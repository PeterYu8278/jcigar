/**
 * 活动订单调试页面
 * 用于诊断活动雪茄分配和订单创建问题
 */

import React, { useState } from 'react'
import { Card, Input, Button, Space, Typography, Alert, Tag, Divider, Descriptions, Table, Spin } from 'antd'
import { SearchOutlined, CheckCircleOutlined, CloseCircleOutlined, WarningOutlined } from '@ant-design/icons'
import { debugEventOrders, debugUserOrders } from '../../../utils/debugEventOrders'
import type { EventOrderDebugInfo } from '../../../utils/debugEventOrders'

const { Title, Text, Paragraph } = Typography

const EventOrderDebug: React.FC = () => {
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
        🔍 活动订单调试工具
      </Title>

      <Card title="检查活动数据" style={{ marginBottom: '24px' }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Text>输入活动ID来检查雪茄分配和订单创建状态</Text>
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
              检查活动
            </Button>
          </Space.Compact>
        </Space>
      </Card>

      <Card title="检查用户订单" style={{ marginBottom: '24px' }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Text>输入用户ID来检查该用户的所有订单（结果会显示在浏览器控制台）</Text>
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
              检查用户
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
            <Card title="📋 活动基本信息">
              <Descriptions column={1} bordered>
                <Descriptions.Item label="活动ID">{debugInfo.event.id}</Descriptions.Item>
                <Descriptions.Item label="活动标题">{debugInfo.event.title}</Descriptions.Item>
                <Descriptions.Item label="活动状态">
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
                      ⚠️ 只有"已完成"状态才会创建订单
                    </Text>
                  )}
                </Descriptions.Item>
              </Descriptions>
            </Card>
          ) : (
            <Alert
              message="活动不存在"
              description={`ID为 ${eventId} 的活动未找到`}
              type="error"
              showIcon
            />
          )}

          {/* 摘要统计 */}
          {debugInfo.event && (
            <Card title="📊 数据摘要">
              <Descriptions column={2} bordered>
                <Descriptions.Item label="已报名用户">{debugInfo.summary.totalRegistered}</Descriptions.Item>
                <Descriptions.Item label="有雪茄分配">{debugInfo.summary.totalAllocated}</Descriptions.Item>
                <Descriptions.Item label="已创建订单">{debugInfo.summary.totalOrdersCreated}</Descriptions.Item>
                <Descriptions.Item label="缺失订单">
                  <Text type={debugInfo.summary.missingOrders > 0 ? 'danger' : 'success'}>
                    {debugInfo.summary.missingOrders}
                    {debugInfo.summary.missingOrders > 0 && ' ❌'}
                  </Text>
                </Descriptions.Item>
              </Descriptions>

              {debugInfo.summary.missingOrders > 0 && (
                <Alert
                  message="发现问题"
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
            <Card title="🚬 雪茄分配详情">
              {!debugInfo.hasAllocations ? (
                <Alert
                  message="没有雪茄分配"
                  description="该活动还没有为任何参与者分配雪茄"
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
            <Card title="📦 订单创建状态">
              <Table
                dataSource={debugInfo.ordersCreated}
                rowKey="userId"
                pagination={false}
                columns={[
                  {
                    title: '用户ID',
                    dataIndex: 'userId',
                    key: 'userId',
                    width: 200,
                    render: (text) => <Text code copyable>{text}</Text>
                  },
                  {
                    title: '订单ID',
                    dataIndex: 'orderId',
                    key: 'orderId',
                    render: (text) => text ? <Text code copyable>{text}</Text> : <Text type="secondary">未创建</Text>
                  },
                  {
                    title: '订单存在',
                    dataIndex: 'hasOrder',
                    key: 'hasOrder',
                    align: 'center',
                    render: (hasOrder) => hasOrder ? (
                      <Tag icon={<CheckCircleOutlined />} color="success">是</Tag>
                    ) : (
                      <Tag icon={<CloseCircleOutlined />} color="error">否</Tag>
                    )
                  },
                  {
                    title: '订单状态',
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
                    title: '订单金额',
                    key: 'total',
                    render: (_, record) => record.orderDetails ? (
                      <Text strong>RM {record.orderDetails.total?.toFixed(2) || '0.00'}</Text>
                    ) : <Text type="secondary">-</Text>
                  },
                  {
                    title: '商品数',
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
            <Card title="💡 诊断建议">
              <Space direction="vertical" style={{ width: '100%' }}>
                {debugInfo.eventStatus !== 'completed' && (
                  <Alert
                    message="活动未完成"
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
                    message="没有雪茄分配"
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
                    message="所有订单已创建"
                    description="所有参与者的订单都已成功创建"
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

