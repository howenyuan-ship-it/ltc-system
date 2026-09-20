import { useEffect, useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'
import { Users, UserCheck, Calendar, AlertCircle, Bell, CheckSquare, Plus, ChevronRight } from 'lucide-react'
import { reportsApi } from '../api/client'

interface DashboardData {
  summary: {
    total_cases: number
    new_cases_week: number
    active_caregivers: number
    today_services: number
    yesterday_services: number
    pending_incidents: number
  }
  today_service_list: Array<{
    id: number
    time: string
    case_name: string
    service_code: string
    service_name: string
    caregiver_name: string
    status: string
    status_display: string
  }>
  service_trend: Array<{ date: string; count: number }>
  service_distribution: Array<{ code: string; name: string; count: number }>
  reminders: Array<{ type: string; count: number; message: string }>
}

const PIE_COLORS = ['#0d9488', '#16a34a', '#f59e0b', '#8b5cf6', '#ec4899']

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, string> = {
    completed: 'badge-completed',
    in_progress: 'bg-blue-100 text-blue-700 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
    pending: 'badge-pending',
    cancelled: 'badge-closed',
  }
  const labels: Record<string, string> = {
    completed: 'Â∑≤Â???, in_progress: '?≤Ë?‰∏?, pending: 'ÂæÖÊ???, cancelled: 'Â∑≤Â?Ê∂?,
  }
  return <span className={map[status] || 'badge-pending'}>{labels[status] || status}</span>
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    reportsApi.dashboard()
      .then(res => setData(res.data))
      .catch(() => {
        // Fallback mock data for demo without backend
        setData({
          summary: {
            total_cases: 128, new_cases_week: 14,
            active_caregivers: 42, today_services: 86,
            yesterday_services: 80, pending_incidents: 7,
          },
          today_service_list: [
            { id: 1, time: '09:00', case_name: '?ã‚???, service_code: 'BA07', service_name: '?îÂä©Ê≤êÊµ¥', caregiver_name: '?≥Â?Áæ?, status: 'completed', status_display: 'Â∑≤Â??? },
            { id: 2, time: '10:30', case_name: '?é‚???, service_code: 'BA15-1', service_name: '?™Â?Â∞±ÈÜ´', caregiver_name: 'ÈªÉÈ?Â©?, status: 'in_progress', status_display: '?≤Ë?‰∏? },
            { id: 3, time: '14:00', case_name: '?≥‚???, service_code: 'BA13', service_name: '?îÂä©È§êÈ?', caregiver_name: '?óÁ???, status: 'pending', status_display: 'ÂæÖÊ??? },
            { id: 4, time: '16:00', case_name: 'Âºµ‚???, service_code: 'BA05', service_name: '?∫Êú¨?•Â∏∏?ßÈ°ß', caregiver_name: '?âÂÆ∂ÂÆ?, status: 'pending', status_display: 'ÂæÖÊ??? },
            { id: 5, time: '17:30', case_name: '?ó‚???, service_code: 'BA01', service_name: '?∫Êú¨Ë∫´È?Ê∏ÖÊ?', caregiver_name: '?≥‰Ω≥??, status: 'pending', status_display: 'ÂæÖÊ??? },
          ],
          service_trend: [
            { date: '10/20', count: 68 }, { date: '10/21', count: 72 }, { date: '10/22', count: 85 },
            { date: '10/23', count: 91 }, { date: '10/24', count: 86 }, { date: '10/25', count: 78 }, { date: '10/26', count: 62 },
          ],
          service_distribution: [
            { code: 'BA01', name: '?∫Êú¨Ë∫´È?Ê∏ÖÊ?', count: 108 },
            { code: 'BA05', name: '?∫Êú¨?•Â∏∏?ßÈ°ß', count: 93 },
            { code: 'BA07', name: '?îÂä©Ê≤êÊµ¥', count: 62 },
            { code: 'BA13', name: '?îÂä©È§êÈ?', count: 69 },
            { code: 'BA15-1', name: '?™Â?Â∞±ÈÜ´', count: 54 },
          ],
          reminders: [
            { type: 'evaluation', count: 3, message: '3 ‰ΩçÂÄãÊ??Ä‰∏âÂÄãÊ?Ë©ï‰º∞' },
            { type: 'incident', count: 2, message: '2 ‰ª∂Áï∞Â∏∏‰?‰ª∂Â?ËøΩËπ§' },
            { type: 'survey', count: 5, message: '5 ‰ªΩÊªø?èÂ∫¶Ë™øÊü•Â∞öÊú™ÂÆåÊ?' },
          ],
        })
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">ËºâÂÖ•‰∏?..</div>
  if (!data) return null

  const { summary } = data
  const totalDist = data.service_distribution.reduce((s, d) => s + d.count, 0)

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">È¶ñÈ??ÄË°®Êùø</h1>
          <p className="text-sm text-gray-500 mt-0.5">Ê≠°Ë??û‰?Ôºå‰??•È?ÈªûÂ?‰∏?/p>
        </div>
        <div className="flex gap-2">
          <button className="btn-primary flex items-center gap-1.5"><Plus className="w-4 h-4" />?∞Â??ãÊ?</button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Users className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <div className="text-sm text-gray-500">?çÂ??ãÊ???/div>
            <div className="text-2xl font-bold text-gray-800">{summary.total_cases}</div>
            <div className="text-xs text-green-600 mt-0.5">??ËºÉ‰???+{summary.new_cases_week} ‰∫?/div>
          </div>
        </div>
        <div className="stat-card">
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <UserCheck className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <div className="text-sm text-gray-500">?®ËÅ∑Â±ÖÊ???/div>
            <div className="text-2xl font-bold text-gray-800">{summary.active_caregivers}</div>
            <div className="text-xs text-green-600 mt-0.5">??ËºÉ‰???+2 ‰∫?/div>
          </div>
        </div>
        <div className="stat-card">
          <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Calendar className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <div className="text-sm text-gray-500">‰ªäÊó•?çÂ??≠Ê¨°</div>
            <div className="text-2xl font-bold text-gray-800">{summary.today_services}</div>
            <div className="text-xs text-green-600 mt-0.5">??ËºÉÊò®??+{summary.today_services - summary.yesterday_services} ??/div>
          </div>
        </div>
        <div className="stat-card">
          <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <div className="text-sm text-gray-500">ÂæÖËøΩËπ§‰???/div>
            <div className="text-2xl font-bold text-gray-800">{summary.pending_incidents}</div>
            <div className="text-xs text-red-500 mt-0.5">??ËºÉÊò®??+2 ‰ª?/div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Service Trend */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-700">‰ªäÊó•?çÂ?Ë∂®Âã¢</h2>
            <span className="text-xs bg-gray-100 px-2 py-1 rounded">Ëøë‰???/span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data.service_trend} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#0d9488" strokeWidth={2.5} dot={{ r: 4 }} name="?çÂ??≠Ê¨°" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Service Distribution */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-700">?çÂ?È°ûÂ??ÜÂ?</h2>
            <span className="text-xs bg-gray-100 px-2 py-1 rounded">?¨Ê?</span>
          </div>
          <div className="flex items-center gap-4">
            <ResponsiveContainer width="50%" height={180}>
              <PieChart>
                <Pie data={data.service_distribution} cx="50%" cy="50%" innerRadius={45} outerRadius={75}
                  dataKey="count" nameKey="name">
                  {data.service_distribution.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="text-sm">
                  <tspan x="50%" dy="-8" fontSize="11" fill="#6b7280">Á∏ΩË?</tspan>
                  <tspan x="50%" dy="18" fontSize="16" fontWeight="bold" fill="#1f2937">{totalDist}</tspan>
                  <tspan x="50%" dy="14" fontSize="10" fill="#6b7280">‰∫∫Ê¨°</tspan>
                </text>
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2">
              {data.service_distribution.map((item, i) => (
                <div key={item.code} className="flex items-center gap-2 text-xs">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="font-medium text-gray-500">{item.code}</span>
                  <span className="text-gray-600">{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Today Service List */}
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-700">‰ªäÊó•?çÂ??çÂñÆ</h2>
            <button className="text-xs text-teal-600 hover:underline flex items-center gap-1">?•Á??®ÈÉ® <ChevronRight className="w-3 h-3" /></button>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 text-xs border-b">
                <th className="text-left pb-2 font-medium">?ÇÈ?</th>
                <th className="text-left pb-2 font-medium">?ãÊ?</th>
                <th className="text-left pb-2 font-medium">?çÂ??ÖÁõÆ</th>
                <th className="text-left pb-2 font-medium">Â±ÖÊ???/th>
                <th className="text-left pb-2 font-medium">?Ä??/th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.today_service_list.map(record => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="py-2.5 text-gray-600">{record.time}</td>
                  <td className="py-2.5 font-medium">{record.case_name}</td>
                  <td className="py-2.5 text-gray-600">{record.service_code} {record.service_name}</td>
                  <td className="py-2.5 text-gray-600">{record.caregiver_name}</td>
                  <td className="py-2.5"><StatusBadge status={record.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Right Panel */}
        <div className="space-y-4">
          {/* Reminders */}
          <div className="card">
            <div className="flex items-center gap-2 mb-3">
              <Bell className="w-4 h-4 text-amber-500" />
              <h2 className="font-semibold text-gray-700 text-sm">?çË??êÈ?</h2>
            </div>
            <div className="space-y-2">
              {data.reminders.map((r, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-amber-500 mt-0.5">??/span>
                  <span className="text-gray-600">{r.message}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card">
            <div className="flex items-center gap-2 mb-3">
              <CheckSquare className="w-4 h-4 text-teal-500" />
              <h2 className="font-semibold text-gray-700 text-sm">Âø´ÈÄüÂ???/h2>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: '?∞Â??ãÊ?', color: 'bg-teal-50 text-teal-700 hover:bg-teal-100' },
                { label: '?∞Â?ÂÆ∂Ë®™', color: 'bg-green-50 text-green-700 hover:bg-green-100' },
                { label: '?∞Â??∞Â∏∏‰∫ã‰ª∂', color: 'bg-red-50 text-red-700 hover:bg-red-100' },
                { label: '?ÅË≥™?•Ê†∏', color: 'bg-purple-50 text-purple-700 hover:bg-purple-100' },
              ].map(({ label, color }) => (
                <button key={label} className={`${color} text-xs font-medium py-2 px-3 rounded-lg transition-colors text-center`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
