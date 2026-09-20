import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import AppLayout from './components/Layout/AppLayout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import CaseList from './pages/Cases/CaseList'
import IncidentList from './pages/Incidents/IncidentList'
import Placeholder from './pages/Placeholder'
import { useAuthStore } from './store/authStore'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

export default function App() {
  const { isAuthenticated, fetchMe } = useAuthStore()

  useEffect(() => {
    if (isAuthenticated) fetchMe()
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<RequireAuth><AppLayout /></RequireAuth>}>
          <Route index element={<Dashboard />} />
          <Route path="cases" element={<CaseList />} />
          <Route path="staff" element={<Placeholder title="人員管理" />} />
          <Route path="assessments" element={<Placeholder title="個案評估" />} />
          <Route path="care-plans" element={<Placeholder title="照顧計畫" />} />
          <Route path="incidents" element={<IncidentList />} />
          <Route path="feedback" element={<Placeholder title="意見反映及申訴" />} />
          <Route path="quality" element={<Placeholder title="品質管理" />} />
          <Route path="audit" element={<Placeholder title="查核管理" />} />
          <Route path="performance" element={<Placeholder title="考核管理" />} />
          <Route path="training" element={<Placeholder title="教育訓練" />} />
          <Route path="statistics" element={<Placeholder title="統計分析" />} />
          <Route path="notifications" element={<Placeholder title="通知中心" />} />
          <Route path="system" element={<Placeholder title="系統管理" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
