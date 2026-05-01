import React, { useState, useEffect } from 'react';
import { Modal, Typography, Space, Divider, Progress } from 'antd';
import { GiftOutlined, ClockCircleOutlined, TrophyOutlined, InfoCircleOutlined, UserAddOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { getAppConfig } from '../../services/firebase/appConfig';
import { useAuth } from '../../hooks/useAuth';
import { getUserTotalVisitHoursInPeriod, getTotalRedemptions, getUserRedemptionLimits } from '../../services/firebase/redemption';
import { getSuccessfulReferralCount } from '../../services/firebase/firestore';
import { getUserMembershipPeriod } from '../../services/firebase/membershipFee';
import type { AppConfig } from '../../types';

const { Text, Title } = Typography;

interface MysteryGiftBannerProps {
  style?: React.CSSProperties;
}

export const MysteryGiftBanner: React.FC<MysteryGiftBannerProps> = ({ style }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [progress, setProgress] = useState({
    hours: 0,
    referrals: 0,
    totalRedeemed: 0,
    dailyLimit: 3,
    totalLimit: 25,
    loading: false
  });

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

  // 当弹窗打开时加载进度
  useEffect(() => {
    if (showModal && user?.id) {
      const loadProgress = async () => {
        setProgress(prev => ({ ...prev, loading: true }));
        try {
          // 获取会员期限，用于重置计算
          const period = await getUserMembershipPeriod(user.id);

          const [hours, referrals, totalRedemptions, limits] = await Promise.all([
            getUserTotalVisitHoursInPeriod(user.id),
            getSuccessfulReferralCount(
              user.id,
              period?.startDate,
              period?.endDate
            ),
            getTotalRedemptions(user.id),
            getUserRedemptionLimits(user.id)
          ]);
          const completedTotal = totalRedemptions.filter(r => r.status === 'completed');
          const totalRedeemed = completedTotal.reduce((sum, r) => sum + r.quantity, 0);
          setProgress({
            hours,
            referrals,
            totalRedeemed,
            dailyLimit: limits.dailyLimit,
            totalLimit: limits.totalLimit,
            loading: false
          });
        } catch (error) {
          console.error('加载进度失败:', error);
          setProgress(prev => ({ ...prev, loading: false }));
        }
      };
      loadProgress();
    }
  }, [showModal, user?.id]);

  return (
    <>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        style={{
          background: appConfig?.colorTheme?.primaryButton
            ? `linear-gradient(135deg, ${appConfig.colorTheme.primaryButton.startColor} 0%, ${appConfig.colorTheme.primaryButton.endColor} 100%)`
            : 'linear-gradient(135deg, #FDE08D 0%, #C48D3A 100%)',
          borderRadius: 12,
          marginTop: 16,
          height: 56,
          fontSize: 16,
          fontWeight: 600,
          color: '#111',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          width: '100%',
          cursor: 'pointer',
          padding: '0 16px',
          ...style
        }}
      >
        <GiftOutlined style={{ fontSize: 20 }} />
        Redeem Your Mystery Gift Here!
      </button>

      <Modal
        title={
          <Space>
            <GiftOutlined style={{ color: '#FDE08D' }} />
            <span style={{ color: '#FDE08D' }}>Redemption Mechanism</span>
          </Space>
        }
        open={showModal}
        onCancel={() => setShowModal(false)}
        footer={null}
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
        width={400}
        centered
      >
        <div style={{ padding: '8px 0' }}>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            {/* 每日限额 */}
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <InfoCircleOutlined style={{ color: '#FDE08D' }} />
                <Text strong style={{ color: '#FFF' }}>Daily Redemption Limit</Text>
              </div>
              <ul style={{ color: 'rgba(255,255,255,0.7)', paddingLeft: 20, margin: 0, fontSize: 13 }}>
                <li>Base Limit: <Text style={{ color: '#FDE08D' }}>3 Cigars</Text> per day</li>
                <li>Wait Interval: <Text style={{ color: '#FDE08D' }}>1 Hour</Text> between each redemption</li>
                <li>Last Call: <Text style={{ color: '#FDE08D' }}>23:00 PM</Text></li>
              </ul>
            </div>

            {/* 里程碑奖励 */}
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <TrophyOutlined style={{ color: '#FDE08D' }} />
                  <Text strong style={{ color: '#FFF' }}>Hour Milestones</Text>
                </div>
                <Text style={{ fontSize: 12, color: '#FDE08D' }}>
                  Current: <Text style={{ color: '#FFF', fontWeight: 600 }}>{Math.floor(progress.hours)}h</Text>
                </Text>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[{ hours: 50, dailyBonus: 1, totalBonus: 25 }, { hours: 100, dailyBonus: 2, totalBonus: 50 }, { hours: 150, dailyBonus: 3, totalBonus: 75 }].map((item) => {
                  const isCompleted = progress.hours >= item.hours;
                  const currentPercent = Math.min(100, (progress.hours / item.hours) * 100);

                  return (
                    <div key={item.hours}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                        <Text style={{ color: isCompleted ? '#FDE08D' : 'rgba(255,255,255,0.6)' }}>Stay {item.hours} hrs</Text>
                        <Text style={{ color: isCompleted ? '#FDE08D' : 'rgba(255,255,255,0.4)', fontSize: 12 }}>
                          Daily +{item.dailyBonus} · Total +{item.totalBonus}
                        </Text>
                      </div>
                      <Progress
                        percent={currentPercent}
                        size="small"
                        showInfo={false}
                        strokeColor={isCompleted ? '#FDE08D' : '#C48D3A'}
                        trailColor="rgba(255,255,255,0.05)"
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 累计兑换总额 */}
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ClockCircleOutlined style={{ color: '#FDE08D' }} />
                  <Text strong style={{ color: '#FFF' }}>Total Redemption Quota</Text>
                </div>
                <Text style={{ fontSize: 12, color: '#FDE08D' }}>
                  <Text style={{ color: '#FFF', fontWeight: 600 }}>{progress.totalRedeemed}</Text> / {progress.totalLimit}
                </Text>
              </div>
              <Progress
                percent={Math.min(100, (progress.totalRedeemed / progress.totalLimit) * 100)}
                size="small"
                showInfo={false}
                strokeColor={progress.totalRedeemed >= progress.totalLimit ? '#ff4d4f' : '#FDE08D'}
                trailColor="rgba(255,255,255,0.05)"
              />
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 6 }}>
                Base: 25 cigars · Bonus from milestones · Resets each membership year
              </div>
            </div>

            {/* 邀请奖励 */}
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <UserAddOutlined style={{ color: '#FDE08D' }} />
                  <Text strong style={{ color: '#FFF' }}>Referral Rewards</Text>
                </div>
                <Text style={{ fontSize: 12, color: '#FDE08D' }}>
                  Current: <Text style={{ color: '#FFF', fontWeight: 600 }}>{progress.referrals}</Text> Friends
                </Text>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { target: 3, points: 100 },
                  { target: 6, points: 100 },
                  { target: 10, points: 150 },
                  { target: 20, points: 400 },
                  { target: 50, points: 1500 }
                ].map((item) => {
                  const isCompleted = progress.referrals >= item.target;
                  const currentPercent = Math.min(100, (progress.referrals / item.target) * 100);

                  return (
                    <div key={item.target}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                        <Text style={{ color: isCompleted ? '#FDE08D' : 'rgba(255,255,255,0.6)' }}>Invite {item.target} Friends</Text>
                        <Text style={{ color: isCompleted ? '#FDE08D' : 'rgba(255,255,255,0.4)' }}>
                          +{item.points} Points
                        </Text>
                      </div>
                      <Progress
                        percent={currentPercent}
                        size="small"
                        showInfo={false}
                        strokeColor={isCompleted ? '#FDE08D' : '#C48D3A'}
                        trailColor="rgba(255,255,255,0.05)"
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textAlign: 'center', display: 'block' }}>
              * Bonuses are calculated based on your total stay duration and successful referrals in the current membership period.
            </Text>
          </Space>
        </div>
      </Modal>
    </>
  );
};
