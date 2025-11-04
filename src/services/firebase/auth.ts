// Firebase认证服务
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult
} from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';
import { doc, setDoc, getDoc, collection, getDocs, query, where, limit } from 'firebase/firestore';
import { auth, db } from '../../config/firebase';
import type { User } from '../../types';
import { normalizePhoneNumber, identifyInputType } from '../../utils/phoneNormalization';

// 用户注册
export const registerUser = async (email: string, password: string, displayName: string, phone?: string) => {
  try {
    // 标准化手机号为 E.164 格式
    let normalizedPhone: string | undefined = undefined
    if (phone) {
      const normalized = normalizePhoneNumber(phone)
      if (!normalized) {
        return { success: false, error: new Error('手机号格式无效'), code: 'invalid-phone' } as { success: false; error: Error; code?: string }
      }
      
      // 检查手机号是否已被使用
      const phoneQuery = query(collection(db, 'users'), where('profile.phone', '==', normalized), limit(1))
      const phoneSnap = await getDocs(phoneQuery)
      if (!phoneSnap.empty) {
        return { success: false, error: new Error('该手机号已被注册'), code: 'phone-already-in-use' } as { success: false; error: Error; code?: string }
      }
      
      normalizedPhone = normalized
    }
    
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // 更新用户显示名称
    await updateProfile(user, { displayName });
    
    // 在Firestore中创建用户文档
    const userData: Omit<User, 'id'> = {
      email: user.email!,
      displayName,
      role: 'member',
      profile: {
        phone: normalizedPhone,  // ✅ 使用标准化格式
        preferences: {
          language: 'zh',
          notifications: true,
        },
      },
      membership: {
        level: 'bronze',
        joinDate: new Date(),
        lastActive: new Date(),
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    await setDoc(doc(db, 'users', user.uid), userData);
    
    return { success: true, user };
  } catch (error) {
    const err = error as any
    const code = err?.code as string | undefined
    const message =
      code === 'auth/email-already-in-use' ? '该邮箱已被注册'
      : code === 'auth/invalid-email' ? '邮箱格式不正确'
      : code === 'auth/weak-password' ? '密码强度不足（至少6位）'
      : err?.message || '注册失败'
    return { success: false, error: new Error(message), code } as { success: false; error: Error; code?: string };
  }
};

// 用户登录
export const loginUser = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { success: true, user: userCredential.user };
  } catch (error) {
    const err = error as any
    const code = err?.code as string | undefined
    const message =
      code === 'auth/user-not-found' ? '账户不存在'
      : code === 'auth/wrong-password' ? '密码错误'
      : code === 'auth/too-many-requests' ? '尝试次数过多，请稍后再试'
      : code === 'auth/invalid-email' ? '邮箱格式不正确'
      : err?.message || '登录失败'
    return { success: false, error: new Error(message), code } as { success: false; error: Error; code?: string };
  }
};

// 允许使用邮箱或手机号 + 密码登录
export const loginWithEmailOrPhone = async (identifier: string, password: string) => {
  try {
    const type = identifyInputType(identifier)
    
    // 未知格式
    if (type === 'unknown') {
      return { success: false, error: new Error('请输入有效的邮箱或手机号') } as { success: false; error: Error }
    }
    
    // 邮箱登录
    if (type === 'email') {
      return await loginUser(identifier.trim(), password)
    }
    
    // 手机号登录
    const normalizedPhone = normalizePhoneNumber(identifier)
    
    if (!normalizedPhone) {
      return { success: false, error: new Error('手机号格式无效') } as { success: false; error: Error }
      }
    
    // 查找 Firestore 中绑定该手机号的用户（使用标准化格式）
    const usersRef = collection(db, 'users')
    const q = query(usersRef, where('profile.phone', '==', normalizedPhone), limit(1))
    const snap = await getDocs(q)
    
      if (snap.empty) {
      return { success: false, error: new Error('未找到绑定该手机号的账户') } as { success: false; error: Error }
      }
    
    const userDoc = snap.docs[0]
    const email = (userDoc.data() as any)?.email
    
      if (!email) {
      return { success: false, error: new Error('该手机号未绑定邮箱账户') } as { success: false; error: Error }
    }
    
    return await loginUser(email, password)
  } catch (error) {
    const err = error as any
    return { success: false, error: err as Error } as { success: false; error: Error }
  }
};

// 使用 Google 登录（新用户需要完善信息）
export const loginWithGoogle = async () => {
  console.log('🟢 [auth.ts] loginWithGoogle 开始执行');
  try {
    const provider = new GoogleAuthProvider();
    console.log('🟢 [auth.ts] GoogleAuthProvider 创建成功');
    
    // 添加额外的OAuth参数
    provider.addScope('email');
    provider.addScope('profile');
    console.log('🟢 [auth.ts] OAuth scopes 已添加');
    
    // 检测是否为移动设备（增强检测）
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                     /Mobile|mobile|Tablet|tablet/i.test(navigator.userAgent) ||
                     ('ontouchstart' in window) ||
                     (navigator.maxTouchPoints > 0);
    
    // 检测是否为开发环境
    const isDev = window.location.hostname === 'localhost' || 
                  window.location.hostname === '127.0.0.1' ||
                  window.location.hostname.includes('192.168.');
    
    console.log('📱 [auth.ts] 设备检测:', isMobile ? '移动设备' : '桌面设备');
    console.log('📱 [auth.ts] UserAgent:', navigator.userAgent);
    console.log('📱 [auth.ts] Touch支持:', 'ontouchstart' in window);
    console.log('📱 [auth.ts] 触摸点数:', navigator.maxTouchPoints);
    console.log('🔧 [auth.ts] 环境检测:', isDev ? '开发环境' : '生产环境');
    
    let credential;
    
    if (isMobile) {
      // 移动端（开发 + 生产环境）：始终使用 redirect
      console.log('📱 [auth.ts] 移动设备，使用重定向方式');
      if (isDev) {
        console.log('⚠️ [auth.ts] 开发环境的 redirect 可能遇到 init.json 404，这是正常的');
      }
      await signInWithRedirect(auth, provider);
      console.log('🔄 [auth.ts] signInWithRedirect 调用成功');
      return { success: true, isRedirecting: true } as any;
    } else {
      // 桌面端：使用 popup
      console.log('🖥️ [auth.ts] 桌面设备，使用弹窗方式登录');
      try {
        console.log('🪟 [auth.ts] 调用 signInWithPopup...');
        credential = await signInWithPopup(auth, provider);
        console.log('✅ [auth.ts] signInWithPopup 成功, credential:', credential);
      } catch (popupError: any) {
        console.error('❌ [auth.ts] signInWithPopup 失败:', popupError);
        console.error('❌ [auth.ts] 错误代码:', popupError.code);
        console.error('❌ [auth.ts] 错误信息:', popupError.message);
        
        // 任何 popup 失败都降级到 redirect（扩大捕获范围）
        console.log('🔄 [auth.ts] Popup 失败，自动降级到重定向方式');
        await signInWithRedirect(auth, provider);
        return { success: true, isRedirecting: true } as any;
      }
    }
    
    const user = credential.user;
    console.log('👤 [auth.ts] 获取到用户信息:', { uid: user.uid, email: user.email, displayName: user.displayName });

    // 检查 Firestore 中是否已存在用户文档
    const ref = doc(db, 'users', user.uid);
    console.log('🔍 [auth.ts] 检查 Firestore 用户文档, uid:', user.uid);
    const snap = await getDoc(ref);
    
    if (!snap.exists()) {
      console.log('📝 [auth.ts] 用户文档不存在，创建新用户');
      // 新用户：创建临时用户文档（仅包含邮箱和基础信息）
      const tempUserData: Omit<User, 'id'> = {
        email: user.email || '',
        displayName: user.displayName || '未命名用户',
        role: 'member',
        profile: {
          // phone 字段省略，待用户完善信息后添加
          preferences: { language: 'zh', notifications: true },
        },
        membership: {
          level: 'bronze',
          joinDate: new Date(),
          lastActive: new Date(),
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await setDoc(ref, tempUserData);
      console.log('✅ [auth.ts] 新用户文档创建成功');
      
      // 返回特殊标识：需要完善信息
      return { success: true, user, needsProfile: true };
    }

    // 已存在用户：检查是否已完善信息
    console.log('✅ [auth.ts] 用户文档已存在，检查信息完整性');
    const userData = snap.data() as User;
    const needsProfile = !userData.profile?.phone; // 如果没有手机号，需要完善信息
    console.log('📋 [auth.ts] 用户信息:', { 
      email: userData.email, 
      phone: userData.profile?.phone,
      needsProfile 
    });

    return { success: true, user, needsProfile };
  } catch (error) {
    console.error('💥 [auth.ts] loginWithGoogle 捕获异常:', error);
    const err = error as any
    console.error('💥 [auth.ts] 错误详情:', {
      code: err?.code,
      message: err?.message,
      stack: err?.stack
    });
    return { success: false, error: err as Error } as { success: false; error: Error };
  }
};

// 处理 Google 重定向登录结果
export const handleGoogleRedirectResult = async () => {
  console.log('🔄 [auth.ts] handleGoogleRedirectResult 开始执行');
  try {
    console.log('🔄 [auth.ts] 调用 getRedirectResult...');
    const result = await getRedirectResult(auth);
    console.log('🔄 [auth.ts] getRedirectResult 返回:', result);
    
    if (!result) {
      console.log('⚪ [auth.ts] 无重定向结果');
      return { success: false, noResult: true } as any;
    }
    
    const user = result.user;
    console.log('👤 [auth.ts] 重定向获取到用户:', { uid: user.uid, email: user.email, displayName: user.displayName });

    // 检查 Firestore 中是否已存在用户文档
    const ref = doc(db, 'users', user.uid);
    console.log('🔍 [auth.ts] 检查 Firestore 用户文档, uid:', user.uid);
    const snap = await getDoc(ref);
    
    if (!snap.exists()) {
      console.log('📝 [auth.ts] 重定向：用户文档不存在，创建新用户');
      // 新用户：创建临时用户文档
      const tempUserData: Omit<User, 'id'> = {
        email: user.email || '',
        displayName: user.displayName || '未命名用户',
        role: 'member',
        profile: {
          // phone 字段省略，待用户完善信息后添加
          preferences: { language: 'zh', notifications: true },
        },
        membership: {
          level: 'bronze',
          joinDate: new Date(),
          lastActive: new Date(),
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await setDoc(ref, tempUserData);
      console.log('✅ [auth.ts] 重定向：新用户文档创建成功');
      
      const returnValue = { success: true, user, needsProfile: true };
      console.log('🔵 [auth.ts] 重定向（新用户）：返回值:', returnValue);
      return returnValue;
    }

    // 已存在用户：检查是否已完善信息
    console.log('✅ [auth.ts] 重定向：用户文档已存在');
    const userData = snap.data() as User;
    const needsProfile = !userData.profile?.phone;
    console.log('📋 [auth.ts] 重定向：用户信息:', { 
      email: userData.email, 
      phone: userData.profile?.phone,
      needsProfile 
    });
    
    const returnValue = { success: true, user, needsProfile };
    console.log('🔵 [auth.ts] 重定向：返回值:', returnValue);
    return returnValue;
  } catch (error) {
    console.error('💥 [auth.ts] handleGoogleRedirectResult 捕获异常:', error);
    const err = error as any;
    console.error('💥 [auth.ts] 错误详情:', {
      code: err?.code,
      message: err?.message,
      stack: err?.stack
    });
    return { success: false, error: err as Error } as { success: false; error: Error };
  }
};

// 完善 Google 登录用户的信息
export const completeGoogleUserProfile = async (
  uid: string,
  displayName: string,
  phone: string,
  password: string
) => {
  try {
    // 1. 更新 Firestore 用户文档
    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, {
      displayName,
      profile: {
        phone,
        preferences: { language: 'zh', notifications: true },
      },
      updatedAt: new Date(),
    }, { merge: true });

    // 2. 为用户设置密码（通过 Firebase Auth）
    const currentUser = auth.currentUser;
    if (currentUser && currentUser.uid === uid) {
      const { updatePassword, EmailAuthProvider, linkWithCredential } = await import('firebase/auth');
      
      // 如果用户还没有邮箱/密码凭证，需要先链接
      const email = currentUser.email;
      if (email) {
        try {
          // 创建邮箱/密码凭证并链接到当前用户
          const credential = EmailAuthProvider.credential(email, password);
          await linkWithCredential(currentUser, credential);
        } catch (linkError: any) {
          // 如果已经链接过，尝试直接更新密码
          if (linkError.code === 'auth/provider-already-linked') {
            await updatePassword(currentUser, password);
          } else {
            throw linkError;
          }
        }
      }
      
      // 3. 更新 Firebase Auth 的 displayName
      await updateProfile(currentUser, { displayName });
    }

    return { success: true };
  } catch (error) {
    const err = error as any;
    const message = 
      err?.code === 'auth/weak-password' ? '密码强度不足（至少6位）'
      : err?.code === 'auth/requires-recent-login' ? '请重新登录后再试'
      : err?.message || '信息保存失败';
    return { success: false, error: new Error(message) } as { success: false; error: Error };
  }
};

// 用户登出
export const logoutUser = async () => {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    return { success: false, error: error as Error };
  }
};

// 获取当前用户信息
export const getCurrentUser = (): FirebaseUser | null => {
  return auth.currentUser;
};

// 监听认证状态变化
export const onAuthStateChange = (callback: (user: FirebaseUser | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

// 获取用户完整信息
export const getUserData = async (uid: string): Promise<User | null> => {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      return { id: uid, ...userDoc.data() } as User;
    }
    return null;
  } catch (error) {
    return null;
  }
};

// 管理员触发密码重置邮件
export const sendPasswordResetEmailFor = async (email: string) => {
  try {
    const { sendPasswordResetEmail } = await import('firebase/auth')
    await sendPasswordResetEmail(auth, email)
    return { success: true }
  } catch (error) {
    return { success: false, error: error as Error }
  }
}
