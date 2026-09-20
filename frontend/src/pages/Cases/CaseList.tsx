import { useEffect, useState } from 'react'
import { Search, Plus, Filter, Download, ChevronLeft, ChevronRight } from 'lucide-react'
import { casesApi } from '../../api/client'

interface Case {
  id: number
  case_no: string
  welfare_no: string
  name: string
  gender: string
  age: number
  cms_level: string
  cms_level_display: string
  status: string
  status_display: string
  city: string
  district: string
  supervisor_name: string
  primary_caregiver_name: string
  service_start_date: string
}

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  suspended: 'bg-yellow-100 text-yellow-700',
  closed: 'bg-gray-100 text-gray-600',
  pending: 'bg-blue-100 text-blue-700',
}

export default function CaseList() {
  const [cases, setCases] = useState<Case[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  const pageSize = 20

  useEffect(() => {
    setLoading(true)
    const params: Record<string, string | number> = { page }
    if (search) params.search = search
    if (statusFilter) params.status = statusFilter

    casesApi.list(params)
      .then(res => {
        setCases(res.data.results || res.data)
        setTotal(res.data.count || res.data.length)
      })
      .catch(() => {
        // Mock fallback
        const mockCases: Case[] = [
          { id: 1, case_no: '東區020', welfare_no: '111U14434', name: '王張月娥', gender: 'F', age: 89, cms_level: '5', cms_level_display: 'CMS 5級', status: 'active', status_display: '服務中', city: '台南市', district: '東區', supervisor_name: '王督導', primary_caregiver_name: '陳小美', service_start_date: '2024-01-15' },
          { id: 2, case_no: '永康區018', welfare_no: '115U16015', name: '歐張春蘭', gender: 'F', age: 82, cms_level: '4', cms_level_display: 'CMS 4級', status: 'active', status_display: '服務中', city: '台南市', district: '永康區', supervisor_name: '王督導', primary_caregiver_name: '黃雅婷', service_start_date: '2024-02-20' },
          { id: 3, case_no: '東區019', welfare_no: '115U15878', name: '黃淑美', gender: 'F', age: 76, cms_level: '3', cms_level_display: 'CMS 3級', status: 'active', status_display: '服務中', city: '台南市', district: '東區', supervisor_name: '王督導', primary_caregiver_name: '林秀芬', service_start_date: '2024-03-10' },
          { id: 4, case_no: '東區018', welfare_no: '115U14285', name: '吳文原', gender: 'M', age: 84, cms_level: '5', cms_level_display: 'CMS 5級', status: 'active', status_display: '服務中', city: '台南市', district: '東區', supervisor_name: '王督導', primary_caregiver_name: '劉家宜', service_start_date: '2024-01-05' },
          { id: 5, case_no: '永康區017', welfare_no: '115U13884', name: '張黔生', gender: 'M', age: 86, cms_level: '6', cms_level_display: 'CMS 6級', status: 'active', status_display: '服務中', city: '台南市', district: '永康區', supervisor_name: '王督導', primary_caregiver_name: '吳佳玲', service_start_date: '2024-02-01' },
        ]
        setCases(mockCases)
        setTotal(29)
      })
      .finally(() => setLoading(false))
  }, [search, statusFilter, page])

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">個案管理</h1>
          <p className="text-sm text-gray-500 mt-0.5">查詢結果：{total} 筆</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary flex items-center gap-1.5"><Download className="w-4 h-4" />匯出</button>
          <button className="btn-primary flex items-center gap-1.5"><Plus className="w-4 h-4" />新增個案</button>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="搜尋案號、姓名、身分證..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="">全部狀態</option>
            <option value="active">服務中</option>
            <option value="suspended">暫停服務</option>
            <option value="pending">待開案</option>
            <option value="closed">結案</option>
          </select>
          <select className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
            <option value="">全部CMS等級</option>
            {[1,2,3,4,5,6,7,8].map(i => <option key={i} value={i}>CMS {i}級</option>)}
          </select>
          <button className="btn-secondary flex items-center gap-1.5"><Filter className="w-4 h-4" />更多篩選</button>
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-gray-500">#</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">案號</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">衛福案號</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">姓名</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">性別</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">年齡</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">CMS等級</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">狀態</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">居住區域</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">主責居服員</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">服務開始日</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={12} className="text-center py-12 text-gray-400">載入中...</td></tr>
              ) : cases.map((c, i) => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4 text-gray-400">{(page - 1) * pageSize + i + 1}</td>
                  <td className="py-3 px-4 font-medium text-teal-700">{c.case_no}</td>
                  <td className="py-3 px-4 text-gray-600">{c.welfare_no}</td>
                  <td className="py-3 px-4 font-medium">{c.name}</td>
                  <td className="py-3 px-4 text-gray-600">{c.gender === 'F' ? '女' : '男'}</td>
                  <td className="py-3 px-4 text-gray-600">{c.age}</td>
                  <td className="py-3 px-4">
                    <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded text-xs">{c.cms_level_display}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[c.status] || ''}`}>
                      {c.status_display}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-600">{c.city}{c.district}</td>
                  <td className="py-3 px-4 text-gray-600">{c.primary_caregiver_name}</td>
                  <td className="py-3 px-4 text-gray-600">{c.service_start_date}</td>
                  <td className="py-3 px-4">
                    <button className="text-teal-600 hover:text-teal-800 text-xs font-medium">班表</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <span className="text-sm text-gray-500">共 {total} 筆，第 {page}/{totalPages} 頁</span>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
