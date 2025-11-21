// Google 登录服务（简化版：Google 仅用于身份验证）
import { 
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  signInWithEmailAndPassword,
  updatePassword,
  EmailAuthProvider,
  linkWithCredential
} from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { auth, db } from '../../config/firebase';
import { GLOBAL_COLLECTIONS } from '../../config/globalCollections';
import { normalizePhoneNumber } from '../../utils/phoneNormalization';
import type { User } from '../../types';

/**
 * Google 登录信息（临时存储）
 */
interface GoogleLoginData {
  email: string;
  displayName: string;
  photoURL?: string;
  idToken?: string;
}

/**
 * 第一步：获取 Google 登录信息（不创建 Firebase Auth 账户）
 * 信息会暂存在 sessionStorage，然后立即登出
 */
export const initiateGoogleLogin = async (): Promise<{
  success: boolean;
  googleData?: GoogleLoginData;
  isRedirecting?: boolean;
  error?: Error;
}> => {
  try {
    const provider = new GoogleAuthProvider();
    provider.addScope('email');
    provider.addScope('profile');
    
    // 检测设备类型
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                     /Mobile|mobile|Tablet|tablet/i.test(navigator.userAgent) ||
                     ('ontouchstart' in window) ||
                     (navigator.maxTouchPoints > 0);
    
    let result;
    
    try {
      if (isMobile) {
        // 移动端：优先 Popup
        try {
          result = await signInWithPopup(auth, provider);
        } catch (popupError) {
          // Popup 失败，降级到 Redirect
          sessionStorage.setItem('googleLoginPending', 'true');
          await signInWithRedirect(auth, provider);
          return { success: true, isRedirecting: true };
        }
      } else {
        // 桌面端：使用 Popup
        result = await signInWithPopup(auth, provider);
      }
    } catch (error) {
      // Popup 失败，尝试 Redirect
      sessionStorage.setItem('googleLoginPending', 'true');
      await signInWithRedirect(auth, provider);
      return { success: true, isRedirecting: true };
    }
    
    // 获取 Google 信息
    const user = result.user;
    const credential = GoogleAuthProvider.credentialFromResult(result);
    
    const googleData: GoogleLoginData = {
      email: user.email || '',
      displayName: user.displayName || '',
      photoURL: user.photoURL || undefined,
      idToken: credential?.idToken,
    };
    
    console.log('[initiateGoogleLogin] 获取 Google 信息:', googleData.email);
    
    // 暂存 Google 信息
    sessionStorage.setItem('googleLoginData', JSON.stringify(googleData));
    
    // 立即登出（不保留 Firebase Auth 会话）
    await signOut(auth);
    console.log('[initiateGoogleLogin] 已登出 Firebase Auth，仅保留 Google 信息');
    
    return { success: true, googleData };
  } catch (error: any) {
    console.error('[initiateGoogleLogin] Error:', error);
    return { success: false, error: error as Error };
  }
};

/**
 * 处理 Google Redirect 结果
 */
export const handleGoogleRedirectResult = async (): Promise<{
  success: boolean;
  googleData?: GoogleLoginData;
  error?: Error;
}> => {
  const hasPending = sessionStorage.getItem('googleLoginPending');
  
  if (!hasPending) {
    return { success: false, error: new Error('No pending redirect') };
  }
  
  try {
    const result = await getRedirectResult(auth);
    
    sessionStorage.removeItem('googleLoginPending');
    
    if (!result) {
      return { success: false, error: new Error('No redirect result') };
    }
    
    const user = result.user;
    const credential = GoogleAuthProvider.credentialFromResult(result);
    
    const googleData: GoogleLoginData = {
      email: user.email || '',
      displayName: user.displayName || '',
      photoURL: user.photoURL || undefined,
      idToken: credential?.idToken,
    };
    
    console.log('[handleGoogleRedirectResult] 获取 Google 信息:', googleData.email);
    
    // 暂存 Google 信息
    sessionStorage.setItem('googleLoginData', JSON.stringify(googleData));
    
    // 立即登出
    await signOut(auth);
    console.log('[handleGoogleRedirectResult] 已登出 Firebase Auth');
    
    return { success: true, googleData };
  } catch (error: any) {
    console.error('[handleGoogleRedirectResult] Error:', error);
    sessionStorage.removeItem('googleLoginPending');
    return { success: false, error: error as Error };
  }
};

/**
 * 第二步：根据手机号查找用户并绑定 Google 邮箱
 */
export const linkGoogleToPhoneAccount = async (
  phone: string,
  password: string,
  referralCode?: string
): Promise<{
  success: boolean;
  needsRegistration?: boolean;
  user?: User;
  error?: Error;
}> => {
  try {
    // 获取暂存的 Google 信息
    const googleDataStr = sessionStorage.getItem('googleLoginData');
    if (!googleDataStr) {
      return { success: false, error: new Error('Google 登录信息已过期，请重新登录') };
    }
    
    const googleData: GoogleLoginData = JSON.parse(googleDataStr);
    console.log('[linkGoogleToPhoneAccount] 处理手机号:', phone);
    console.log('[linkGoogleToPhoneAccount] Google 邮箱:', googleData.email);
    
    // 标准化手机号
    const normalizedPhone = normalizePhoneNumber(phone);
    if (!normalizedPhone) {
      return { success: false, error: new Error('手机号格式无效') };
    }
    
    // 查找手机号对应的用户
    const usersQuery = query(
      collection(db, GLOBAL_COLLECTIONS.USERS),
      where('profile.phone', '==', normalizedPhone),
      limit(1)
    );
    const usersSnapshot = await getDocs(usersQuery);
    
    if (usersSnapshot.empty) {
      // 手机号未注册，需要创建新用户
      console.log('[linkGoogleToPhoneAccount] 手机号未注册，需要创建新账户');
      return { 
        success: false, 
        needsRegistration: true,
        error: new Error('该手机号未注册，请先注册账户') 
      };
    }
    
    // 找到手机号对应的用户
    const userDoc = usersSnapshot.docs[0];
    const userId = userDoc.id;
    const userData = userDoc.data() as User;
    
    console.log('[linkGoogleToPhoneAccount] 找到用户:', userId);
    console.log('[linkGoogleToPhoneAccount] 现有邮箱:', userData.email);
    
    // 检查该用户是否已有邮箱
    if (userData.email && userData.email !== '') {
      // 已有邮箱，检查是否与 Google 邮箱一致
      if (userData.email !== googleData.email) {
        return { 
          success: false, 
          error: new Error(`该手机号已绑定其他邮箱 (${userData.email})，无法绑定 ${googleData.email}`) 
        };
      }
      
      // 邮箱一致，直接登录
      console.log('[linkGoogleToPhoneAccount] 邮箱已绑定，尝试登录');
      
      // 尝试用邮箱+密码登录
      try {
        const credential = await signInWithEmailAndPassword(auth, userData.email, password);
        console.log('[linkGoogleToPhoneAccount] ✅ 登录成功');
        
        // 清除暂存的 Google 信息
        sessionStorage.removeItem('googleLoginData');
        
        return { success: true, user: { ...userData, id: userId } };
      } catch (loginError: any) {
        console.error('[linkGoogleToPhoneAccount] 登录失败:', loginError);
        return { 
          success: false, 
          error: new Error('密码错误或账户不存在') 
        };
      }
    }
    
    // 用户没有邮箱，将 Google 邮箱写入该用户数据
    console.log('[linkGoogleToPhoneAccount] 用户无邮箱，绑定 Google 邮箱:', googleData.email);
    
    // 检查该 Google 邮箱是否已在 Firebase Auth 中存在
    try {
      // 尝试用邮箱+密码登录
      console.log('[linkGoogleToPhoneAccount] 尝试用邮箱+密码登录...');
      await signInWithEmailAndPassword(auth, googleData.email, password);
      console.log('[linkGoogleToPhoneAccount] ✅ 登录成功，该邮箱已存在于 Firebase Auth');
      
      // 登录成功，直接更新 Firestore 文档
      await setDoc(doc(db, GLOBAL_COLLECTIONS.USERS, userId), {
        email: googleData.email,
        displayName: googleData.displayName || userData.displayName,
        googlePhotoURL: googleData.photoURL,
        authProvider: 'google',
        googleLinkedAt: new Date(),
        updatedAt: new Date(),
      }, { merge: true });
      
      console.log('[linkGoogleToPhoneAccount] ✅ Google 邮箱已绑定到用户:', userId);
      
      // 清除暂存的 Google 信息
      sessionStorage.removeItem('googleLoginData');
      
      // 重新获取用户数据
      const updatedUserDoc = await getDoc(doc(db, GLOBAL_COLLECTIONS.USERS, userId));
      const updatedUserData = updatedUserDoc.data() as User;
      
      return { success: true, user: { ...updatedUserData, id: userId } };
      
    } catch (loginError: any) {
      console.log('[linkGoogleToPhoneAccount] 邮箱不存在或密码错误，尝试创建新账户');
      
      // 邮箱不存在或密码错误，尝试创建新的 Firebase Auth 账户
      const { createUserWithEmailAndPassword, updateProfile } = await import('firebase/auth');
      
      try {
        // 创建 Firebase Auth 账户
        const authResult = await createUserWithEmailAndPassword(auth, googleData.email, password);
        console.log('[linkGoogleToPhoneAccount] ✅ Firebase Auth 账户已创建:', authResult.user.uid);
        
        // 更新 displayName
        await updateProfile(authResult.user, { displayName: googleData.displayName });
        
        // 更新 Firestore 用户文档（添加邮箱）
        await setDoc(doc(db, GLOBAL_COLLECTIONS.USERS, userId), {
          email: googleData.email,
          displayName: googleData.displayName || userData.displayName,
          googlePhotoURL: googleData.photoURL,
          authProvider: 'google',
          googleLinkedAt: new Date(),
          updatedAt: new Date(),
        }, { merge: true });
        
        console.log('[linkGoogleToPhoneAccount] ✅ Google 邮箱已绑定到用户:', userId);
        
        // 清除暂存的 Google 信息
        sessionStorage.removeItem('googleLoginData');
        
        // 重新获取用户数据
        const updatedUserDoc = await getDoc(doc(db, GLOBAL_COLLECTIONS.USERS, userId));
        const updatedUserData = updatedUserDoc.data() as User;
        
        return { success: true, user: { ...updatedUserData, id: userId } };
        
      } catch (createError: any) {
        console.error('[linkGoogleToPhoneAccount] 创建 Auth 账户失败:', createError);
        
        if (createError.code === 'auth/email-already-in-use') {
          // 邮箱已被使用，但密码不匹配
          return { 
            success: false, 
            error: new Error('该 Google 邮箱已被其他账户使用，且密码不匹配。请使用其他邮箱或联系管理员。') 
          };
        }
        
        if (createError.code === 'auth/weak-password') {
          return { 
            success: false, 
            error: new Error('密码强度不足，请使用至少6位字符的密码') 
          };
        }
        
        return { 
          success: false, 
          error: new Error(createError.message || '创建账户失败，请重试') 
        };
      }
    }
    
  } catch (error: any) {
    console.error('[linkGoogleToPhoneAccount] Error:', error);
    return { success: false, error: error as Error };
  }
};

/**
 * 获取暂存的 Google 信息
 */
export const getStoredGoogleData = (): GoogleLoginData | null => {
  const googleDataStr = sessionStorage.getItem('googleLoginData');
  if (!googleDataStr) return null;
  
  try {
    return JSON.parse(googleDataStr) as GoogleLoginData;
  } catch {
    return null;
  }
};

/**
 * 清除暂存的 Google 信息
 */
export const clearStoredGoogleData = (): void => {
  sessionStorage.removeItem('googleLoginData');
  sessionStorage.removeItem('googleLoginPending');
};

