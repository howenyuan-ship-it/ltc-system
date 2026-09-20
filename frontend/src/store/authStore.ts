import { create } from 'zustand'
import { auth } from '../api/client'

interface User {
  id: number
  username: string
  chinese_name: string
  role: string
  role_display: string
  organization: { name: string }
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  fetchMe: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: !!localStorage.getItem('access_token'),
  isLoading: false,

  login: async (username, password) => {
    set({ isLoading: true })
    const { data } = await auth.login(username, password)
    localStorage.setItem('access_token', data.access)
    localStorage.setItem('refresh_token', data.refresh)
    const meRes = await auth.me()
    set({ user: meRes.data, isAuthenticated: true, isLoading: false })
  },

  logout: () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    set({ user: null, isAuthenticated: false })
  },

  fetchMe: async () => {
    try {
      const { data } = await auth.me()
      set({ user: data, isAuthenticated: true })
    } catch {
      set({ user: null, isAuthenticated: false })
    }
  },
}))
