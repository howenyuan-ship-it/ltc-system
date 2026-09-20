import { Bell, Search, ChevronDown, LogOut } from 'lucide-react'
import { useState } from 'react'
import { useAuthStore } from '../../store/authStore'

export default function Header() {
  const { user, logout } = useAuthStore()
  const [showMenu, setShowMenu] = useState(false)

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center gap-4 px-6 fixed top-0 right-0 left-56 z-20">
      {/* Search */}
      <div className="flex-1 max-w-lg">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="搜尋個案、居服員、服務紀錄..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
      </div>

      <div className="flex items-center gap-3 ml-auto">
        {/* Notifications */}
        <button className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">3</span>
        </button>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="flex items-center gap-2 hover:bg-gray-50 rounded-lg px-2 py-1.5 transition-colors"
          >
            <div className="w-8 h-8 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center text-sm font-medium">
              {(user?.chinese_name || user?.username || '?')[0]}
            </div>
            <div className="text-left hidden sm:block">
              <div className="text-sm font-medium text-gray-700">{user?.chinese_name || user?.username}</div>
              <div className="text-xs text-gray-400">{user?.role_display}</div>
            </div>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </button>

          {showMenu && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-100 rounded-xl shadow-lg py-1 z-50">
              <button
                onClick={logout}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                <LogOut className="w-4 h-4" />
                登出
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
