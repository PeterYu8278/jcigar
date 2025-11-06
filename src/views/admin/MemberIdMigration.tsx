/**
 * 会员ID迁移管理页面
 * 用于为现有用户生成会员ID
 */

import React, { useState } from 'react'
import { Button, Card, Typography, Space, Progress, Alert, Table, message } from 'antd'
import { SyncOutlined, CheckCircleOutlined, CloseCircleOutlined, InfoCircleOutlined } from '@ant-design/icons'
import { migrateAllUserMemberIds, validateAllMemberIds, migrateSingleUser } from '../../scripts/migrateMemberIds'

const { Title, Text, Paragraph } = Typography

interface MigrationResult {
  uid: string
  displayName?: string
  memberId?: string
  status: 'success' | 'failed' | 'skipped'
  error?: string
}

const MemberIdMigration: React.FC = () => {
  const [migrating, setMigrating] = useState(false)
  const [validating, setValidating] = useState(false)
  const [results, setResults] = useState<MigrationResult[]>([])
  const [stats, setStats] = useState({
    total: 0,
    success: 0,
    failed: 0,
    skipped: 0
  })
  const [validationResult, setValidationResult] = useState<any>(null)

  /**
   * 执行迁移
   */
  const handleMigrate = async () => {
    setMigrating(true)
    setResults([])
    setValidationResult(null)
    
    try {
      const result = await migrateAllUserMemberIds()
      
      setStats({
        total: result.total,
        success: result.success,
        failed: result.failed,
        skipped: result.skipped
      })
      
      setResults(result.results)
      
      if (result.failed === 0) {
        message.success(`迁移成功！处理了 ${result.total} 个用户`)
      } else {
        message.warning(`迁移完成，但有 ${result.failed} 个失败`)
      }
    } catch (error) {
      message.error('迁移失败: ' + (error instanceof Error ? error.message : '未知错误'))
    } finally {
      setMigrating(false)
    }
  }

  /**
   * 验证唯一性
   */
  const handleValidate = async () => {
    setValidating(true)
    setValidationResult(null)
    
    try {
      const result = await validateAllMemberIds()
      setValidationResult(result)
      
      if (result.duplicates.length === 0) {
        message.success('所有会员ID都是唯一的！')
      } else {
        message.error(`发现 ${result.duplicates.length} 个重复的会员ID`)
      }
    } catch (error) {
      message.error('验证失败: ' + (error instanceof Error ? error.message : '未知错误'))
    } finally {
      setValidating(false)
    }
  }

  /**
   * 重试单个失败的用户
   */
  const handleRetrySingle = async (uid: string) => {
    try {
      const memberId = await migrateSingleUser(uid)
      message.success(`用户 ${uid} 的会员ID已生成: ${memberId}`)
      
      // 更新结果列表
      setResults(prev => prev.map(r => 
        r.uid === uid 
          ? { ...r, status: 'success', memberId, error: undefined }
          : r
      ))
      
      setStats(prev => ({
        ...prev,
        success: prev.success + 1,
        failed: prev.failed - 1
      }))
    } catch (error) {
      message.error('重试失败: ' + (error instanceof Error ? error.message : '未知错误'))
    }
  }

  /**
   * 表格列定义
   */
  const columns = [
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status: string) => {
        if (status === 'success') {
          return <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 18 }} />
        } else if (status === 'failed') {
          return <CloseCircleOutlined style={{ color: '#ff4d4f', fontSize: 18 }} />
        } else {
          return <InfoCircleOutlined style={{ color: '#faad14', fontSize: 18 }} />
        }
      }
    },
    {
      title: '用户名',
      dataIndex: 'displayName',
      key: 'displayName',
      render: (name: string) => name || '未命名'
    },
    {
      title: 'Firebase UID',
      dataIndex: 'uid',
      key: 'uid',
      ellipsis: true
    },
    {
      title: '会员ID',
      dataIndex: 'memberId',
      key: 'memberId',
      render: (memberId: string) => (
        <Text strong style={{ color: '#F4AF25', fontSize: 14, letterSpacing: 1 }}>
          {memberId || '-'}
        </Text>
      )
    },
    {
      title: '错误信息',
      dataIndex: 'error',
      key: 'error',
      render: (error: string) => error ? <Text type="danger">{error}</Text> : '-'
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: any, record: MigrationResult) => (
        record.status === 'failed' ? (
          <Button 
            size="small" 
            type="link" 
            onClick={() => handleRetrySingle(record.uid)}
          >
            重试
          </Button>
        ) : null
      )
    }
  ]

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
      <Title level={2}>会员ID迁移工具</Title>
      <Paragraph type="secondary">
        为现有用户生成唯一的会员ID。此操作是安全的，已有会员ID的用户会被自动跳过。
      </Paragraph>

      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 操作按钮 */}
        <Card>
          <Space size="large">
            <Button
              type="primary"
              size="large"
              icon={<SyncOutlined />}
              onClick={handleMigrate}
              loading={migrating}
            >
              开始迁移
            </Button>
            
            <Button
              size="large"
              onClick={handleValidate}
              loading={validating}
            >
              验证唯一性
            </Button>
          </Space>
        </Card>

        {/* 迁移进度 */}
        {migrating && (
          <Card>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text strong>迁移进行中...</Text>
              <Progress percent={100} status="active" />
            </Space>
          </Card>
        )}

        {/* 统计信息 */}
        {stats.total > 0 && (
          <Card title="迁移统计">
            <Space size="large">
              <div>
                <Text type="secondary">总计</Text>
                <div><Text strong style={{ fontSize: 24 }}>{stats.total}</Text></div>
              </div>
              <div>
                <Text type="success">成功</Text>
                <div><Text strong style={{ fontSize: 24, color: '#52c41a' }}>{stats.success}</Text></div>
              </div>
              <div>
                <Text type="danger">失败</Text>
                <div><Text strong style={{ fontSize: 24, color: '#ff4d4f' }}>{stats.failed}</Text></div>
              </div>
              <div>
                <Text type="warning">跳过</Text>
                <div><Text strong style={{ fontSize: 24, color: '#faad14' }}>{stats.skipped}</Text></div>
              </div>
            </Space>
          </Card>
        )}

        {/* 验证结果 */}
        {validationResult && (
          <Card title="唯一性验证结果">
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Text>总会员ID数: </Text>
                <Text strong>{validationResult.total}</Text>
              </div>
              <div>
                <Text>唯一ID数: </Text>
                <Text strong style={{ color: '#52c41a' }}>{validationResult.unique}</Text>
              </div>
              <div>
                <Text>重复ID数: </Text>
                <Text strong style={{ color: validationResult.duplicates.length > 0 ? '#ff4d4f' : '#52c41a' }}>
                  {validationResult.duplicates.length}
                </Text>
              </div>

              {validationResult.duplicates.length > 0 && (
                <Alert
                  type="error"
                  message="发现重复的会员ID"
                  description={
                    <ul>
                      {validationResult.duplicates.map((dup: any, index: number) => (
                        <li key={index}>
                          {dup.memberId}: {dup.count} 个用户 ({dup.uids.join(', ')})
                        </li>
                      ))}
                    </ul>
                  }
                />
              )}
            </Space>
          </Card>
        )}

        {/* 详细结果表格 */}
        {results.length > 0 && (
          <Card title="详细结果">
            <Table
              dataSource={results}
              columns={columns}
              rowKey="uid"
              pagination={{
                pageSize: 20,
                showTotal: (total) => `共 ${total} 条记录`
              }}
            />
          </Card>
        )}

        {/* 使用说明 */}
        {stats.total === 0 && !migrating && (
          <Card title="使用说明">
            <Space direction="vertical">
              <Paragraph>
                <Text strong>1. 开始迁移</Text><br />
                点击"开始迁移"按钮为所有现有用户生成会员ID。已有会员ID的用户会自动跳过。
              </Paragraph>
              <Paragraph>
                <Text strong>2. 验证唯一性</Text><br />
                迁移完成后，建议运行"验证唯一性"检查是否有重复的会员ID。
              </Paragraph>
              <Paragraph>
                <Text strong>3. 重试失败</Text><br />
                如果有用户迁移失败，可以点击表格中的"重试"按钮单独处理。
              </Paragraph>
              <Alert
                type="info"
                message="安全提示"
                description="此操作是安全的，不会覆盖已有的会员ID。如果用户已有会员ID，系统会自动跳过。"
              />
            </Space>
          </Card>
        )}
      </Space>
    </div>
  )
}

export default MemberIdMigration

