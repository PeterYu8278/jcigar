// 驻店计时器组件
import React, { useState, useEffect } from 'react';
import { Card, Typography, Space } from 'antd';
import { ClockCircleOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../store/modules/auth';
import { getPendingVisitSession } from '../../services/firebase/visitSessions';
import type { VisitSession } from '../../types';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

interface VisitTimerProps {
  style?: React.CSSProperties;
}

export const VisitTimer: React.FC<VisitTimerProps> = ({ style }) => {
  const { user } = useAuthStore();
  const [currentSession, setCurrentSession] = useState<VisitSession | null>(null);
  const [duration, setDuration] = useState<string>('00:00:00');
  const [lastCheckIn, setLastCheckIn] = useState<Date | null>(null);

  useEffect(() => {
    if (!user?.id) {
      setCurrentSession(null);
      setLastCheckIn(user?.membership?.lastCheckInAt || null);
      return;
    }

    // 加载pending session
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

  if (!user) {
    return null;
  }

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
      <Space direction="vertical" size="small" style={{ width: '100%' }}>
        {/* 左侧：计时器 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Space direction="vertical" size={0}>
              <Title level={3} style={{ margin: 0, color: '#FFFFFF', fontFamily: 'monospace' }}>
                {duration}
              </Title>
              <Text style={{ color: '#c0c0c0', fontSize: 12 }}>
                <ClockCircleOutlined /> Stay Duration Timer
              </Text>
            </Space>
          </div>

          {/* 右侧：Last Check-in */}
          {lastCheckIn && (
            <div style={{ textAlign: 'right' }}>
              <Space direction="vertical" size={0}>
                <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: 600 }}>
                  Last Check In:
                </Text>
                <Text style={{ color: '#c0c0c0', fontSize: 11 }}>
                  {dayjs(lastCheckIn).format('YYYY-MM-DD HH:mm:ss')}
                </Text>
              </Space>
            </div>
          )}
        </div>
      </Space>
    </Card>
  );
};

