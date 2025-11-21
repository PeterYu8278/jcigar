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
    
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // 更新用户显示名称
    await updateProfile(user, { displayName });
    
    // 生成会员编号（基于 userId hash）
    const memberId = await generateMemberId(user.uid);
    
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
    
    // ✅ 如果有引荐人，更新引荐人的数据
    if (referrer) {
      try {
        await updateDoc(doc(db, 'users', referrer.id), {
          'referral.referrals': arrayUnion(user.uid),
          'referral.totalReferred': increment(1),
          'membership.points': increment(200),  // 引荐人获得200积分
          'membership.referralPoints': increment(200),
          updatedAt: new Date()
        });
      } catch (error) {
        // 不影响注册流程，静默失败
      }
    }
    
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
        const userEmail = user.email;
        
        if (!userEmail) {
          return { success: false, error: new Error('无法获取用户邮箱') } as { success: false; error: Error };
        }
        
        // 1. 先检查该电邮是否已存在于系统中（通过 email 字段查询）
        const emailQuery = query(collection(db, 'users'), where('email', '==', userEmail), limit(1));
        const emailSnap = await getDocs(emailQuery);
        
        if (!emailSnap.empty) {
          // 1.a 电邮已存在系统中
          const existingUserDoc = emailSnap.docs[0];
          const existingUserId = existingUserDoc.id;
          const existingUserData = existingUserDoc.data() as User;
          
          // 1.a.1 检查资料是否完整
          const needsProfile = !existingUserData.displayName || !existingUserData.email || !existingUserData.profile?.phone;
          
          // 如果当前 Firebase Auth UID 与数据库中的 UID 不一致，需要同步
          if (user.uid !== existingUserId) {
            // 这种情况不应该发生，但如果发生了，返回错误
            return { success: false, error: new Error('账户状态异常，请联系管理员') } as { success: false; error: Error };
          }
          
          return { success: true, user, needsProfile };
        }
        
        // 1.b 电邮不存在系统中 → 创建新用户
        const ref = doc(db, 'users', user.uid);
        const snap = await getDoc(ref);
        
        if (!snap.exists()) {
          // 生成会员编号
          const memberId = await generateMemberId(user.uid);
          
          const tempUserData: Omit<User, 'id'> = {
            email: userEmail,
            displayName: user.displayName || '未命名用户',
            role: 'member',
            memberId,
            profile: {
              preferences: { language: 'zh', notifications: true },
            },
            membership: {
              level: 'bronze',
              joinDate: new Date(),
              lastActive: new Date(),
              points: 50,
              referralPoints: 0,
            },
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
        
        // 已存在用户：检查是否已完善信息
        const userData = snap.data() as User;
        const needsProfile = !userData.displayName || !userData.email || !userData.profile?.phone;
        return { success: true, user, needsProfile };
      }
      
      return { success: false, noResult: true } as any;
    }
    
    const user = result.user;
    const userEmail = user.email;
    
    if (!userEmail) {
      return { success: false, error: new Error('无法获取用户邮箱') } as { success: false; error: Error };
    }

    // 1. 先检查该电邮是否已存在于系统中（通过 email 字段查询）
    const emailQuery = query(collection(db, 'users'), where('email', '==', userEmail), limit(1));
    const emailSnap = await getDocs(emailQuery);
    
    if (!emailSnap.empty) {
      // 1.a 电邮已存在系统中
      const existingUserDoc = emailSnap.docs[0];
      const existingUserId = existingUserDoc.id;
      const existingUserData = existingUserDoc.data() as User;
      
      // 1.a.1 检查资料是否完整
      const needsProfile = !existingUserData.displayName || !existingUserData.email || !existingUserData.profile?.phone;
      
      // 如果当前 Firebase Auth UID 与数据库中的 UID 不一致，需要同步
      if (user.uid !== existingUserId) {
        // 这种情况不应该发生，但如果发生了，返回错误
        return { success: false, error: new Error('账户状态异常，请联系管理员') } as { success: false; error: Error };
      }
      
      return { success: true, user, needsProfile };
    }
    
    // 1.b 电邮不存在系统中 → 创建新用户
    const ref = doc(db, 'users', user.uid);
    const snap = await getDoc(ref);
    
    if (!snap.exists()) {
      // 生成会员编号
      const memberId = await generateMemberId(user.uid);
      
      const tempUserData: Omit<User, 'id'> = {
        email: userEmail,
        displayName: user.displayName || '未命名用户',
        role: 'member',
        memberId,
        profile: {
          preferences: { language: 'zh', notifications: true },
        },
        membership: {
          level: 'bronze',
          joinDate: new Date(),
          lastActive: new Date(),
          points: 50,
          referralPoints: 0,
        },
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

    // 已存在用户：检查是否已完善信息
    const userData = snap.data() as User;
    const needsProfile = !userData.displayName || !userData.email || !userData.profile?.phone;
    
    return { success: true, user, needsProfile };
  } catch (error) {
    const err = error as any;
    return { success: false, error: err as Error } as { success: false; error: Error };
  }
};

// 完善 Google 登录用户的信息
export const completeGoogleUserProfile = async (
  uid: string,
  displayName: string,
  phone: string,
  password: string,
  referralCode?: string  // ✅ 添加引荐码参数
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
    
    // 获取当前用户的 email
    const currentUser = auth.currentUser;
    if (!currentUser || !currentUser.email) {
      return { success: false, error: new Error('无法获取用户邮箱信息') } as { success: false; error: Error }
    }
    const currentUserEmail = currentUser.email;
    
    if (!phoneSnap.empty && phoneSnap.docs[0].id !== uid) {
      // 电话号码已被其他用户使用
      const existingPhoneUserDoc = phoneSnap.docs[0];
      const existingPhoneUserId = existingPhoneUserDoc.id;
      const existingPhoneUserData = existingPhoneUserDoc.data() as User;
      
      if (!existingPhoneUserData.email) {
        // 该电话号码的用户数据不存在电邮 → 将现有用户数据迁移到当前 Google UID
        try {
          // 将现有用户的数据复制到当前 Google UID 文档，并添加电邮
          const migratedUserData = {
            ...existingPhoneUserData,
            email: currentUserEmail,
            displayName: displayName,
            updatedAt: new Date()
          };
          
          // 写入当前 Google UID 文档
          await setDoc(doc(db, 'users', uid), migratedUserData);
          
          // 标记旧文档为已迁移（保留以便追踪）
          await updateDoc(doc(db, 'users', existingPhoneUserId), {
            migratedTo: uid,
            status: 'migrated' as any,
            updatedAt: new Date()
          });
          
          // 设置密码
          const { updatePassword, EmailAuthProvider, linkWithCredential } = await import('firebase/auth');
          try {
            const credential = EmailAuthProvider.credential(currentUserEmail, password);
            await linkWithCredential(currentUser, credential);
          } catch (linkError: any) {
            if (linkError.code === 'auth/provider-already-linked') {
              await updatePassword(currentUser, password);
            } else {
              throw linkError;
            }
          }
          
          // 更新 displayName
          await updateProfile(currentUser, { displayName });
          
          return { success: true };
        } catch (error) {
          console.error('数据迁移失败:', error);
          return { success: false, error: new Error('数据迁移失败') } as { success: false; error: Error }
        }
      } else {
        // 该电话号码的用户数据已存在电邮 → 提示电话号码已被使用
        return { success: false, error: new Error('该手机号已被其他用户使用') } as { success: false; error: Error }
      }
    }
    
    // ✅ 验证引荐码（如果提供）
    let referrer: any = null;
    if (referralCode) {
      const referralResult = await getUserByMemberId(referralCode.trim());
      if (!referralResult.success) {
        return { success: false, error: new Error(referralResult.error || '引荐码无效') } as { success: false; error: Error }
      }
      referrer = referralResult.user;
    }
    
    // 1. 更新 Firestore 用户文档
    const userRef = doc(db, 'users', uid);
    
    // ✅ 准备更新数据
    const updateData: any = {
      email: currentUserEmail, // 使用之前获取的 email
      displayName,
      profile: {
        phone: normalizedPhone, // 使用标准化后的手机号
        preferences: { language: 'zh', notifications: true },
      },
      updatedAt: new Date(),
    };
    
    // ✅ 如果有引荐人，更新引荐信息和积分
    if (referrer) {
      updateData.referral = {
        referredBy: referrer.memberId,
        referredByUserId: referrer.id,
        referralDate: new Date(),
        referrals: [],
        totalReferred: 0,
        activeReferrals: 0,
      };
      updateData.membership = {
        level: 'bronze',
        joinDate: new Date(),
        lastActive: new Date(),
        points: 100,  // 被引荐用户获得100积分
        referralPoints: 0,
      };
    }
    
    await setDoc(userRef, updateData, { merge: true });

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
    
    // 4. ✅ 如果有引荐人，更新引荐人的数据
    if (referrer) {
      try {
        await updateDoc(doc(db, 'users', referrer.id), {
          'referral.referrals': arrayUnion(uid),
          'referral.totalReferred': increment(1),
          'membership.points': increment(200),  // 引荐人获得200积分
          'membership.referralPoints': increment(200),
          updatedAt: new Date()
        });
      } catch (error) {
        // 不影响完善资料流程，静默失败
      }
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
const convertFirestoreTimestamps = (value: any): any => {
  if (!value) return value;
  if (typeof value?.toDate === 'function') {
    return value.toDate();
  }
  if (Array.isArray(value)) {
    return value.map((item) => convertFirestoreTimestamps(item));
  }
  if (typeof value === 'object') {
    return Object.keys(value).reduce((acc, key) => {
      acc[key] = convertFirestoreTimestamps(value[key]);
      return acc;
    }, {} as Record<string, any>);
  }
  return value;
};

export const getUserData = async (uid: string): Promise<User | null> => {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      const rawData = userDoc.data();
      const data = convertFirestoreTimestamps(rawData);
      return { id: uid, ...data } as User;
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
