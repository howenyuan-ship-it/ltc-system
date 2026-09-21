import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import {
  AlertTriangle, Building2, CheckCircle2, Clock, MapPin, RefreshCw, Search, UserRound, X,
} from 'lucide-react'
import 'leaflet/dist/leaflet.css'

import { geoApi } from '../../api/client'
import { caregiverIcon, caseIcon, siteIcon } from './markers'
import { STATUS_META } from './types'
import type { GeoCaregiver, GeoRecord, MapData, MapStatus, Supervisor } from './types'

const TAINAN_CENTER: [number, number] = [22.995, 120.215]
const REFRESH_MS = 60_000

type SupervisorMode = 'case' | 'caregiver'

const LAYER_KEYS = ['caregivers', 'doneCases', 'sites', 'openCases'] as const
type LayerKey = (typeof LAYER_KEYS)[number]

const LAYER_LABELS: Record<LayerKey, { label: string; color: string }> = {
  caregivers: { label: '居服員位置', color: '#2563eb' },
  doneCases: { label: '當日服務個案', color: '#16a34a' },
  sites: { label: '服務據點', color: '#7c3aed' },
  openCases: { label: '當日未完成班表', color: '#eab308' },
}

/** 同一位個案當日可能有多個班次，圖釘以「最嚴重」的狀態著色 */
const SEVERITY: Record<MapStatus, number> = {
  late: 0, late_completed: 1, pending: 2, completed: 3, cancelled: 4,
}

interface CasePin {
  caseId: number
  caseName: string
  caseNo: string
  address: string
  latitude: number
  longitude: number
  geocodeSource: string
  supervisorName: string
  worst: MapStatus
  records: GeoRecord[]
}

const STATUS_FILTERS: { key: MapStatus; label: string }[] = [
  { key: 'completed', label: '已完成' },
  { key: 'pending', label: '未完成' },
  { key: 'late', label: '遲到' },
  { key: 'late_completed', label: '遲到後完成' },
]

/** 讓地圖在資料載入後自動框住所有標記，並在點選清單時飛到該點 */
function MapController({ focus, bounds }: {
  focus: [number, number] | null
  bounds: [number, number][] | null
}) {
  const map = useMap()
  const fitted = useRef(false)

  useEffect(() => {
    if (fitted.current || !bounds || bounds.length === 0) return
    fitted.current = true
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 })
  }, [bounds, map])

  useEffect(() => {
    if (focus) map.flyTo(focus, 16, { duration: 0.8 })
  }, [focus, map])

  return null
}

function StatusDot({ status }: { status: MapStatus }) {
  if (status === 'late_completed') {
    return (
      <span className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0 overflow-hidden"
            style={{ background: 'linear-gradient(90deg,#dc2626 50%,#16a34a 50%)' }} />
    )
  }
  return <span className={`inline-block w-2.5 h-2.5 rounded-full flex-shrink-0 ${STATUS_META[status].ring}`} />
}

export default function GeoMap() {
  const [data, setData] = useState<MapData | null>(null)
  const [supervisorList, setSupervisorList] = useState<Supervisor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<MapStatus[]>([])
  const [supervisorMode, setSupervisorMode] = useState<SupervisorMode>('case')
  const [supervisorId, setSupervisorId] = useState<string>('')
  const [layers, setLayers] = useState<Record<LayerKey, boolean>>({
    caregivers: true, doneCases: true, sites: true, openCases: true,
  })
  const [focus, setFocus] = useState<[number, number] | null>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(timer)
  }, [search])

  const load = useCallback(async () => {
    try {
      const params: Record<string, string> = {}
      if (debouncedSearch) params.q = debouncedSearch
      if (statusFilter.length) params.status = statusFilter.join(',')
      if (supervisorId) {
        params[supervisorMode === 'case' ? 'supervisor' : 'caregiver_supervisor'] = supervisorId
      }
      const res = await geoApi.mapData(params)
      setData(res.data)
      setError('')
    } catch {
      setError('無法載入地圖資料，請確認後端服務是否正常。')
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, statusFilter, supervisorId, supervisorMode])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const timer = setInterval(load, REFRESH_MS)
    return () => clearInterval(timer)
  }, [load])

  useEffect(() => {
    geoApi.supervisors()
      .then(res => setSupervisorList(res.data))
      .catch(() => setSupervisorList([]))
  }, [])

  const records = data?.records ?? []
  const caregivers = data?.caregivers ?? []
  const sites = data?.sites ?? []

  const openRecords = useMemo(
    () => records.filter(r => r.map_status === 'pending' || r.map_status === 'late'),
    [records],
  )
  const doneRecords = useMemo(
    () => records.filter(r => r.map_status === 'completed' || r.map_status === 'late_completed'),
    [records],
  )
  const lateRecords = useMemo(() => records.filter(r => r.map_status === 'late'), [records])

  const bounds = useMemo(() => {
    const pts: [number, number][] = []
    records.forEach(r => { if (r.latitude && r.longitude) pts.push([r.latitude, r.longitude]) })
    caregivers.forEach(c => { if (c.latitude && c.longitude) pts.push([c.latitude, c.longitude]) })
    sites.forEach(s => pts.push([s.latitude, s.longitude]))
    return pts.length ? pts : null
  }, [records, caregivers, sites])

  /** 依個案彙整成地圖圖釘，避免同址多班次的標記互相重疊 */
  const casePins = useMemo(() => {
    const shown: GeoRecord[] = []
    if (layers.doneCases) shown.push(...doneRecords)
    if (layers.openCases) shown.push(...openRecords)

    const byCase = new Map<number, CasePin>()
    for (const r of shown) {
      if (r.latitude == null || r.longitude == null) continue
      const existing = byCase.get(r.case_id)
      if (existing) {
        existing.records.push(r)
        if (SEVERITY[r.map_status] < SEVERITY[existing.worst]) existing.worst = r.map_status
      } else {
        byCase.set(r.case_id, {
          caseId: r.case_id,
          caseName: r.case_name,
          caseNo: r.case_no,
          address: r.address,
          latitude: r.latitude,
          longitude: r.longitude,
          geocodeSource: r.geocode_source,
          supervisorName: r.supervisor_name,
          worst: r.map_status,
          records: [r],
        })
      }
    }
    for (const pin of byCase.values()) {
      pin.records.sort((a, b) => a.scheduled_start.localeCompare(b.scheduled_start))
    }
    return [...byCase.values()]
  }, [layers.doneCases, layers.openCases, doneRecords, openRecords])

  const toggleLayer = (key: LayerKey) =>
    setLayers(prev => ({ ...prev, [key]: !prev[key] }))

  const toggleStatus = (key: MapStatus) =>
    setStatusFilter(prev => (prev.includes(key) ? prev.filter(s => s !== key) : [...prev, key]))

  const focusRecord = (r: GeoRecord) => {
    setSelectedId(r.id)
    if (r.latitude && r.longitude) setFocus([r.latitude, r.longitude])
  }

  const focusCaregiver = (c: GeoCaregiver) => {
    if (c.latitude && c.longitude) setFocus([c.latitude, c.longitude])
  }

  const stats = data?.stats

  return (
    <div className="flex flex-col h-[calc(100vh-7.5rem)] bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      {/* 標題與圖層開關 */}
      <div className="bg-[#1a5f5f] text-white px-5 py-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-lg font-bold">地理位置管理</h1>
          <div className="flex items-center gap-2 text-xs">
            {data && (
              <span className="text-white/70">
                {data.date}　更新於 {new Date(data.now).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <button onClick={load} title="立即重新整理"
                    className="p-1.5 rounded hover:bg-white/15 transition-colors">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4 mt-2.5 flex-wrap">
          {LAYER_KEYS.map(key => (
            <button key={key} onClick={() => toggleLayer(key)}
                    className="flex items-center gap-2 text-sm group">
              <span className={`w-9 h-5 rounded-full transition-colors flex items-center px-0.5
                                ${layers[key] ? 'bg-teal-400' : 'bg-white/25'}`}>
                <span className={`w-4 h-4 rounded-full bg-white transition-transform
                                  ${layers[key] ? 'translate-x-4' : ''}`} />
              </span>
              <span className={layers[key] ? 'text-white' : 'text-white/50'}>
                {LAYER_LABELS[key].label}
              </span>
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: LAYER_LABELS[key].color }} />
            </button>
          ))}
        </div>
      </div>

      {/* 過濾列 */}
      <div className="px-5 py-2.5 border-b border-gray-200 flex items-center gap-4 flex-wrap bg-gray-50">
        <div className="flex items-center gap-4 text-sm">
          {(['case', 'caregiver'] as SupervisorMode[]).map(mode => (
            <label key={mode} className="flex items-center gap-1.5 cursor-pointer">
              <input type="radio" name="supMode" checked={supervisorMode === mode}
                     onChange={() => setSupervisorMode(mode)} className="accent-teal-600" />
              <span>{mode === 'case' ? '以個案督導過濾' : '以居服員督導過濾'}</span>
            </label>
          ))}
        </div>

        <select value={supervisorId} onChange={e => setSupervisorId(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm min-w-[11rem] bg-white">
          <option value="">全部督導</option>
          {supervisorList.map(s => <option key={s.id} value={s.id}>{s.name}（{s.role}）</option>)}
        </select>

        <div className="flex items-center gap-1.5 ml-auto flex-wrap">
          {STATUS_FILTERS.map(({ key, label }) => {
            const active = statusFilter.includes(key)
            return (
              <button key={key} onClick={() => toggleStatus(key)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border transition-colors
                                  ${active ? STATUS_META[key].text : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-100'}`}>
                <StatusDot status={key} />
                {label}
              </button>
            )
          })}
          {statusFilter.length > 0 && (
            <button onClick={() => setStatusFilter([])}
                    className="text-xs text-gray-400 hover:text-gray-600 px-1.5 flex items-center gap-1">
              <X className="w-3 h-3" />清除
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="px-5 py-2 bg-red-50 text-red-700 text-sm border-b border-red-100">{error}</div>
      )}

      {/* 主體 */}
      <div className="flex-1 flex min-h-0">
        {/* 左側清單 */}
        <aside className="w-80 border-r border-gray-200 flex flex-col min-h-0 bg-white">
          <div className="p-3 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                     placeholder="搜尋個案、居服員、服務項目"
                     className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg
                                focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
          </div>

          {lateRecords.length > 0 && (
            <div className="mx-3 mt-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-red-700 leading-relaxed">
                <span className="font-semibold">{lateRecords.length} 筆班次已逾時未到</span>
                <div className="text-red-600/80 mt-0.5">超過排定時間 {data?.grace_minutes} 分鐘仍未打卡，已置頂顯示</div>
              </div>
            </div>
          )}

          <div className="px-3 pt-3 pb-1 text-xs font-semibold text-gray-500 flex items-center justify-between">
            <span>當日班表</span>
            <span className="text-gray-400 font-normal">{records.length} 筆</span>
          </div>

          <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-1.5">
            {loading && records.length === 0 && (
              <div className="text-center text-gray-400 text-sm py-10">載入中...</div>
            )}
            {!loading && records.length === 0 && (
              <div className="text-center text-gray-400 text-sm py-10">當日沒有符合條件的班次</div>
            )}
            {records.map(r => {
              const meta = STATUS_META[r.map_status]
              const isSelected = selectedId === r.id
              return (
                <button key={r.id} onClick={() => focusRecord(r)}
                        className={`w-full text-left px-2.5 py-2 rounded-lg border transition-colors
                                    ${isSelected ? 'border-teal-400 bg-teal-50' : 'border-transparent hover:bg-gray-50'}`}>
                  <div className="flex items-center gap-2">
                    <StatusDot status={r.map_status} />
                    <span className="font-medium text-sm text-gray-800 truncate">{r.case_name}</span>
                    <span className="text-xs text-gray-500 ml-auto flex-shrink-0">
                      {r.scheduled_start} - {r.scheduled_end}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 pl-[1.125rem] text-xs text-gray-500">
                    <span className="truncate">{r.service_code} {r.service_name}</span>
                    <span className="ml-auto flex-shrink-0">{r.caregiver_name}</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 pl-[1.125rem]">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] border ${meta.text}`}>
                      {r.status_label}
                    </span>
                    {r.is_late && r.late_minutes > 0 && (
                      <span className="text-[10px] text-red-600">逾時 {r.late_minutes} 分</span>
                    )}
                    {r.actual_start && (
                      <span className="text-[10px] text-gray-400">打卡 {r.actual_start}</span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>

          {/* 居服員一覽 */}
          <div className="border-t border-gray-100 max-h-44 overflow-y-auto">
            <div className="px-3 pt-2.5 pb-1 text-xs font-semibold text-gray-500">居服員位置</div>
            <div className="px-2 pb-2 space-y-1">
              {caregivers.map(c => (
                <button key={c.id} onClick={() => focusCaregiver(c)}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-gray-50 flex items-center gap-2">
                  <UserRound className={`w-4 h-4 flex-shrink-0 ${c.is_stale ? 'text-gray-300' : 'text-blue-600'}`} />
                  <span className="text-sm text-gray-700">{c.name}</span>
                  <span className="text-[11px] text-gray-400 ml-auto">
                    {c.today_completed}/{c.today_total}
                  </span>
                  <span className={`text-[11px] ${c.is_stale ? 'text-gray-300' : 'text-gray-500'}`}>
                    {c.recorded_at_label || '無定位'}
                  </span>
                </button>
              ))}
              {caregivers.length === 0 && (
                <div className="text-xs text-gray-400 px-2.5 py-2">尚無居服員位置資料</div>
              )}
            </div>
          </div>
        </aside>

        {/* 地圖 */}
        <div className="flex-1 relative min-h-0">
          <MapContainer center={TAINAN_CENTER} zoom={12} className="absolute inset-0" scrollWheelZoom>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapController focus={focus} bounds={bounds} />

            {casePins.map(pin => (
              <Marker key={pin.caseId} position={[pin.latitude, pin.longitude]}
                      icon={caseIcon(pin.worst, pin.records.some(r => r.id === selectedId))}
                      eventHandlers={{ click: () => setSelectedId(pin.records[0].id) }}>
                <Popup>
                  <div className="text-sm min-w-[14rem]">
                    <div className="font-semibold text-gray-800 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-gray-400" />
                      {pin.caseName}
                      <span className="text-xs text-gray-400 font-normal">{pin.caseNo}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{pin.address}</div>
                    {pin.supervisorName && (
                      <div className="text-xs text-gray-500">督導：{pin.supervisorName}</div>
                    )}

                    <div className="mt-2 pt-2 border-t border-gray-100 space-y-2">
                      <div className="text-xs font-semibold text-gray-600">
                        當日班次 {pin.records.length} 筆
                      </div>
                      {pin.records.map(r => (
                        <div key={r.id} className="text-xs leading-relaxed">
                          <div className="flex items-center gap-1.5">
                            <StatusDot status={r.map_status} />
                            <span className="font-medium">{r.scheduled_start} - {r.scheduled_end}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] border ${STATUS_META[r.map_status].text}`}>
                              {r.status_label}
                            </span>
                          </div>
                          <div className="pl-4 text-gray-600">
                            {r.service_code} {r.service_name}　{r.caregiver_name}
                          </div>
                          {r.actual_start && (
                            <div className="pl-4 text-gray-500">
                              實際 {r.actual_start}{r.actual_end && ` - ${r.actual_end}`}
                            </div>
                          )}
                          {r.is_late && r.late_minutes > 0 && (
                            <div className="pl-4 text-red-600">逾時 {r.late_minutes} 分</div>
                          )}
                        </div>
                      ))}
                    </div>

                    {pin.geocodeSource === 'fallback' && (
                      <div className="mt-2 text-[10px] text-amber-600">※ 此座標為示範用假資料</div>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}

            {layers.caregivers && caregivers.map(c => (
              c.latitude && c.longitude ? (
                <Marker key={`cg-${c.id}`} position={[c.latitude, c.longitude]} icon={caregiverIcon(c.is_stale)}>
                  <Popup>
                    <div className="text-sm min-w-[12rem]">
                      <div className="font-semibold text-gray-800 flex items-center gap-1.5">
                        <UserRound className="w-3.5 h-3.5 text-blue-600" />
                        {c.name}
                        {c.employee_id && <span className="text-xs text-gray-400 font-normal">{c.employee_id}</span>}
                      </div>
                      <div className="mt-2 space-y-0.5 text-xs">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-gray-400" />
                          定位時間：{c.recorded_at_label || '無'}
                          {c.is_stale && <span className="text-amber-600">（已逾時未更新）</span>}
                        </div>
                        {c.last_checkin ? (
                          <div className="flex items-start gap-1">
                            <CheckCircle2 className="w-3 h-3 text-green-600 mt-0.5" />
                            <span>
                              最近打卡 {c.last_checkin.time}　{c.last_checkin.case_name}
                              <br />{c.last_checkin.service}
                            </span>
                          </div>
                        ) : (
                          <div className="text-gray-400">今日尚未打卡</div>
                        )}
                        <div>今日進度：{c.today_completed} / {c.today_total} 班</div>
                        {c.supervisor_name && <div>督導：{c.supervisor_name}</div>}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ) : null
            ))}

            {layers.sites && sites.map(s => (
              <Marker key={`site-${s.id}`} position={[s.latitude, s.longitude]} icon={siteIcon()}>
                <Popup>
                  <div className="text-sm min-w-[11rem]">
                    <div className="font-semibold text-gray-800 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-purple-600" />
                      {s.name}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{s.address}</div>
                    {s.phone && <div className="text-xs text-gray-500">{s.phone}</div>}
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>

          {/* 圖例 */}
          <div className="absolute bottom-4 right-4 z-[1000] bg-white/95 backdrop-blur rounded-lg shadow-lg
                          border border-gray-200 px-3 py-2.5 text-xs space-y-1.5">
            <div className="font-semibold text-gray-600 mb-1">圖例</div>
            <div className="flex items-center gap-2"><StatusDot status="completed" />已完成</div>
            <div className="flex items-center gap-2"><StatusDot status="pending" />未完成</div>
            <div className="flex items-center gap-2"><StatusDot status="late" />遲到</div>
            <div className="flex items-center gap-2"><StatusDot status="late_completed" />遲到後完成</div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-600" />居服員
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-sm bg-purple-600" />服務據點
            </div>
          </div>
        </div>
      </div>

      {/* 底部統計 */}
      <div className="bg-[#1a5f5f] text-white px-5 py-2.5 flex items-center gap-6 text-sm flex-wrap">
        <span className="font-semibold">數據統計</span>
        <span>今日預計服務班數：<strong className="text-base">{stats?.scheduled_total ?? 0}</strong></span>
        <span>今日已完成個案：<strong className="text-base">{stats?.completed_cases ?? 0}</strong></span>
        <div className="flex items-center gap-4 ml-auto text-xs">
          <span className="flex items-center gap-1.5"><StatusDot status="completed" />已完成 {stats?.completed ?? 0}</span>
          <span className="flex items-center gap-1.5"><StatusDot status="late_completed" />遲到後完成 {stats?.late_completed ?? 0}</span>
          <span className="flex items-center gap-1.5"><StatusDot status="pending" />未完成 {stats?.pending ?? 0}</span>
          <span className="flex items-center gap-1.5"><StatusDot status="late" />遲到 {stats?.late ?? 0}</span>
        </div>
      </div>
    </div>
  )
}
