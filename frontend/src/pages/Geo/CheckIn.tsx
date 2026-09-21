import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CheckCircle2, Clock, LogOut, MapPin, Navigation, RefreshCw, TriangleAlert,
} from 'lucide-react'

import { geoApi } from '../../api/client'
import { useAuthStore } from '../../store/authStore'
import { STATUS_META } from './types'
import type { GeoRecord } from './types'

interface Coords {
  latitude: number
  longitude: number
  accuracy_m: number | null
}

/** 居服員行動版打卡頁：取得瀏覽器定位，回報位置並完成服務起訖打卡。 */
export default function CheckIn() {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()

  const [records, setRecords] = useState<GeoRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [coords, setCoords] = useState<Coords | null>(null)
  const [geoError, setGeoError] = useState('')
  const [busyId, setBusyId] = useState<number | null>(null)
  const [message, setMessage] = useState('')

  const load = useCallback(async () => {
    try {
      const res = await geoApi.mySchedule()
      setRecords(res.data.records)
    } catch {
      setMessage('無法載入今日班表')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  /** 取得目前定位。瀏覽器僅在 HTTPS 或 localhost 下提供 geolocation。 */
  const locate = useCallback((): Promise<Coords | null> => {
    return new Promise(resolve => {
      if (!('geolocation' in navigator)) {
        setGeoError('此瀏覽器不支援定位功能')
        resolve(null)
        return
      }
      navigator.geolocation.getCurrentPosition(
        pos => {
          const next: Coords = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy_m: pos.coords.accuracy ?? null,
          }
          setCoords(next)
          setGeoError('')
          resolve(next)
        },
        err => {
          setGeoError(
            err.code === err.PERMISSION_DENIED
              ? '定位權限被拒絕，請在瀏覽器設定中允許此網站取得位置'
              : '無法取得目前位置，請確認已開啟定位服務',
          )
          resolve(null)
        },
        { enableHighAccuracy: true, timeout: 10_000, maximumAge: 30_000 },
      )
    })
  }, [])

  useEffect(() => { locate() }, [locate])

  // 每兩分鐘回報一次位置，讓督導端地圖看得到移動軌跡
  useEffect(() => {
    const timer = setInterval(async () => {
      const c = await locate()
      if (c) geoApi.reportLocation({ ...c, source: 'mobile' }).catch(() => undefined)
    }, 120_000)
    return () => clearInterval(timer)
  }, [locate])

  const act = async (record: GeoRecord, kind: 'in' | 'out') => {
    setBusyId(record.id)
    setMessage('')
    const c = coords ?? (await locate())
    const payload = {
      record_id: record.id,
      latitude: c?.latitude ?? null,
      longitude: c?.longitude ?? null,
      accuracy_m: c?.accuracy_m ?? null,
    }
    try {
      const res = kind === 'in' ? await geoApi.checkIn(payload) : await geoApi.checkOut(payload)
      setRecords(prev => prev.map(r => (r.id === record.id ? res.data : r)))
      setMessage(kind === 'in' ? `已於 ${res.data.actual_start} 打卡開始服務` : `已於 ${res.data.actual_end} 完成簽退`)
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setMessage(detail || '操作失敗，請稍後再試')
    } finally {
      setBusyId(null)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-[#1a5f5f] text-white px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-bold">服務打卡</div>
            <div className="text-xs text-white/70">{user?.chinese_name || user?.username}</div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={load} className="p-2 rounded hover:bg-white/15" title="重新整理">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={handleLogout} className="p-2 rounded hover:bg-white/15" title="登出">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="mt-2 text-xs flex items-center gap-1.5">
          <Navigation className="w-3.5 h-3.5" />
          {coords ? (
            <span className="text-white/80">
              定位就緒（誤差約 {Math.round(coords.accuracy_m ?? 0)} 公尺）
            </span>
          ) : (
            <span className="text-amber-200">{geoError || '取得定位中...'}</span>
          )}
          <button onClick={() => locate()} className="ml-auto underline text-white/70">重新定位</button>
        </div>
      </header>

      {geoError && (
        <div className="m-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex gap-2">
          <TriangleAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            {geoError}
            <div className="mt-1 text-amber-700/80">
              定位功能需要 HTTPS 連線，用 http 開啟時瀏覽器會拒絕提供位置。
            </div>
          </div>
        </div>
      )}

      {message && (
        <div className="m-3 px-3 py-2 bg-teal-50 border border-teal-200 rounded-lg text-sm text-teal-800">
          {message}
        </div>
      )}

      <main className="p-3 space-y-3 pb-8">
        {loading && <div className="text-center text-gray-400 py-12">載入中...</div>}
        {!loading && records.length === 0 && (
          <div className="text-center text-gray-400 py-12">今日沒有排定的班次</div>
        )}

        {records.map(r => {
          const meta = STATUS_META[r.map_status]
          const canCheckIn = !r.actual_start
          const canCheckOut = !!r.actual_start && !r.actual_end
          const done = !!r.actual_end
          return (
            <div key={r.id}
                 className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="h-1" style={{ backgroundColor: meta.color }} />
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-gray-800">{r.case_name}</div>
                    <div className="text-xs text-gray-500 mt-0.5 flex items-start gap-1">
                      <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      {r.address || '（未填地址）'}
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-xs border flex-shrink-0 ${meta.text}`}>
                    {r.status_label}
                  </span>
                </div>

                <div className="mt-3 text-sm text-gray-600 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                    排定 {r.scheduled_start} - {r.scheduled_end}
                  </div>
                  <div>{r.service_code} {r.service_name}</div>
                  {r.actual_start && (
                    <div className="text-teal-700">
                      實際 {r.actual_start}{r.actual_end && ` - ${r.actual_end}`}
                    </div>
                  )}
                  {r.is_late && r.late_minutes > 0 && (
                    <div className="text-red-600 text-xs">逾時 {r.late_minutes} 分鐘</div>
                  )}
                </div>

                <div className="mt-3 flex gap-2">
                  {canCheckIn && (
                    <button onClick={() => act(r, 'in')} disabled={busyId === r.id}
                            className="flex-1 bg-teal-600 hover:bg-teal-700 disabled:opacity-50
                                       text-white py-2.5 rounded-lg text-sm font-medium">
                      {busyId === r.id ? '處理中...' : '打卡開始服務'}
                    </button>
                  )}
                  {canCheckOut && (
                    <button onClick={() => act(r, 'out')} disabled={busyId === r.id}
                            className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50
                                       text-white py-2.5 rounded-lg text-sm font-medium">
                      {busyId === r.id ? '處理中...' : '完成服務簽退'}
                    </button>
                  )}
                  {done && (
                    <div className="flex-1 flex items-center justify-center gap-1.5 py-2.5
                                    text-sm text-green-700 bg-green-50 rounded-lg">
                      <CheckCircle2 className="w-4 h-4" />服務已完成
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </main>
    </div>
  )
}
