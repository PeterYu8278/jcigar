// Firebase 手机号认证服务
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  PhoneAuthProvider,
  ConfirmationResult,
  updatePassword as firebaseUpdatePassword
} from 'firebase/auth';
import { auth, db } from '../../config/firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { normalizePhoneNumber } from '../../utils/phoneNormalization';

// 全局变量存储 recaptcha verifier 和 confirmation result
let recaptchaVerifier: RecaptchaVerifier | null = null;
let confirmationResult: ConfirmationResult | null = null;

/**
 * 初始化 reCAPTCHA verifier
 * @param containerId reCAPTCHA 容器的 DOM ID
 * @param size 'normal' | 'invisible' | 'compact'
 */
export const initRecaptchaVerifier = (
  containerId: string = 'recaptcha-container',
  size: 'normal' | 'invisible' | 'compact' = 'invisible'
): RecaptchaVerifier => {
  // 如果已经初始化，先清理
  if (recaptchaVerifier) {
    recaptchaVerifier.clear();
  }

  recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
    size: size,
    callback: () => {
      console.log('[reCAPTCHA] 验证成功');
    },
    'expired-callback': () => {
      console.log('[reCAPTCHA] 验证过期');
    }
  });

  return recaptchaVerifier;
};

/**
 * 发送 SMS 验证码用于密码重置
 * @param phone 手机号
 * @returns Promise<{ success: boolean; error?: Error }>
 */
export const sendPasswordResetSMS = async (phone: string): Promise<{
  success: boolean;
  error?: Error;
  phone?: string;
}> => {
  try {
    // 1. 标准化手机号
    const normalizedPhone = normalizePhoneNumber(phone);
    if (!normalizedPhone) {
      return {
        success: false,
        error: new Error('手机号格式无效')
      };
    }

    // 2. 检查该手机号是否在系统中注册
    const usersQuery = query(
      collection(db, 'users'),
      where('profile.phone', '==', normalizedPhone),
      limit(1)
    );
    const usersSnapshot = await getDocs(usersQuery);

    if (usersSnapshot.empty) {
      return {
        success: false,
        error: new Error('未找到与此手机号关联的账户')
      };
    }

    // 3. 确保 reCAPTCHA 已初始化
    if (!recaptchaVerifier) {
      return {
        success: false,
        error: new Error('reCAPTCHA 未初始化，请刷新页面重试')
      };
    }

    // 4. 发送 SMS 验证码
    // 注意：需要使用国际格式（+60...）
    const phoneWithCountryCode = normalizedPhone.startsWith('+') 
      ? normalizedPhone 
      : `+60${normalizedPhone.replace(/^0/, '')}`;

    console.log('[sendPasswordResetSMS] 发送验证码到:', phoneWithCountryCode);

    confirmationResult = await signInWithPhoneNumber(
      auth,
      phoneWithCountryCode,
      recaptchaVerifier
    );

    console.log('[sendPasswordResetSMS] 验证码已发送');

    return {
      success: true,
      phone: normalizedPhone
    };
  } catch (error: any) {
    console.error('[sendPasswordResetSMS] Error:', error);

    // 友好的错误消息
    let errorMessage = '发送验证码失败，请重试';
    
    if (error.code === 'auth/invalid-phone-number') {
      errorMessage = '手机号格式无效';
    } else if (error.code === 'auth/too-many-requests') {
      errorMessage = '请求过于频繁，请稍后再试';
    } else if (error.code === 'auth/captcha-check-failed') {
      errorMessage = 'reCAPTCHA 验证失败，请刷新页面重试';
    }

    return {
      success: false,
      error: new Error(errorMessage)
    };
  }
};

/**
 * 验证 SMS 验证码
 * @param code 6位数字验证码
 * @returns Promise<{ success: boolean; error?: Error }>
 */
export const verifySMSCode = async (code: string): Promise<{
  success: boolean;
  error?: Error;
  credential?: any;
}> => {
  try {
    if (!confirmationResult) {
      return {
        success: false,
        error: new Error('请先发送验证码')
      };
    }

    // 验证码验证
    const result = await confirmationResult.confirm(code);
    
    console.log('[verifySMSCode] 验证成功:', result.user?.uid);

    // 返回 credential 用于后续操作
    const credential = PhoneAuthProvider.credential(
      confirmationResult.verificationId,
      code
    );

    return {
      success: true,
      credential
    };
  } catch (error: any) {
    console.error('[verifySMSCode] Error:', error);

    let errorMessage = '验证码错误，请重试';
    
    if (error.code === 'auth/invalid-verification-code') {
      errorMessage = '验证码无效或已过期';
    } else if (error.code === 'auth/code-expired') {
      errorMessage = '验证码已过期，请重新发送';
    }

    return {
      success: false,
      error: new Error(errorMessage)
    };
  }
};

/**
 * 通过手机号验证后重置密码
 * @param phone 手机号
 * @param verificationCode SMS 验证码
 * @param newPassword 新密码
 */
export const resetPasswordWithPhone = async (
  phone: string,
  verificationCode: string,
  newPassword: string
): Promise<{
  success: boolean;
  error?: Error;
}> => {
  try {
    // 1. 验证 SMS 验证码
    const verifyResult = await verifySMSCode(verificationCode);
    if (!verifyResult.success) {
      return verifyResult;
    }

    // 2. 标准化手机号
    const normalizedPhone = normalizePhoneNumber(phone);
    if (!normalizedPhone) {
      return {
        success: false,
        error: new Error('手机号格式无效')
      };
    }

    // 3. 查找用户
    const usersQuery = query(
      collection(db, 'users'),
      where('profile.phone', '==', normalizedPhone),
      limit(1)
    );
    const usersSnapshot = await getDocs(usersQuery);

    if (usersSnapshot.empty) {
      return {
        success: false,
        error: new Error('未找到用户')
      };
    }

    // 4. 更新密码
    // 注意：当前用户已通过手机号验证登录
    const currentUser = auth.currentUser;
    if (!currentUser) {
      return {
        success: false,
        error: new Error('用户未登录')
      };
    }

    await firebaseUpdatePassword(currentUser, newPassword);

    // 5. 清理状态
    confirmationResult = null;
    if (recaptchaVerifier) {
      recaptchaVerifier.clear();
      recaptchaVerifier = null;
    }

    console.log('[resetPasswordWithPhone] 密码重置成功');

    return {
      success: true
    };
  } catch (error: any) {
    console.error('[resetPasswordWithPhone] Error:', error);
    return {
      success: false,
      error: new Error(error.message || '密码重置失败')
    };
  }
};

/**
 * 清理 reCAPTCHA verifier
 */
export const cleanupRecaptcha = () => {
  if (recaptchaVerifier) {
    recaptchaVerifier.clear();
    recaptchaVerifier = null;
  }
  confirmationResult = null;
};

