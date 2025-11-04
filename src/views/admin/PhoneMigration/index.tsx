// 临时页面：手机号迁移工具
import React, { useState } from 'react'
import { Button, Card, Typography, Space, message, List, Tag, Progress, Alert } from 'antd'
import { SyncOutlined, CheckCircleOutlined, CloseCircleOutlined, ExclamationCircleOutlined, EyeOutlined } from '@ant-design/icons'
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
  const [previewing, setPreviewing] = useState(false)
  const [results, setResults] = useState<MigrationResult[]>([])
  const [progress, setProgress] = useState(0)
  const [isPreviewed, setIsPreviewed] = useState(false)
  const [stats, setStats] = useState({
    total: 0,
    updated: 0,
    skipped: 0,
    errors: 0
  })

  // 预览迁移
  const previewMigration = async () => {
    setPreviewing(true)
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

        // 需要更新（仅预览，不实际更新）
        updated++
        migrationResults.push({
          userId: user.id,
          email: user.email,
          oldPhone: phone,
          newPhone: normalized,
          status: 'success',
          message: '将被更新'
        })
      }

      setResults(migrationResults)
      setStats({
        total: users.length,
        updated,
        skipped,
        errors
      })
      setIsPreviewed(true)

      message.success(`预览完成！将更新 ${updated} 个用户`)
    } catch (error) {
      message.error('预览失败: ' + (error as Error).message)
    } finally {
      setPreviewing(false)
    }
  }

  // 执行迁移
  const runMigration = async () => {
    if (!isPreviewed) {
      message.warning('请先预览迁移结果')
      return
    }

    setLoading(true)
    setProgress(0)

    try {
      const users = await getUsers()
      let updated = 0
      let errors = 0

      for (let i = 0; i < users.length; i++) {
        const user = users[i]
        const phone = user.profile?.phone || user.phone

        setProgress(Math.round(((i + 1) / users.length) * 100))

        if (!phone) continue

        const normalized = normalizePhoneNumber(phone)
        if (!normalized || normalized === phone) continue

        // 实际更新数据库
        try {
          await updateDocument<User>(COLLECTIONS.USERS, user.id, {
            profile: {
              ...(user.profile || {}),
              phone: normalized
            }
          } as any)

          updated++

          // 更新结果状态
          setResults(prev => prev.map(r => 
            r.userId === user.id 
              ? { ...r, status: 'success' as const, message: '更新成功' }
              : r
          ))
        } catch (error) {
          errors++

          // 更新结果状态
          setResults(prev => prev.map(r => 
            r.userId === user.id 
              ? { ...r, status: 'error' as const, message: '更新失败: ' + (error as Error).message }
              : r
          ))
        }
      }

      if (errors === 0) {
        message.success(`迁移完成！成功更新 ${updated} 个用户`)
      } else {
        message.warning(`迁移完成，成功 ${updated} 个，失败 ${errors} 个`)
      }
    } catch (error) {
      message.error('迁移失败: ' + (error as Error).message)
    } finally {
      setLoading(false)
      setIsPreviewed(false)
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

          {/* 操作按钮 */}
          <Space size="large" style={{ width: '100%' }}>
            <Button
              type="default"
              size="large"
              icon={<EyeOutlined />}
              onClick={previewMigration}
              loading={previewing}
              disabled={loading || previewing}
              style={{
                flex: 1,
                height: '48px',
                fontWeight: 600
              }}
            >
              {previewing ? '预览中...' : '预览迁移'}
            </Button>

            <Button
              type="primary"
              size="large"
              icon={<SyncOutlined spin={loading} />}
              onClick={runMigration}
              loading={loading}
              disabled={loading || previewing || !isPreviewed}
              style={{
                flex: 1,
                background: isPreviewed 
                  ? 'linear-gradient(to right, #FDE08D, #C48D3A)' 
                  : '#d9d9d9',
                border: 'none',
                color: isPreviewed ? '#221c10' : '#999',
                fontWeight: 600,
                height: '48px'
              }}
            >
              {loading ? '迁移中...' : '确认迁移'}
            </Button>
          </Space>

          {/* 预览提示 */}
          {!isPreviewed && (
            <Alert
              type="info"
              message="请先预览迁移结果，确认无误后再执行迁移"
              showIcon
            />
          )}

          {isPreviewed && !loading && (
            <Alert
              type="success"
              message={`预览完成！将更新 ${stats.updated} 个用户的手机号`}
              description="确认无误后，请点击'确认迁移'按钮执行实际迁移操作"
              showIcon
            />
          )}

          {/* 进度条 */}
          {(loading || previewing) && (
            <div>
              <Text type="secondary" style={{ display: 'block', marginBottom: '8px' }}>
                {previewing ? '预览进度：' : '迁移进度：'}
              </Text>
              <Progress 
                percent={progress} 
                status="active"
                strokeColor={{
                  '0%': '#FDE08D',
                  '100%': '#C48D3A'
                }}
              />
            </div>
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
        <Card 
          title={
            <Space>
              <span>{isPreviewed && !loading ? '预览结果' : '迁移详情'}</span>
              {isPreviewed && !loading && (
                <Tag color="orange">预览模式 - 未实际修改数据</Tag>
              )}
            </Space>
          }
        >
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
                        item.status === 'success' ? (isPreviewed && !loading ? 'orange' : 'success') :
                        item.status === 'error' ? 'error' :
                        'default'
                      }
                    >
                      {item.status === 'success' ? (isPreviewed && !loading ? '将更新' : '已更新') : 
                       item.status === 'error' ? '错误' : 
                       '跳过'}
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

