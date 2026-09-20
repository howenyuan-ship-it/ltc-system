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
    completed: '已完成', in_progress: '進行中', pending: '待服務', cancelled: '已取消',
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
            { id: 1, time: '09:00', case_name: '王○○', service_code: 'BA07', service_name: '協助沐浴', caregiver_name: '陳小美', status: 'completed', status_display: '已完成' },
            { id: 2, time: '10:30', case_name: '李○○', service_code: 'BA15-1', service_name: '陪同就醫', caregiver_name: '黃雅婷', status: 'in_progress', status_display: '進行中' },
            { id: 3, time: '14:00', case_name: '陳○○', service_code: 'BA13', service_name: '協助餐食', caregiver_name: '林秀芬', status: 'pending', status_display: '待服務' },
            { id: 4, time: '16:00', case_name: '張○○', service_code: 'BA05', service_name: '基本日常照顧', caregiver_name: '劉家宜', status: 'pending', status_display: '待服務' },
            { id: 5, time: '17:30', case_name: '林○○', service_code: 'BA01', service_name: '基本身體清潔', caregiver_name: '吳佳玲', status: 'pending', status_display: '待服務' },
          ],
          service_trend: [
            { date: '10/20', count: 68 }, { date: '10/21', count: 72 }, { date: '10/22', count: 85 },
            { date: '10/23', count: 91 }, { date: '10/24', count: 86 }, { date: '10/25', count: 78 }, { date: '10/26', count: 62 },
          ],
          service_distribution: [
            { code: 'BA01', name: '基本身體清潔', count: 108 },
            { code: 'BA05', name: '基本日常照顧', count: 93 },
            { code: 'BA07', name: '協助沐浴', count: 62 },
            { code: 'BA13', name: '協助餐食', count: 69 },
            { code: 'BA15-1', name: '陪同就醫', count: 54 },
          ],
          reminders: [
            { type: 'evaluation', count: 3, message: '3 位個案需三個月評估' },
            { type: 'incident', count: 2, message: '2 件異常事件待追蹤' },
            { type: 'survey', count: 5, message: '5 份滿意度調查尚未完成' },
          ],
        })
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">載入中...</div>
  if (!data) return null

  const { summary } = data
  const totalDist = data.service_distribution.reduce((s, d) => s + d.count, 0)

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">首頁儀表板</h1>
          <p className="text-sm text-gray-500 mt-0.5">歡迎回來，今日重點如下</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-primary flex items-center gap-1.5"><Plus className="w-4 h-4" />新增個案</button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Users className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <div className="text-sm text-gray-500">服務個案數</div>
            <div className="text-2xl font-bold text-gray-800">{summary.total_cases}</div>
            <div className="text-xs text-green-600 mt-0.5">▲ 較上週 +{summary.new_cases_week} 人</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <UserCheck className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <div className="text-sm text-gray-500">在職居服員</div>
            <div className="text-2xl font-bold text-gray-800">{summary.active_caregivers}</div>
            <div className="text-xs text-green-600 mt-0.5">▲ 較上週 +2 人</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Calendar className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <div className="text-sm text-gray-500">今日服務班次</div>
            <div className="text-2xl font-bold text-gray-800">{summary.today_services}</div>
            <div className="text-xs text-green-600 mt-0.5">▲ 較昨日 +{summary.today_services - summary.yesterday_services} 班</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <div className="text-sm text-gray-500">待追蹤事項</div>
            <div className="text-2xl font-bold text-gray-800">{summary.pending_incidents}</div>
            <div className="text-xs text-red-500 mt-0.5">▲ 較昨日 +2 件</div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Service Trend */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-700">今日服務趨勢</h2>
            <span className="text-xs bg-gray-100 px-2 py-1 rounded">近一週</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data.service_trend} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#0d9488" strokeWidth={2.5} dot={{ r: 4 }} name="服務班次" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Service Distribution */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-700">服務類型分布</h2>
            <span className="text-xs bg-gray-100 px-2 py-1 rounded">本月</span>
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
                  <tspan x="50%" dy="-8" fontSize="11" fill="#6b7280">總計</tspan>
                  <tspan x="50%" dy="18" fontSize="16" fontWeight="bold" fill="#1f2937">{totalDist}</tspan>
                  <tspan x="50%" dy="14" fontSize="10" fill="#6b7280">人次</tspan>
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
            <h2 className="font-semibold text-gray-700">今日服務名單</h2>
            <button className="text-xs text-teal-600 hover:underline flex items-center gap-1">查看全部 <ChevronRight className="w-3 h-3" /></button>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 text-xs border-b">
                <th className="text-left pb-2 font-medium">時間</th>
                <th className="text-left pb-2 font-medium">個案</th>
                <th className="text-left pb-2 font-medium">服務項目</th>
                <th className="text-left pb-2 font-medium">居服員</th>
                <th className="text-left pb-2 font-medium">狀態</th>
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
              <h2 className="font-semibold text-gray-700 text-sm">重要提醒</h2>
            </div>
            <div className="space-y-2">
              {data.reminders.map((r, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-amber-500 mt-0.5">•</span>
                  <span className="text-gray-600">{r.message}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card">
            <div className="flex items-center gap-2 mb-3">
              <CheckSquare className="w-4 h-4 text-teal-500" />
              <h2 className="font-semibold text-gray-700 text-sm">快速功能</h2>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: '新增個案', color: 'bg-teal-50 text-teal-700 hover:bg-teal-100' },
                { label: '新增家訪', color: 'bg-green-50 text-green-700 hover:bg-green-100' },
                { label: '新增異常事件', color: 'bg-red-50 text-red-700 hover:bg-red-100' },
                { label: '品質查核', color: 'bg-purple-50 text-purple-700 hover:bg-purple-100' },
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
