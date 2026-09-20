import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'

export default function AppLayout() {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 ml-56">
        <Header />
        <main className="pt-14 p-6 min-h-screen">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
