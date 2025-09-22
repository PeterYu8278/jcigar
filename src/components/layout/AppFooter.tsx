// 应用底部组件
import React from 'react'
import { Layout, Typography, Space } from 'antd'

const { Footer } = Layout
const { Text, Link } = Typography

const AppFooter: React.FC = () => {
  return (
    <Footer style={{ 
      textAlign: 'center', 
      background: '#fff',
      borderTop: '1px solid #f0f0f0'
    }}>
      <Space direction="vertical" size="small">
        <Text type="secondary">
          雪茄客管理平台 ©2024 Created by JEP Ventures
        </Text>
        <Space size="middle">
          <Link href="#" target="_blank">
            隐私政策
          </Link>
          <Link href="#" target="_blank">
            服务条款
          </Link>
          <Link href="#" target="_blank">
            联系我们
          </Link>
        </Space>
      </Space>
    </Footer>
  )
}

export default AppFooter
