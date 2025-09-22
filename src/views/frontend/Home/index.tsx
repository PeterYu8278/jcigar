// 首页组件 - 雪茄客黑金主题
import React from 'react'
import { Row, Col, Card, Typography, Button, Space, Statistic, Badge } from 'antd'
import { 
  CalendarOutlined, 
  ShoppingOutlined, 
  TeamOutlined,
  FireOutlined,
  CrownOutlined,
  StarOutlined,
  TrophyOutlined
} from '@ant-design/icons'

const { Title, Paragraph, Text } = Typography

import { useNavigate } from 'react-router-dom'

const Home: React.FC = () => {
  const navigate = useNavigate()
  
  return (
    <div style={{ padding: '24px' }}>
      {/* 欢迎横幅 */}
      <Card 
        className="cigar-card"
        style={{ 
          marginBottom: 32, 
          background: 'linear-gradient(135deg, rgba(26, 26, 26, 0.9) 0%, rgba(45, 45, 45, 0.8) 100%)',
          border: '2px solid rgba(255, 215, 0, 0.3)',
          borderRadius: '20px',
          overflow: 'hidden',
          position: 'relative'
        }}
      >
        {/* 背景装饰 */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.1) 0%, transparent 100%)',
          pointerEvents: 'none'
        }} />
        
        <Row align="middle" style={{ position: 'relative', zIndex: 1 }}>
          <Col span={16}>
            <Title level={1} style={{ 
              color: '#f8f8f8', 
              marginBottom: 16,
              background: 'linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              fontWeight: 700,
              fontSize: '36px'
            }}>
              欢迎来到雪茄客社区
            </Title>
            <Paragraph style={{ color: '#c0c0c0', fontSize: '18px', marginBottom: 32, lineHeight: 1.8 }}>
              探索世界顶级雪茄，参与专业聚会，与同好分享品鉴心得
            </Paragraph>
            <Space size="large">
              <Button 
                type="primary" 
                size="large" 
                icon={<CalendarOutlined />} 
                onClick={() => navigate('/events')}
                style={{
                  height: '48px',
                  background: 'linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)',
                  border: 'none',
                  borderRadius: '12px',
                  color: '#0a0a0a',
                  fontWeight: 600,
                  boxShadow: '0 4px 20px rgba(255, 215, 0, 0.3)'
                }}
                className="home-button"
              >
                查看活动
              </Button>
              <Button 
                size="large" 
                icon={<ShoppingOutlined />} 
                style={{ 
                  height: '48px',
                  background: 'rgba(255, 215, 0, 0.1)', 
                  border: '2px solid rgba(255, 215, 0, 0.3)', 
                  color: '#ffd700',
                  borderRadius: '12px',
                  fontWeight: 600
                }}
                onClick={() => navigate('/shop')}
                className="home-button-secondary"
              >
                购买雪茄
              </Button>
            </Space>
          </Col>
          <Col span={8} style={{ textAlign: 'center' }}>
            <div style={{ position: 'relative' }}>
              <FireOutlined style={{ 
                fontSize: '120px', 
                color: 'rgba(255, 215, 0, 0.6)',
                filter: 'drop-shadow(0 0 20px rgba(255, 215, 0, 0.3))'
              }} />
              <CrownOutlined style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                fontSize: '24px',
                color: '#ffd700'
              }} />
            </div>
          </Col>
        </Row>
      </Card>

      {/* 统计数据 */}
      <Row gutter={[24, 24]} style={{ marginBottom: 32 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card className="cigar-card" style={{ textAlign: 'center' }}>
            <Statistic
              title={<Text style={{ color: '#c0c0c0' }}>活跃会员</Text>}
              value={1128}
              prefix={<TeamOutlined style={{ color: '#ffd700' }} />}
              valueStyle={{ color: '#ffd700', fontSize: '28px', fontWeight: 700 }}
              suffix={<Text style={{ color: '#999999' }}>人</Text>}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="cigar-card" style={{ textAlign: 'center' }}>
            <Statistic
              title={<Text style={{ color: '#c0c0c0' }}>本月活动</Text>}
              value={15}
              prefix={<CalendarOutlined style={{ color: '#ffd700' }} />}
              valueStyle={{ color: '#ffd700', fontSize: '28px', fontWeight: 700 }}
              suffix={<Text style={{ color: '#999999' }}>场</Text>}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="cigar-card" style={{ textAlign: 'center' }}>
            <Statistic
              title={<Text style={{ color: '#c0c0c0' }}>雪茄品种</Text>}
              value={286}
              prefix={<ShoppingOutlined style={{ color: '#ffd700' }} />}
              valueStyle={{ color: '#ffd700', fontSize: '28px', fontWeight: 700 }}
              suffix={<Text style={{ color: '#999999' }}>种</Text>}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="cigar-card" style={{ textAlign: 'center' }}>
            <Statistic
              title={<Text style={{ color: '#c0c0c0' }}>社区评分</Text>}
              value={4.8}
              precision={1}
              prefix={<StarOutlined style={{ color: '#ffd700' }} />}
              suffix={<Text style={{ color: '#999999' }}>/ 5.0</Text>}
              valueStyle={{ color: '#ffd700', fontSize: '28px', fontWeight: 700 }}
            />
          </Card>
        </Col>
      </Row>

      {/* 功能卡片 */}
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={12}>
          <Card
            className="cigar-card"
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CalendarOutlined style={{ color: '#ffd700' }} />
                <Text style={{ color: '#f8f8f8', fontSize: '18px', fontWeight: 600 }}>最新活动</Text>
              </div>
            }
            extra={
              <Button 
                type="link" 
                onClick={() => navigate('/events')}
                style={{ color: '#ffd700', fontWeight: 600 }}
              >
                查看更多
              </Button>
            }
            hoverable
          >
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <CalendarOutlined style={{ 
                  fontSize: '64px', 
                  color: '#ffd700', 
                  marginBottom: 20,
                  filter: 'drop-shadow(0 0 10px rgba(255, 215, 0, 0.3))'
                }} />
                <Badge 
                  count="热门" 
                  style={{ 
                    backgroundColor: '#ffd700',
                    color: '#0a0a0a',
                    fontWeight: 600
                  }}
                  offset={[-10, 10]}
                />
              </div>
              <Title level={3} style={{ color: '#f8f8f8', marginBottom: 16 }}>
                古巴雪茄品鉴会
              </Title>
              <Paragraph style={{ color: '#c0c0c0', fontSize: '16px', marginBottom: 24 }}>
                时间：2024年10月15日<br />
                地点：上海雪茄俱乐部<br />
                费用：¥200/人
              </Paragraph>
              <Button 
                type="primary"
                style={{
                  height: '40px',
                  background: 'linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#0a0a0a',
                  fontWeight: 600,
                  boxShadow: '0 4px 15px rgba(255, 215, 0, 0.3)'
                }}
                className="feature-button"
              >
                立即报名
              </Button>
            </div>
          </Card>
        </Col>
        
        <Col xs={24} lg={12}>
          <Card
            className="cigar-card"
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShoppingOutlined style={{ color: '#ffd700' }} />
                <Text style={{ color: '#f8f8f8', fontSize: '18px', fontWeight: 600 }}>热门雪茄</Text>
              </div>
            }
            extra={
              <Button 
                type="link" 
                onClick={() => navigate('/shop')}
                style={{ color: '#ffd700', fontWeight: 600 }}
              >
                查看更多
              </Button>
            }
            hoverable
          >
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <TrophyOutlined style={{ 
                  fontSize: '64px', 
                  color: '#ffd700', 
                  marginBottom: 20,
                  filter: 'drop-shadow(0 0 10px rgba(255, 215, 0, 0.3))'
                }} />
                <Badge 
                  count="推荐" 
                  style={{ 
                    backgroundColor: '#ffd700',
                    color: '#0a0a0a',
                    fontWeight: 600
                  }}
                  offset={[-10, 10]}
                />
              </div>
              <Title level={3} style={{ color: '#f8f8f8', marginBottom: 16 }}>
                Cohiba Behike 52
              </Title>
              <Paragraph style={{ color: '#c0c0c0', fontSize: '16px', marginBottom: 24 }}>
                产地：古巴<br />
                强度：中等偏强<br />
                价格：¥580
              </Paragraph>
              <Button 
                type="primary"
                style={{
                  height: '40px',
                  background: 'linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#0a0a0a',
                  fontWeight: 600,
                  boxShadow: '0 4px 15px rgba(255, 215, 0, 0.3)'
                }}
                className="feature-button"
              >
                立即购买
              </Button>
            </div>
          </Card>
        </Col>
      </Row>
      
    </div>
  )
}

export default Home
