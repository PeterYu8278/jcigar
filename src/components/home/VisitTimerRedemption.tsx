// 合并后的驻店计时器和兑换模块组件
import React, { useState, useEffect } from 'react';
import { Card, Typography, Space, Progress, message, Image, App, Modal, Table, Tag, Row, Col } from 'antd';
import { ClockCircleOutlined, GiftOutlined, ShoppingCartOutlined, TrophyOutlined, ReloadOutlined, WalletOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../store/modules/auth';
import { getPendingVisitSession } from '../../services/firebase/visitSessions';
import { getUserRedemptionLimits, canUserRedeem, getDailyRedemptions, getTotalRedemptions, getHourlyRedemptions, getRedemptionConfig, createRedemptionRecord } from '../../services/firebase/redemption';
import { createMembershipFeeRecord, deductMembershipFee } from '../../services/firebase/membershipFee';
import { getUserData } from '../../services/firebase/auth';
import { useNavigate } from 'react-router-dom';
import type { VisitSession, AppConfig } from '../../types';
import { getAppConfig } from '../../services/firebase/appConfig';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

interface VisitTimerRedemptionProps {
  style?: React.CSSProperties;
}

export const VisitTimerRedemption: React.FC<VisitTimerRedemptionProps> = ({ style }) => {
  const { user, setUser } = useAuthStore();
  const navigate = useNavigate();
  const { modal } = App.useApp();
  const [currentSession, setCurrentSession] = useState<VisitSession | null>(null);
  const [duration, setDuration] = useState<string>('00:00:00');
  const [lastCheckIn, setLastCheckIn] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);
  const [limits, setLimits] = useState({ dailyLimit: 3, totalLimit: 25, hourlyLimit: undefined as number | undefined });
  const [dailyCount, setDailyCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [hourlyCount, setHourlyCount] = useState(0);

  const [cutoffTime, setCutoffTime] = useState('23:00');
  const [totalHours, setTotalHours] = useState(0);
  const [targetHours, setTargetHours] = useState(150);
  const [milestones, setMilestones] = useState<Array<{ hoursRequired: number; dailyLimitBonus: number; totalLimitBonus?: number }>>([]);
  const [canRedeemThisHour, setCanRedeemThisHour] = useState(true);
  const [countdownSeconds, setCountdownSeconds] = useState<number | null>(null); // 倒计时剩余秒数
  const [annualFeeAmount, setAnnualFeeAmount] = useState<number | null>(null); // 年费金额
  const [dayPassConfig, setDayPassConfig] = useState<any>(null);
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [membershipModalVisible, setMembershipModalVisible] = useState(false);
  const [selectedAccess, setSelectedAccess] = useState<'membership' | 'daypass' | null>(null);
  const [redemptionHistory, setRedemptionHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // 加载倒计时状态（从localStorage）
  useEffect(() => {
    if (!user?.id) {
      setCountdownSeconds(null);
      return;
    }

    const storageKey = `redeem_countdown_${user.id}`;
    const savedTimestamp = localStorage.getItem(storageKey);


    if (savedTimestamp) {
      const lastClickTime = parseInt(savedTimestamp, 10);
      const now = Date.now();
      const elapsed = Math.floor((now - lastClickTime) / 1000); // 已过秒数
      const remaining = Math.max(0, 3600 - elapsed); // 1小时 = 3600秒


      if (remaining > 0) {
        setCountdownSeconds(remaining);
      } else {
        // 倒计时已结束，清除localStorage
        localStorage.removeItem(storageKey);
        setCountdownSeconds(null);
      }
    } else {
      setCountdownSeconds(null);
    }
  }, [user?.id]);

  // 倒计时更新
  useEffect(() => {
    if (countdownSeconds === null || countdownSeconds <= 0) {
      return;
    }


    const interval = setInterval(() => {
      setCountdownSeconds(prev => {
        if (prev === null || prev <= 1) {
          // 倒计时结束，清除localStorage
          if (user?.id) {
            const storageKey = `redeem_countdown_${user.id}`;
            localStorage.removeItem(storageKey);
          }
          return null;
        }
        const newValue = prev - 1;
        if (newValue % 60 === 0) {
          // 每分钟记录一次日志
        }
        return newValue;
      });
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [countdownSeconds, user?.id]);

  // 计算基于小时数的兑换限额（每50小时+25支）
  const calculateCigarLimitFromHours = (hours: number): number => {
    const baseLimit = 25; // 基础25支
    const bonusPer50Hours = 25; // 每50小时+25支
    const bonusHours = Math.floor(hours / 50) * 50; // 向下取整到最近的50的倍数
    const bonusCigars = (bonusHours / 50) * bonusPer50Hours;
    return baseLimit + bonusCigars;
  };

  // 加载驻店会话数据
  useEffect(() => {
    if (!user?.id) {
      setCurrentSession(null);
      setLastCheckIn(user?.membership?.lastCheckInAt || null);
      return;
    }

    const loadSession = async () => {
      const session = await getPendingVisitSession(user.id);
      setCurrentSession(session);
      setLastCheckIn(user.membership?.lastCheckInAt || null);
    };

    loadSession();
    const interval = setInterval(loadSession, 10000); // 每10秒刷新一次

    return () => clearInterval(interval);
  }, [user]);

  // 计算实时时长
  useEffect(() => {
    if (!currentSession?.checkInAt) {
      setDuration('00:00:00');
      return;
    }

    const updateDuration = () => {
      const now = new Date();
      const checkInAt = currentSession.checkInAt;
      const diffMs = now.getTime() - checkInAt.getTime();
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
      setDuration(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
    };

    updateDuration();
    const interval = setInterval(updateDuration, 1000); // 每秒更新

    return () => clearInterval(interval);
  }, [currentSession]);

  // 获取当前会员期限内的累计驻店时长
  const loadTotalHours = async () => {
    if (!user?.id) {
      setTotalHours(0);
      return;
    }
    const userId = user.id;
    try {
      const { getUserMembershipPeriod } = await import('../../services/firebase/membershipFee');
      const { getUserVisitSessions } = await import('../../services/firebase/visitSessions');
      const period = await getUserMembershipPeriod(userId);

      const sessions = await getUserVisitSessions(userId);

      if (!period) {
        // 如果没有找到会员期限记录（可能是新系统迁移前的活跃用户），则计算所有已完成记录
        const allHours = sessions
          .filter(s => s.status === 'completed' && s.durationHours)
          .reduce((sum, s) => sum + (s.durationHours || 0), 0);
        setTotalHours(allHours);
        return;
      }

      const periodSessions = sessions.filter(session => {
        if (session.status !== 'completed' || !session.checkOutAt) {
          return false;
        }
        // 确保 checkOutAt 是 Date 对象
        const checkOutDate = session.checkOutAt instanceof Date ? session.checkOutAt : new Date(session.checkOutAt);
        const inPeriod = checkOutDate.getTime() >= period.startDate.getTime() && checkOutDate.getTime() < period.endDate.getTime();
        return inPeriod;
      });

      const hours = periodSessions.reduce((sum, session) => sum + (session.durationHours || 0), 0);
      setTotalHours(hours);
    } catch (error) {
      console.error('[loadTotalHours] Error:', error);
      setTotalHours(0);
    }
  };

  // 加载应用配置
  useEffect(() => {
    const loadAppConfig = async () => {
      try {
        const config = await getAppConfig();
        if (config) {
          setAppConfig(config);
        }
      } catch (error) {
        console.error('加载应用配置失败:', error);
      }
    };
    loadAppConfig();
  }, []);

  // 加载兑换数据和时长数据
  const loadData = async () => {
    if (!user?.id) {
      setTotalHours(0);
      return;
    }
    const userId = user.id;
    try {
      // 加载累计驻店时长
      await loadTotalHours();

      const userLimits = await getUserRedemptionLimits(userId);

      setLimits({
        dailyLimit: userLimits.dailyLimit,
        totalLimit: userLimits.totalLimit,
        hourlyLimit: userLimits.hourlyLimit
      });

      const config = await getRedemptionConfig();
      if (config) {
        setCutoffTime(config.cutoffTime);

        // 设置目标为150小时（固定里程碑）
        setTargetHours(150);

        // 生成固定里程碑（50, 100, 150小时）
        setMilestones([
          { hoursRequired: 50, dailyLimitBonus: 1 },
          { hoursRequired: 100, dailyLimitBonus: 2 },
          { hoursRequired: 150, dailyLimitBonus: 3 }
        ]);
      }

      // 获取当日兑换记录（只计算已完成的记录）
      const today = new Date().toISOString().split('T')[0];
      const dailyRedemptions = await getDailyRedemptions(userId, today);
      const completedDailyRedemptions = dailyRedemptions.filter(r => r.status === 'completed');
      const dailyCountValue = completedDailyRedemptions.reduce((sum, r) => sum + r.quantity, 0);
      setDailyCount(dailyCountValue);


      // 获取总兑换记录（只计算已完成的记录）
      const totalRedemptions = await getTotalRedemptions(userId);
      const completedTotalRedemptions = totalRedemptions.filter(r => r.status === 'completed');
      const totalCountValue = completedTotalRedemptions.reduce((sum, r) => sum + r.quantity, 0);
      setTotalCount(totalCountValue);

      // 获取本小时兑换记录（用于检查每小时限制）
      try {
        const now = new Date();
        const hourKey = now.toISOString().split(':')[0]; // YYYY-MM-DDTHH
        const hourlyRedemptions = await getHourlyRedemptions(userId, hourKey);
        const currentHourlyCount = hourlyRedemptions.reduce((sum, r) => sum + r.quantity, 0);
        setHourlyCount(currentHourlyCount);

        // 检查本小时是否还可以兑换（默认每小时只能兑换1次）
        const effectiveHourlyLimit = userLimits.hourlyLimit !== undefined ? userLimits.hourlyLimit : 1;
        setCanRedeemThisHour(currentHourlyCount < effectiveHourlyLimit);

      } catch (error) {
        // 如果获取失败，默认允许兑换（避免因为查询失败而禁用按钮）
        setCanRedeemThisHour(true);
        setHourlyCount(0);
      }

      // 获取 Day Pass 配置
      try {
        const { getPointsConfig } = await import('../../services/firebase/pointsConfig');
        const pointsConfig = await getPointsConfig();
        if (pointsConfig?.dayPass) {
          setDayPassConfig(pointsConfig.dayPass);
        }
      } catch (e) {
        console.error('加载 Day Pass 配置失败:', e);
      }
    } catch (error) {
      // 加载失败，静默处理
    }
  };

  // 加载年费金额
  useEffect(() => {
    const loadAnnualFee = async () => {
      try {
        const { getCurrentAnnualFeeAmount } = await import('../../services/firebase/membershipFee');
        const amount = await getCurrentAnnualFeeAmount();
        setAnnualFeeAmount(amount);
      } catch (error) {
        // 获取年费金额失败，静默处理
      }
    };
    if (user?.id) {
      loadAnnualFee();
    }
  }, [user?.id]);

  // 加载兑换数据和时长数据
  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // 每30秒刷新一次

    return () => clearInterval(interval);
  }, [user]);

  // 开通会员
  const handleActivateMembership = async () => {
    if (!user?.id) {
      message.warning('请先登录');
      return;
    }

    if (loading) {
      return;
    }

    setLoading(true);

    try {
      // 先检查是否已存在 pending 状态的年费记录
      const { getUserMembershipFeeRecords } = await import('../../services/firebase/membershipFee');
      const existingRecords = await getUserMembershipFeeRecords(user.id, 10);
      const pendingRecord = existingRecords.find(r => r.status === 'pending' && r.renewalType === 'initial');

      let recordId: string;

      if (pendingRecord) {
        recordId = pendingRecord.id;
      } else {
        const today = new Date();
        const result = await createMembershipFeeRecord(
          user.id,
          today,
          'initial'
        );

        if (!result.success || !result.recordId) {
          message.error(result.error || '创建年费记录失败');
          setLoading(false);
          return;
        }

        recordId = result.recordId;
      }

      // 立即尝试扣除年费
      const deductResult = await deductMembershipFee(recordId);

      if (deductResult.success) {
        message.success('会员开通成功！');

        // 刷新用户信息
        try {
          const updatedUser = await getUserData(user.id);
          if (updatedUser) {
            setUser(updatedUser);
          }
        } catch (error) {
          // 静默处理
        }

        await loadData();
        setMembershipModalVisible(false);
        setSelectedAccess(null);
      } else {
        message.error(deductResult.error || '扣除年费失败，请稍后重试');
      }
    } catch (error: any) {
      message.error(error.message || '开通会员失败，请重试');
    } finally {
      setLoading(false);
    }
  };
  const handleRedeem = async () => {
    if (!user?.id) {
      message.warning('请先登录');
      return;
    }

    if (loading) {
      return;
    }

    setLoading(true);

    try {
      const session = await getPendingVisitSession(user.id);
      if (!session) {
        message.warning('请先check-in才能兑换');
        setLoading(false);
        return;
      }

      const canRedeem = await canUserRedeem(user.id, 1);
      if (!canRedeem.canRedeem) {
        message.warning(canRedeem.reason || '无法兑换');
        setLoading(false);
        return;
      }

      const { createPendingRedemptionRecord } = await import('../../services/firebase/redemption');
      const result = await createPendingRedemptionRecord(user.id, session.id, 1);

      if (result.success) {
        message.success('兑换请求已提交，请等待管理员选择雪茄产品');
        const storageKey = `redeem_countdown_${user.id}`;
        localStorage.setItem(storageKey, Date.now().toString());
        setCountdownSeconds(3600);
      } else {
        message.error(result.error || '提交兑换请求失败');
      }
    } catch (error: any) {
      message.error(error.message || '兑换失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleBuyDayPass = async () => {
    if (!user?.id) {
      message.warning('请先登录');
      return;
    }
    if (loading) return;
 
    setLoading(true);
    try {
      const { purchaseDayPass } = await import('../../services/firebase/visitSessions');
      const result = await purchaseDayPass(user.id, user.displayName, currentSession?.id);
      if (result.success) {
        message.success('Day Pass 购买成功，已为您自动办理签到及雪茄兑换！');
        const updatedUser = await getUserData(user.id);
        if (updatedUser) setUser(updatedUser);
        await loadData();
        setMembershipModalVisible(false);
        setSelectedAccess(null);
      } else {
        message.error(result.error || '购买失败');
      }
    } catch (error: any) {
      message.error(error.message || '购买失败');
    } finally {
      setLoading(false);
    }
  };
 
  if (!user) {
    return null;
  }

  const dailyRemaining = Math.max(0, limits.dailyLimit - dailyCount);
  const totalRemaining = Math.max(0, limits.totalLimit - totalCount);
  const dailyPercent = limits.dailyLimit > 0 ? (dailyCount / limits.dailyLimit) * 100 : 0;
  const totalPercent = limits.totalLimit > 0 ? (totalCount / limits.totalLimit) * 100 : 0;

  // 检查是否在截止时间之前
  const now = new Date();
  const [cutoffHour, cutoffMinute] = cutoffTime.split(':').map(Number);
  const cutoff = new Date(now);
  cutoff.setHours(cutoffHour, cutoffMinute, 0, 0);
  // 如果当前时间已经过了今天的截止时间，检查是否应该允许兑换
  // 如果当前时间小于截止时间，说明还在今天，允许兑换
  const isBeforeCutoff = now < cutoff;

  // 计算合并后的进度条数据
  const hoursText = formatHours(totalHours);
  // 使用后端返回的限额，而不是前端计算值（确保与里程碑奖励逻辑一致）
  const currentCigarLimit = limits.totalLimit; // 使用 getUserRedemptionLimits 返回的 totalLimit
  const maxCigarLimit = calculateCigarLimitFromHours(targetHours); // 150小时时的限额（仅用于进度条显示）
  const hoursPercent = targetHours > 0 ? Math.min(100, (totalHours / targetHours) * 100) : 0;
  const cigarPercent = currentCigarLimit > 0 ? Math.min(100, (totalCount / currentCigarLimit) * 100) : 0;

  // 生成里程碑（每50小时一个）
  const generateMilestones = (maxHours: number) => {
    const milestones = [];
    for (let hours = 50; hours <= maxHours; hours += 50) {
      const cigars = calculateCigarLimitFromHours(hours);
      milestones.push({ hours, cigars });
    }
    return milestones;
  };

  const progressMilestones = generateMilestones(targetHours);

  return (
    <Card
      style={{
        background: 'linear-gradient(135deg, rgba(26, 26, 26, 0.95) 0%, rgba(45, 45, 45, 0.95) 100%)',
        border: '1px solid rgba(255, 215, 0, 0.2)',
        borderRadius: 12,
        ...style
      }}
      styles={{ body: { padding: 16 } }}
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        {/* 上半部分：计时器区域 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          {/* 左侧：计时器信息 */}
          <div style={{ flex: 1 }}>
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              {/* Last Check In - 显示在计时器上面 */}
              {lastCheckIn && (
                <div>
                  <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: 600 }}>
                    Last Check In:
                  </Text>
                  <Text style={{ color: '#c0c0c0', fontSize: 11, marginLeft: 8 }}>
                    {dayjs(lastCheckIn).format('YYYY-MM-DD HH:mm:ss')}
                  </Text>
                </div>
              )}

              {/* Stay Duration Timer */}
              <div>
                <Title level={3} style={{ margin: 0, color: '#FFFFFF', fontFamily: 'monospace' }}>
                  {duration}
                </Title>
                <Text style={{ color: '#c0c0c0', fontSize: 12 }}>
                  <ClockCircleOutlined /> Stay Duration Timer
                </Text>
              </div>
            </Space>
          </div>

          {/* 右侧：Redeem 按钮 */}
          <div style={{ marginLeft: 16, textAlign: 'center' }}>
            {(() => {
              // 计算倒计时显示文本
              const formatCountdown = (seconds: number): string => {
                const hours = Math.floor(seconds / 3600);
                const minutes = Math.floor((seconds % 3600) / 60);
                const secs = seconds % 60;
                return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
              };

              // 检查用户会员状态
              const isActiveMember = user?.status === 'active';
              const hasDayPass = currentSession?.dayPass?.isPurchased;

              // 如果不是活跃会员且没有购买 Day Pass，显示合并按钮
              if (!isActiveMember && !hasDayPass) {
                return (
                  <button
                    type="button"
                    onClick={() => setMembershipModalVisible(true)}
                    disabled={loading}
                    style={{
                      background: appConfig?.colorTheme?.primaryButton
                        ? `linear-gradient(135deg, ${appConfig.colorTheme.primaryButton.startColor} 0%, ${appConfig.colorTheme.primaryButton.endColor} 100%)`
                        : 'linear-gradient(135deg, #FDE08D 0%, #C48D3A 100%)',
                      color: '#111',
                      height: 48,
                      fontSize: 16,
                      fontWeight: 600,
                      minWidth: 140,
                      opacity: loading ? 0.6 : 1,
                      cursor: loading ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      borderRadius: 6,
                      padding: '0 24px',
                      boxShadow: '0 4px 12px rgba(196, 141, 58, 0.3)'
                    }}
                  >
                    {loading && <span className="anticon-spin" style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid #111', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />}
                    <TrophyOutlined />
                    Join NOW
                  </button>
                );
              }

              // 如果是活跃会员或已购买 Day Pass，显示正常逻辑
              const currentPoints = user?.membership?.points || 0;
              const isLowPoints = currentPoints < 50;

              // 判断按钮状态和显示文本
              let buttonText = 'Redeem';
              let isDisabled = true;
              let buttonIcon: React.ReactNode = undefined;
              let buttonOnClick: () => void | Promise<void> = handleRedeem;
              let buttonStyle: React.CSSProperties = {
                background: appConfig?.colorTheme?.primaryButton
                  ? `linear-gradient(135deg, ${appConfig.colorTheme.primaryButton.startColor} 0%, ${appConfig.colorTheme.primaryButton.endColor} 100%)`
                  : 'linear-gradient(135deg, #FDE08D 0%, #C48D3A 100%)',
                border: 'none',
                color: '#111',
                height: 48,
                fontSize: 16,
                fontWeight: 600,
                minWidth: 120
              };

              // 如果积分少于50，显示Reload按钮
              if (isLowPoints) {
                buttonText = 'Reload';
                buttonIcon = <ReloadOutlined />;
                buttonOnClick = () => {
                  navigate('/reload');
                };
                isDisabled = false;
                buttonStyle.opacity = 1;
              }
              // 如果dailyCount >= dailyLimit，显示"No Quota"
              else if (dailyCount >= limits.dailyLimit) {
                buttonText = 'No Quota';
                isDisabled = true;
                buttonStyle.opacity = 0.5;
              }
              // 如果倒计时中，显示倒计时
              else if (countdownSeconds !== null && countdownSeconds > 0) {
                buttonText = formatCountdown(countdownSeconds);
                isDisabled = true;
                buttonStyle.opacity = 0.7;
              }
              // 其他情况，检查是否可以兑换
              else {
                isDisabled = !isBeforeCutoff || !currentSession || loading;
                buttonStyle.opacity = isDisabled ? 0.5 : 1;
                buttonIcon = countdownSeconds === null || countdownSeconds <= 0 ? <ShoppingCartOutlined /> : undefined;
              }

              return (
                <>
                  <button
                    type="button"
                    onClick={buttonOnClick}
                    disabled={isDisabled || loading}
                    style={{
                      ...buttonStyle,
                      cursor: (isDisabled || loading) ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      borderRadius: 6,
                      padding: '0 16px'
                    }}
                    title={
                      isLowPoints
                        ? `积分不足（当前: ${currentPoints}），请先充值`
                        : dailyCount >= limits.dailyLimit
                          ? '今日兑换限额已用完'
                          : countdownSeconds !== null && countdownSeconds > 0
                            ? `请等待 ${formatCountdown(countdownSeconds)} 后再次兑换`
                            : !currentSession
                              ? '请先check-in才能兑换'
                              : !isBeforeCutoff
                                ? `兑换截止时间为 ${cutoffTime}，请明日再试`
                                : undefined
                    }
                  >
                    {loading && <span style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid #111', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />}
                    {buttonIcon}
                    {buttonText}
                  </button>
                  <Text style={{ fontSize: 13, display: 'block', marginTop: 8, color: '#FFFFFF' }}>
                    Daily Limit: {dailyCount}/{limits.dailyLimit}
                  </Text>
                </>
              );
            })()}
          </div>
        </div>

        {/* 合并后的兑换和时长奖励区域 */}
        <div
          style={{
            background: 'rgba(0, 0, 0, 0.2)',
            border: '1px solid rgba(255, 215, 0, 0.3)',
            borderRadius: 8,
            padding: 16,
            marginTop: 8
          }}
        >
          {/* 合并的进度条区域 */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Title level={5} style={{ margin: 0, color: '#FFFFFF', fontSize: 18, fontWeight: 700 }}>
                  Complimentary Cigars
                </Title>
              </div>
              <div
                onClick={async () => {
                  setHistoryModalVisible(true);
                  if (user?.id) {
                    setHistoryLoading(true);
                    try {
                      const history = await getTotalRedemptions(user.id);
                      // getTotalRedemptions 已经返回了拍平后的 RedemptionRecord[]
                      const sortedHistory = [...history].sort((a, b) => {
                        const dateA = a.redeemedAt instanceof Date ? a.redeemedAt : new Date(a.redeemedAt);
                        const dateB = b.redeemedAt instanceof Date ? b.redeemedAt : new Date(b.redeemedAt);
                        return dateB.getTime() - dateA.getTime();
                      });
                      setRedemptionHistory(sortedHistory);
                    } catch (error) {
                      message.error('加载历史记录失败');
                    } finally {
                      setHistoryLoading(false);
                    }
                  }
                }}
                style={{
                  background: 'none',
                  padding: 0,
                  color: '#C48D3A',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  textDecoration: 'none'
                }}
              >
                History &gt;
              </div>
            </div>

            {/* 合并的进度条显示 */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
                {/* 驻店时间统计 */}
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <Text style={{ fontSize: 20, fontWeight: 700, color: '#FFD700' }}>{hoursText}</Text>
                  <Text style={{ fontSize: 16, fontWeight: 400, color: '#9ca3af' }}>/ {targetHours} hrs</Text>
                </div>
                {/* 雪茄兑换统计 */}
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <Text style={{ fontSize: 20, fontWeight: 700, color: '#FFD700' }}>{totalCount}</Text>
                  <Text style={{ fontSize: 16, fontWeight: 400, color: '#9ca3af' }}>/ {currentCigarLimit} Cigars</Text>
                </div>
              </div>

              {/* 合并的进度条 */}
              <div style={{ position: 'relative', marginBottom: 12 }}>
                <div style={{ height: 12, width: '100%', borderRadius: 9999, backgroundColor: '#374151', overflow: 'visible', position: 'relative' }}>
                  <div
                    style={{
                      height: '100%',
                      borderRadius: 9999,
                      background: 'linear-gradient(90deg, #FDE08D 0%, #C48D3A 100%)',
                      width: `${hoursPercent}%`,
                      transition: 'width 0.3s ease'
                    }}
                  />

                  {/* 里程碑标记（每50小时）- 显示在进度条宽度范围内 */}
                  {progressMilestones.length > 0 && (
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      display: 'flex',
                      alignItems: 'center',
                      pointerEvents: 'none'
                    }}>
                      {progressMilestones.map((milestone, index) => {
                        const position = (milestone.hours / targetHours) * 93;
                        const isCompleted = totalHours >= milestone.hours;

                        return (
                          <div
                            key={index}
                            style={{
                              position: 'absolute',
                              left: `${position}%`,
                              transform: 'translateX(-50%)',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              width: '1px'
                            }}
                          >
                            <div style={{
                              height: '12px',
                              width: '1px',
                              backgroundColor: 'transparent',
                              marginBottom: '4px'
                            }} />
                            <Text style={{
                              fontSize: 11,
                              color: isCompleted ? '#000000' : '#9ca3af',
                              whiteSpace: 'nowrap',
                              marginTop: '4px',
                              fontWeight: isCompleted ? 600 : 400
                            }}>
                              {milestone.hours}hrs
                            </Text>
                            <TrophyOutlined
                              style={{
                                fontSize: 18,
                                color: isCompleted ? '#C48D3A' : '#9ca3af',
                                marginTop: '4px'
                              }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* 底部信息 */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: 32 }}>
                <Text style={{ color: '#d1d5db', fontSize: 14, fontWeight: 600 }}>
                  🎁 <Text style={{ color: '#FFD700' }}>25</Text> Cigars / 50 hrs
                </Text>
              </div>
            </div>

            {/* 截止提示 */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              borderRadius: 6,
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              padding: 8,
              textAlign: 'center'
            }}>
              <span style={{ fontSize: 16, color: '#FDE08D' }}></span>
              <Text style={{ fontSize: 12, color: '#9ca3af' }}>
                Last call for redemption is at {cutoffTime} PM
              </Text>
            </div>
          </div>
        </div>
      </Space>

      <Modal
        title={
          <Space>
            <GiftOutlined style={{ color: '#FDE08D' }} />
            <span style={{ color: '#FDE08D' }}>Redemption History</span>
          </Space>
        }
        open={historyModalVisible}
        onCancel={() => setHistoryModalVisible(false)}
        footer={null}
        width={500}
        centered
        styles={{
          mask: { backdropFilter: 'blur(4px)' },
          content: {
            background: '#1a1612',
            border: '1px solid rgba(244, 175, 37, 0.3)',
            borderRadius: 16
          },
          header: {
            background: 'transparent',
            borderBottom: '1px solid rgba(244, 175, 37, 0.2)',
            paddingBottom: 16
          }
        }}
      >
        <Table
          dataSource={redemptionHistory}
          loading={historyLoading}
          rowKey={(record, index) => record.id || `history-${index}`}
          pagination={{ pageSize: 5, simple: true }}
          size="small"
          columns={[
            {
              title: 'Date',
              dataIndex: 'redeemedAt',
              key: 'redeemedAt',
              render: (ts) => {
                const date = ts instanceof Date ? ts : new Date(ts);
                return <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13 }}>{dayjs(date).format('MM-DD HH:mm')}</Text>
              }
            },
            {
              title: 'Cigar',
              dataIndex: 'cigarName',
              key: 'cigarName',
              render: (name) => <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13 }}>{name || '-'}</Text>
            },
            {
              title: 'Qty',
              dataIndex: 'quantity',
              key: 'quantity',
              render: (qty) => <Text style={{ color: '#FDE08D', fontWeight: 600 }}>{qty}</Text>
            },
            {
              title: 'Status',
              dataIndex: 'status',
              key: 'status',
              render: (status) => (
                <Tag color={status === 'completed' ? 'gold' : 'default'} style={{ borderRadius: 4 }}>
                  {status?.toUpperCase() || 'COMPLETED'}
                </Tag>
              )
            }
          ]}
          locale={{
            emptyText: <Text style={{ color: 'rgba(255,255,255,0.45)' }}>No redemption records found</Text>
          }}
          style={{ background: 'transparent' }}
          className="dark-table"
        />
        <style>{`
          .dark-table .ant-table { background: transparent !important; color: #fff !important; }
          .dark-table .ant-table-thead > tr > th { 
            background: rgba(255, 255, 255, 0.05) !important; 
            color: rgba(255, 255, 255, 0.65) !important;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
          }
          .dark-table .ant-table-tbody > tr > td { 
            border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
          }
          .dark-table .ant-table-tbody > tr:hover > td {
            background: rgba(255, 255, 255, 0.02) !important;
          }
          .dark-table .ant-pagination-item-link, .dark-table .ant-pagination-item a { color: #fff !important; }
        `}</style>
      </Modal>

      {/* 会员/Day Pass 选择弹窗 */}
      <Modal
        title={<span style={{ color: '#FDE08D', fontWeight: 800, fontSize: 18 }}>Choose Your Access</span>}
        open={membershipModalVisible}
        onCancel={() => setMembershipModalVisible(false)}
        footer={null}
        width={window.innerWidth < 768 ? '95%' : 600}
        centered
        styles={{
          mask: { backdropFilter: 'blur(8px)' },
          content: {
            background: '#1a1a1a',
            border: '1px solid #C48D3A',
            borderRadius: 16,
            padding: '24px'
          }
        }}
      >
        <div style={{
          marginBottom: 16,
          padding: '12px 16px',
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: 12,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          border: '1px solid rgba(244, 175, 37, 0.2)',
          marginTop: 16
        }}>
          <span style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: 14 }}>Your Current Balance</span>
          <span style={{
            color: '#FDE08D',
            fontSize: 18,
            fontWeight: 800,
            textShadow: '0 0 10px rgba(253, 224, 141, 0.3)'
          }}>
            {user?.membership?.points || 0} pts
          </span>
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: window.innerWidth < 768 ? 'repeat(2, 1fr)' : 'repeat(2, 1fr)',
          gap: 12,
          marginTop: 16
        }}>
          {/* Card 1: Membership */}
          <div
            onClick={() => setSelectedAccess('membership')}
            style={{
              padding: window.innerWidth < 768 ? '16px 12px' : '24px',
              borderRadius: 12,
              cursor: (loading || annualFeeAmount === null) ? 'not-allowed' : 'pointer',
              background: selectedAccess === 'membership' ? 'rgba(253,224,141,0.08)' : 'rgba(255,255,255,0.03)',
              border: selectedAccess === 'membership' ? '2px solid #FDE08D' : '1px solid rgba(255,255,255,0.1)',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: window.innerWidth < 768 ? 160 : 200,
              boxShadow: selectedAccess === 'membership' ? '0 0 15px rgba(253,224,141,0.2)' : 'none',
            }}
            className="membership-selection-card"
          >
            <div>
              <div style={{ color: selectedAccess === 'membership' ? '#FDE08D' : '#fff', fontWeight: 800, fontSize: 16, marginBottom: 8 }}>
                Annual Membership
              </div>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, lineHeight: 1.4 }} className="benefit-list">
                ✓ Annual membership<br />
                ✓ Accumulate Stay Hours<br />
                ✓ Priority Access<br />
                ✓ Rate per hour<br />
                ✓ FREE 25/50/75 Cigar<br />
                ✓ Daily redemption limit 3/5/6
              </div>
            </div>
            <div style={{ textAlign: 'right', marginTop: 16 }} className="price-text-container">
              <div style={{
                fontSize: 20,
                fontWeight: 800,
                backgroundImage: 'linear-gradient(to right,#FDE08D,#C48D3A)',
                WebkitBackgroundClip: 'text',
                color: 'transparent'
              }}>
                {annualFeeAmount} pts
              </div>
              <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 9, letterSpacing: 1 }}>YEARLY</div>
            </div>
          </div>

          {/* Card 2: Day Pass */}
          <div
            onClick={() => setSelectedAccess('daypass')}
            style={{
              padding: window.innerWidth < 768 ? '16px 12px' : '24px',
              borderRadius: 12,
              cursor: loading ? 'not-allowed' : 'pointer',
              background: selectedAccess === 'daypass' ? 'rgba(253,224,141,0.08)' : 'rgba(255,255,255,0.03)',
              border: selectedAccess === 'daypass' ? '2px solid #FDE08D' : '1px solid rgba(255,255,255,0.1)',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: window.innerWidth < 768 ? 160 : 200,
              boxShadow: selectedAccess === 'daypass' ? '0 0 15px rgba(253,224,141,0.2)' : 'none',
            }}
            className="membership-selection-card"
          >
            <div>
              <div style={{ color: selectedAccess === 'daypass' ? '#FDE08D' : '#fff', fontWeight: 800, fontSize: 16, marginBottom: 8 }}>
                Day Pass
              </div>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, lineHeight: 1.4 }} className="benefit-list">
                ✓ 3 Hours Free<br />
                ✓ 1 Cigar Included<br />
                ✓ One-time Entry<br />
                ✓ Rate per hour<br />
                <span style={{ color: 'rgba(255,255,255,0.3)' }}>X FREE 25/50/75 Cigar</span><br />
                <span style={{ color: 'rgba(255,255,255,0.3)' }}>X Accumulate Stay Hours</span>
              </div>
            </div>
            <div style={{ textAlign: 'right', marginTop: 16 }} className="price-text-container">
              <div style={{
                fontSize: 20,
                fontWeight: 800,
                backgroundImage: 'linear-gradient(to right,#FDE08D,#C48D3A)',
                WebkitBackgroundClip: 'text',
                color: 'transparent'
              }}>
                {dayPassConfig?.cost || 100} pts
              </div>
              <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 9, letterSpacing: 1 }}>ONE-TIME</div>
            </div>
          </div>
        </div>
 
        {/* Action Button Section */}
        {selectedAccess && (() => {
          const currentPoints = user?.membership?.points || 0;
          const cost = selectedAccess === 'membership' ? (annualFeeAmount || 0) : (dayPassConfig?.cost || 100);
          const hasEnoughPoints = currentPoints >= cost;
 
          return (
            <div style={{ marginTop: 24 }}>
              <button
                type="button"
                onClick={hasEnoughPoints ? (selectedAccess === 'membership' ? handleActivateMembership : handleBuyDayPass) : () => navigate('/reload')}
                disabled={loading}
                style={{
                  width: '100%',
                  height: 48,
                  borderRadius: 12,
                  background: 'linear-gradient(to right,#FDE08D,#C48D3A)',
                  border: 'none',
                  color: '#111',
                  fontWeight: 700,
                  fontSize: 16,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 15px rgba(244,175,37,0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8
                }}
              >
                {loading && <span className="anticon-spin" style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />}
                {!hasEnoughPoints && <WalletOutlined />}
                {hasEnoughPoints 
                  ? (selectedAccess === 'membership' ? 'Confirm Activation' : 'Confirm Purchase')
                  : `Reload Points (Short: ${cost - currentPoints})`
                }
              </button>
            </div>
          );
        })()}

        <style>{`
          .membership-selection-card {
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
          }
          @media (max-width: 575px) {
            .membership-selection-card {
              padding: 12px 10px !important;
              min-height: 180px !important;
            }
            .membership-selection-card .benefit-list {
              font-size: 10px !important;
              line-height: 1.4 !important;
              margin-top: 4px !important;
            }
            .membership-selection-card .price-text-container {
              margin-top: 12px !important;
            }
            .membership-selection-card .price-text-container div:first-child {
              font-size: 16px !important;
            }
          }
          .membership-selection-card:hover {
            background: rgba(253,224,141,0.08) !important;
            transform: translateY(-5px);
            border-color: #FDE08D !important;
            box-shadow: 0 0 15px rgba(253,224,141,0.2) !important;
          }
        `}</style>
      </Modal>
    </Card>
  );
};

// 格式化小时显示（例如：02:32）
function formatHours(hours: number): string {
  return String(Math.floor(hours));
}

