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

  // 时长奖励进度相关
  const hoursText = formatHours(totalHours);
  const hoursPercent = targetHours > 0 ? Math.min(100, (totalHours / targetHours) * 100) : 0;
  const completedMilestones = milestones.filter(m => totalHours >= m.hoursRequired);
  const nextMilestone = milestones.find(m => totalHours < m.hoursRequired);

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

        {/* 下半部分：兑换信息区域 */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: 8,
            padding: 12,
            marginTop: 8
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Image
                src="https://res.cloudinary.com/dy2zb1n41/image/upload/comp_kmz4dr"
                alt="Redemption"
                preview={false}
                style={{ height: 24, width: 'auto' }}
              />
              <Title level={5} style={{ margin: 0 }}>
                <GiftOutlined /> Redemption
              </Title>
            </div>
            <Button type="link" size="small" onClick={() => navigate('/redemption-history')} style={{ padding: 0 }}>
              History &gt;
            </Button>
          </div>

          {/* 限额显示 */}
          <Space direction="vertical" size="small" style={{ width: '100%', marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Text strong style={{ fontSize: 13 }}>Total: {totalCount}/{limits.totalLimit}</Text>
            </div>
            
            {/* 进度条 */}
            <Progress
              percent={dailyPercent}
              strokeColor={{
                '0%': '#ffd700',
                '100%': '#c48d3a',
              }}
              showInfo={false}
              style={{ marginTop: 8 }}
            />
          </Space>

          {/* 截止提示 */}
          <Text type="secondary" style={{ fontSize: 11, display: 'block', textAlign: 'center' }}>
            *Last call for cigar redemption is at or before {cutoffTime} PM
          </Text>
        </div>

        {/* 时长奖励进度区域 */}
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(138, 43, 226, 0.95) 0%, rgba(75, 0, 130, 0.95) 100%)',
            border: '1px solid rgba(255, 215, 0, 0.3)',
            borderRadius: 8,
            padding: 12,
            marginTop: 8
          }}
        >
          <Title level={5} style={{ color: '#FFFFFF', marginBottom: 12, marginTop: 0 }}>
            <TrophyOutlined /> More hours, more rewards!
          </Title>

          {/* 进度条 */}
          <Progress
            percent={hoursPercent}
            strokeColor={{
              '0%': '#ffd700',
              '100%': '#c48d3a',
            }}
            showInfo={false}
            strokeWidth={12}
            style={{ marginBottom: 12 }}
          />

          {/* 当前进度 */}
          <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: 600, display: 'block', marginBottom: 12 }}>
            <Text style={{ color: '#FFD700' }}>{hoursText}</Text> / {targetHours} hrs
          </Text>

          {/* 里程碑标记 */}
          {milestones.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
              {milestones.map((milestone, index) => {
                const isCompleted = totalHours >= milestone.hoursRequired;
                const isNext = nextMilestone?.hoursRequired === milestone.hoursRequired;
                
                return (
                  <div key={index} style={{ textAlign: 'center', flex: 1 }}>
                    <Text
                      style={{
                        color: isCompleted ? '#FFD700' : '#FFFFFF',
                        fontSize: 12,
                        fontWeight: isNext ? 600 : 400,
                        display: 'block'
                      }}
                    >
                      {milestone.hoursRequired}
                    </Text>
                    {isCompleted && (
                      <Text style={{ color: '#FFD700', fontSize: 16 }}>✓</Text>
                    )}
                  </div>
                );
              })}
            </div>
          )}
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

