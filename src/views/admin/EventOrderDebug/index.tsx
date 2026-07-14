/**
 * 活动订单调试页面
 * 用于诊断活动雪茄分配和订单创建问题
 */

import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, Input, Button, Space, Typography, Alert, Tag, Divider, Descriptions, Table, Spin } from 'antd'
import { SearchOutlined, CheckCircleOutlined, CloseCircleOutlined, WarningOutlined } from '@ant-design/icons'
import { debugEventOrders, debugUserOrders } from '../../../utils/debugEventOrders'
import type { EventOrderDebugInfo } from '../../../utils/debugEventOrders'

const { Title, Text, Paragraph } = Typography

const EventOrderDebug: React.FC = () => {
  const { t } = useTranslation()
  const [eventId, setEventId] = useState('')
  const [userId, setUserId] = useState('')
  const [loading, setLoading] = useState(false)
  const [debugInfo, setDebugInfo] = useState<EventOrderDebugInfo | null>(null)

  const handleDebugEvent = async () => {
    if (!eventId.trim()) {
      return
    }

    setLoading(true)
    try {
      const info = await debugEventOrders(eventId.trim())
      setDebugInfo(info)
      
      // 同时打印到控制台
    } catch (error) {
    } finally {
      setLoading(false)
    }
  }

  const handleDebugUser = async () => {
    if (!userId.trim()) {
      return
    }

    setLoading(true)
    try {
      await debugUserOrders(userId.trim())
    } catch (error) {
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <Title level={2} style={{ color: '#ffd700', marginBottom: '24px' }}>
        {t("eventDebug.title")}
      </Title>

      <Card title={t("eventDebug.checkEventCard")} style={{ marginBottom: '24px' }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Text>{t("eventDebug.checkEventDesc")}</Text>
          <Space.Compact style={{ width: '100%' }}>
            <Input
              placeholder={t('eventDebug.eventIdPlaceholder')}
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
              onPressEnter={handleDebugEvent}
              style={{ flex: 1 }}
            />
            <Button
              type="primary"
              icon={<SearchOutlined />}
              onClick={handleDebugEvent}
              loading={loading}
            >
              {t("eventDebug.checkEventBtn")}
            </Button>
          </Space.Compact>
        </Space>
      </Card>

      <Card title={t("eventDebug.checkUserCard")} style={{ marginBottom: '24px' }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Text>{t("eventDebug.checkUserDesc")}</Text>
          <Space.Compact style={{ width: '100%' }}>
            <Input
              placeholder={t('eventDebug.userIdPlaceholder')}
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              onPressEnter={handleDebugUser}
              style={{ flex: 1 }}
            />
            <Button
              type="primary"
              icon={<SearchOutlined />}
              onClick={handleDebugUser}
              loading={loading}
            >
              {t("eventDebug.checkUserBtn")}
            </Button>
          </Space.Compact>
        </Space>
      </Card>

      {loading && (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Spin size="large" />
        </div>
      )}

      {debugInfo && !loading && (
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          {/* 活动基本信息 */}
          {debugInfo.event ? (
            <Card title={t("eventDebug.eventInfoCard")}>
              <Descriptions column={1} bordered>
                <Descriptions.Item label={t("eventDebug.labelEventId")}>{debugInfo.event.id}</Descriptions.Item>
                <Descriptions.Item label={t("eventDebug.labelEventTitle")}>{debugInfo.event.title}</Descriptions.Item>
                <Descriptions.Item label={t("eventDebug.labelEventStatus")}>
                  <Tag color={
                    debugInfo.eventStatus === 'completed' ? 'success' :
                    debugInfo.eventStatus === 'ongoing' ? 'processing' :
                    debugInfo.eventStatus === 'upcoming' ? 'blue' :
                    'default'
                  }>
                    {debugInfo.eventStatus}
                  </Tag>
                  {debugInfo.eventStatus !== 'completed' && (
                    <Text type="warning" style={{ marginLeft: '8px' }}>
                      {t("eventDebug.onlyCompletedCreatesOrders")}
                    </Text>
                  )}
                </Descriptions.Item>
              </Descriptions>
            </Card>
          ) : (
            <Alert
              message={t("eventDebug.eventNotFound")}
              description={t('eventDebug.eventNotFoundDesc', { id: eventId })}
              type="error"
              showIcon
            />
          )}

          {/* 摘要统计 */}
          {debugInfo.event && (
            <Card title={t("eventDebug.summaryCard")}>
              <Descriptions column={2} bordered>
                <Descriptions.Item label={t("eventDebug.labelTotalRegistered")}>{debugInfo.summary.totalRegistered}</Descriptions.Item>
                <Descriptions.Item label={t("eventDebug.labelTotalAllocated")}>{debugInfo.summary.totalAllocated}</Descriptions.Item>
                <Descriptions.Item label={t("eventDebug.labelTotalOrders")}>{debugInfo.summary.totalOrdersCreated}</Descriptions.Item>
                <Descriptions.Item label={t("eventDebug.labelMissingOrders")}>
                  <Text type={debugInfo.summary.missingOrders > 0 ? 'danger' : 'success'}>
                    {debugInfo.summary.missingOrders}
                    {debugInfo.summary.missingOrders > 0 && ''}
                  </Text>
                </Descriptions.Item>
              </Descriptions>

              {debugInfo.summary.missingOrders > 0 && (
                <Alert
                  message={t("eventDebug.issueFoundAlert")}
                  description={t('eventDebug.issueFoundDesc', { count: debugInfo.summary.missingOrders })}
                  type="warning"
                  showIcon
                  style={{ marginTop: '16px' }}
                />
              )}
            </Card>
          )}

          {/* 雪茄分配详情 */}
          {debugInfo.event && (
            <Card title={t("eventDebug.allocationCard")}>
              {!debugInfo.hasAllocations ? (
                <Alert
                  message={t("eventDebug.noAllocationAlert")}
                  description={t("eventDebug.noAllocationDesc")}
                  type="warning"
                  showIcon
                />
              ) : (
                <pre style={{ 
                  background: '#1a1a1a', 
                  padding: '16px', 
                  borderRadius: '8px', 
                  color: '#ffd700',
                  overflow: 'auto',
                  maxHeight: '400px'
                }}>
                  {JSON.stringify(debugInfo.allocations, null, 2)}
                </pre>
              )}
            </Card>
          )}

          {/* 订单创建状态表格 */}
          {debugInfo.event && debugInfo.ordersCreated.length > 0 && (
            <Card title={t("eventDebug.ordersCard")}>
              <Table
                dataSource={debugInfo.ordersCreated}
                rowKey="userId"
                pagination={false}
                columns={[
                  {
                    title: t("eventDebug.colUserId"),
                    dataIndex: 'userId',
                    key: 'userId',
                    width: 200,
                    render: (text) => <Text code copyable>{text}</Text>
                  },
                  {
                    title: t("eventDebug.colOrderId"),
                    dataIndex: 'orderId',
                    key: 'orderId',
                    render: (text) => text ? <Text code copyable>{text}</Text> : <Text type="secondary">{t("eventDebug.orderNotCreated")}</Text>
                  },
                  {
                    title: t("eventDebug.colOrderExists"),
                    dataIndex: 'hasOrder',
                    key: 'hasOrder',
                    align: 'center',
                    render: (hasOrder) => hasOrder ? (
                      <Tag icon={<CheckCircleOutlined />} color="success">{t("eventDebug.orderExistsYes")}</Tag>
                    ) : (
                      <Tag icon={<CloseCircleOutlined />} color="error">{t("eventDebug.orderExistsNo")}</Tag>
                    )
                  },
                  {
                    title: t("eventDebug.colOrderStatus"),
                    key: 'status',
                    render: (_, record) => record.orderDetails ? (
                      <Tag color={
                        record.orderDetails.status === 'delivered' ? 'success' :
                        record.orderDetails.status === 'shipped' ? 'processing' :
                        record.orderDetails.status === 'confirmed' ? 'blue' :
                        record.orderDetails.status === 'cancelled' ? 'error' :
                        'default'
                      }>
                        {record.orderDetails.status}
                      </Tag>
                    ) : <Text type="secondary">-</Text>
                  },
                  {
                    title: t("eventDebug.colOrderTotal"),
                    key: 'total',
                    render: (_, record) => record.orderDetails ? (
                      <Text strong>RM {record.orderDetails.total?.toFixed(2) || '0.00'}</Text>
                    ) : <Text type="secondary">-</Text>
                  },
                  {
                    title: t("eventDebug.colItemCount"),
                    key: 'items',
                    align: 'center',
                    render: (_, record) => record.orderDetails ? (
                      <Text>{record.orderDetails.items?.length || 0}</Text>
                    ) : <Text type="secondary">-</Text>
                  }
                ]}
              />
            </Card>
          )}

          {/* 诊断建议 */}
          {debugInfo.event && (
            <Card title={t("eventDebug.diagCard")}>
              <Space direction="vertical" style={{ width: '100%' }}>
                {debugInfo.eventStatus !== 'completed' && (
                  <Alert
                    message={t("eventDebug.eventNotCompleted")}
                    description={
                      <div>
                        <Paragraph>{t('eventDebug.currentStatus')} <Tag>{debugInfo.eventStatus}</Tag></Paragraph>
                        <Paragraph>
                          <WarningOutlined /> {t('eventDebug.orderCreationNote')} <Tag color="success">completed</Tag>
                        </Paragraph>
                        <Paragraph>
                          <strong>{t('common.solution')}</strong>
                          <br />1. {t('eventDebug.solutionStep1GoToEventMgmt')}
                          <br />2. {t('eventDebug.solutionStep2EditEvent')}
                          <br />3. {t('eventDebug.solutionStep3SetCompleted')}
                          <br />4. {t('eventDebug.solutionStep4SaveAutoCreate')}
                        </Paragraph>
                      </div>
                    }
                    type="warning"
                    showIcon
                  />
                )}

                {!debugInfo.hasAllocations && (
                  <Alert
                    message={t("eventDebug.noAllocationAlert")}
                    description={
                      <div>
                        <Paragraph>{t('eventDebug.noCigarsAllocated')}</Paragraph>
                        <Paragraph>
                          <strong>{t('common.solution')}</strong>
                          <br />1. {t('eventDebug.solutionStep1GoToEventMgmt')}
                          <br />2. {t('eventDebug.solutionStep2ClickView')}
                          <br />3. {t('eventDebug.solutionStep3AllocateCigars')}
                          <br />4. {t('eventDebug.solutionStep4SaveThenComplete')}
                        </Paragraph>
                      </div>
                    }
                    type="warning"
                    showIcon
                  />
                )}

                {debugInfo.summary.missingOrders > 0 && debugInfo.hasAllocations && (
                  <Alert
                    message={t('eventDebug.missingOrdersAlert', { count: debugInfo.summary.missingOrders })}
                    description={
                      <div>
                        <Paragraph>
                          {t('eventDebug.missingOrdersDesc')}
                        </Paragraph>
                        <Paragraph>
                          <strong>{t('common.possibleReasons')}</strong>
                          <br />• {t('eventDebug.reasonNotCompleted')}
                          <br />• {t('eventDebug.reasonCreationError')}
                          <br />• {t('eventDebug.reasonInvalidFormat')}
                        </Paragraph>
                        <Paragraph>
                          <strong>{t('common.solution')}</strong>
                          <br />{t('eventDebug.solutionSetCompleteAndSave')}
                        </Paragraph>
                      </div>
                    }
                    type="error"
                    showIcon
                  />
                )}

                {debugInfo.summary.totalOrdersCreated === debugInfo.summary.totalRegistered && 
                 debugInfo.summary.totalRegistered > 0 && (
                  <Alert
                    message={t("eventDebug.allOrdersCreated")}
                    description={t("eventDebug.allOrdersCreatedDesc")}
                    type="success"
                    showIcon
                  />
                )}
              </Space>
            </Card>
          )}
        </Space>
      )}
    </div>
  )
}

export default EventOrderDebug

