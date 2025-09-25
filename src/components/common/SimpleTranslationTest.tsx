import React from 'react'
import { Button, Space, Typography } from 'antd'
import { useTranslation } from 'react-i18next'

const { Text } = Typography

const SimpleTranslationTest: React.FC = () => {
  const { t, i18n } = useTranslation()

  const changeLanguage = async (lng: string) => {
    await i18n.changeLanguage(lng)
  }

  return (
    <div style={{ 
      padding: '20px', 
      background: 'rgba(26, 26, 26, 0.8)', 
      borderRadius: '8px',
      margin: '20px',
      border: '1px solid #333333'
    }}>
      <Text style={{ color: '#ffd700', fontSize: '16px', fontWeight: 'bold' }}>
        Simple Translation Test
      </Text>
      
      <div style={{ margin: '10px 0' }}>
        <Text style={{ color: '#c0c0c0' }}>Current Language: </Text>
        <Text style={{ color: '#ffffff', fontWeight: 'bold' }}>{i18n.language}</Text>
      </div>
      
      <div style={{ margin: '10px 0' }}>
        <Text style={{ color: '#c0c0c0' }}>Home: </Text>
        <Text style={{ color: '#ffffff' }}>{t('common.home')}</Text>
      </div>
      
      <div style={{ margin: '10px 0' }}>
        <Text style={{ color: '#c0c0c0' }}>Events: </Text>
        <Text style={{ color: '#ffffff' }}>{t('common.events')}</Text>
      </div>
      
      <Space style={{ marginTop: '15px' }}>
        <Button 
          type={i18n.language === 'zh' ? 'primary' : 'default'}
          onClick={() => changeLanguage('zh')}
          style={{ 
            background: i18n.language === 'zh' ? '#ffd700' : 'transparent',
            borderColor: '#ffd700',
            color: i18n.language === 'zh' ? '#000000' : '#ffd700'
          }}
        >
          🇨🇳 中文
        </Button>
        
        <Button 
          type={i18n.language === 'en' ? 'primary' : 'default'}
          onClick={() => changeLanguage('en')}
          style={{ 
            background: i18n.language === 'en' ? '#ffd700' : 'transparent',
            borderColor: '#ffd700',
            color: i18n.language === 'en' ? '#000000' : '#ffd700'
          }}
        >
          🇺🇸 English
        </Button>
      </Space>
    </div>
  )
}

export default SimpleTranslationTest
