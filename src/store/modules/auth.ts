// 认证状态管理
import { create } from 'zustand'
import { onAuthStateChange, getUserData } from '../../services/firebase/auth'
import type { User, UserRole, Permission } from '../../types'
import { hasPermission } from '../../config/permissions'

interface AuthState {
  user: User | null
  firebaseUser: any | null
  loading: boolean
  error: string | null
  isAdmin: boolean
  
  // Actions
  setUser: (user: User | null) => void
  setFirebaseUser: (user: any | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  initializeAuth: () => void
  logout: () => void
  hasPermission: (permission: keyof Permission) => boolean
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  firebaseUser: null,
  loading: true,
  error: null,
  isAdmin: false,

  setUser: (user) => set({ user }),
  
  setFirebaseUser: (firebaseUser) => set({ firebaseUser }),
  
  setLoading: (loading) => set({ loading }),
  
  setError: (error) => set({ error }),

  initializeAuth: () => {
    const { setLoading, setUser, setFirebaseUser } = get()
    
    onAuthStateChange(async (firebaseUser) => {
      setLoading(true)
      
      if (firebaseUser) {
        try {
          const userData = await getUserData(firebaseUser.uid)
          if (userData) {
            setUser(userData)
            setFirebaseUser(firebaseUser)
            set({ isAdmin: userData.role === 'admin' })
          }
        } catch (error) {
          set({ error: '获取用户数据失败' })
        }
      } else {
        setUser(null)
        setFirebaseUser(null)
        set({ isAdmin: false })
      }
      
      setLoading(false)
    })
  },

  logout: () => {
    set({ user: null, firebaseUser: null, isAdmin: false })
  },

  hasPermission: (permission: keyof Permission) => {
    const { user } = get()
    if (!user) return false
    return hasPermission(user.role, permission)
  },
}))
