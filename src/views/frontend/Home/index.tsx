// 首页组件
import React from 'react'
import { Row, Col, Card, Typography, Button, Space, Statistic } from 'antd'
import { 
  CalendarOutlined, 
  ShoppingOutlined, 
  TeamOutlined,
  FireOutlined 
} from '@ant-design/icons'

const { Title, Paragraph } = Typography

import { useNavigate } from 'react-router-dom'

const Home: React.FC = () => {
  const navigate = useNavigate()
  return (
    <div style={{ padding: '24px' }}>
      {/* 欢迎横幅 */}
      <Card style={{ marginBottom: 24, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <Row align="middle">
          <Col span={16}>
            <Title level={1} style={{ color: '#fff', marginBottom: 16 }}>
              欢迎来到雪茄客社区
            </Title>
            <Paragraph style={{ color: '#fff', fontSize: '16px', marginBottom: 24 }}>
              探索世界顶级雪茄，参与专业聚会，与同好分享品鉴心得
            </Paragraph>
            <Space>
              <Button 
                type="primary" 
                size="large" 
                icon={<CalendarOutlined />} 
                onClick={() => navigate('/events')}
              >
                查看活动
              </Button>
              <Button 
                size="large" 
                icon={<ShoppingOutlined />} 
                style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff' }}
                onClick={() => navigate('/shop')}
              >
                购买雪茄
              </Button>
            </Space>
          </Col>
          <Col span={8} style={{ textAlign: 'center' }}>
            <FireOutlined style={{ fontSize: '120px', color: 'rgba(255,255,255,0.3)' }} />
          </Col>
        </Row>
      </Card>

      {/* 统计数据 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="活跃会员"
              value={1128}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="本月活动"
              value={15}
              prefix={<CalendarOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="雪茄品种"
              value={286}
              prefix={<ShoppingOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="社区评分"
              value={4.8}
              precision={1}
              suffix="/ 5.0"
              valueStyle={{ color: '#f5222d' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 功能卡片 */}
      <Row gutter={[16, 16]}>
        <Col span={12}>
          <Card
            title="最新活动"
            extra={<Button type="link" onClick={() => navigate('/events')}>查看更多</Button>}
            hoverable
          >
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <CalendarOutlined style={{ fontSize: '48px', color: '#1890ff', marginBottom: 16 }} />
              <Title level={4}>古巴雪茄品鉴会</Title>
              <Paragraph type="secondary">
                时间：2024年10月15日<br />
                地点：上海雪茄俱乐部<br />
                费用：¥200/人
              </Paragraph>
              <Button type="primary">立即报名</Button>
            </div>
          </Card>
        </Col>
        
        <Col span={12}>
          <Card
            title="热门雪茄"
            extra={<Button type="link" onClick={() => navigate('/shop')}>查看更多</Button>}
            hoverable
          >
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <ShoppingOutlined style={{ fontSize: '48px', color: '#52c41a', marginBottom: 16 }} />
              <Title level={4}>Cohiba Behike 52</Title>
              <Paragraph type="secondary">
                产地：古巴<br />
                强度：中等偏强<br />
                价格：¥580
              </Paragraph>
              <Button type="primary">立即购买</Button>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default Home
