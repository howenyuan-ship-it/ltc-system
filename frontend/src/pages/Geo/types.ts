export type MapStatus = 'completed' | 'pending' | 'late' | 'late_completed' | 'cancelled'

export interface GeoRecord {
  id: number
  case_id: number
  case_no: string
  case_name: string
  address: string
  latitude: number | null
  longitude: number | null
  geocode_source: string
  caregiver_id: number | null
  caregiver_name: string
  service_code: string
  service_name: string
  scheduled_date: string
  scheduled_start: string
  scheduled_end: string
  actual_start: string
  actual_end: string
  raw_status: string
  map_status: MapStatus
  status_label: string
  is_late: boolean
  late_minutes: number
  supervisor_id: number | null
  supervisor_name: string
}

export interface GeoCaregiver {
  id: number
  name: string
  employee_id: string
  phone: string
  supervisor_id: number | null
  supervisor_name: string
  latitude: number | null
  longitude: number | null
  recorded_at: string | null
  recorded_at_label: string
  location_source: string
  is_stale: boolean
  last_checkin: {
    record_id: number
    case_name: string
    service: string
    time: string
  } | null
  today_total: number
  today_completed: number
  matches_filter: boolean
}

export interface GeoSite {
  id: number
  name: string
  code: string
  address: string
  phone: string
  latitude: number
  longitude: number
}

export interface GeoStats {
  scheduled_total: number
  completed: number
  late_completed: number
  pending: number
  late: number
  cancelled: number
  completed_total: number
  completed_cases: number
}

export interface MapData {
  date: string
  now: string
  grace_minutes: number
  stats: GeoStats
  records: GeoRecord[]
  caregivers: GeoCaregiver[]
  sites: GeoSite[]
}

export interface Supervisor {
  id: number
  name: string
  role: string
}

/** 狀態對應的顏色與說明，地圖標記與清單共用同一組定義 */
export const STATUS_META: Record<MapStatus, { label: string; color: string; ring: string; text: string }> = {
  completed:      { label: '已完成',    color: '#16a34a', ring: 'bg-green-500',  text: 'text-green-700 bg-green-50 border-green-200' },
  pending:        { label: '未完成',    color: '#eab308', ring: 'bg-yellow-400', text: 'text-yellow-800 bg-yellow-50 border-yellow-300' },
  late:           { label: '遲到',      color: '#dc2626', ring: 'bg-red-500',    text: 'text-red-700 bg-red-50 border-red-200' },
  late_completed: { label: '遲到後完成', color: '#dc2626', ring: 'bg-red-500',    text: 'text-red-700 bg-gradient-to-r from-red-50 to-green-50 border-red-200' },
  cancelled:      { label: '已取消',    color: '#9ca3af', ring: 'bg-gray-400',   text: 'text-gray-600 bg-gray-50 border-gray-200' },
}

export const CAREGIVER_COLOR = '#2563eb'
export const SITE_COLOR = '#7c3aed'
