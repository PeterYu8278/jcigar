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
              placeholder="输入活动ID (例: event123)"
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
              placeholder="输入用户ID (例: user123)"
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
              description={`ID为 ${eventId} 的活动未找到`}
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
                  description={`有 ${debugInfo.summary.missingOrders} 个用户已报名并分配了雪茄，但没有对应的订单`}
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
                        <Paragraph>当前活动状态为 <Tag>{debugInfo.eventStatus}</Tag></Paragraph>
                        <Paragraph>
                          <WarningOutlined /> 订单只会在活动状态改为 <Tag color="success">completed</Tag> 时自动创建
                        </Paragraph>
                        <Paragraph>
                          <strong>解决方案：</strong>
                          <br />1. 进入 "活动管理" 页面
                          <br />2. 编辑此活动
                          <br />3. 将状态改为 "已完成"
                          <br />4. 保存 → 系统会自动为所有分配创建订单
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
                        <Paragraph>该活动还没有为参与者分配雪茄</Paragraph>
                        <Paragraph>
                          <strong>解决方案：</strong>
                          <br />1. 进入 "活动管理" 页面
                          <br />2. 点击活动的 "查看" 按钮
                          <br />3. 在参与者列表中为每个用户分配雪茄
                          <br />4. 保存分配后，将活动状态改为 "已完成"
                        </Paragraph>
                      </div>
                    }
                    type="warning"
                    showIcon
                  />
                )}

                {debugInfo.summary.missingOrders > 0 && debugInfo.hasAllocations && (
                  <Alert
                    message={`缺少 ${debugInfo.summary.missingOrders} 个订单`}
                    description={
                      <div>
                        <Paragraph>
                          已为用户分配雪茄但订单未创建
                        </Paragraph>
                        <Paragraph>
                          <strong>可能原因：</strong>
                          <br />• 活动状态不是 "已完成"
                          <br />• 订单创建过程出错
                          <br />• 分配数据格式不正确
                        </Paragraph>
                        <Paragraph>
                          <strong>解决方案：</strong>
                          <br />将活动状态改为 "已完成" 并保存，系统会自动创建缺失的订单
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

