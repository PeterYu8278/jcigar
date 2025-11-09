/**
 * 统计卡片组件
 * 用于 Dashboard 数据展示
 */

import React from 'react'
import { Card, Statistic, Row, Col, Tag } from 'antd'
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  MinusOutlined
} from '@ant-design/icons'
import type { CardProps } from 'antd'
import { formatNumber, formatPercentage, formatCurrency } from '../../utils/format'

export interface StatisticCardProps extends Omit<CardProps, 'title' | 'prefix' | 'variant'> {
  /** 标题 */
  title: string
  /** 数值 */
  value: number | string
  /** 前缀（图标） */
  prefix?: React.ReactNode
  /** 后缀 */
  suffix?: string
  /** 数值格式 */
  valueFormat?: 'number' | 'currency' | 'percent'
  /** 货币符号（当 format 为 currency 时使用） */
  currency?: string
  /** 小数位数 */
  precision?: number
  /** 趋势方向 */
  trend?: 'up' | 'down' | 'flat'
  /** 趋势值 */
  trendValue?: number | string
  /** 趋势文本 */
  trendText?: string
  /** 对比说明文字 */
  comparison?: string
  /** 额外内容 */
  extra?: React.ReactNode
  /** 底部内容 */
  footer?: React.ReactNode
  /** 加载状态 */
  loading?: boolean
  /** 自定义颜色 */
  color?: string
  /** 卡片样式变体 */
  variant?: 'default' | 'gradient' | 'minimal'
}

/**
 * 统计卡片组件
 * 
 * @example
 * ```tsx
 * // 基础用法
 * <StatisticCard
 *   title="总销售额"
 *   value={125680}
 *   valueFormat="currency"
 *   prefix={<DollarOutlined />}
 * />
 * 
 * // 带趋势
 * <StatisticCard
 *   title="活跃用户"
 *   value={1234}
 *   trend="up"
 *   trendValue={12.5}
 *   trendText="较上月"
 * />
 * 
 * // 渐变样式
 * <StatisticCard
 *   title="订单总数"
 *   value={856}
 *   variant="gradient"
 *   color="#1890ff"
 *   trend="up"
 *   trendValue="15%"
 * />
 * ```
 */
const StatisticCard: React.FC<StatisticCardProps> = ({
  title,
  value,
  prefix,
  suffix,
  valueFormat = 'number',
  currency = 'RM',
  precision = 2,
  trend,
  trendValue,
  trendText,
  comparison,
  extra,
  footer,
  loading = false,
  color,
  variant = 'default',
  ...cardProps
}) => {
  /**
   * 格式化数值
   */
  const formatValue = (): string => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value

    switch (valueFormat) {
      case 'currency':
        return formatCurrency(numValue, { 
          currency, 
          minimumFractionDigits: precision,
          maximumFractionDigits: precision 
        })
      case 'percent':
        return formatPercentage(numValue, { 
          minimumFractionDigits: precision ?? 1,
          maximumFractionDigits: precision ?? 2
        })
      case 'number':
      default:
        return formatNumber(numValue, { 
          minimumFractionDigits: precision ?? 0,
          maximumFractionDigits: precision ?? 2
        })
    }
  }

  /**
   * 获取趋势图标
   */
  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <ArrowUpOutlined style={{ color: '#52c41a' }} />
      case 'down':
        return <ArrowDownOutlined style={{ color: '#ff4d4f' }} />
      case 'flat':
        return <MinusOutlined style={{ color: '#faad14' }} />
      default:
        return null
    }
  }

  /**
   * 获取趋势颜色
   */
  const getTrendColor = (): string => {
    switch (trend) {
      case 'up':
        return '#52c41a'
      case 'down':
        return '#ff4d4f'
      case 'flat':
        return '#faad14'
      default:
        return 'rgba(255, 255, 255, 0.65)'
    }
  }

  /**
   * 渲染趋势信息
   */
  const renderTrend = () => {
    if (!trend && !trendValue) return null

    return (
      <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
        {getTrendIcon()}
        <span style={{ color: getTrendColor(), fontSize: 14 }}>
          {trendValue}
          {trendText && (
            <span style={{ marginLeft: 4, color: 'rgba(255, 255, 255, 0.65)' }}>
              {trendText}
            </span>
          )}
        </span>
      </div>
    )
  }

  /**
   * 获取卡片样式
   */
  const getCardStyle = (): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      borderRadius: '12px',
      border: '1px solid rgba(244, 175, 37, 0.3)'
    }

    switch (variant) {
      case 'gradient':
        return {
          ...baseStyle,
          background: color
            ? `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`
            : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          border: 'none'
        }
      case 'minimal':
        return {
          ...baseStyle,
          background: 'transparent',
          boxShadow: 'none'
        }
      case 'default':
      default:
        return {
          ...baseStyle,
          background: 'rgba(24, 22, 17, 0.95)',
          backdropFilter: 'blur(20px)'
        }
    }
  }

  return (
    <Card
      {...cardProps}
      loading={loading}
      style={{
        ...getCardStyle(),
        ...cardProps.style
      }}
      bodyStyle={{
        padding: '20px 24px',
        ...cardProps.bodyStyle
      }}
    >
      <Row justify="space-between" align="top">
        <Col flex="auto">
          <div style={{ marginBottom: 12 }}>
            <span
              style={{
                fontSize: 14,
                color: variant === 'gradient' ? 'rgba(255, 255, 255, 0.85)' : 'rgba(255, 255, 255, 0.65)'
              }}
            >
              {title}
            </span>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            {prefix && (
              <span style={{ fontSize: 24, color: color || '#F4AF25' }}>
                {prefix}
              </span>
            )}
            <Statistic
              value={formatValue()}
              suffix={suffix}
              valueStyle={{
                fontSize: 30,
                fontWeight: 600,
                color: variant === 'gradient' ? '#fff' : color || '#F4AF25'
              }}
            />
          </div>

          {renderTrend()}

          {comparison && (
            <div style={{ marginTop: 8 }}>
              <span style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.45)' }}>
                {comparison}
              </span>
            </div>
          )}
        </Col>

        {extra && (
          <Col>
            {extra}
          </Col>
        )}
      </Row>

      {footer && (
        <div
          style={{
            marginTop: 16,
            paddingTop: 16,
            borderTop: `1px solid ${variant === 'gradient' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(244, 175, 37, 0.1)'}`
          }}
        >
          {footer}
        </div>
      )}
    </Card>
  )
}

/**
 * 统计卡片组
 * 
 * @example
 * ```tsx
 * <StatisticCardGroup>
 *   <StatisticCard title="总销售额" value={125680} valueFormat="currency" />
 *   <StatisticCard title="订单数" value={1234} trend="up" trendValue={12.5} />
 *   <StatisticCard title="用户数" value={5678} />
 * </StatisticCardGroup>
 * ```
 */
export const StatisticCardGroup: React.FC<{
  children: React.ReactNode
  gutter?: number | [number, number]
}> = ({ children, gutter = [16, 16] }) => {
  return (
    <Row gutter={gutter}>
      {React.Children.map(children, (child) => (
        <Col xs={24} sm={12} lg={8} xl={6}>
          {child}
        </Col>
      ))}
    </Row>
  )
}

export default StatisticCard

