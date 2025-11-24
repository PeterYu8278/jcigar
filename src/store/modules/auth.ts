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
  isDeveloper: boolean
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
  isDeveloper: false,
  initialized: false,

  setUser: (user) => set({ user }),
  
  setFirebaseUser: (firebaseUser) => set({ firebaseUser }),
  
  setLoading: (loading) => set({ loading }),
  
  setError: (error) => set({ error }),

  initializeAuth: () => {
    console.log('[Auth Store] 🔄 initializeAuth 开始')
    const { initialized } = get()
    
    // 如果已经初始化，直接返回
    if (initialized) {
      console.log('[Auth Store] ⚠️ 已经初始化，跳过')
      return
    }
    
    const { setLoading, setUser, setFirebaseUser } = get()
    
    // 如果已有订阅，先取消
    if (authUnsubscribe) {
      console.log('[Auth Store] 🔄 取消旧的 auth 订阅')
      authUnsubscribe()
    }
    
    console.log('[Auth Store] 📡 创建新的 auth 状态监听器')
    // 创建新订阅
    authUnsubscribe = onAuthStateChange(async (firebaseUser) => {
      console.log('[Auth Store] 🔔 onAuthStateChange 触发', { 
        hasUser: !!firebaseUser, 
        uid: firebaseUser?.uid 
      })
      setLoading(true)
      console.log('[Auth Store] ⏳ 设置 loading = true')
      
      // 取消之前的用户文档监听
      if (userDocUnsubscribe) {
        userDocUnsubscribe()
        userDocUnsubscribe = null
      }
      
      if (firebaseUser) {
        try {
          console.log('[Auth Store] 👤 用户已登录，开始获取用户数据')
          
          // ✅ 优先使用 sessionStorage 中的 firestoreUserId（Google 登录后设置）
          let firestoreUserId = sessionStorage.getItem('firestoreUserId');
          let userData = null;
          
          if (firestoreUserId) {
            // 场景 1: 有 sessionStorage 中的 ID（Google 登录）
            console.log('[Auth Store] 🔍 使用 sessionStorage 中的 firestoreUserId:', firestoreUserId)
            userData = await getUserData(firestoreUserId);
            console.log('[Auth Store] ✅ getUserData 完成', { hasUserData: !!userData })
          } else {
            // 场景 2: 没有 sessionStorage（邮箱登录），通过邮箱查找用户文档
            console.log('[Auth Store] 🔍 通过邮箱查找用户文档')
            const { findUserByEmail } = await import('../../services/firebase/auth')
            const normalizedEmail = firebaseUser.email?.toLowerCase().trim();
            
            if (normalizedEmail) {
              const existingUser = await findUserByEmail(normalizedEmail);
              if (existingUser) {
                firestoreUserId = existingUser.id;
                userData = existingUser.data;
                // 保存到 sessionStorage，以便后续使用
                sessionStorage.setItem('firestoreUserId', firestoreUserId);
                console.log('[Auth Store] ✅ 通过邮箱找到用户文档:', { firestoreUserId, firebaseUid: firebaseUser.uid })
              } else {
                // 场景 3: 通过邮箱找不到，尝试使用 Firebase UID（兼容旧用户）
                console.log('[Auth Store] ⚠️ 通过邮箱未找到，尝试使用 Firebase UID')
                firestoreUserId = firebaseUser.uid;
                userData = await getUserData(firestoreUserId);
                if (userData) {
                  // 找到后也保存到 sessionStorage
                  sessionStorage.setItem('firestoreUserId', firestoreUserId);
                  console.log('[Auth Store] ✅ 通过 Firebase UID 找到用户文档')
                } else {
                  console.log('[Auth Store] ❌ 通过 Firebase UID 也未找到用户文档')
                }
              }
            } else {
              // 场景 4: 没有邮箱，使用 Firebase UID
              console.log('[Auth Store] ⚠️ 用户没有邮箱，使用 Firebase UID')
              firestoreUserId = firebaseUser.uid;
              userData = await getUserData(firestoreUserId);
            }
          }
          
          if (userData) {
            console.log('[Auth Store] ✅ 用户数据获取成功，设置用户状态', { 
              userId: userData.id, 
              role: userData.role,
              firestoreUserId,
              firebaseUid: firebaseUser.uid
            })
            setUser(userData)
            setFirebaseUser(firebaseUser)
            set({ 
              isAdmin: userData.role === 'admin' || userData.role === 'developer',
              isDeveloper: userData.role === 'developer'
            })
            
            // 自动初始化推送通知（静默执行，不阻塞登录流程）
            initializePushNotifications(userData).catch((error) => {
              // 静默处理错误，不影响登录流程
              console.warn('[Auth] Failed to initialize push notifications:', error)
            })
            
            // 开始实时监听用户文档变化（自动更新用户状态和会员状态）
            if (firestoreUserId) {
              const userDocRef = doc(db, 'users', firestoreUserId)
              userDocUnsubscribe = onSnapshot(userDocRef, (userDocSnap) => {
                if (userDocSnap.exists()) {
                  // 转换 Firestore 时间戳
                  const rawData = userDocSnap.data()
                  const data = convertFirestoreTimestamps(rawData)
                  const updatedUser = { id: firestoreUserId, ...data } as User
                  setUser(updatedUser)
                  set({ 
                    isAdmin: updatedUser.role === 'admin' || updatedUser.role === 'developer',
                    isDeveloper: updatedUser.role === 'developer'
                  })
                }
              }, (error) => {
                // 监听错误不影响主流程
                console.warn('[Auth] User document snapshot error:', error)
              })
            }
          }
        } catch (error) {
          console.error('[Auth Store] ❌ 获取用户数据失败:', error)
          set({ error: '获取用户数据失败' })
        }
      } else {
        console.log('[Auth Store] 👤 用户未登录，清除用户状态')
        setUser(null)
        setFirebaseUser(null)
        set({ isAdmin: false, isDeveloper: false })
        // 清除 sessionStorage 中的 firestoreUserId
        sessionStorage.removeItem('firestoreUserId')
      }
      
      console.log('[Auth Store] ✅ 设置 loading = false')
      setLoading(false)
    })
    
    // 标记为已初始化
    console.log('[Auth Store] ✅ 标记为已初始化')
    set({ initialized: true })
  },

  logout: () => {
    // 取消用户文档监听
    if (userDocUnsubscribe) {
      userDocUnsubscribe()
      userDocUnsubscribe = null
    }
    set({ user: null, firebaseUser: null, isAdmin: false, isDeveloper: false })
  },

  hasPermission: (permission: keyof Permission) => {
    const { user } = get()
    if (!user) return false
    return hasPermission(user.role, permission)
  },
}))
