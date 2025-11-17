// 时长奖励进度组件
import React, { useEffect, useState } from 'react';
import { Card, Typography, Progress, Space } from 'antd';
import { TrophyOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../store/modules/auth';
import { getRedemptionConfig } from '../../services/firebase/redemption';

const { Title, Text } = Typography;

interface HoursRewardProgressProps {
  style?: React.CSSProperties;
}

export const HoursRewardProgress: React.FC<HoursRewardProgressProps> = ({ style }) => {
  const { user } = useAuthStore();
  const [totalHours, setTotalHours] = useState(0);
  const [targetHours, setTargetHours] = useState(150);
  const [milestones, setMilestones] = useState<Array<{ hoursRequired: number; dailyLimitBonus: number; totalLimitBonus?: number }>>([]);

  useEffect(() => {
    if (!user) {
      setTotalHours(0);
      return;
    }

    const hours = user.membership?.totalVisitHours || 0;
    setTotalHours(hours);

    const loadConfig = async () => {
      const config = await getRedemptionConfig();
      if (config?.milestoneRewards && config.milestoneRewards.length > 0) {
        const sortedRewards = [...config.milestoneRewards].sort((a, b) => a.hoursRequired - b.hoursRequired);
        setMilestones(sortedRewards);
        // 设置目标为最高里程碑
        const maxMilestone = sortedRewards[sortedRewards.length - 1];
        if (maxMilestone) {
          setTargetHours(maxMilestone.hoursRequired);
        }
      }
    };

    loadConfig();
  }, [user]);

  if (!user) {
    return null;
  }

  const hoursText = formatHours(totalHours);
  const percent = targetHours > 0 ? Math.min(100, (totalHours / targetHours) * 100) : 0;

  // 找到已完成的里程碑
  const completedMilestones = milestones.filter(m => totalHours >= m.hoursRequired);
  const nextMilestone = milestones.find(m => totalHours < m.hoursRequired);

  return (
    <Card
      style={{
        background: 'linear-gradient(135deg, rgba(138, 43, 226, 0.95) 0%, rgba(75, 0, 130, 0.95) 100%)',
        border: '1px solid rgba(255, 215, 0, 0.3)',
        borderRadius: 12,
        marginTop: 16,
        ...style
      }}
      bodyStyle={{ padding: 16 }}
    >
      <Title level={5} style={{ color: '#FFFFFF', marginBottom: 16 }}>
        <TrophyOutlined /> More hours, more rewards!
      </Title>

      {/* 进度条 */}
      <Progress
        percent={percent}
        strokeColor={{
          '0%': '#ffd700',
          '100%': '#c48d3a',
        }}
        showInfo={false}
        strokeWidth={12}
        style={{ marginBottom: 16 }}
      />

      {/* 当前进度 */}
      <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: 600, display: 'block', marginBottom: 16 }}>
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
    </Card>
  );
};

// 格式化小时显示（例如：02:32）
function formatHours(hours: number): string {
  const wholeHours = Math.floor(hours);
  const minutes = Math.floor((hours - wholeHours) * 60);
  return `${String(wholeHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

