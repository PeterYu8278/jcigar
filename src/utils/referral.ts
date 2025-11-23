import type { User } from '../types';

/**
 * 从 referral.referrals 数组计算 referralPoints 总和
 * 这是 referralPoints 的唯一真实来源
 */
export const calculateReferralPoints = (user: User | null | undefined): number => {
  if (!user?.referral?.referrals || !Array.isArray(user.referral.referrals)) {
    return 0;
  }
  
  return user.referral.referrals.reduce((sum, r) => {
    // 兼容新旧格式：string 或对象
    if (typeof r === 'string') {
      return sum;
    }
    return sum + (r.firstReloadReward || 0);
  }, 0);
};

/**
 * 从 referrals 数组计算 referralPoints（用于内部计算）
 */
export const calculateReferralPointsFromArray = (referrals: any[]): number => {
  if (!referrals || !Array.isArray(referrals)) {
    return 0;
  }
  return referrals.reduce((sum, r) => {
    // 兼容新旧格式：string 或对象
    if (typeof r === 'string') {
      return sum;
    }
    return sum + (r.firstReloadReward || 0);
  }, 0);
};

