// 合并后的驻店计时器和兑换模块组件
import React, { useState, useEffect } from 'react';
import { Card, Typography, Button, Space, Progress, message, Image } from 'antd';
import { ClockCircleOutlined, GiftOutlined, ShoppingCartOutlined, TrophyOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../store/modules/auth';
import { getPendingVisitSession } from '../../services/firebase/visitSessions';
import { getUserRedemptionLimits, canUserRedeem, getDailyRedemptions, getTotalRedemptions, getRedemptionConfig } from '../../services/firebase/redemption';
import { useNavigate } from 'react-router-dom';
import type { VisitSession } from '../../types';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

interface VisitTimerRedemptionProps {
  style?: React.CSSProperties;
}

export const VisitTimerRedemption: React.FC<VisitTimerRedemptionProps> = ({ style }) => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [currentSession, setCurrentSession] = useState<VisitSession | null>(null);
  const [duration, setDuration] = useState<string>('00:00:00');
  const [lastCheckIn, setLastCheckIn] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);
  const [limits, setLimits] = useState({ dailyLimit: 3, totalLimit: 25 });
  const [dailyCount, setDailyCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [cutoffTime, setCutoffTime] = useState('23:00');
  const [totalHours, setTotalHours] = useState(0);
  const [targetHours, setTargetHours] = useState(150);
  const [milestones, setMilestones] = useState<Array<{ hoursRequired: number; dailyLimitBonus: number; totalLimitBonus?: number }>>([]);
  
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

  // 加载兑换数据和时长数据
  useEffect(() => {
    if (!user?.id) {
      setTotalHours(0);
      return;
    }

    const hours = user.membership?.totalVisitHours || 0;
    setTotalHours(hours);

    const loadData = async () => {
      try {
        const userLimits = await getUserRedemptionLimits(user.id);
        setLimits(userLimits);

        const config = await getRedemptionConfig();
        if (config) {
          setCutoffTime(config.cutoffTime);
          
          // 加载里程碑配置
          if (config.milestoneRewards && config.milestoneRewards.length > 0) {
            const sortedRewards = [...config.milestoneRewards].sort((a, b) => a.hoursRequired - b.hoursRequired);
            setMilestones(sortedRewards);
            // 设置目标为最高里程碑
            const maxMilestone = sortedRewards[sortedRewards.length - 1];
            if (maxMilestone) {
              setTargetHours(maxMilestone.hoursRequired);
            }
          }
        }

        // 获取当日兑换记录
        const today = new Date().toISOString().split('T')[0];
        const dailyRedemptions = await getDailyRedemptions(user.id, today);
        setDailyCount(dailyRedemptions.reduce((sum, r) => sum + r.quantity, 0));

        // 获取总兑换记录
        const totalRedemptions = await getTotalRedemptions(user.id);
        setTotalCount(totalRedemptions.reduce((sum, r) => sum + r.quantity, 0));
      } catch (error) {
        console.error('加载兑换数据失败:', error);
      }
    };

    loadData();
    const interval = setInterval(loadData, 30000); // 每30秒刷新一次

    return () => clearInterval(interval);
  }, [user]);

  const handleRedeem = async () => {
    if (!user?.id) {
      message.warning('请先登录');
      return;
    }

    // 检查是否有pending session
    const session = await getPendingVisitSession(user.id);
    if (!session) {
      message.warning('请先check-in才能兑换');
      return;
    }

    // 检查是否可以兑换
    const canRedeem = await canUserRedeem(user.id, 1);
    if (!canRedeem.canRedeem) {
      message.warning(canRedeem.reason || '无法兑换');
      return;
    }

    // 跳转到兑换页面（需要在管理后台完成兑换）
    message.info('兑换功能需在驻店时联系管理员操作');
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
  const isBeforeCutoff = now < cutoff;

  // 计算合并后的进度条数据
  const hoursText = formatHours(totalHours);
  const currentCigarLimit = calculateCigarLimitFromHours(totalHours);
  const maxCigarLimit = calculateCigarLimitFromHours(targetHours); // 150小时时的限额
  const hoursPercent = targetHours > 0 ? Math.min(100, (totalHours / targetHours) * 100) : 0;
  const cigarPercent = maxCigarLimit > 0 ? Math.min(100, (totalCount / maxCigarLimit) * 100) : 0;
  
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
      bodyStyle={{ padding: 16 }}
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
            <Button
              type="primary"
              size="large"
              icon={<ShoppingCartOutlined />}
              onClick={handleRedeem}
              disabled={!isBeforeCutoff || dailyRemaining <= 0 || !currentSession}
              loading={loading}
              style={{
                background: 'linear-gradient(135deg, #FDE08D 0%, #C48D3A 100%)',
                border: 'none',
                color: '#111',
                height: 48,
                fontSize: 16,
                fontWeight: 600,
                minWidth: 120,
                opacity: (!isBeforeCutoff || dailyRemaining <= 0 || !currentSession) ? 0.5 : 1
              }}
            >
              Redeem
            </Button>
            <Text style={{ fontSize: 13, display: 'block', marginTop: 8, color: '#FFFFFF' }}>
              Daily Limit: {dailyCount}/{limits.dailyLimit}
            </Text>
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
                <span style={{ fontSize: 24 }}>🏆</span>
                <Title level={5} style={{ margin: 0, color: '#FFFFFF', fontSize: 18, fontWeight: 700 }}>
                  Complimentary Cigars
                </Title>
              </div>
              <Button 
                type="link" 
                size="small" 
                onClick={() => navigate('/redemption-history')} 
                style={{ padding: 0, color: '#C48D3A', fontSize: 14, fontWeight: 600 }}
              >
                History &gt;
              </Button>
            </div>

            {/* 合并的进度条显示 */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'flex-end', marginBottom: 8 }}>
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
                        const position = (milestone.hours / targetHours) * 100;
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
                              backgroundColor: '#2D2D2D',
                              marginBottom: '4px'
                            }} />
                            <Text style={{ 
                              fontSize: 11, 
                              color: isCompleted ? '#FFD700' : '#9ca3af',
                              whiteSpace: 'nowrap',
                              marginTop: '4px'
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 32 }}>
                <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: 400 }}>
                  <Text style={{ color: '#FFD700', fontWeight: 700 }}>{hoursText}</Text> / {targetHours} hrs
                </Text>
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
              <span style={{ fontSize: 16, color: '#FDE08D' }}>ℹ️</span>
              <Text style={{ fontSize: 12, color: '#9ca3af' }}>
                Last call for redemption is at {cutoffTime} PM
              </Text>
            </div>
          </div>
        </div>
      </Space>
    </Card>
  );
};

// 格式化小时显示（例如：02:32）
function formatHours(hours: number): string {
  const wholeHours = Math.floor(hours);
  const minutes = Math.floor((hours - wholeHours) * 60);
  return `${String(wholeHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

