import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Users, UserCheck, ClipboardList, BookOpen,
  AlertTriangle, MessageSquare, ShieldCheck, BarChart3, Bell,
  Settings, Heart, Activity, FileText, GraduationCap, MapPinned
} from 'lucide-react'

const navItems = [
  { label: '首頁儀表板', icon: LayoutDashboard, path: '/' },
  { label: '個案管理', icon: Users, path: '/cases' },
  { label: '地理位置管理', icon: MapPinned, path: '/geo' },
  { label: '人員管理', icon: UserCheck, path: '/staff' },
  { label: '個案評估', icon: ClipboardList, path: '/assessments' },
  { label: '照顧計畫', icon: BookOpen, path: '/care-plans' },
  { label: '異常事件管理', icon: AlertTriangle, path: '/incidents' },
  { label: '意見反映及申訴', icon: MessageSquare, path: '/feedback' },
  { label: '品質管理', icon: ShieldCheck, path: '/quality' },
  { label: '查核管理', icon: FileText, path: '/audit' },
  { label: '考核管理', icon: Activity, path: '/performance' },
  { label: '教育訓練', icon: GraduationCap, path: '/training' },
  { label: '統計分析', icon: BarChart3, path: '/statistics' },
  { label: '通知中心', icon: Bell, path: '/notifications' },
  { label: '系統管理', icon: Settings, path: '/system' },
]

export default function Sidebar() {
  return (
    <aside className="w-56 bg-[#1a3a4a] text-white flex flex-col min-h-screen fixed left-0 top-0 z-30">
      {/* Logo */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-teal-400 rounded-xl flex items-center justify-center">
            <Heart className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="font-bold text-sm leading-tight">新東安居家</div>
            <div className="text-xs text-white/60">長照管理系統</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 overflow-y-auto">
        {navItems.map(({ label, icon: Icon, path }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                isActive
                  ? 'bg-teal-600 text-white'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`
            }
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-white/10 text-xs text-white/40 text-center">
        用專業守護每一個家 ♡
      </div>
    </aside>
  )
}
