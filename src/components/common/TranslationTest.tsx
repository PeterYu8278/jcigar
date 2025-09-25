import React from 'react'
import { Card, Typography, Space, Button } from 'antd'
import { useLanguage } from '../../contexts/LanguageContext'

const { Title, Text } = Typography

const TranslationTest: React.FC = () => {
  const { t, language, setLanguage } = useLanguage()

  return (
    <Card 
      style={{ 
        margin: '20px', 
        background: 'rgba(26, 26, 26, 0.8)',
        border: '1px solid #333333',
        borderRadius: '12px'
      }}
    >
      <Title level={4} style={{ color: '#ffd700', marginBottom: '16px' }}>
        Translation Test Component
      </Title>
      
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <div>
          <Text style={{ color: '#c0c0c0' }}>Current Language: </Text>
          <Text style={{ color: '#ffd700', fontWeight: 'bold' }}>{language}</Text>
        </div>
        
        <div>
          <Text style={{ color: '#c0c0c0' }}>Home: </Text>
          <Text style={{ color: '#ffffff' }}>{t('common.home')}</Text>
        </div>
        
        <div>
          <Text style={{ color: '#c0c0c0' }}>Events: </Text>
          <Text style={{ color: '#ffffff' }}>{t('common.events')}</Text>
        </div>
        
        <div>
          <Text style={{ color: '#c0c0c0' }}>Profile: </Text>
          <Text style={{ color: '#ffffff' }}>{t('common.profile')}</Text>
        </div>
        
        <Space>
          <Button 
            type={language === 'zh' ? 'primary' : 'default'}
            onClick={() => setLanguage('zh')}
            style={{ 
              background: language === 'zh' ? '#ffd700' : 'transparent',
              borderColor: '#ffd700',
              color: language === 'zh' ? '#000000' : '#ffd700'
            }}
          >
            中文
          </Button>
          
          <Button 
            type={language === 'en' ? 'primary' : 'default'}
            onClick={() => setLanguage('en')}
            style={{ 
              background: language === 'en' ? '#ffd700' : 'transparent',
              borderColor: '#ffd700',
              color: language === 'en' ? '#000000' : '#ffd700'
            }}
          >
            English
          </Button>
        </Space>
      </Space>
    </Card>
  )
}

export default TranslationTest
