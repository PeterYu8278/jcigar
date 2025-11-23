// 认证状态管理
import { create } from 'zustand'
import { onAuthStateChange, getUserData, convertFirestoreTimestamps } from '../../services/firebase/auth'
import type { User, UserRole, Permission } from '../../types'
import { hasPermission } from '../../config/permissions'
import { initializePushNotifications } from '../../services/firebase/messaging'
import { doc, onSnapshot, Unsubscribe } from 'firebase/firestore'
import { db } from '../../config/firebase'

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
let userDocUnsubscribe: Unsubscribe | null = null

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
      
      // 取消之前的用户文档监听
      if (userDocUnsubscribe) {
        userDocUnsubscribe()
        userDocUnsubscribe = null
      }
      
      if (firebaseUser) {
        try {
          // ✅ 优先使用 sessionStorage 中的 firestoreUserId（Google 登录后设置）
          // 如果没有，则使用 firebaseUser.uid（普通邮箱登录）
          const firestoreUserId = sessionStorage.getItem('firestoreUserId') || firebaseUser.uid;
          
          const userData = await getUserData(firestoreUserId);
          
          if (userData) {
            setUser(userData)
            setFirebaseUser(firebaseUser)
            set({ isAdmin: userData.role === 'admin' })
            
            // 自动初始化推送通知（静默执行，不阻塞登录流程）
            initializePushNotifications(userData).catch((error) => {
              // 静默处理错误，不影响登录流程
              console.warn('[Auth] Failed to initialize push notifications:', error)
            })
            
            // 开始实时监听用户文档变化（自动更新用户状态和会员状态）
            const userDocRef = doc(db, 'users', firestoreUserId)
            userDocUnsubscribe = onSnapshot(userDocRef, (userDocSnap) => {
              if (userDocSnap.exists()) {
                // 转换 Firestore 时间戳
                const rawData = userDocSnap.data()
                const data = convertFirestoreTimestamps(rawData)
                const updatedUser = { id: firestoreUserId, ...data } as User
                setUser(updatedUser)
                set({ isAdmin: updatedUser.role === 'admin' })
              }
            }, (error) => {
              // 监听错误不影响主流程
              console.warn('[Auth] User document snapshot error:', error)
            })
          } else {
            // 如果使用 sessionStorage 的 ID 查不到，尝试使用 Firebase UID
            if (firestoreUserId !== firebaseUser.uid) {
              const fallbackData = await getUserData(firebaseUser.uid);
              if (fallbackData) {
                setUser(fallbackData)
                setFirebaseUser(firebaseUser)
                set({ isAdmin: fallbackData.role === 'admin' })
                
                // 自动初始化推送通知（静默执行，不阻塞登录流程）
                initializePushNotifications(fallbackData).catch((error) => {
                  // 静默处理错误，不影响登录流程
                  console.warn('[Auth] Failed to initialize push notifications:', error)
                })
                
                // 开始实时监听用户文档变化（自动更新用户状态和会员状态）
                const userDocRef = doc(db, 'users', firebaseUser.uid)
                userDocUnsubscribe = onSnapshot(userDocRef, (userDocSnap) => {
                  if (userDocSnap.exists()) {
                    // 转换 Firestore 时间戳
                    const rawData = userDocSnap.data()
                    const data = convertFirestoreTimestamps(rawData)
                    const updatedUser = { id: firebaseUser.uid, ...data } as User
                    setUser(updatedUser)
                    set({ isAdmin: updatedUser.role === 'admin' })
                  }
                }, (error) => {
                  // 监听错误不影响主流程
                  console.warn('[Auth] User document snapshot error:', error)
                })
              }
            }
          }
        } catch (error) {
          set({ error: '获取用户数据失败' })
        }
      } else {
        setUser(null)
        setFirebaseUser(null)
        set({ isAdmin: false })
        // 清除 sessionStorage 中的 firestoreUserId
        sessionStorage.removeItem('firestoreUserId')
      }
      
      setLoading(false)
    })
    
    // 标记为已初始化
    set({ initialized: true })
  },

  logout: () => {
    // 取消用户文档监听
    if (userDocUnsubscribe) {
      userDocUnsubscribe()
      userDocUnsubscribe = null
    }
    set({ user: null, firebaseUser: null, isAdmin: false })
  },

  hasPermission: (permission: keyof Permission) => {
    const { user } = get()
    if (!user) return false
    return hasPermission(user.role, permission)
  },
}))
