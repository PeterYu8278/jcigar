// 账户合并服务
import { doc, getDoc, updateDoc, writeBatch, collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { GLOBAL_COLLECTIONS } from '../../config/globalCollections';
import type { User } from '../../types';

/**
 * 检查手机号是否可以被绑定（智能检测）
 * @param phone 标准化后的手机号
 * @param currentUserId 当前用户ID（Google登录用户）
 * @returns 
 *   - canBind: 是否可以绑定
 *   - needsMerge: 是否需要合并账户
 *   - existingUser: 已存在的用户（如果有）
 *   - reason: 不能绑定的原因
 */
export const checkPhoneBindingEligibility = async (
  phone: string,
  currentUserId: string
): Promise<{
  canBind: boolean;
  needsMerge: boolean;
  existingUser?: User;
  reason?: string;
}> => {
  try {
    // 查询是否有其他用户使用此手机号
    const phoneQuery = query(
      collection(db, GLOBAL_COLLECTIONS.USERS),
      where('profile.phone', '==', phone)
    );
    const phoneSnap = await getDocs(phoneQuery);

    // 没有其他用户使用此手机号，可以直接绑定
    if (phoneSnap.empty) {
      return { canBind: true, needsMerge: false };
    }

    // 有其他用户使用此手机号
    const existingUserDoc = phoneSnap.docs[0];
    const existingUserId = existingUserDoc.id;

    // 如果是当前用户自己，可以绑定（更新）
    if (existingUserId === currentUserId) {
      return { canBind: true, needsMerge: false };
    }

    // 获取已存在用户的详细信息
    const existingUserData = existingUserDoc.data() as User;
    const existingUser: User = {
      ...existingUserData,
      id: existingUserId
    };

    // 检查已存在用户是否有邮箱
    const hasEmail = !!(existingUser.email && existingUser.email.trim());

    if (hasEmail) {
      // 已存在用户有邮箱，不允许绑定
      return {
        canBind: false,
        needsMerge: false,
        existingUser,
        reason: '该手机号已被其他用户使用'
      };
    }

    // 已存在用户没有邮箱，允许绑定并需要合并账户
    return {
      canBind: true,
      needsMerge: true,
      existingUser,
      reason: '该手机号对应的账户将与您的账户合并'
    };
  } catch (error: any) {
    console.error('[checkPhoneBindingEligibility] Error:', error);
    throw new Error('检查手机号绑定资格失败');
  }
};

/**
 * 合并账户：将无邮箱的账户数据合并到Google登录账户
 * @param googleUserId Google登录用户的ID
 * @param phoneOnlyUserId 仅有手机号的用户ID
 */
export const mergeUserAccounts = async (
  googleUserId: string,
  phoneOnlyUserId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log('[mergeUserAccounts] 开始合并账户:', { googleUserId, phoneOnlyUserId });

    // 获取两个用户的数据
    const [googleUserDoc, phoneUserDoc] = await Promise.all([
      getDoc(doc(db, GLOBAL_COLLECTIONS.USERS, googleUserId)),
      getDoc(doc(db, GLOBAL_COLLECTIONS.USERS, phoneOnlyUserId))
    ]);

    if (!googleUserDoc.exists()) {
      return { success: false, error: 'Google用户不存在' };
    }

    if (!phoneUserDoc.exists()) {
      return { success: false, error: '手机号用户不存在' };
    }

    const googleUser = googleUserDoc.data() as User;
    const phoneUser = phoneUserDoc.data() as User;

    // 安全检查：确保手机号用户确实没有邮箱
    if (phoneUser.email && phoneUser.email.trim()) {
      return {
        success: false,
        error: '目标账户已有邮箱，不能合并'
      };
    }

    // 使用 batch 操作确保原子性
    const batch = writeBatch(db);

    // 1. 合并会员数据（积分、等级、引荐等）
    const mergedMembership = {
      level: phoneUser.membership?.level || googleUser.membership?.level || 'bronze',
      // 积分相加
      points: (phoneUser.membership?.points || 0) + (googleUser.membership?.points || 0),
      // 引荐积分相加
      referralPoints: (phoneUser.membership?.referralPoints || 0) + (googleUser.membership?.referralPoints || 0),
      // 累计驻店时长相加
      totalVisitHours: (phoneUser.membership?.totalVisitHours || 0) + (googleUser.membership?.totalVisitHours || 0),
      // 保留两个账户中较早的注册时间
      joinDate: (phoneUser.membership?.joinDate && googleUser.membership?.joinDate)
        ? (phoneUser.membership.joinDate < googleUser.membership.joinDate 
            ? phoneUser.membership.joinDate 
            : googleUser.membership.joinDate)
        : (phoneUser.membership?.joinDate || googleUser.membership?.joinDate || new Date()),
      // 最后活跃时间
      lastActive: new Date(),
      // 当前驻店会话ID（优先使用phoneUser的）
      currentVisitSessionId: phoneUser.membership?.currentVisitSessionId || googleUser.membership?.currentVisitSessionId || null
    };

    // 2. 合并引荐数据
    const mergedReferral = {
      // 被谁引荐（优先使用phoneUser的）
      referredBy: phoneUser.referral?.referredBy || googleUser.referral?.referredBy,
      referredByUserId: phoneUser.referral?.referredByUserId || googleUser.referral?.referredByUserId,
      // 引荐日期（保留较早的）
      referralDate: (phoneUser.referral?.referralDate && googleUser.referral?.referralDate)
        ? (phoneUser.referral.referralDate < googleUser.referral.referralDate
            ? phoneUser.referral.referralDate
            : googleUser.referral.referralDate)
        : (phoneUser.referral?.referralDate || googleUser.referral?.referralDate),
      // 引荐列表合并（去重）
      referrals: Array.from(new Set([
        ...(phoneUser.referral?.referrals || []),
        ...(googleUser.referral?.referrals || [])
      ])),
      // 总引荐数
      totalReferred: 
        (phoneUser.referral?.totalReferred || 0) + 
        (googleUser.referral?.totalReferred || 0),
      // 活跃引荐数
      activeReferrals:
        (phoneUser.referral?.activeReferrals || 0) +
        (googleUser.referral?.activeReferrals || 0)
    };

    // 3. 更新Google用户账户（主账户）
    const googleUserRef = doc(db, GLOBAL_COLLECTIONS.USERS, googleUserId);
    batch.update(googleUserRef, {
      // 保留Google邮箱
      email: googleUser.email,
      // 使用手机号用户的displayName（如果有）
      displayName: phoneUser.displayName || googleUser.displayName,
      // 使用手机号用户的手机号
      'profile.phone': phoneUser.profile?.phone,
      // 合并后的会员数据
      membership: mergedMembership,
      // 合并后的引荐数据
      referral: mergedReferral,
      // 使用phoneUser的memberId（如果有）
      memberId: phoneUser.memberId || googleUser.memberId,
      // 状态（使用活跃的账户状态）
      status: phoneUser.status === 'active' ? phoneUser.status : googleUser.status,
      // 记录合并信息
      mergedFrom: phoneOnlyUserId,
      mergedAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });

    // 4. 更新所有关联记录的userId
    // 4.1 更新积分记录
    const pointsRecordsQuery = query(
      collection(db, GLOBAL_COLLECTIONS.POINTS_RECORDS),
      where('userId', '==', phoneOnlyUserId)
    );
    const pointsRecords = await getDocs(pointsRecordsQuery);
    pointsRecords.forEach(doc => {
      batch.update(doc.ref, { 
        userId: googleUserId,
        updatedAt: Timestamp.now()
      });
    });

    // 4.2 更新订单记录
    const ordersQuery = query(
      collection(db, GLOBAL_COLLECTIONS.ORDERS),
      where('userId', '==', phoneOnlyUserId)
    );
    const orders = await getDocs(ordersQuery);
    orders.forEach(doc => {
      batch.update(doc.ref, { 
        userId: googleUserId,
        updatedAt: Timestamp.now()
      });
    });

    // 4.3 更新驻店记录
    const visitSessionsQuery = query(
      collection(db, GLOBAL_COLLECTIONS.VISIT_SESSIONS),
      where('userId', '==', phoneOnlyUserId)
    );
    const visitSessions = await getDocs(visitSessionsQuery);
    visitSessions.forEach(doc => {
      batch.update(doc.ref, { 
        userId: googleUserId,
        updatedAt: Timestamp.now()
      });
    });

    // 4.4 更新活动参与记录
    const eventsQuery = query(
      collection(db, GLOBAL_COLLECTIONS.EVENTS)
    );
    const events = await getDocs(eventsQuery);
    events.forEach(eventDoc => {
      const eventData = eventDoc.data();
      const participants = eventData.participants || [];
      
      // 检查是否有phoneOnlyUserId在参与者列表中
      const hasPhoneUser = participants.some((p: any) => p.userId === phoneOnlyUserId);
      
      if (hasPhoneUser) {
        // 更新参与者的userId
        const updatedParticipants = participants.map((p: any) => 
          p.userId === phoneOnlyUserId 
            ? { ...p, userId: googleUserId }
            : p
        );
        batch.update(eventDoc.ref, { 
          participants: updatedParticipants,
          updatedAt: Timestamp.now()
        });
      }
    });

    // 4.5 更新其他用户的引荐关系（如果phoneUser引荐了别人）
    const referredUsersQuery = query(
      collection(db, GLOBAL_COLLECTIONS.USERS),
      where('referral.referredByUserId', '==', phoneOnlyUserId)
    );
    const referredUsers = await getDocs(referredUsersQuery);
    referredUsers.forEach(doc => {
      batch.update(doc.ref, {
        'referral.referredByUserId': googleUserId,
        updatedAt: Timestamp.now()
      });
    });

    // 5. 标记phoneUser账户为已合并（而不是删除，保留历史记录）
    const phoneUserRef = doc(db, GLOBAL_COLLECTIONS.USERS, phoneOnlyUserId);
    batch.update(phoneUserRef, {
      status: 'merged',
      mergedInto: googleUserId,
      mergedAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });

    // 6. 执行批量操作
    await batch.commit();

    console.log('[mergeUserAccounts] 账户合并成功:', {
      googleUserId,
      phoneOnlyUserId,
      pointsRecordsUpdated: pointsRecords.size,
      ordersUpdated: orders.size,
      visitSessionsUpdated: visitSessions.size,
      referredUsersUpdated: referredUsers.size
    });

    return { success: true };
  } catch (error: any) {
    console.error('[mergeUserAccounts] 账户合并失败:', error);
    return {
      success: false,
      error: error.message || '账户合并失败'
    };
  }
};

