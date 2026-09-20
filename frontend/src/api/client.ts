import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

export const apiClient = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT token to every request
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Auto-refresh on 401
apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      const refreshToken = localStorage.getItem('refresh_token')
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${API_BASE}/auth/refresh/`, { refresh: refreshToken })
          localStorage.setItem('access_token', data.access)
          original.headers.Authorization = `Bearer ${data.access}`
          return apiClient(original)
        } catch {
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(error)
  }
)

// API helpers
export const auth = {
  login: (username: string, password: string) =>
    apiClient.post('/auth/login/', { username, password }),
  me: () => apiClient.get('/accounts/users/me/'),
}

export const casesApi = {
  list: (params?: object) => apiClient.get('/cases/', { params }),
  get: (id: number) => apiClient.get(`/cases/${id}/`),
  create: (data: object) => apiClient.post('/cases/', data),
  update: (id: number, data: object) => apiClient.patch(`/cases/${id}/`, data),
  statistics: () => apiClient.get('/cases/statistics/'),
}

export const servicesApi = {
  records: (params?: object) => apiClient.get('/services/records/', { params }),
  items: () => apiClient.get('/services/items/'),
}

export const reportsApi = {
  dashboard: () => apiClient.get('/reports/dashboard/'),
  services: (params?: object) => apiClient.get('/reports/services/', { params }),
}

export const incidentsApi = {
  list: (params?: object) => apiClient.get('/incidents/', { params }),
  create: (data: object) => apiClient.post('/incidents/', data),
  update: (id: number, data: object) => apiClient.patch(`/incidents/${id}/`, data),
}
