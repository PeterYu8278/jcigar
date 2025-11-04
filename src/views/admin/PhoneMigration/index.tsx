// 临时页面：手机号迁移工具
import React, { useState } from 'react'
import { Button, Card, Typography, Space, message, List, Tag, Progress, Alert } from 'antd'
import { SyncOutlined, CheckCircleOutlined, CloseCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons'
import { getUsers, updateDocument, COLLECTIONS } from '../../../services/firebase/firestore'
import { normalizePhoneNumber } from '../../../utils/phoneNormalization'
import type { User } from '../../../types'

const { Title, Text } = Typography

interface MigrationResult {
  userId: string
  email: string
  oldPhone: string
  newPhone: string
  status: 'success' | 'skipped' | 'error'
  message?: string
}

const PhoneMigration: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<MigrationResult[]>([])
  const [progress, setProgress] = useState(0)
  const [stats, setStats] = useState({
    total: 0,
    updated: 0,
    skipped: 0,
    errors: 0
  })

  const runMigration = async () => {
    setLoading(true)
    setResults([])
    setProgress(0)
    setStats({ total: 0, updated: 0, skipped: 0, errors: 0 })

    try {
      const users = await getUsers()
      const migrationResults: MigrationResult[] = []
      let updated = 0
      let skipped = 0
      let errors = 0

      for (let i = 0; i < users.length; i++) {
        const user = users[i]
        const phone = user.profile?.phone || user.phone

        setProgress(Math.round(((i + 1) / users.length) * 100))

        // 没有手机号，跳过
        if (!phone) {
          skipped++
          migrationResults.push({
            userId: user.id,
            email: user.email,
            oldPhone: '-',
            newPhone: '-',
            status: 'skipped',
            message: '无手机号'
          })
          continue
        }

        // 标准化手机号
        const normalized = normalizePhoneNumber(phone)

        if (!normalized) {
          errors++
          migrationResults.push({
            userId: user.id,
            email: user.email,
            oldPhone: phone,
            newPhone: '-',
            status: 'error',
            message: '手机号格式无效'
          })
          continue
        }

        // 已经是标准格式，跳过
        if (normalized === phone) {
          skipped++
          migrationResults.push({
            userId: user.id,
            email: user.email,
            oldPhone: phone,
            newPhone: phone,
            status: 'skipped',
            message: '已是标准格式'
          })
          continue
        }

        // 更新为标准化格式
        try {
          await updateDocument<User>(COLLECTIONS.USERS, user.id, {
            profile: {
              ...(user.profile || {}),
              phone: normalized
            }
          } as any)

          updated++
          migrationResults.push({
            userId: user.id,
            email: user.email,
            oldPhone: phone,
            newPhone: normalized,
            status: 'success',
            message: '更新成功'
          })
        } catch (error) {
          errors++
          migrationResults.push({
            userId: user.id,
            email: user.email,
            oldPhone: phone,
            newPhone: normalized,
            status: 'error',
            message: '更新失败: ' + (error as Error).message
          })
        }
      }

      setResults(migrationResults)
      setStats({
        total: users.length,
        updated,
        skipped,
        errors
      })

      if (errors === 0) {
        message.success(`迁移完成！成功更新 ${updated} 个用户`)
      } else {
        message.warning(`迁移完成，但有 ${errors} 个错误`)
      }
    } catch (error) {
      message.error('迁移失败: ' + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* 标题 */}
      <Title level={2} style={{
        background: 'linear-gradient(to right, #FDE08D, #C48D3A)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        marginBottom: '24px'
      }}>
        📱 手机号迁移工具
      </Title>

      {/* 警告提示 */}
      <Alert
        type="warning"
        showIcon
        message="注意事项"
        description={
          <div>
            <p>此工具将把数据库中所有手机号标准化为 E.164 格式（+60XXXXXXXXX）</p>
            <ul style={{ marginBottom: 0 }}>
              <li>迁移前建议备份数据库</li>
              <li>迁移过程不可中断</li>
              <li>已标准化的号码会被跳过</li>
              <li>无效格式的号码会被标记为错误</li>
            </ul>
          </div>
        }
        style={{ marginBottom: '24px' }}
      />

      {/* 操作卡片 */}
      <Card style={{ marginBottom: '24px' }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* 示例 */}
          <div>
            <Text strong style={{ fontSize: '16px', display: 'block', marginBottom: '12px' }}>
              支持的格式转换：
            </Text>
            <div style={{ background: '#f5f5f5', padding: '16px', borderRadius: '8px' }}>
              <Space direction="vertical" size="small">
                <Text><code>+601157288278</code> → <code>+601157288278</code> ✅ 已标准</Text>
                <Text><code>601157288278</code> → <code>+601157288278</code> ✅ 添加+</Text>
                <Text><code>01157288278</code> → <code>+601157288278</code> ✅ 0→+60</Text>
                <Text><code>+6011-5728 8278</code> → <code>+60115728278</code> ✅ 清理分隔符</Text>
                <Text><code>6011-5728 8278</code> → <code>+60115728278</code> ✅ 清理+添加</Text>
                <Text><code>011-57288278</code> → <code>+601157288278</code> ✅ 0→+60+清理</Text>
              </Space>
            </div>
          </div>

          {/* 开始按钮 */}
          <Button
            type="primary"
            size="large"
            icon={<SyncOutlined spin={loading} />}
            onClick={runMigration}
            loading={loading}
            disabled={loading}
            style={{
              background: 'linear-gradient(to right, #FDE08D, #C48D3A)',
              border: 'none',
              color: '#221c10',
              fontWeight: 600,
              height: '48px'
            }}
          >
            {loading ? '迁移中...' : '开始迁移'}
          </Button>

          {/* 进度条 */}
          {loading && (
            <Progress 
              percent={progress} 
              status="active"
              strokeColor={{
                '0%': '#FDE08D',
                '100%': '#C48D3A'
              }}
            />
          )}

          {/* 统计信息 */}
          {stats.total > 0 && !loading && (
            <div style={{
              background: '#f0f0f0',
              padding: '20px',
              borderRadius: '8px',
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '16px'
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#666' }}>
                  {stats.total}
                </div>
                <div style={{ fontSize: '14px', color: '#999' }}>总用户数</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#52c41a' }}>
                  {stats.updated}
                </div>
                <div style={{ fontSize: '14px', color: '#999' }}>已更新</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1890ff' }}>
                  {stats.skipped}
                </div>
                <div style={{ fontSize: '14px', color: '#999' }}>已跳过</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ff4d4f' }}>
                  {stats.errors}
                </div>
                <div style={{ fontSize: '14px', color: '#999' }}>错误数</div>
              </div>
            </div>
          )}
        </Space>
      </Card>

      {/* 迁移结果列表 */}
      {results.length > 0 && (
        <Card title="迁移详情">
          <List
            dataSource={results}
            renderItem={(item) => (
              <List.Item>
                <div style={{ width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <Text strong>{item.email}</Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        ID: {item.userId}
                      </Text>
                    </div>
                    <Tag
                      icon={
                        item.status === 'success' ? <CheckCircleOutlined /> :
                        item.status === 'error' ? <CloseCircleOutlined /> :
                        <ExclamationCircleOutlined />
                      }
                      color={
                        item.status === 'success' ? 'success' :
                        item.status === 'error' ? 'error' :
                        'default'
                      }
                    >
                      {item.status === 'success' ? '已更新' : 
                       item.status === 'error' ? '错误' : 
                       '已跳过'}
                    </Tag>
                  </div>
                  <div style={{ marginTop: '8px', fontSize: '13px' }}>
                    {item.oldPhone !== item.newPhone ? (
                      <Text>
                        <code style={{ background: '#fff3cd', padding: '2px 6px', borderRadius: '4px' }}>
                          {item.oldPhone}
                        </code>
                        {' → '}
                        <code style={{ background: '#d1f2eb', padding: '2px 6px', borderRadius: '4px' }}>
                          {item.newPhone}
                        </code>
                      </Text>
                    ) : (
                      <Text type="secondary">
                        <code>{item.oldPhone}</code> {item.message && `(${item.message})`}
                      </Text>
                    )}
                  </div>
                  {item.message && item.status === 'error' && (
                    <Text type="danger" style={{ fontSize: '12px', marginTop: '4px', display: 'block' }}>
                      ⚠️ {item.message}
                    </Text>
                  )}
                </div>
              </List.Item>
            )}
            pagination={{
              pageSize: 10,
              showTotal: (total) => `共 ${total} 条记录`
            }}
          />
        </Card>
      )}
    </div>
  )
}

export default PhoneMigration

