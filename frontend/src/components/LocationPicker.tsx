import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import { Crosshair, Loader2, MapPin, Save, Search, TriangleAlert, X } from 'lucide-react'
import type { Map as LeafletMap } from 'leaflet'
import 'leaflet/dist/leaflet.css'

import { geoApi } from '../api/client'
import { caseIcon } from '../pages/Geo/markers'

/** 台灣本島與離島的大致範圍，用來提醒使用者座標是不是貼錯了 */
const TAIWAN = { latMin: 21.5, latMax: 26.5, lngMin: 118.0, lngMax: 122.5 }
const DEFAULT_CENTER: [number, number] = [22.995, 120.215]

export interface PickerCase {
  id: number
  name: string
  case_no: string
  city: string
  district: string
  address: string
  latitude: number | string | null
  longitude: number | string | null
  geocode_source?: string
  address_quality?: string
  address_quality_label?: string
}

interface Props {
  target: PickerCase
  onClose: () => void
  onSaved: (result: { case_id: number; latitude: number; longitude: number; address: string }) => void
}

interface NominatimHit {
  display_name: string
  lat: string
  lon: string
}

function toNumber(v: number | string | null): number | null {
  if (v === null || v === '') return null
  const n = typeof v === 'number' ? v : parseFloat(v)
  return Number.isFinite(n) ? n : null
}

/**
 * 解析使用者貼上的座標字串。
 * 支援 Google 地圖「複製座標」給的 "22.990812, 120.213355"，
 * 也容忍空白分隔。經緯度貼反是最常見的錯誤，所以第一個值
 * 超出緯度範圍時自動對調，而不是直接報錯。
 */
export function parseCoords(input: string): { lat: number; lng: number; swapped: boolean } | null {
  const nums = input.match(/-?\d+(\.\d+)?/g)
  if (!nums || nums.length < 2) return null
  let lat = parseFloat(nums[0])
  let lng = parseFloat(nums[1])
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null

  let swapped = false
  if (Math.abs(lat) > 90 && Math.abs(lng) <= 90) {
    [lat, lng] = [lng, lat]
    swapped = true
  }
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null
  return { lat, lng, swapped }
}

function isInTaiwan(lat: number, lng: number): boolean {
  return lat >= TAIWAN.latMin && lat <= TAIWAN.latMax && lng >= TAIWAN.lngMin && lng <= TAIWAN.lngMax
}

/** 與後端 apps/geo/address.py 的判定一致：有門牌號碼才算完整 */
const HOUSE_NUMBER = /\d+\s*(?:[之-]\s*\d+)?\s*號/

function hasHouseNumber(addr: string): boolean {
  return HOUSE_NUMBER.test(addr)
}

/** 對話框開啟時地圖容器尺寸才確定，必須重新計算一次否則圖磚會錯位 */
function MapReady({ onReady }: { onReady: (m: LeafletMap) => void }) {
  const map = useMap()
  useEffect(() => {
    const timer = setTimeout(() => map.invalidateSize(), 120)
    onReady(map)
    return () => clearTimeout(timer)
  }, [map, onReady])
  return null
}

function ClickToPlace({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: e => onPick(e.latlng.lat, e.latlng.lng) })
  return null
}

export default function LocationPicker({ target, onClose, onSaved }: Props) {
  const initial = useMemo(() => {
    const lat = toNumber(target.latitude)
    const lng = toNumber(target.longitude)
    return lat !== null && lng !== null ? ([lat, lng] as [number, number]) : null
  }, [target.latitude, target.longitude])

  const [pos, setPos] = useState<[number, number] | null>(initial)
  const [address, setAddress] = useState(target.address || '')
  const [pasted, setPasted] = useState('')
  const [hits, setHits] = useState<NominatimHit[]>([])
  const [searching, setSearching] = useState(false)
  const [saving, setSaving] = useState(false)
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const mapRef = useRef<LeafletMap | null>(null)

  const prefix = `${target.city || ''}${target.district || ''}`

  const moveTo = useCallback((lat: number, lng: number, zoom = 17) => {
    setPos([lat, lng])
    mapRef.current?.flyTo([lat, lng], zoom, { duration: 0.6 })
  }, [])

  /** 用 OpenStreetMap 的 Nominatim 把地圖帶到大概位置，細部再靠人工拖曳 */
  const search = useCallback(async () => {
    const q = `${prefix}${address}`.trim()
    if (!q) {
      setError('請先填寫地址')
      return
    }
    setSearching(true)
    setError('')
    setNote('')
    try {
      const url = new URL('https://nominatim.openstreetmap.org/search')
      url.searchParams.set('q', q)
      url.searchParams.set('format', 'json')
      url.searchParams.set('limit', '5')
      url.searchParams.set('countrycodes', 'tw')
      url.searchParams.set('accept-language', 'zh-TW')
      const res = await fetch(url.toString())
      const data: NominatimHit[] = await res.json()
      setHits(data)
      if (data.length === 0) {
        setNote('查不到這個地址，請直接在地圖上點選或拖曳圖釘。台灣的巷弄地址常常查不到，這很正常。')
      } else {
        moveTo(parseFloat(data[0].lat), parseFloat(data[0].lon))
        setNote('已帶到大概位置，請拖曳圖釘微調到正確的門口。')
      }
    } catch {
      setError('地址查詢服務連線失敗，請直接在地圖上點選位置。')
    } finally {
      setSearching(false)
    }
  }, [address, prefix, moveTo])

  const applyPasted = useCallback(() => {
    const parsed = parseCoords(pasted)
    if (!parsed) {
      setError('看不懂這組座標，正確格式像是 22.990812, 120.213355')
      return
    }
    setError('')
    moveTo(parsed.lat, parsed.lng)
    setNote(
      parsed.swapped
        ? '偵測到經緯度順序相反，已自動對調。請確認圖釘位置正確。'
        : isInTaiwan(parsed.lat, parsed.lng)
          ? '已移到貼上的座標。'
          : '這個座標不在台灣範圍內，請確認是否貼錯。',
    )
  }, [pasted, moveTo])

  const save = async () => {
    if (!pos) {
      setError('請先在地圖上選定位置')
      return
    }
    setSaving(true)
    setError('')
    try {
      const res = await geoApi.setCaseLocation({
        case_id: target.id,
        latitude: pos[0].toFixed(6),
        longitude: pos[1].toFixed(6),
        address: address.trim(),
      })
      onSaved({
        case_id: res.data.case_id,
        latitude: res.data.latitude,
        longitude: res.data.longitude,
        address: res.data.address,
      })
      onClose()
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(detail || '儲存失敗，請稍後再試')
    } finally {
      setSaving(false)
    }
  }

  const outsideTaiwan = pos ? !isInTaiwan(pos[0], pos[1]) : false
  const addressIncomplete = address.trim().length > 0 && !hasHouseNumber(address)

  return (
    <div className="fixed inset-0 z-[2000] bg-black/50 flex items-center justify-center p-4"
         onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden"
           onClick={e => e.stopPropagation()}>

        <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-teal-600" />
              設定居家位置
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {target.name}　<span className="text-gray-400">{target.case_no}</span>
              {target.geocode_source === 'fallback' && (
                <span className="ml-2 text-amber-600">目前是示範用假座標</span>
              )}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-gray-100 text-gray-500">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3 border-b border-gray-100">
          {/* 地址搜尋 */}
          <div>
            <label className="text-xs font-medium text-gray-600">居住地址</label>
            <div className="flex gap-2 mt-1">
              <div className="flex-1 flex items-stretch border border-gray-300 rounded-lg overflow-hidden
                              focus-within:ring-2 focus-within:ring-teal-500">
                {prefix && (
                  <span className="px-2.5 flex items-center text-sm text-gray-500 bg-gray-50 border-r border-gray-200">
                    {prefix}
                  </span>
                )}
                <input value={address} onChange={e => setAddress(e.target.value)}
                       onKeyDown={e => { if (e.key === 'Enter') search() }}
                       placeholder="例如 林森路一段149號"
                       className="flex-1 px-3 py-2 text-sm focus:outline-none" />
              </div>
              <button onClick={search} disabled={searching}
                      className="btn-secondary flex items-center gap-1.5 disabled:opacity-50">
                {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                查地址
              </button>
            </div>
            {hits.length > 1 && (
              <div className="mt-1.5 space-y-1">
                {hits.map((h, i) => (
                  <button key={i} onClick={() => moveTo(parseFloat(h.lat), parseFloat(h.lon))}
                          className="w-full text-left text-xs px-2 py-1 rounded hover:bg-gray-100 text-gray-600 truncate">
                    {h.display_name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 貼上座標 */}
          <div>
            <label className="text-xs font-medium text-gray-600">
              或貼上座標
              <span className="text-gray-400 font-normal ml-1">
                （Google 地圖上按右鍵→複製座標）
              </span>
            </label>
            <div className="flex gap-2 mt-1">
              <input value={pasted} onChange={e => setPasted(e.target.value)}
                     onKeyDown={e => { if (e.key === 'Enter') applyPasted() }}
                     placeholder="22.990812, 120.213355"
                     className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg
                                focus:outline-none focus:ring-2 focus:ring-teal-500" />
              <button onClick={applyPasted} className="btn-secondary flex items-center gap-1.5">
                <Crosshair className="w-4 h-4" />移到此處
              </button>
            </div>
          </div>

          {addressIncomplete && (
            <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex gap-2">
              <TriangleAlert className="w-4 h-4 flex-shrink-0" />
              <div>
                這個地址沒有門牌號碼，系統不會自動定位（只到路段的地址會得到整條路的中心點）。
                <div className="mt-0.5 text-amber-700/80">
                  你仍然可以在地圖上手動指定位置並儲存，那會被記為人工座標。
                </div>
              </div>
            </div>
          )}
          {note && <div className="text-xs text-teal-700 bg-teal-50 border border-teal-200 rounded-lg px-3 py-2">{note}</div>}
          {error && <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}
          {outsideTaiwan && (
            <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex gap-2">
              <TriangleAlert className="w-4 h-4 flex-shrink-0" />
              目前圖釘位置不在台灣範圍內，請確認是否選錯。
            </div>
          )}
        </div>

        {/* 地圖 */}
        <div className="flex-1 min-h-[20rem] relative">
          <MapContainer center={pos || DEFAULT_CENTER} zoom={pos ? 17 : 12}
                        className="absolute inset-0" scrollWheelZoom>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapReady onReady={m => { mapRef.current = m }} />
            <ClickToPlace onPick={(lat, lng) => setPos([lat, lng])} />
            {pos && (
              <Marker position={pos} icon={caseIcon('pending', true)} draggable
                      eventHandlers={{
                        dragend: e => {
                          const { lat, lng } = e.target.getLatLng()
                          setPos([lat, lng])
                        },
                      }} />
            )}
          </MapContainer>

          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] bg-white/95 backdrop-blur
                          rounded-full shadow px-3 py-1.5 text-xs text-gray-600 border border-gray-200">
            在地圖上點一下放置圖釘，或直接拖曳圖釘微調
          </div>
        </div>

        {/* 底部 */}
        <div className="px-5 py-3 border-t border-gray-200 flex items-center gap-3">
          <div className="text-xs text-gray-500 font-mono">
            {pos ? `${pos[0].toFixed(6)}, ${pos[1].toFixed(6)}` : '尚未選定位置'}
          </div>
          <div className="ml-auto flex gap-2">
            <button onClick={onClose} className="btn-secondary">取消</button>
            <button onClick={save} disabled={!pos || saving}
                    className="btn-primary flex items-center gap-1.5 disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              儲存位置
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
