// Firebase认证服务
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup
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

// 使用 Google 登录（首次登录自动创建用户文档）
export const loginWithGoogle = async () => {
  try {
    const provider = new GoogleAuthProvider();
    
    // 添加额外的OAuth参数
    provider.addScope('email');
    provider.addScope('profile');
    
    const credential = await signInWithPopup(auth, provider);
    const user = credential.user;

    // 确保 Firestore 中存在用户文档
    const ref = doc(db, 'users', user.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      const userData: Omit<User, 'id'> = {
        email: user.email || '',
        displayName: user.displayName || '未命名用户',
        role: 'member',
        profile: {
          phone: undefined,
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
      await setDoc(ref, userData);
    }

    return { success: true, user };
  } catch (error) {
    const err = error as any
    return { success: false, error: err as Error } as { success: false; error: Error };
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
