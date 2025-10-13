import React, { Component, ReactNode } from 'react'
import { Button, Result } from 'antd'

interface Props {
  /** 子组件 */
  children: ReactNode
  /** 自定义错误 UI */
  fallback?: (error: Error, errorInfo: React.ErrorInfo, reset: () => void) => ReactNode
  /** 错误回调 */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  /** 是否在开发环境显示详细错误信息 */
  showDetails?: boolean
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

/**
 * 错误边界组件
 * 捕获子组件树中的 JavaScript 错误，记录错误并显示降级 UI
 * 
 * @example
 * ```tsx
 * // 基础用法
 * <ErrorBoundary>
 *   <YourComponent />
 * </ErrorBoundary>
 * 
 * // 自定义错误 UI
 * <ErrorBoundary
 *   fallback={(error, errorInfo, reset) => (
 *     <div>
 *       <h1>出错了</h1>
 *       <p>{error.message}</p>
 *       <button onClick={reset}>重试</button>
 *     </div>
 *   )}
 * >
 *   <YourComponent />
 * </ErrorBoundary>
 * 
 * // 带错误回调
 * <ErrorBoundary
 *   onError={(error, errorInfo) => {
 *     // 发送错误日志到监控系统
 *     console.error('Error caught by boundary:', error, errorInfo)
 *   }}
 * >
 *   <YourComponent />
 * </ErrorBoundary>
 * ```
 */
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    }
  }

  static getDerivedStateFromError(error: Error): State {
    // 更新状态，使下一次渲染显示降级 UI
    return {
      hasError: true,
      error,
      errorInfo: null
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // 记录错误信息
    console.error('ErrorBoundary caught an error:', error, errorInfo)

    // 更新错误信息到状态
    this.setState({
      error,
      errorInfo
    })

    // 调用用户提供的错误回调
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    })
  }

  render() {
    const { hasError, error, errorInfo } = this.state
    const { children, fallback, showDetails = process.env.NODE_ENV === 'development' } = this.props

    if (hasError && error) {
      // 如果提供了自定义降级 UI，使用它
      if (fallback) {
        return fallback(error, errorInfo!, this.handleReset)
      }

      // 默认错误 UI
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(24, 22, 17, 0.95)',
            padding: '20px'
          }}
        >
          <Result
            status="error"
            title="页面出错了"
            subTitle={showDetails ? error.message : '抱歉，页面加载时遇到了一些问题'}
            extra={[
              <Button
                type="primary"
                key="reset"
                onClick={this.handleReset}
              >
                重新加载
              </Button>,
              <Button
                key="home"
                onClick={() => (window.location.href = '/')}
              >
                返回首页
              </Button>
            ]}
          >
            {showDetails && errorInfo && (
              <div
                style={{
                  marginTop: '24px',
                  padding: '16px',
                  background: 'rgba(0, 0, 0, 0.3)',
                  borderRadius: '8px',
                  border: '1px solid rgba(244, 175, 37, 0.3)',
                  textAlign: 'left',
                  maxWidth: '800px',
                  overflow: 'auto'
                }}
              >
                <div style={{ marginBottom: '12px', color: '#F4AF25', fontWeight: 'bold' }}>
                  错误详情：
                </div>
                <div style={{ color: '#FFFFFF', fontSize: '14px', lineHeight: '1.6' }}>
                  <div style={{ marginBottom: '8px' }}>
                    <strong>错误消息：</strong>
                    <div style={{ marginTop: '4px', color: '#ff4d4f' }}>{error.toString()}</div>
                  </div>
                  <div>
                    <strong>组件栈：</strong>
                    <pre
                      style={{
                        marginTop: '4px',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        fontSize: '12px',
                        color: 'rgba(255, 255, 255, 0.8)'
                      }}
                    >
                      {errorInfo.componentStack}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </Result>
        </div>
      )
    }

    return children
  }
}

/**
 * 函数式错误边界 Hook（实验性）
 * 由于 React 尚未支持函数组件的错误边界，这是一个包装器
 */
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  )

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name || 'Component'})`

  return WrappedComponent
}

export default ErrorBoundary

