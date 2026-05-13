// 管理后台仪表板（自定义样式版本）
import React, { useEffect, useState } from 'react'
import { Typography, Button, message, Spin, Modal, Form, Select, Input, Alert } from 'antd'
import { ReloadOutlined, PlusOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import {
  getUsers,
  getAllOrders,
  getEvents,
  getAllTransactions,
  getCigars
} from '../../../services/firebase/firestore'
import { db } from '../../../config/firebase'
import { GLOBAL_COLLECTIONS } from '../../../config/globalCollections'
import { collection, addDoc } from 'firebase/firestore'
import type { User, Order, Event, Transaction, Cigar, AppConfig, SubscriptionRequest } from '../../../types'
import { useTranslation } from 'react-i18next'
import { isFeatureVisible } from '../../../services/firebase/featureVisibility'
import { useAuthStore } from '../../../store/modules/auth'
import { getAppConfig } from '../../../services/firebase/appConfig'

const { Title } = Typography
import { createBill } from '../../../services/billplz'

const PlanSelector: React.FC<{ value?: string; onChange?: (val: string) => void; plans: any[]; currentPlanId?: string; memberCount?: number }> = ({ value, onChange, plans, currentPlanId, memberCount = 0 }) => {
  const isMobile = window.innerWidth < 768;

  if (!plans || plans.length === 0) {
    return (
      <div style={{ padding: 20, textAlign: 'center', color: '#666', border: '1px dashed #444', borderRadius: 12 }}>
        No subscription plans available. Please contact admin.
      </div>
    );
  }

  return (
    <div style={{
      display: isMobile ? 'flex' : 'grid',
      flexDirection: isMobile ? 'row' : 'unset',
      overflowX: isMobile ? 'auto' : 'visible',
      gridTemplateColumns: isMobile ? 'unset' : 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: isMobile ? 8 : 12,
      paddingBottom: isMobile ? 4 : 0,
      width: '100%',
      maxWidth: '100%'
    }}>
      {plans.map((p: any) => {
        const isSelected = value === p.id;
        const isCurrent = currentPlanId === p.id;
        const isDisabled = p.maxMembers && p.maxMembers > 0 && memberCount > p.maxMembers;
        return (
          <div
            key={p.id}
            onClick={() => !isDisabled && onChange?.(p.id)}
            style={{
              flex: isMobile ? '1 1 0' : 'unset',
              minWidth: isMobile ? '100px' : 'unset',
              padding: isMobile ? '12px 8px' : '16px',
              borderRadius: 12,
              cursor: isDisabled ? 'not-allowed' : 'pointer',
              background: isDisabled ? 'rgba(255,255,255,0.01)' : (isSelected ? 'rgba(253,224,141,0.08)' : 'rgba(255,255,255,0.03)'),
              border: isDisabled ? '1px solid rgba(255,0,0,0.2)' : (isSelected ? '2px solid #FDE08D' : (isCurrent ? '2px solid rgba(82,196,26,0.6)' : '1px solid rgba(255,255,255,0.1)')),
              opacity: isDisabled ? 0.45 : 1,
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: isSelected ? '0 0 15px rgba(253,224,141,0.2)' : 'none',
              minHeight: isMobile ? 120 : 140,
              position: 'relative' as const
            }}
            onMouseEnter={(e) => {
              if (!isSelected && !isDisabled) {
                e.currentTarget.style.borderColor = 'rgba(253,224,141,0.5)';
                e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isSelected && !isDisabled) {
                e.currentTarget.style.borderColor = isCurrent ? 'rgba(82,196,26,0.6)' : 'rgba(255,255,255,0.1)';
                e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
              }
            }}
          >
            {isCurrent && (
              <div style={{
                position: 'absolute',
                top: -1,
                right: -1,
                background: '#52c41a',
                color: '#fff',
                fontSize: 9,
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '0 10px 0 8px',
                letterSpacing: 0.5
              }}>CURRENT</div>
            )}
            {isDisabled && (
              <div style={{
                position: 'absolute',
                top: -1,
                left: -1,
                background: '#ff4d4f',
                color: '#fff',
                fontSize: 9,
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '10px 0 8px 0',
                letterSpacing: 0.5
              }}>INSUFFICIENT</div>
            )}
            <div>
              <div style={{ color: isSelected ? '#FDE08D' : '#fff', fontWeight: 800, fontSize: 16, marginBottom: 4 }}>
                {p.name}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>
                <span style={{ color: '#aaa' }}>{p.maxMembers || '∞'}</span> Members<br />
                <span style={{ color: '#aaa' }}>{p.validPeriodMonth}</span> Months
              </div>
            </div>
            <div style={{ textAlign: 'right', marginTop: 12 }}>
              <div style={{
                fontSize: 20,
                fontWeight: 800,
                backgroundImage: 'linear-gradient(to right,#FDE08D,#C48D3A)',
                WebkitBackgroundClip: 'text',
                color: 'transparent'
              }}>
                RM {p.fee}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 9, letterSpacing: 1 }}>ANNUAL</div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { user, isSuperAdmin } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [cigars, setCigars] = useState<Cigar[]>([])
  const [inventoryFeatureVisible, setInventoryFeatureVisible] = useState<boolean>(true)
  const [eventsAdminFeatureVisible, setEventsAdminFeatureVisible] = useState<boolean>(true)
  const [ordersFeatureVisible, setOrdersFeatureVisible] = useState<boolean>(true)
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null)
  const [showRenewModal, setShowRenewModal] = useState(false)
  const [renewLoading, setRenewLoading] = useState(false)

  // 检查功能可见性（developer 不受限制）
  useEffect(() => {
    const checkFeatureVisibility = async () => {
      if (user?.role === 'developer') {
        // developer 不受限制，所有功能都可见
        setInventoryFeatureVisible(true)
        setEventsAdminFeatureVisible(true)
        setOrdersFeatureVisible(true)
      } else {
        const [inventoryVisible, eventsAdminVisible, ordersVisible] = await Promise.all([
          isFeatureVisible('inventory'),
          isFeatureVisible('events-admin'),
          isFeatureVisible('orders')
        ])
        setInventoryFeatureVisible(inventoryVisible)
        setEventsAdminFeatureVisible(eventsAdminVisible)
        setOrdersFeatureVisible(ordersVisible)
      }
    }
    checkFeatureVisibility()
  }, [user?.role])

  // 加载数据
  useEffect(() => {
    loadDashboardData()
    loadAppConfig()
  }, [])

  const loadAppConfig = async () => {
    try {
      const config = await getAppConfig()
      if (config) {
        setAppConfig(config)
      }
    } catch (error) {
      console.error('加载应用配置失败:', error)
    }
  }

  const loadDashboardData = async () => {
    setLoading(true)
    try {
      const [usersData, ordersData, eventsData, transactionsData, cigarsData] = await Promise.all([
        getUsers(),
        getAllOrders(isSuperAdmin ? undefined : user?.storeId),
        getEvents(isSuperAdmin ? undefined : user?.id),
        getAllTransactions(isSuperAdmin ? undefined : user?.storeId),
        getCigars()
      ])

      setUsers(usersData)
      setOrders(ordersData)
      setEvents(eventsData)
      setTransactions(transactionsData)
      setCigars(cigarsData)
    } catch (error) {
      message.error(t('messages.dataLoadFailed'))
    } finally {
      setLoading(false)
    }
  }

  // 统计数据计算
  const totalUsers = users.length
  const totalOrders = orders.length
  const activeEvents = events.filter(e => e.status === 'ongoing').length
  const totalRevenue = transactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0)

  // 本月数据
  const currentMonth = dayjs().format('YYYY-MM')
  const monthlyOrders = orders.filter(o => dayjs(o.createdAt).format('YYYY-MM') === currentMonth).length
  const monthlyRevenue = transactions
    .filter(t => t.amount > 0 && dayjs(t.createdAt).format('YYYY-MM') === currentMonth)
    .reduce((sum, t) => sum + t.amount, 0)

  // 最近订单（前5个），拆分完成/未完成
  const recentOrders = orders
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)
    .map(order => ({
      ...order,
      user: users.find(u => u.id === order.userId)?.displayName || t('dashboard.unknownUser')
    }))
  const completedOrders = recentOrders.filter(o => o.status === 'delivered')
  const pendingOrders = recentOrders.filter(o => o.status !== 'delivered')

  const [activeTab, setActiveTab] = useState<'completed' | 'pending'>('pending')

  // 低库存统计
  const lowStockCount = cigars.reduce((count, c) => {
    const stock = (c as any)?.inventory?.stock ?? 0
    const min = (c as any)?.inventory?.minStock ?? 0
    return count + (stock <= min ? 1 : 0)
  }, 0)

  const handleRenewSubmit = async (values: any) => {
    try {
      setRenewLoading(true)
      const plan = appConfig?.subscription?.plans?.find(p => p.id === values.planId)

      const currentPlanId = appConfig?.subscription?.planId || appConfig?.subscription?.plan;
      const isUpgrade = currentPlanId && currentPlanId !== values.planId;

      const requestData: any = {
        planId: values.planId,
        planName: plan?.name || values.planId,
        validPeriodMonth: plan?.validPeriodMonth || 12,
        requestedBy: user?.displayName || user?.id || 'Admin',
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
        adminNotes: values.adminNotes || '',
        paymentMethod: 'manual',
        requestType: isUpgrade ? 'upgrade' : 'renewal',
        previousPlanId: isUpgrade ? currentPlanId : undefined
      }

      // 检查平台 Billplz 是否启用
      const platformBillplz = appConfig?.paymentPlatform?.billplz;
      if (platformBillplz?.enabled && platformBillplz?.apiKey && platformBillplz?.collectionId) {
        const fee = plan?.fee || 0;
        if (fee > 0) {
          const billResponse = await createBill(
            fee,
            `Subscription Activation: ${plan?.name || values.planId}`,
            user?.displayName || 'Admin',
            user?.email || '',
            user?.phone || '',
            true // usePlatformConfig
          );

          if (billResponse.success && billResponse.data?.url) {
            // 关联 Billplz ID 并设置支付方式为在线
            requestData.billplzId = billResponse.data.id;
            requestData.paymentMethod = 'online';
            
            await addDoc(collection(db, GLOBAL_COLLECTIONS.SUBSCRIPTION_REQUESTS), requestData);
            
            message.loading('Redirecting to payment page...', 2);
            setTimeout(() => {
              window.location.href = billResponse.data!.url;
            }, 1000);
            return;
          } else {
            console.warn('Failed to create Billplz bill, falling back to manual request:', billResponse.error);
          }
        }
      }

      await addDoc(collection(db, GLOBAL_COLLECTIONS.SUBSCRIPTION_REQUESTS), requestData)

      message.success('Activation request submitted successfully. Waiting for developer verification.')
      setShowRenewModal(false)
    } catch (error) {
      console.error('Failed to submit renewal request:', error)
      message.error('Failed to submit request')
    } finally {
      setRenewLoading(false)
    }
  }


  return (
    <div style={{ minHeight: '100vh', marginBottom: 100 }}>
      {/* 顶部 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>

      </div>

      <h1 style={{ fontSize: 22, fontWeight: 800, backgroundImage: 'linear-gradient(to right,#FDE08D,#C48D3A)', WebkitBackgroundClip: 'text', color: 'transparent', marginBottom: 12 }}>{t('dashboard.overview')}</h1>

      {/* 概览卡片 */}
      <div style={window.innerWidth < 768 ? {
        backgroundColor: 'rgba(57, 51, 40, 0.5)',
        backdropFilter: 'blur(10px)',
        borderRadius: 12,
        padding: '16px 8px',
        border: '1px solid rgba(244, 175, 37, 0.3)',
        display: 'flex',
        gap: 4,
        marginBottom: 16,
        justifyContent: 'space-around'
      } : {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: 12,
        marginBottom: 16
      }}>
        {(() => {
          const { isActive, planId, plan, expiryDate, plans } = appConfig?.subscription || {};
          const currentPlan = plans?.find((p: any) => p.id === (planId || plan)) || { name: (planId || plan || 'Free').toUpperCase(), maxMembers: 50 };

          let statusValue = currentPlan.name;
          let subText = '';
          let isExpired = false;
          let daysLeft = 999;

          if (!isActive && appConfig?.subscription) {
            statusValue = 'Inactive';
            isExpired = true;
          } else if (expiryDate) {
            try {
              const exp = (expiryDate as any).toDate ? (expiryDate as any).toDate() : new Date(expiryDate as any);
              if (!isNaN(exp.getTime())) {
                daysLeft = Math.max(0, Math.ceil((exp.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)));
                isExpired = daysLeft === 0;
                const dateStr = dayjs(exp).format('YYYY-MM-DD');
                subText = `Exp: ${dateStr}`;
              }
            } catch (e) {
              console.warn('Invalid expiry date format', e);
            }
          }

          const isOverlimit = totalUsers > (currentPlan.maxMembers || 50);
          const currentPlanIndex = plans?.findIndex((p: any) => p.id === (planId || plan)) ?? -1;
          const hasHigherPlan = plans && currentPlanIndex >= 0 && currentPlanIndex < plans.length - 1;
          const showButton = isOverlimit || isExpired || daysLeft <= 30 || hasHigherPlan;

          const cards: Array<{
            label: string;
            value: string;
            subText?: string;
            isSubscription?: boolean;
            isExpired?: boolean;
            extraInfo?: string;
            showButton?: boolean;
          }> = [
              { label: t('dashboard.totalMembers'), value: `${totalUsers}/${currentPlan.maxMembers || 50}` },
              { label: '', value: statusValue, subText, isSubscription: true, isExpired: isExpired || !isActive, showButton },
              { label: t('dashboard.monthlyOrders'), value: monthlyOrders.toLocaleString() },
              isSuperAdmin ? { label: t('dashboard.monthlyRevenue'), value: `RM${monthlyRevenue.toLocaleString()}` } : null
            ].filter(Boolean) as any[];

          const isMobile = window.innerWidth < 768;

          return cards.map((card: any, idx) => (
            <div key={idx} style={{
              flex: 1,
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: isMobile ? 'flex-start' : 'center',
              minHeight: isMobile ? 'auto' : 110,
              padding: isMobile ? '0 2px' : 12,
              backgroundColor: isMobile ? 'transparent' : 'rgba(255,255,255,0.05)',
              borderRadius: isMobile ? 0 : 12,
              border: isMobile ? 'none' : '1px solid rgba(255,255,255,0.05)',
              borderRight: isMobile && idx !== cards.length - 1 ? '1px solid rgba(244, 175, 37, 0.2)' : (isMobile ? 'none' : '1px solid rgba(255,255,255,0.05)'),
              position: 'relative'
            }}>
              {!isMobile && <div style={{ fontSize: 12, color: '#A0A0A0', marginBottom: 4 }}>{card.label}</div>}

              <div style={{
                fontSize: isMobile ? (card.isSubscription ? 11 : 16) : (card.isSubscription ? 18 : 24),
                fontWeight: 800,
                backgroundImage: 'linear-gradient(to right,#FDE08D,#C48D3A)',
                WebkitBackgroundClip: 'text',
                color: 'transparent',
                lineHeight: 1.2,
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'center'
              }}>
                {typeof card.value === 'string' && card.value.includes('/') ? (
                  <>
                    <span>{card.value.split('/')[0]}</span>
                    <span style={{
                      fontSize: isMobile ? '10px' : '14px',
                      color: 'rgba(255,255,255,0.7)',
                      WebkitTextFillColor: 'rgba(255,255,255,0.7)',
                      marginLeft: 2,
                      fontWeight: 500
                    }}>
                      /{card.value.split('/')[1]}
                    </span>
                  </>
                ) : card.value}
              </div>

              {card.subText && (
                <div style={{
                  fontSize: isMobile ? 9 : 12,
                  color: card.isExpired ? '#ff4d4f' : '#EAEAEA',
                  marginTop: isMobile ? 2 : 4,
                  fontWeight: 600
                }}>
                  {card.subText}
                </div>
              )}

              {card.extraInfo && (
                <div style={{
                  fontSize: isMobile ? 8 : 11,
                  color: '#888',
                  marginTop: 2
                }}>
                  {card.extraInfo}
                </div>
              )}

              {isMobile && !card.isSubscription && (
                <div style={{ fontSize: 9, color: 'rgba(255, 255, 255, 0.6)', marginTop: 2 }}>
                  {card.label.split(' ').pop()}
                </div>
              )}

              {card.isSubscription && card.showButton && (
                <Button
                  size="small"
                  type="primary"
                  onClick={() => setShowRenewModal(true)}
                  style={{
                    marginTop: 6,
                    fontSize: isMobile ? 8 : 11,
                    height: isMobile ? 16 : 22,
                    padding: isMobile ? '0 4px' : '0 12px',
                    background: 'linear-gradient(to right,#FDE08D,#C48D3A)',
                    color: '#111',
                    border: 'none',
                    fontWeight: 600,
                    width: 'auto',
                    marginInline: 'auto'
                  }}
                >
                  {isOverlimit || hasHigherPlan ? 'Upgrade' : (isExpired ? 'Activate' : 'Renew')}
                </Button>
              )}
            </div>
          ));
        })()}
      </div>

      {/* Subscription Renewal Modal */}
      <Modal
        title={<span style={{ color: '#FDE08D' }}>Subscription Activation / Renewal / Upgrade</span>}
        open={showRenewModal}
        onCancel={() => setShowRenewModal(false)}
        footer={null}
        centered
        width={window.innerWidth < 768 ? '95%' : 800}
        styles={{ content: { background: '#1a1a1a', border: '1px solid #C48D3A' } }}
      >
        <Form layout="vertical" onFinish={handleRenewSubmit}>
          <Form.Item
            name="planId"
            label={<span style={{ color: '#ccc' }}>Choose Your Plan</span>}
            rules={[{ required: true, message: 'Please select a plan' }]}
            initialValue={appConfig?.subscription?.planId || appConfig?.subscription?.plan || 'basic'}
          >
            <PlanSelector plans={appConfig?.subscription?.plans || []} currentPlanId={appConfig?.subscription?.planId || appConfig?.subscription?.plan} memberCount={totalUsers} />
          </Form.Item>

          <Form.Item name="adminNotes" label={<span style={{ color: '#ccc' }}>Notes (Optional)</span>}>
            <Input.TextArea placeholder="Any payment notes or special requests..." />
          </Form.Item>

          <Alert
            message="Activation Process"
            description="After submitting, our developer will verify your payment and activate your subscription. Reference the member reload mechanism for proof submission if required."
            type="info"
            showIcon
            style={{ marginBottom: 16, background: 'rgba(255,255,255,0.05)', border: '1px solid #C48D3A' }}
          />

          <div style={{ textAlign: 'right' }}>
            <Button onClick={() => setShowRenewModal(false)} style={{ marginRight: 8, background: 'transparent', color: '#fff', border: '1px solid #444' }}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={renewLoading} style={{ background: 'linear-gradient(to right,#FDE08D,#C48D3A)', color: '#111', border: 'none', fontWeight: 600 }}>
              Submit Request
            </Button>
          </div>
        </Form>
      </Modal>

      {/* 快速操作 */}
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 16, fontWeight: 800, color: '#EAEAEA', paddingInline: 8 }}>{t('dashboard.quickActions')}</h2>
        <div style={{
          marginTop: 8,
          display: 'grid',
          gridTemplateColumns: (() => {
            // 基础按钮：用户管理（始终显示）
            const baseButtons = 1
            // 可选按钮：创建活动、订单管理、库存管理
            const optionalButtons = (eventsAdminFeatureVisible ? 1 : 0) + (ordersFeatureVisible ? 1 : 0) + (inventoryFeatureVisible ? 1 : 0)
            const totalButtons = baseButtons + optionalButtons
            return `repeat(${totalButtons}, 1fr)`
          })()
        }}>
          {eventsAdminFeatureVisible && (
            <button onClick={() => navigate('/admin/events')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, borderRadius: 12, padding: 8, background: appConfig?.colorTheme?.primaryButton ? `linear-gradient(to right, ${appConfig.colorTheme.primaryButton.startColor}, ${appConfig.colorTheme.primaryButton.endColor})` : 'linear-gradient(to right,#FDE08D,#C48D3A)', color: '#111', fontWeight: 700, boxShadow: '0 4px 15px rgba(244,175,37,0.35)', cursor: 'pointer' }}>
              <svg width="24" height="24" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M10 2a1 1 0 011 1v6h6a1 1 0 110 2h-6v6a1 1 0 11-2 0v-6H3a1 1 0 110-2h6V3a1 1 0 011-1z" /></svg>
              <span>{t('dashboard.createEvent')}</span>
            </button>
          )}
          {ordersFeatureVisible && (
            <button onClick={() => navigate('/admin/orders')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, borderRadius: 12, padding: 8, background: appConfig?.colorTheme?.secondaryButton?.backgroundColor || 'rgba(255,255,255,0.05)', color: appConfig?.colorTheme?.secondaryButton?.textColor || '#EAEAEA', cursor: 'pointer' }}>
              <svg width="24" height="24" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path clipRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h14a1 1 0 001-1V4a1 1 0 00-1-1H3zm12 11H5V5h10v9z" fillRule="evenodd"></path><path d="M9 7a1 1 0 100 2h2a1 1 0 100-2H9z"></path></svg>
              <span>{t('dashboard.viewOrders')}</span>
            </button>
          )}
          <button onClick={() => navigate('/admin/users')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, borderRadius: 12, padding: 8, background: appConfig?.colorTheme?.secondaryButton?.backgroundColor || 'rgba(255,255,255,0.05)', color: appConfig?.colorTheme?.secondaryButton?.textColor || '#EAEAEA', cursor: 'pointer' }}>
            <svg width="24" height="24" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path clipRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" fillRule="evenodd"></path></svg>
            <span>{t('dashboard.createUser')}</span>
          </button>
          {inventoryFeatureVisible && (
            <button onClick={() => navigate('/admin/inventory')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, borderRadius: 12, padding: 8, background: appConfig?.colorTheme?.secondaryButton?.backgroundColor || 'rgba(255,255,255,0.05)', color: appConfig?.colorTheme?.secondaryButton?.textColor || '#EAEAEA', cursor: 'pointer' }}>
              <svg width="24" height="24" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M5 8a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z"></path><path clipRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v14a1 1 0 01-1 1H4a1 1 0 01-1-1V3zm2 2v10h10V5H5z" fillRule="evenodd"></path></svg>
              <span>{t('dashboard.inventory')}</span>
            </button>
          )}
        </div>
      </div>

      {/* 订单标签页 - 仅在订单管理功能可见时显示 */}
      {ordersFeatureVisible && (
        <div style={{ marginBottom: 16, paddingInline: 8 }}>
          <div style={{ display: 'flex', borderBottom: '1px solid rgba(244,175,37,0.2)' }}>
            {(['pending', 'completed'] as const).map((tabKey) => {
              const isActive = activeTab === tabKey
              const baseStyle: React.CSSProperties = {
                flex: 1,
                padding: '10px 0',
                fontWeight: 800,
                fontSize: 12,
                outline: 'none',
                borderBottom: '2px solid transparent',
                cursor: 'pointer',
                background: 'transparent',
                border: 'none',
                position: 'relative' as const,
              }
              const activeStyle: React.CSSProperties = {
                color: 'transparent',
                backgroundImage: 'linear-gradient(to right,#FDE08D,#C48D3A)',
                WebkitBackgroundClip: 'text',
              }
              const inactiveStyle: React.CSSProperties = {
                color: '#A0A0A0',
                background: 'transparent',
              }
              return (
                <button
                  key={tabKey}
                  onClick={() => setActiveTab(tabKey)}
                  style={{ ...baseStyle, ...(isActive ? activeStyle : inactiveStyle) }}
                >
                  {tabKey === 'completed' ? t('dashboard.completedOrders') : t('dashboard.pendingOrders')}
                  {isActive && (
                    <div style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: '2px',
                      background: 'linear-gradient(to right,#FDE08D,#C48D3A)',
                      borderRadius: '1px'
                    }} />
                  )}
                </button>
              )
            })}
          </div>
          <div style={{ marginTop: 12 }}>
            {(activeTab === 'completed' ? completedOrders : pendingOrders).map((order) => (
              <div key={order.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, background: 'rgba(255,255,255,0.05)', marginBottom: 8 }}>
                <div style={{ width: 48, height: 48, borderRadius: 9999, background: 'rgba(45,39,26,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img alt="avatar" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCqh6yOfMjU5qQSoCZPZvRqAiz-okAgrdu0FpYXfw5uHOQsuU4n9sXB0tgWxKp0S0CeRoIfGobj8db5AYyR99MzIRYRhGQ6FTM8hDdbqiekQypZbWKI-hdGzfS2pxYZNJ6bYvPj6CXp9XlDHxFyPDtN3i6CETf5OL_Cwg7QBM79IF0fAn-CPEBxheKV9HTDuDr0eao0xcYzNAf_ho8FNb9cgnap5ZOygDZktOCV_aV3y2MBiYrxtLFdefqLos7npLS50yvMaM7cH9MK" style={{ width: 48, height: 48, borderRadius: 9999 }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: '#EAEAEA' }}>{order.user}</div>
                  <div style={{ fontSize: 12, color: '#A0A0A0' }}>{t('dashboard.orderNumber')} #{String(order.id).slice(0, 8)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 800, color: '#FDE08D' }}>RM{order.total.toFixed(2)}</div>
                  <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 9999, background: order.status === 'delivered' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', color: order.status === 'delivered' ? '#22c55e' : '#ef4444' }}>
                    {order.status === 'delivered' ? t('dashboard.completed') : t('dashboard.pending')}
                  </span>
                </div>
              </div>
            ))}
            {(activeTab === 'completed' ? completedOrders : pendingOrders).length === 0 && (
              <div style={{ color: '#999', textAlign: 'center', padding: '20px 0' }}>{t('dashboard.noCompletedOrders')}</div>
            )}
          </div>
        </div>
      )}

      {/* 最近活动 - 仅在活动管理功能可见时显示 */}
      {eventsAdminFeatureVisible && (
        <div style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: '#EAEAEA', paddingInline: 8 }}>{t('dashboard.recentActivities')}</h2>
          <div style={{ marginTop: 8, borderRadius: 12, padding: 12, background: 'rgba(255,255,255,0.05)' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}><Spin /></div>
            ) : events.length > 0 ? (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <img alt="event" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCqZ66H4cXQr5mFjjZyArt6LdIb2BIhk4GF2JHKx2UCbrmxHNifoFkgto2LG8dL9qzuUPUV1f-BSFt8puUWcvCTY9TDHmgNLRVDHbY5AQDcoEfpA2UCkA7yw2LW8wyULzH1uKlNeWPJWxeQz9OJLA1t1bX9m6isA9rQp2vMKu50gx-ykzHIEFQYiHCFdw6JtNhTVBYbcmO0OXa-tiLBaQCRrKo2931k70O13w9CwSQqcROyUsbO70ENYAHrnobDtbOq44lMixgFghpH" style={{ width: 96, height: 96, objectFit: 'cover', borderRadius: 8 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, color: '#EAEAEA' }}>{events[0].title}</div>
                  <div style={{ fontSize: 12, color: '#A0A0A0', marginTop: 4 }}>
                    {(() => {
                      const startDate = (events[0].schedule.startDate as any)?.toDate ? (events[0].schedule.startDate as any).toDate() : events[0].schedule.startDate
                      return startDate ? dayjs(startDate).format('YYYY-MM-DD') : t('dashboard.noTimeSet')
                    })()}
                  </div>
                  <div style={{ fontSize: 12, color: '#A0A0A0', marginTop: 4 }}>
                    {t('dashboard.registeredCount', {
                      registered: ((events[0] as any).participants?.registered || []).length,
                      max: (events[0] as any).participants?.maxParticipants || 0
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ color: '#999', textAlign: 'center', padding: '20px 0' }}>{t('dashboard.noEventData')}</div>
            )}
          </div>
        </div>
      )}

      {/* 库存状态 - 仅在库存管理功能可见时显示 */}
      {inventoryFeatureVisible && (
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: '#EAEAEA', paddingInline: 8 }}>{t('dashboard.stockStatus')}</h2>
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: 12, padding: 12, background: 'rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 48, height: 48, borderRadius: 9999, background: 'rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>!</div>
              <div>
                <div style={{ fontWeight: 700, color: '#EAEAEA' }}>{t('dashboard.lowStockWarning')}</div>
                <div style={{ fontSize: 12, color: '#A0A0A0' }}>{t('dashboard.lowStockCount', { count: lowStockCount })}</div>
              </div>
            </div>
            <div style={{ color: '#A0A0A0' }}>&gt;</div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminDashboard
