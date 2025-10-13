/**
 * 错误边界组件
 * 捕获和处理组件树中的错误
 */

import React, { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { Result, Button, Typography, Card, Collapse } from 'antd'
import { CloseCircleOutlined, ReloadOutlined, BugOutlined } from '@ant-design/icons'

const { Paragraph, Text } = Typography
const { Panel } = Collapse

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  showDetails?: boolean
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // 记录错误信息
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    
    this.setState({
      error,
      errorInfo
    })
    
    // 调用错误回调
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
    
    // 发送错误日志到服务器
    this.logErrorToService(error, errorInfo)
  }

  logErrorToService = (error: Error, errorInfo: ErrorInfo): void => {
    try {
      // 可以集成第三方错误追踪服务（如 Sentry）
      const errorLog = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href
      }
      
      // 发送到错误日志服务
      console.log('Error logged:', errorLog)
      
      // 示例：发送到后端
      // fetch('/api/logs/error', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(errorLog)
      // })
    } catch (loggingError) {
      console.error('Failed to log error:', loggingError)
    }
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    })
  }

  handleReload = (): void => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      // 自定义回退 UI
      if (this.props.fallback) {
        return this.props.fallback
      }

      const { error, errorInfo } = this.state
      const { showDetails = true } = this.props

      return (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: '20px',
            background: 'var(--cigar-black-primary)'
          }}
        >
          <Card
            style={{
              maxWidth: 800,
              width: '100%',
              background: 'var(--cigar-black-secondary)',
              borderColor: 'var(--cigar-border-primary)'
            }}
          >
            <Result
              status="error"
              icon={<CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
              title={
                <span style={{ color: 'var(--cigar-text-primary)' }}>
                  应用出现错误
                </span>
              }
              subTitle={
                <span style={{ color: 'var(--cigar-text-secondary)' }}>
                  抱歉，应用遇到了一个意外错误。我们已经记录了这个问题。
                </span>
              }
              extra={[
                <Button
                  key="reset"
                  type="primary"
                  icon={<ReloadOutlined />}
                  onClick={this.handleReset}
                >
                  重试
                </Button>,
                <Button
                  key="reload"
                  onClick={this.handleReload}
                >
                  刷新页面
                </Button>
              ]}
            >
              {showDetails && error && (
                <div style={{ textAlign: 'left', marginTop: 24 }}>
                  <Collapse
                    ghost
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: 4
                    }}
                  >
                    <Panel
                      header={
                        <span style={{ color: 'var(--cigar-text-primary)' }}>
                          <BugOutlined /> 错误详情
                        </span>
                      }
                      key="1"
                    >
                      <div style={{ marginBottom: 16 }}>
                        <Text strong style={{ color: '#ff4d4f' }}>
                          错误消息:
                        </Text>
                        <Paragraph
                          copyable
                          style={{
                            color: 'var(--cigar-text-secondary)',
                            marginTop: 8,
                            padding: 12,
                            background: 'rgba(0, 0, 0, 0.3)',
                            borderRadius: 4,
                            fontFamily: 'monospace',
                            fontSize: 12
                          }}
                        >
                          {error.message}
                        </Paragraph>
                      </div>

                      {error.stack && (
                        <div style={{ marginBottom: 16 }}>
                          <Text strong style={{ color: '#ff4d4f' }}>
                            错误堆栈:
                          </Text>
                          <Paragraph
                            copyable
                            style={{
                              color: 'var(--cigar-text-secondary)',
                              marginTop: 8,
                              padding: 12,
                              background: 'rgba(0, 0, 0, 0.3)',
                              borderRadius: 4,
                              fontFamily: 'monospace',
                              fontSize: 11,
                              maxHeight: 200,
                              overflow: 'auto'
                            }}
                          >
                            {error.stack}
                          </Paragraph>
                        </div>
                      )}

                      {errorInfo?.componentStack && (
                        <div>
                          <Text strong style={{ color: '#ff4d4f' }}>
                            组件堆栈:
                          </Text>
                          <Paragraph
                            copyable
                            style={{
                              color: 'var(--cigar-text-secondary)',
                              marginTop: 8,
                              padding: 12,
                              background: 'rgba(0, 0, 0, 0.3)',
                              borderRadius: 4,
                              fontFamily: 'monospace',
                              fontSize: 11,
                              maxHeight: 200,
                              overflow: 'auto'
                            }}
                          >
                            {errorInfo.componentStack}
                          </Paragraph>
                        </div>
                      )}
                    </Panel>
                  </Collapse>
                </div>
              )}
            </Result>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary