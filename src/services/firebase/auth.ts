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
import { doc, setDoc, getDoc, collection, getDocs, query, where, limit, updateDoc, arrayUnion, increment } from 'firebase/firestore';
import { auth, db } from '../../config/firebase';
import type { User } from '../../types';
import { normalizePhoneNumber, identifyInputType } from '../../utils/phoneNormalization';
import { generateMemberId, getUserByMemberId } from '../../utils/memberId';

// 用户注册（所有字段都是必需的）
export const registerUser = async (
  email: string, 
  password: string, 
  displayName: string, 
  phone: string,
  referralCode?: string  // 可选的引荐码（memberId）
) => {
  try {
    // 验证必需字段（所有字段都是必需的）
    if (!email || !password || !displayName || !phone) {
      return { success: false, error: new Error('所有字段都是必需的'), code: 'missing-required-fields' } as { success: false; error: Error; code?: string }
    }
    
    // 标准化手机号为 E.164 格式
    const normalizedPhone = normalizePhoneNumber(phone)
    if (!normalizedPhone) {
      return { success: false, error: new Error('手机号格式无效'), code: 'invalid-phone' } as { success: false; error: Error; code?: string }
    }
    
    // 检查手机号是否已被使用
    const phoneQuery = query(collection(db, 'users'), where('profile.phone', '==', normalizedPhone), limit(1))
    const phoneSnap = await getDocs(phoneQuery)
    if (!phoneSnap.empty) {
      return { success: false, error: new Error('该手机号已被注册'), code: 'phone-already-in-use' } as { success: false; error: Error; code?: string }
    }
    
    // 验证引荐码（如果提供）
    let referrer: any = null;
    if (referralCode) {
      const referralResult = await getUserByMemberId(referralCode.trim());
      if (!referralResult.success) {
        return { success: false, error: new Error(referralResult.error || '引荐码无效'), code: 'invalid-referral-code' } as { success: false; error: Error; code?: string }
      }
      referrer = referralResult.user;
    }
    
    console.log('📝 [registerUser] 开始创建用户:', { email, displayName, phone: normalizedPhone, hasReferralCode: !!referralCode });
    
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    console.log('✅ [registerUser] Firebase Auth 用户创建成功:', user.uid);
    
    // 更新用户显示名称
    await updateProfile(user, { displayName });
    
    // 生成会员编号（基于 userId hash）
    const memberId = await generateMemberId(user.uid);
    console.log('🎫 [registerUser] 会员编号已生成:', memberId);
    
    // 在Firestore中创建用户文档
    const userData: Omit<User, 'id'> = {
      email,  // ✅ 邮箱必填
      displayName,
      role: 'member',
      memberId,  // ✅ 会员编号（用作引荐码）
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
        points: referrer ? 100 : 50,  // 被引荐：100积分，自然注册：50积分
        referralPoints: 0,
      },
      // ✅ 引荐信息（使用 null 替代 undefined，Firestore 不接受 undefined）
      referral: {
        referredBy: (referrer?.memberId || null) as string | null,
        referredByUserId: (referrer?.id || null) as string | null,
        referralDate: (referrer ? new Date() : null) as Date | null,
        referrals: [],
        totalReferred: 0,
        activeReferrals: 0,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    await setDoc(doc(db, 'users', user.uid), userData);
    console.log('✅ [registerUser] Firestore 用户文档创建成功');
    
    // ✅ 如果有引荐人，更新引荐人的数据
    if (referrer) {
      console.log('👥 [registerUser] 更新引荐人数据:', { referrerId: referrer.id, referrerMemberId: referrer.memberId });
      try {
        await updateDoc(doc(db, 'users', referrer.id), {
          'referral.referrals': arrayUnion(user.uid),
          'referral.totalReferred': increment(1),
          'membership.points': increment(200),  // 引荐人获得200积分
          'membership.referralPoints': increment(200),
          updatedAt: new Date()
        });
        console.log('✅ [registerUser] 引荐人数据更新成功，引荐人获得200积分');
      } catch (error) {
        console.error('❌ [registerUser] 更新引荐人信息失败:', error);
        // 不影响注册流程，静默失败
      }
    }
    
    console.log('🎉 [registerUser] 注册流程完成，返回成功');
    return { success: true, user };
  } catch (error) {
    console.error('❌ [registerUser] 注册失败:', error);
    const err = error as any
    const code = err?.code as string | undefined
    console.error('❌ [registerUser] 错误代码:', code);
    console.error('❌ [registerUser] 错误详情:', err);
    
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
  // 检查是否已有 pending 的 redirect
  const hasPending = sessionStorage.getItem('googleRedirectPending');
  if (hasPending) {
    return { success: false, error: new Error('重定向正在进行中，请稍候...') } as { success: false; error: Error };
  }
  
  try {
    const provider = new GoogleAuthProvider();
    provider.addScope('email');
    provider.addScope('profile');
    
    // 检测是否为移动设备（增强检测）
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                     /Mobile|mobile|Tablet|tablet/i.test(navigator.userAgent) ||
                     ('ontouchstart' in window) ||
                     (navigator.maxTouchPoints > 0);
    
    let credential;
    
    if (isMobile) {
      // 移动端：尝试 popup，失败降级到 redirect
      try {
        credential = await signInWithPopup(auth, provider);
      } catch (mobilePopupError: any) {
        // Popup 失败，降级到 redirect
        sessionStorage.setItem('googleRedirectPending', 'true');
        await signInWithRedirect(auth, provider);
        return { success: true, isRedirecting: true } as any;
      }
    } else {
      // 桌面端：使用 popup
      try {
        credential = await signInWithPopup(auth, provider);
      } catch (popupError: any) {
        // 任何 popup 失败都降级到 redirect
        await signInWithRedirect(auth, provider);
        return { success: true, isRedirecting: true } as any;
      }
    }
    
    const user = credential.user;

    // 检查 Firestore 中是否已存在用户文档
    const ref = doc(db, 'users', user.uid);
    const snap = await getDoc(ref);
    
    if (!snap.exists()) {
      // 新用户：创建临时用户文档（仅包含邮箱和基础信息）
      // ✅ 生成会员编号（基于 userId hash）
      const memberId = await generateMemberId(user.uid);
      
      const tempUserData: Omit<User, 'id'> = {
        email: user.email || '',
        displayName: user.displayName || '未命名用户',
        role: 'member',
        memberId,  // ✅ 添加会员编号
        profile: {
          // phone 字段省略，待用户完善信息后添加
          preferences: { language: 'zh', notifications: true },
        },
        membership: {
          level: 'bronze',
          joinDate: new Date(),
          lastActive: new Date(),
          points: 50,  // 初始积分
          referralPoints: 0,
        },
        // ✅ 初始化引荐信息（Google 登录时没有引荐人）
        referral: {
          referredBy: null as string | null,
          referredByUserId: null as string | null,
          referralDate: null as Date | null,
          referrals: [],
          totalReferred: 0,
          activeReferrals: 0,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await setDoc(ref, tempUserData);
      
      // 返回特殊标识：需要完善信息
      return { success: true, user, needsProfile: true };
    }

    // 已存在用户：检查是否已完善信息（需要：名字、电邮、手机号）
    const userData = snap.data() as User;
    const needsProfile = !userData.displayName || !userData.email || !userData.profile?.phone;
    
    return { success: true, user, needsProfile };
  } catch (error) {
    console.error('Google login error:', error);
    const err = error as any
    return { success: false, error: err as Error } as { success: false; error: Error };
  }
};

// 处理 Google 重定向登录结果
export const handleGoogleRedirectResult = async () => {
  const hasPending = sessionStorage.getItem('googleRedirectPending');
  
  try {
    const result = await getRedirectResult(auth);
    
    // 如果返回 null，等待一下再检查 currentUser
    if (!result && hasPending) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // 清除标记
    sessionStorage.removeItem('googleRedirectPending');
    
    if (!result) {
      // 备用方案：检查是否有标记 + 用户已登录
      const currentUser = auth.currentUser;
      
      if (hasPending && currentUser) {
        const user = currentUser;
        
        // 检查 Firestore 用户文档
        const ref = doc(db, 'users', user.uid);
        const snap = await getDoc(ref);
        
        if (!snap.exists()) {
          // ✅ 生成会员编号（基于 userId hash）
          const memberId = await generateMemberId(user.uid);
          
          const tempUserData: Omit<User, 'id'> = {
            email: user.email || '',
            displayName: user.displayName || '未命名用户',
            role: 'member',
            memberId,  // ✅ 添加会员编号
            profile: {
              preferences: { language: 'zh', notifications: true },
            },
            membership: {
              level: 'bronze',
              joinDate: new Date(),
              lastActive: new Date(),
              points: 50,  // 初始积分
              referralPoints: 0,
            },
            // ✅ 初始化引荐信息（Google 登录时没有引荐人）
            referral: {
              referredBy: null as string | null,
              referredByUserId: null as string | null,
              referralDate: null as Date | null,
              referrals: [],
              totalReferred: 0,
              activeReferrals: 0,
            },
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          await setDoc(ref, tempUserData);
          return { success: true, user, needsProfile: true };
        }
        
        // 已存在用户：检查是否已完善信息（需要：名字、电邮、手机号）
        const userData = snap.data() as User;
        const needsProfile = !userData.displayName || !userData.email || !userData.profile?.phone;
        return { success: true, user, needsProfile };
      }
      
      return { success: false, noResult: true } as any;
    }
    
    const user = result.user;

    // 检查 Firestore 中是否已存在用户文档
    const ref = doc(db, 'users', user.uid);
    const snap = await getDoc(ref);
    
    if (!snap.exists()) {
      // 新用户：创建临时用户文档
      // ✅ 生成会员编号（基于 userId hash）
      const memberId = await generateMemberId(user.uid);
      
      const tempUserData: Omit<User, 'id'> = {
        email: user.email || '',
        displayName: user.displayName || '未命名用户',
        role: 'member',
        memberId,  // ✅ 添加会员编号
        profile: {
          // phone 字段省略，待用户完善信息后添加
          preferences: { language: 'zh', notifications: true },
        },
        membership: {
          level: 'bronze',
          joinDate: new Date(),
          lastActive: new Date(),
          points: 50,  // 初始积分
          referralPoints: 0,
        },
        // ✅ 初始化引荐信息
        referral: {
          referrals: [],
          totalReferred: 0,
          activeReferrals: 0,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await setDoc(ref, tempUserData);
      
      return { success: true, user, needsProfile: true };
    }

    // 已存在用户：检查是否已完善信息（需要：名字、电邮、手机号）
    const userData = snap.data() as User;
    const needsProfile = !userData.displayName || !userData.email || !userData.profile?.phone;
    
    return { success: true, user, needsProfile };
  } catch (error) {
    console.error('Redirect result error:', error);
    const err = error as any;
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
    // 验证必需字段
    if (!uid || !displayName || !phone || !password) {
      return { success: false, error: new Error('所有字段都是必需的') } as { success: false; error: Error }
    }
    
    // 标准化手机号
    const normalizedPhone = normalizePhoneNumber(phone)
    if (!normalizedPhone) {
      return { success: false, error: new Error('手机号格式无效') } as { success: false; error: Error }
    }
    
    // 检查手机号是否已被其他用户使用
    const phoneQuery = query(collection(db, 'users'), where('profile.phone', '==', normalizedPhone), limit(1))
    const phoneSnap = await getDocs(phoneQuery)
    if (!phoneSnap.empty && phoneSnap.docs[0].id !== uid) {
      return { success: false, error: new Error('该手机号已被其他用户使用') } as { success: false; error: Error }
    }
    
    // 1. 更新 Firestore 用户文档
    const userRef = doc(db, 'users', uid);
    
    // 获取当前用户的 email（确保保留）
    const currentUser = auth.currentUser;
    if (!currentUser || !currentUser.email) {
      return { success: false, error: new Error('无法获取用户邮箱信息') } as { success: false; error: Error }
    }
    
    await setDoc(userRef, {
      email: currentUser.email, // 确保 email 字段存在
      displayName,
      profile: {
        phone: normalizedPhone, // 使用标准化后的手机号
        preferences: { language: 'zh', notifications: true },
      },
      updatedAt: new Date(),
    }, { merge: true });

    // 2. 为用户设置密码（通过 Firebase Auth）
    if (currentUser.uid === uid) {
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
