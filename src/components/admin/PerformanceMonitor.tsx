/**
 * 性能监控面板
 * 实时查看应用性能指标
 */

import React, { useState, useEffect } from 'react'
import { Card, Row, Col, Statistic, Table, Progress, Tag, Button, Space, Tabs, Empty } from 'antd'
import {
  DashboardOutlined,
  ThunderboltOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  ReloadOutlined,
  DownloadOutlined
} from '@ant-design/icons'
import {
  generateReport,
  getMetrics,
  clearMetrics,
  getMemoryUsage,
  initPerformanceMonitoring,
  type PerformanceReport,
  type PerformanceMetric
} from '../../utils/performance'
import { formatNumber } from '../../utils/format'
import { useTranslation } from 'react-i18next'
import { COMMON_ACTIONS, PERFORMANCE_KEYS } from '../../i18n/constants'

const PerformanceMonitor: React.FC = () => {
  const { t } = useTranslation()
  const [report, setReport] = useState<PerformanceReport | null>(null)
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([])
  const [memory, setMemory] = useState<ReturnType<typeof getMemoryUsage>>(null)
  const [autoRefresh, setAutoRefresh] = useState(false)

  // 加载性能数据
  const loadPerformanceData = () => {
    const newReport = generateReport()
    const newMetrics = getMetrics()
    const newMemory = getMemoryUsage()

    setReport(newReport)
    setMetrics(newMetrics)
    setMemory(newMemory)
  }

  // 初始化和自动刷新
  useEffect(() => {
    // 确保性能监控已启动
    initPerformanceMonitoring({ enabled: true, sampleRate: 1.0 })

    // 初始加载
    loadPerformanceData()

    // 自动刷新
    let interval: NodeJS.Timeout | null = null
    if (autoRefresh) {
      interval = setInterval(loadPerformanceData, 5000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [autoRefresh])

  // 导出报告
  const handleExport = () => {
    const data = JSON.stringify(report, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `performance-report-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // 清空数据
  const handleClear = () => {
    clearMetrics()
    loadPerformanceData()
  }

  // 获取性能评分颜色
  const getScoreColor = (value: number, threshold: number, reverse = false): string => {
    if (reverse) {
      return value > threshold ? '#52c41a' : '#ff4d4f'
    }
    return value < threshold ? '#52c41a' : '#ff4d4f'
  }

  // 获取性能等级
  const getPerformanceGrade = (value: number, thresholds: { good: number; warning: number }): string => {
    if (value < thresholds.good) return 'A'
    if (value < thresholds.warning) return 'B'
    return 'C'
  }

  // Web Vitals 阈值
  const thresholds = {
    fcp: { good: 1800, warning: 3000 },
    lcp: { good: 2500, warning: 4000 },
    fid: { good: 100, warning: 300 },
    cls: { good: 0.1, warning: 0.25 },
    loadTime: { good: 3000, warning: 5000 }
  }

  if (!report) {
    return (
      <Card>
        <Empty description={t('performance.loading')} />
      </Card>
    )
  }

  return (
    <div style={{ 
      padding: '24px', 
      background: 'linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 100%)',
      minHeight: '100vh'
    }}>
      {/* 头部操作栏 */}
      <div style={{ 
        marginBottom: 24, 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        padding: '16px',
        background: 'rgba(15, 15, 15, 0.6)',
        border: '1px solid rgba(255, 215, 0, 0.2)',
        borderRadius: '8px',
        backdropFilter: 'blur(10px)'
      }}>
        <h2 style={{ 
          margin: 0, 
          color: '#ffd700', 
          fontSize: '20px',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <DashboardOutlined style={{ color: '#ffd700' }} /> {t(PERFORMANCE_KEYS.TITLE)}
        </h2>
        <Space>
          <Button
            icon={<ReloadOutlined />}
            onClick={loadPerformanceData}
            style={{
              background: 'rgba(255, 215, 0, 0.1)',
              borderColor: 'rgba(255, 215, 0, 0.3)',
              color: '#ffd700'
            }}
          >
            {t(COMMON_ACTIONS.REFRESH)}
          </Button>
          <Button
            type={autoRefresh ? 'primary' : 'default'}
            onClick={() => setAutoRefresh(!autoRefresh)}
            style={autoRefresh ? {
              background: 'linear-gradient(to right, #FDE08D, #C48D3A)',
              borderColor: '#ffd700',
              color: '#000'
            } : {
              background: 'rgba(255, 215, 0, 0.1)',
              borderColor: 'rgba(255, 215, 0, 0.3)',
              color: '#ffd700'
            }}
          >
            {autoRefresh ? t(PERFORMANCE_KEYS.AUTO_REFRESH_OFF) : t(PERFORMANCE_KEYS.AUTO_REFRESH_ON)}
          </Button>
          <Button
            icon={<DownloadOutlined />}
            onClick={handleExport}
            style={{
              background: 'rgba(255, 215, 0, 0.1)',
              borderColor: 'rgba(255, 215, 0, 0.3)',
              color: '#ffd700'
            }}
          >
            {t(COMMON_ACTIONS.EXPORT_REPORT)}
          </Button>
          <Button 
            danger 
            onClick={handleClear}
            style={{
              background: 'rgba(255, 77, 79, 0.1)',
              borderColor: 'rgba(255, 77, 79, 0.3)',
              color: '#ff4d4f'
            }}
          >
            {t(COMMON_ACTIONS.CLEAR_DATA)}
          </Button>
        </Space>
      </div>

      <Tabs 
        defaultActiveKey="overview"
        style={{
          background: 'rgba(15, 15, 15, 0.4)',
          padding: '16px',
          borderRadius: '8px',
          border: '1px solid rgba(255, 215, 0, 0.1)'
        }}
        items={[
          {
            key: 'overview',
            label: <span style={{ color: '#ffd700', fontWeight: 600 }}>{t(PERFORMANCE_KEYS.OVERVIEW)}</span>,
            children: (
              <>
          {/* Web Vitals 核心指标 */}
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} sm={12} lg={6}>
              <Card
                style={{
                  background: 'var(--cigar-black-secondary)',
                  borderColor: 'var(--cigar-border-primary)'
                }}
              >
                <Statistic
                  title={<span style={{ color: 'var(--cigar-text-secondary)' }}>{t('performance.metrics.fcp')}</span>}
                  value={report.summary.firstContentfulPaint || 0}
                  suffix="ms"
                  valueStyle={{ color: getScoreColor(report.summary.firstContentfulPaint, thresholds.fcp.warning) }}
                  prefix={<ThunderboltOutlined />}
                />
                <div style={{ marginTop: 8 }}>
                  <Tag color={getScoreColor(report.summary.firstContentfulPaint, thresholds.fcp.warning)}>
                    {getPerformanceGrade(report.summary.firstContentfulPaint, thresholds.fcp)}
                  </Tag>
                  <span style={{ color: 'var(--cigar-text-tertiary)', fontSize: 12 }}>
                    {t('performance.target')}: &lt; {thresholds.fcp.good}ms
                  </span>
                </div>
              </Card>
            </Col>

            <Col xs={24} sm={12} lg={6}>
              <Card
                style={{
                  background: 'var(--cigar-black-secondary)',
                  borderColor: 'var(--cigar-border-primary)'
                }}
              >
                <Statistic
                  title={<span style={{ color: 'var(--cigar-text-secondary)' }}>{t('performance.metrics.lcp')}</span>}
                  value={report.summary.largestContentfulPaint || 0}
                  suffix="ms"
                  valueStyle={{ color: getScoreColor(report.summary.largestContentfulPaint, thresholds.lcp.warning) }}
                  prefix={<ClockCircleOutlined />}
                />
                <div style={{ marginTop: 8 }}>
                  <Tag color={getScoreColor(report.summary.largestContentfulPaint, thresholds.lcp.warning)}>
                    {getPerformanceGrade(report.summary.largestContentfulPaint, thresholds.lcp)}
                  </Tag>
                  <span style={{ color: 'var(--cigar-text-tertiary)', fontSize: 12 }}>
                    {t('performance.target')}: &lt; {thresholds.lcp.good}ms
                  </span>
                </div>
              </Card>
            </Col>

            <Col xs={24} sm={12} lg={6}>
              <Card
                style={{
                  background: 'var(--cigar-black-secondary)',
                  borderColor: 'var(--cigar-border-primary)'
                }}
              >
                <Statistic
                  title={<span style={{ color: 'var(--cigar-text-secondary)' }}>{t('performance.metrics.fid')}</span>}
                  value={report.summary.firstInputDelay || 0}
                  suffix="ms"
                  valueStyle={{ color: getScoreColor(report.summary.firstInputDelay, thresholds.fid.warning) }}
                  prefix={<ThunderboltOutlined />}
                />
                <div style={{ marginTop: 8 }}>
                  <Tag color={getScoreColor(report.summary.firstInputDelay, thresholds.fid.warning)}>
                    {getPerformanceGrade(report.summary.firstInputDelay, thresholds.fid)}
                  </Tag>
                  <span style={{ color: 'var(--cigar-text-tertiary)', fontSize: 12 }}>
                    {t('performance.target')}: &lt; {thresholds.fid.good}ms
                  </span>
                </div>
              </Card>
            </Col>

            <Col xs={24} sm={12} lg={6}>
              <Card
                style={{
                  background: 'var(--cigar-black-secondary)',
                  borderColor: 'var(--cigar-border-primary)'
                }}
              >
                <Statistic
                  title={<span style={{ color: 'var(--cigar-text-secondary)' }}>{t('performance.metrics.cls')}</span>}
                  value={(report.summary.cumulativeLayoutShift || 0).toFixed(3)}
                  valueStyle={{ color: getScoreColor(report.summary.cumulativeLayoutShift, thresholds.cls.warning) }}
                  prefix={<WarningOutlined />}
                />
                <div style={{ marginTop: 8 }}>
                  <Tag color={getScoreColor(report.summary.cumulativeLayoutShift, thresholds.cls.warning)}>
                    {getPerformanceGrade(report.summary.cumulativeLayoutShift, thresholds.cls)}
                  </Tag>
                  <span style={{ color: 'var(--cigar-text-tertiary)', fontSize: 12 }}>
                    {t('performance.target')}: &lt; {thresholds.cls.good}
                  </span>
                </div>
              </Card>
            </Col>
          </Row>

          {/* 其他关键指标 */}
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} sm={12} lg={8}>
              <Card
                title={<span style={{ color: 'var(--cigar-text-primary)' }}>{t('performance.metrics.pageLoad')}</span>}
                style={{
                  background: 'var(--cigar-black-secondary)',
                  borderColor: 'var(--cigar-border-primary)'
                }}
              >
                <Statistic
                  value={report.summary.totalLoadTime || 0}
                  suffix="ms"
                  valueStyle={{ color: 'var(--cigar-text-primary)' }}
                />
                <Progress
                  percent={Math.min(100, (report.summary.totalLoadTime / thresholds.loadTime.warning) * 100)}
                  strokeColor={getScoreColor(report.summary.totalLoadTime, thresholds.loadTime.warning)}
                  showInfo={false}
                />
              </Card>
            </Col>

            <Col xs={24} sm={12} lg={8}>
              <Card
                title={<span style={{ color: 'var(--cigar-text-primary)' }}>{t('performance.metrics.tti')}</span>}
                style={{
                  background: 'var(--cigar-black-secondary)',
                  borderColor: 'var(--cigar-border-primary)'
                }}
              >
                <Statistic
                  value={report.summary.timeToInteractive || 0}
                  suffix="ms"
                  valueStyle={{ color: 'var(--cigar-text-primary)' }}
                />
              </Card>
            </Col>

            <Col xs={24} sm={12} lg={8}>
              <Card
                title={<span style={{ color: 'var(--cigar-text-primary)' }}>{t('performance.metrics.memory')}</span>}
                style={{
                  background: 'var(--cigar-black-secondary)',
                  borderColor: 'var(--cigar-border-primary)'
                }}
              >
                {memory ? (
                  <>
                    <Statistic
                      value={memory.percentage.toFixed(1)}
                      suffix="%"
                      valueStyle={{ color: memory.percentage > 80 ? '#ff4d4f' : 'var(--cigar-text-primary)' }}
                    />
                    <div style={{ color: 'var(--cigar-text-tertiary)', fontSize: 12, marginTop: 8 }}>
                      {formatNumber(memory.used / 1024 / 1024, { maximumFractionDigits: 0 })} MB / {formatNumber(memory.total / 1024 / 1024, { maximumFractionDigits: 0 })} MB
                    </div>
                  </>
                ) : (
                  <div style={{ color: 'var(--cigar-text-secondary)' }}>{t('performance.notSupported')}</div>
                )}
              </Card>
            </Col>
          </Row>

          {/* 资源统计 */}
          <Card
            title={<span style={{ color: 'var(--cigar-text-primary)' }}>{t('performance.resources.title')}</span>}
            style={{
              background: 'var(--cigar-black-secondary)',
              borderColor: 'var(--cigar-border-primary)'
            }}
          >
            <Row gutter={16}>
              <Col span={6}>
                <Statistic
                  title={<span style={{ color: 'var(--cigar-text-secondary)' }}>{t('performance.resources.scripts')}</span>}
                  value={report.resources.scripts}
                  valueStyle={{ color: 'var(--cigar-text-primary)' }}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title={<span style={{ color: 'var(--cigar-text-secondary)' }}>{t('performance.resources.stylesheets')}</span>}
                  value={report.resources.stylesheets}
                  valueStyle={{ color: 'var(--cigar-text-primary)' }}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title={<span style={{ color: 'var(--cigar-text-secondary)' }}>{t('performance.resources.images')}</span>}
                  value={report.resources.images}
                  valueStyle={{ color: 'var(--cigar-text-primary)' }}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title={<span style={{ color: 'var(--cigar-text-secondary)' }}>{t('performance.resources.total')}</span>}
                  value={report.resources.total}
                  valueStyle={{ color: 'var(--cigar-text-primary)' }}
                />
              </Col>
            </Row>
          </Card>
              </>
            )
          },
          {
            key: 'metrics',
            label: <span style={{ color: '#ffd700', fontWeight: 600 }}>{t(PERFORMANCE_KEYS.DETAILED_METRICS)}</span>,
            children: (
              <div className="points-config-form">
                <Table
                  dataSource={metrics.map((m, i) => ({ ...m, key: i }))}
                  columns={[
                    {
                      title: t(PERFORMANCE_KEYS.METRIC_NAME),
                      dataIndex: 'name',
                      key: 'name',
                      render: (text) => <span style={{ color: 'rgba(255, 255, 255, 0.85)' }}>{text}</span>
                    },
                    {
                      title: t(PERFORMANCE_KEYS.VALUE),
                      dataIndex: 'value',
                      key: 'value',
                      render: (value, record) => (
                        <span style={{ color: 'rgba(255, 255, 255, 0.85)' }}>
                          {formatNumber(value, { maximumFractionDigits: 2 })} {record.unit}
                        </span>
                      )
                    },
                    {
                      title: t(PERFORMANCE_KEYS.CATEGORY),
                      dataIndex: 'category',
                      key: 'category',
                      render: (category) => {
                        const colors: Record<string, string> = {
                          navigation: '#1890ff',
                          resource: '#52c41a',
                          mark: '#faad14',
                          measure: '#722ed1',
                          custom: '#13c2c2'
                        }
                        return <Tag color={colors[category]}>{category}</Tag>
                      }
                    },
                    {
                      title: t(PERFORMANCE_KEYS.TIMESTAMP),
                      dataIndex: 'timestamp',
                      key: 'timestamp',
                      render: (timestamp) => (
                        <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                          {new Date(timestamp).toLocaleTimeString()}
                        </span>
                      )
                    }
                  ]}
                  pagination={{
                    pageSize: 20,
                    showSizeChanger: true
                  }}
                  style={{
                    background: 'transparent'
                  }}
                />
              </div>
            )
          }
        ]}
      />
    </div>
  )
}

export default PerformanceMonitor
