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
  initialized: boolean
  
  // Actions
  setUser: (user: User | null) => void
  setFirebaseUser: (user: any | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  initializeAuth: () => void
  logout: () => void
  hasPermission: (permission: keyof Permission) => boolean
}

// 全局变量：防止重复初始化
let authUnsubscribe: (() => void) | null = null

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  firebaseUser: null,
  loading: true,
  error: null,
  isAdmin: false,
  initialized: false,

  setUser: (user) => set({ user }),
  
  setFirebaseUser: (firebaseUser) => set({ firebaseUser }),
  
  setLoading: (loading) => set({ loading }),
  
  setError: (error) => set({ error }),

  initializeAuth: () => {
    const { initialized } = get()
    
    // 如果已经初始化，直接返回
    if (initialized) {
      return
    }
    
    const { setLoading, setUser, setFirebaseUser } = get()
    
    // 如果已有订阅，先取消
    if (authUnsubscribe) {
      authUnsubscribe()
    }
    
    // 创建新订阅
    authUnsubscribe = onAuthStateChange(async (firebaseUser) => {
      setLoading(true)
      
      if (firebaseUser) {
        try {
          const userData = await getUserData(firebaseUser.uid)
          if (userData) {
            console.log('[AuthStore] 用户数据已加载:', {
              id: userData.id,
              email: userData.email,
              displayName: userData.displayName,
              phone: userData.profile?.phone,
              role: userData.role
            })
            setUser(userData)
            setFirebaseUser(firebaseUser)
            set({ isAdmin: userData.role === 'admin' })
          } else {
            console.log('[AuthStore] 用户数据不存在')
          }
        } catch (error) {
          console.error('[AuthStore] 获取用户数据失败:', error)
          set({ error: '获取用户数据失败' })
        }
      } else {
        console.log('[AuthStore] 用户已登出')
        setUser(null)
        setFirebaseUser(null)
        set({ isAdmin: false })
      }
      
      setLoading(false)
    })
    
    // 标记为已初始化
    set({ initialized: true })
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
