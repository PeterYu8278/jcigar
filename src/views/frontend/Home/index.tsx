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
    <div style={{ padding: '0' }}>
      {/* 欢迎横幅 */}
      <Card 
        className="cigar-card"
        style={{ 
          marginBottom: 16, 
          background: 'linear-gradient(135deg, rgba(26, 26, 26, 0.9) 0%, rgba(45, 45, 45, 0.8) 100%)',
          border: '2px solid rgba(255, 215, 0, 0.3)',
          borderRadius: '16px',
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
        
        <Row align="middle" style={{ position: 'relative', zIndex: 1 }} gutter={[16, 16]}>
          <Col xs={24} sm={16} md={16} lg={16}>
            <Title level={1} style={{ 
              color: '#f8f8f8', 
              marginBottom: 12,
              background: 'linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              fontWeight: 700,
              fontSize: 'clamp(24px, 5vw, 36px)'
            }}>
              欢迎来到雪茄客社区
            </Title>
            <Paragraph style={{ 
              color: '#c0c0c0', 
              fontSize: 'clamp(14px, 3vw, 18px)', 
              marginBottom: 20, 
              lineHeight: 1.6 
            }}>
              探索世界顶级雪茄，参与专业聚会，与同好分享品鉴心得
            </Paragraph>
            <Space size="middle" direction="vertical" style={{ width: '100%', display: 'none' }} className="mobile-button-stack">
              <Button 
                type="primary" 
                size="large" 
                icon={<CalendarOutlined />} 
                onClick={() => navigate('/events')}
                block
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
                block
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
            <Space size="large" className="desktop-button-row">
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
          <Col xs={24} sm={8} md={8} lg={8} style={{ textAlign: 'center' }}>
            <div style={{ position: 'relative' }}>
              <FireOutlined style={{ 
                fontSize: 'clamp(60px, 15vw, 120px)', 
                color: 'rgba(255, 215, 0, 0.6)',
                filter: 'drop-shadow(0 0 20px rgba(255, 215, 0, 0.3))'
              }} />
              <CrownOutlined style={{
                position: 'absolute',
                top: '15%',
                right: '15%',
                fontSize: 'clamp(16px, 4vw, 24px)',
                color: '#ffd700'
              }} />
            </div>
          </Col>
        </Row>
      </Card>

      {/* 统计数据 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={12} lg={6}>
          <Card className="cigar-card" style={{ textAlign: 'center', padding: '12px' }}>
            <Statistic
              title={<Text style={{ color: '#c0c0c0', fontSize: '12px' }}>活跃会员</Text>}
              value={1128}
              prefix={<TeamOutlined style={{ color: '#ffd700', fontSize: '18px' }} />}
              valueStyle={{ color: '#ffd700', fontSize: 'clamp(20px, 4vw, 28px)', fontWeight: 700 }}
              suffix={<Text style={{ color: '#999999', fontSize: '14px' }}>人</Text>}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} lg={6}>
          <Card className="cigar-card" style={{ textAlign: 'center', padding: '12px' }}>
            <Statistic
              title={<Text style={{ color: '#c0c0c0', fontSize: '12px' }}>本月活动</Text>}
              value={15}
              prefix={<CalendarOutlined style={{ color: '#ffd700', fontSize: '18px' }} />}
              valueStyle={{ color: '#ffd700', fontSize: 'clamp(20px, 4vw, 28px)', fontWeight: 700 }}
              suffix={<Text style={{ color: '#999999', fontSize: '14px' }}>场</Text>}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} lg={6}>
          <Card className="cigar-card" style={{ textAlign: 'center', padding: '12px' }}>
            <Statistic
              title={<Text style={{ color: '#c0c0c0', fontSize: '12px' }}>雪茄品种</Text>}
              value={286}
              prefix={<ShoppingOutlined style={{ color: '#ffd700', fontSize: '18px' }} />}
              valueStyle={{ color: '#ffd700', fontSize: 'clamp(20px, 4vw, 28px)', fontWeight: 700 }}
              suffix={<Text style={{ color: '#999999', fontSize: '14px' }}>种</Text>}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} lg={6}>
          <Card className="cigar-card" style={{ textAlign: 'center', padding: '12px' }}>
            <Statistic
              title={<Text style={{ color: '#c0c0c0', fontSize: '12px' }}>社区评分</Text>}
              value={4.8}
              precision={1}
              prefix={<StarOutlined style={{ color: '#ffd700', fontSize: '18px' }} />}
              suffix={<Text style={{ color: '#999999', fontSize: '14px' }}>/ 5.0</Text>}
              valueStyle={{ color: '#ffd700', fontSize: 'clamp(20px, 4vw, 28px)', fontWeight: 700 }}
            />
          </Card>
        </Col>
      </Row>

      {/* 功能卡片 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card
            className="cigar-card"
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CalendarOutlined style={{ color: '#ffd700' }} />
                <Text style={{ color: '#f8f8f8', fontSize: 'clamp(14px, 3vw, 18px)', fontWeight: 600 }}>最新活动</Text>
              </div>
            }
            extra={
              <Button 
                type="link" 
                onClick={() => navigate('/events')}
                style={{ color: '#ffd700', fontWeight: 600, fontSize: '12px' }}
              >
                查看更多
              </Button>
            }
            hoverable
          >
            <div style={{ textAlign: 'center', padding: 'clamp(12px, 3vw, 20px) 0' }}>
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <CalendarOutlined style={{ 
                  fontSize: 'clamp(48px, 12vw, 64px)', 
                  color: '#ffd700', 
                  marginBottom: 16,
                  filter: 'drop-shadow(0 0 10px rgba(255, 215, 0, 0.3))'
                }} />
                <Badge 
                  count="热门" 
                  style={{ 
                    backgroundColor: '#ffd700',
                    color: '#0a0a0a',
                    fontWeight: 600,
                    fontSize: '10px'
                  }}
                  offset={[-8, 8]}
                />
              </div>
              <Title level={3} style={{ 
                color: '#f8f8f8', 
                marginBottom: 12, 
                fontSize: 'clamp(18px, 4vw, 24px)' 
              }}>
                古巴雪茄品鉴会
              </Title>
              <Paragraph style={{ 
                color: '#c0c0c0', 
                fontSize: 'clamp(12px, 3vw, 16px)', 
                marginBottom: 20,
                lineHeight: 1.5
              }}>
                时间：2024年10月15日<br />
                地点：上海雪茄俱乐部<br />
                费用：¥200/人
              </Paragraph>
              <Button 
                type="primary"
                style={{
                  height: '44px',
                  background: 'linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#0a0a0a',
                  fontWeight: 600,
                  boxShadow: '0 4px 15px rgba(255, 215, 0, 0.3)',
                  width: '100%'
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
                <Text style={{ color: '#f8f8f8', fontSize: 'clamp(14px, 3vw, 18px)', fontWeight: 600 }}>热门雪茄</Text>
              </div>
            }
            extra={
              <Button 
                type="link" 
                onClick={() => navigate('/shop')}
                style={{ color: '#ffd700', fontWeight: 600, fontSize: '12px' }}
              >
                查看更多
              </Button>
            }
            hoverable
          >
            <div style={{ textAlign: 'center', padding: 'clamp(12px, 3vw, 20px) 0' }}>
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <TrophyOutlined style={{ 
                  fontSize: 'clamp(48px, 12vw, 64px)', 
                  color: '#ffd700', 
                  marginBottom: 16,
                  filter: 'drop-shadow(0 0 10px rgba(255, 215, 0, 0.3))'
                }} />
                <Badge 
                  count="推荐" 
                  style={{ 
                    backgroundColor: '#ffd700',
                    color: '#0a0a0a',
                    fontWeight: 600,
                    fontSize: '10px'
                  }}
                  offset={[-8, 8]}
                />
              </div>
              <Title level={3} style={{ 
                color: '#f8f8f8', 
                marginBottom: 12, 
                fontSize: 'clamp(18px, 4vw, 24px)' 
              }}>
                Cohiba Behike 52
              </Title>
              <Paragraph style={{ 
                color: '#c0c0c0', 
                fontSize: 'clamp(12px, 3vw, 16px)', 
                marginBottom: 20,
                lineHeight: 1.5
              }}>
                产地：古巴<br />
                强度：中等偏强<br />
                价格：¥580
              </Paragraph>
              <Button 
                type="primary"
                style={{
                  height: '44px',
                  background: 'linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#0a0a0a',
                  fontWeight: 600,
                  boxShadow: '0 4px 15px rgba(255, 215, 0, 0.3)',
                  width: '100%'
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
