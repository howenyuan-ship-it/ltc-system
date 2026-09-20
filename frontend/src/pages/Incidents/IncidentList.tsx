import { useEffect, useState } from 'react'
import { AlertTriangle, Plus, Search } from 'lucide-react'
import { incidentsApi } from '../../api/client'

interface Incident {
  id: number
  case_name: string
  incident_type_display: string
  severity: string
  severity_display: string
  status: string
  status_display: string
  occurred_at: string
  description: string
  reported_by_name: string
}

const SEVERITY_STYLES: Record<string, string> = {
  low: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
}
const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-red-100 text-red-700',
  processing: 'bg-blue-100 text-blue-700',
  tracking: 'bg-yellow-100 text-yellow-700',
  resolved: 'bg-green-100 text-green-700',
}

export default function IncidentList() {
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    incidentsApi.list()
      .then(res => setIncidents(res.data.results || res.data))
      .catch(() => {
        setIncidents([
          { id: 1, case_name: '李奶奶', incident_type_display: '跌倒/意外事件', severity: 'high', severity_display: '嚴重', status: 'processing', status_display: '處理中', occurred_at: '2025-06-20T08:15:00', description: '在浴室跌倒', reported_by_name: '張美玲' },
          { id: 2, case_name: '王爺爺', incident_type_display: '身體狀況異常', severity: 'medium', severity_display: '中等', status: 'processing', status_display: '處理中', occurred_at: '2025-06-19T16:30:00', description: '血壓偏高、頭暈', reported_by_name: '陳小華' },
          { id: 3, case_name: '陳阿姨', incident_type_display: '環境安全問題', severity: 'low', severity_display: '輕微', status: 'pending', status_display: '待處理', occurred_at: '2025-06-19T11:20:00', description: '地板濕滑、浴室無防滑墊', reported_by_name: '吳大同' },
        ])
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">異常事件管理</h1>
          <p className="text-sm text-gray-500 mt-0.5">共 {incidents.length} 筆事件</p>
        </div>
        <button className="btn-primary flex items-center gap-1.5">
          <Plus className="w-4 h-4" />新增事件
        </button>
      </div>

      <div className="card">
        <div className="flex gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input placeholder="搜尋事件..." className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500" />
          </div>
          <select className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
            <option value="">全部類型</option>
            <option value="fall">跌倒/意外</option>
            <option value="health">身體狀況異常</option>
            <option value="environment">環境安全問題</option>
          </select>
          <select className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
            <option value="">全部狀態</option>
            <option value="pending">待處理</option>
            <option value="processing">處理中</option>
            <option value="resolved">已結案</option>
          </select>
        </div>

        <table className="w-full text-sm">
          <thead className="border-b border-gray-100">
            <tr className="text-gray-400 text-xs">
              {['事件類型', '個案', '發生時間', '嚴重程度', '狀態', '回報人員', '說明', '操作'].map(h => (
                <th key={h} className="text-left pb-2 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={8} className="text-center py-10 text-gray-400">載入中...</td></tr>
            ) : incidents.map(inc => (
              <tr key={inc.id} className="hover:bg-gray-50">
                <td className="py-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <span className="font-medium">{inc.incident_type_display}</span>
                  </div>
                </td>
                <td className="py-3 text-gray-600">{inc.case_name}</td>
                <td className="py-3 text-gray-600">{new Date(inc.occurred_at).toLocaleString('zh-TW')}</td>
                <td className="py-3">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${SEVERITY_STYLES[inc.severity]}`}>
                    {inc.severity_display}
                  </span>
                </td>
                <td className="py-3">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[inc.status]}`}>
                    {inc.status_display}
                  </span>
                </td>
                <td className="py-3 text-gray-600">{inc.reported_by_name}</td>
                <td className="py-3 text-gray-500 max-w-xs truncate">{inc.description}</td>
                <td className="py-3">
                  <button className="text-teal-600 hover:underline text-xs">詳情</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
