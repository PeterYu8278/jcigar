// 测试数据生成页面
import React, { useState } from 'react'
import { Card, Button, Space, Typography, Progress, Alert, Divider, Row, Col, Statistic, message } from 'antd'
import { PlayCircleOutlined, CheckCircleOutlined, LoadingOutlined, WarningOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { generateBrands } from './generators/brands'
import { generateUsers } from './generators/users'
import { generateCigars } from './generators/cigars'
import { generateInboundOrders } from './generators/inboundOrders'
import { generateEvents } from './generators/events'
import { generateMembershipFeeRecords } from './generators/membershipFeeRecords'
import { generateReloadRecords } from './generators/reloadRecords'
import { generateVisitSessions } from './generators/visitSessions'
import { generateRedemptions } from './generators/redemptions'
import { generateOrders } from './generators/orders'
import { generateOutboundOrders } from './generators/outboundOrders'
import { generateTransactions } from './generators/transactions'
import { generatePointsRecords } from './generators/pointsRecords'

const { Title, Text } = Typography

interface GenerationStage {
  id: string
  name: string
  description: string
  count: number
  status: 'pending' | 'running' | 'completed' | 'error'
  progress: number
  error?: string
}

const TestDataGenerator: React.FC = () => {
  const { t } = useTranslation()
  const [stages, setStages] = useState<GenerationStage[]>([
    { id: '1.1', name: '品牌', description: '生成300个品牌', count: 300, status: 'pending', progress: 0 },
    { id: '1.2', name: '用户', description: '生成10,000个用户（含推荐关系）', count: 10000, status: 'pending', progress: 0 },
    { id: '2.1', name: '雪茄产品', description: '生成3,000个雪茄产品', count: 3000, status: 'pending', progress: 0 },
    { id: '3.1', name: '雪茄入库记录', description: '生成5,000个入库记录（总库存1,000,000）', count: 5000, status: 'pending', progress: 0 },
    { id: '4.1', name: '活动', description: '生成2,000个活动（每个15个用户参与）', count: 2000, status: 'pending', progress: 0 },
    { id: '5.1', name: '会员年费记录', description: '生成10,000个会员年费记录', count: 10000, status: 'pending', progress: 0 },
    { id: '5.2', name: '充值记录', description: '生成20,000个充值记录', count: 20000, status: 'pending', progress: 0 },
    { id: '6.1', name: '驻店记录', description: '生成200,000个驻店记录', count: 200000, status: 'pending', progress: 0 },
    { id: '6.2', name: '驻店雪茄兑换记录', description: '生成400,000个兑换记录', count: 400000, status: 'pending', progress: 0 },
    { id: '7.1', name: '活动订单', description: '生成30,000个活动订单', count: 30000, status: 'pending', progress: 0 },
    { id: '7.2', name: '兑换订单', description: '生成200,000个兑换订单', count: 200000, status: 'pending', progress: 0 },
    { id: '8.1', name: '出库订单', description: '生成200,000个出库订单', count: 200000, status: 'pending', progress: 0 },
    { id: '9.1', name: '银行交易记录', description: '生成100,000个交易记录', count: 100000, status: 'pending', progress: 0 },
    { id: '10.1', name: '积分记录', description: '动态生成积分记录', count: 0, status: 'pending', progress: 0 },
  ])

  const [totalProgress, setTotalProgress] = useState(0)
  const [isRunning, setIsRunning] = useState(false)

  const updateStage = (id: string, updates: Partial<GenerationStage>) => {
    setStages(prev => prev.map(stage => 
      stage.id === id ? { ...stage, ...updates } : stage
    ))
  }

  const handleGenerate = async (stageId: string) => {
    const stage = stages.find(s => s.id === stageId)
    if (!stage || stage.status === 'running') return

    updateStage(stageId, { status: 'running', progress: 0, error: undefined })
    setIsRunning(true)

    try {
      let result: { success: boolean; count?: number; error?: string; progress?: (progress: number) => void } | undefined

      switch (stageId) {
        case '1.1':
          result = await generateBrands(stage.count, (progress) => {
            updateStage(stageId, { progress })
          })
          break
        case '1.2':
          result = await generateUsers(stage.count, (progress) => {
            updateStage(stageId, { progress })
          })
          break
        case '2.1':
          result = await generateCigars(stage.count, (progress) => {
            updateStage(stageId, { progress })
          })
          break
        case '3.1':
          result = await generateInboundOrders(stage.count, 1000000, (progress) => {
            updateStage(stageId, { progress })
          })
          break
        case '4.1':
          result = await generateEvents(stage.count, (progress) => {
            updateStage(stageId, { progress })
          })
          break
        case '5.1':
          result = await generateMembershipFeeRecords(stage.count, (progress) => {
            updateStage(stageId, { progress })
          })
          break
        case '5.2':
          result = await generateReloadRecords(stage.count, (progress) => {
            updateStage(stageId, { progress })
          })
          break
        case '6.1':
          result = await generateVisitSessions(stage.count, (progress) => {
            updateStage(stageId, { progress })
          })
          break
        case '6.2':
          result = await generateRedemptions(stage.count, (progress) => {
            updateStage(stageId, { progress })
          })
          break
        case '7.1':
          result = await generateOrders('event', stage.count, (progress) => {
            updateStage(stageId, { progress })
          })
          break
        case '7.2':
          result = await generateOrders('redemption', stage.count, (progress) => {
            updateStage(stageId, { progress })
          })
          break
        case '8.1':
          result = await generateOutboundOrders(stage.count, (progress) => {
            updateStage(stageId, { progress })
          })
          break
        case '9.1':
          result = await generateTransactions(stage.count, (progress) => {
            updateStage(stageId, { progress })
          })
          break
        case '10.1':
          result = await generatePointsRecords((progress) => {
            updateStage(stageId, { progress })
          })
          break
        default:
          throw new Error(`未知的阶段: ${stageId}`)
      }

      if (result?.success) {
        updateStage(stageId, { 
          status: 'completed', 
          progress: 100,
          count: result.count || stage.count
        })
        message.success(`${stage.name}生成完成`)
      } else {
        throw new Error(result?.error || '生成失败')
      }
    } catch (error: any) {
      updateStage(stageId, { 
        status: 'error', 
        error: error.message || '生成失败'
      })
      message.error(`${stage.name}生成失败: ${error.message}`)
    } finally {
      setIsRunning(false)
    }
  }

  const completedCount = stages.filter(s => s.status === 'completed').length
  const totalCount = stages.length
  const totalProgressValue = totalCount > 0 ? (completedCount / totalCount) * 100 : 0

  return (
    <div style={{ padding: '24px', minHeight: '100vh', background: 'transparent' }}>
      <Card
        style={{
          background: 'rgba(26, 26, 26, 0.8)',
          border: '1px solid rgba(255, 215, 0, 0.3)',
          borderRadius: '8px'
        }}
      >
        <Title level={2} style={{ color: '#ffd700', marginBottom: '24px' }}>
          测试数据生成器
        </Title>

        <Alert
          message="警告"
          description="此工具将生成大量测试数据。请确保在测试环境中使用，避免影响生产数据。"
          type="warning"
          showIcon
          style={{ marginBottom: '24px' }}
        />

        <Row gutter={16} style={{ marginBottom: '24px' }}>
          <Col span={12}>
            <Statistic
              title="总进度"
              value={totalProgressValue}
              precision={1}
              suffix="%"
              valueStyle={{ color: '#ffd700' }}
            />
          </Col>
          <Col span={12}>
            <Statistic
              title="已完成阶段"
              value={completedCount}
              suffix={`/ ${totalCount}`}
              valueStyle={{ color: '#ffd700' }}
            />
          </Col>
        </Row>

        <Progress 
          percent={totalProgressValue} 
          strokeColor="#ffd700"
          style={{ marginBottom: '24px' }}
        />

        <Divider style={{ borderColor: 'rgba(255, 215, 0, 0.3)' }} />

        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {stages.map((stage) => (
            <Card
              key={stage.id}
              style={{
                background: 'rgba(15, 15, 15, 0.5)',
                border: '1px solid rgba(255, 215, 0, 0.2)',
                borderRadius: '8px'
              }}
            >
              <Row gutter={16} align="middle">
                <Col span={4}>
                  <Text strong style={{ color: '#ffd700' }}>
                    {stage.id}
                  </Text>
                </Col>
                <Col span={8}>
                  <Text strong style={{ color: '#f8f8f8', fontSize: '16px' }}>
                    {stage.name}
                  </Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    {stage.description}
                  </Text>
                </Col>
                <Col span={6}>
                  <Progress
                    percent={stage.progress}
                    size="small"
                    status={
                      stage.status === 'error' ? 'exception' :
                      stage.status === 'completed' ? 'success' : 'active'
                    }
                    strokeColor="#ffd700"
                  />
                </Col>
                <Col span={6} style={{ textAlign: 'right' }}>
                  <Space>
                    {stage.status === 'completed' && (
                      <CheckCircleOutlined style={{ color: '#52c41a', fontSize: '20px' }} />
                    )}
                    {stage.status === 'running' && (
                      <LoadingOutlined style={{ color: '#ffd700', fontSize: '20px' }} />
                    )}
                    {stage.status === 'error' && (
                      <WarningOutlined style={{ color: '#ff4d4f', fontSize: '20px' }} />
                    )}
                    <Button
                      type="primary"
                      icon={<PlayCircleOutlined />}
                      onClick={() => handleGenerate(stage.id)}
                      disabled={stage.status === 'running' || isRunning}
                      style={{
                        background: stage.status === 'completed' 
                          ? 'rgba(82, 196, 26, 0.2)' 
                          : 'linear-gradient(135deg, #ffd700 0%, #c48d3a 100%)',
                        border: 'none',
                        color: '#000'
                      }}
                    >
                      {stage.status === 'completed' ? '已完成' : 
                       stage.status === 'running' ? '生成中...' : 
                       stage.status === 'error' ? '重试' : '生成'}
                    </Button>
                  </Space>
                </Col>
              </Row>
              {stage.error && (
                <Alert
                  message={stage.error}
                  type="error"
                  showIcon
                  style={{ marginTop: '12px' }}
                />
              )}
            </Card>
          ))}
        </Space>
      </Card>
    </div>
  )
}

export default TestDataGenerator

