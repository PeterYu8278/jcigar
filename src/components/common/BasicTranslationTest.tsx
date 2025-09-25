import React, { useState, useEffect } from 'react'
import { Button, Typography, Space } from 'antd'
import { useTranslation } from 'react-i18next'

const { Text } = Typography

const BasicTranslationTest: React.FC = () => {
  const { t, i18n } = useTranslation()
  const [forceUpdate, setForceUpdate] = useState(0)

  const changeLanguage = async (lng: string) => {
    console.log('Changing language to:', lng)
    try {
      await i18n.changeLanguage(lng)
      console.log('Language changed successfully to:', i18n.language)
      setForceUpdate(prev => prev + 1)
    } catch (error) {
      console.error('Failed to change language:', error)
    }
  }

  useEffect(() => {
    console.log('Component mounted, current language:', i18n.language)
    console.log('Available resources:', i18n.getResourceBundle(i18n.language, 'common'))
  }, [i18n])

  return (
    <div style={{ 
      padding: '20px', 
      background: 'rgba(0, 0, 0, 0.9)', 
      borderRadius: '8px',
      margin: '20px',
      border: '2px solid #ffd700'
    }}>
      <Text style={{ color: '#ffd700', fontSize: '18px', fontWeight: 'bold' }}>
        Basic Translation Test (Check Console)
      </Text>
      
      <div style={{ margin: '15px 0' }}>
        <Text style={{ color: '#c0c0c0' }}>Current Language: </Text>
        <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '16px' }}>
          {i18n.language}
        </Text>
      </div>
      
      <div style={{ margin: '10px 0' }}>
        <Text style={{ color: '#c0c0c0' }}>Home Translation: </Text>
        <Text style={{ color: '#ffffff', fontSize: '16px' }}>
          "{t('common.home')}"
        </Text>
      </div>
      
      <div style={{ margin: '10px 0' }}>
        <Text style={{ color: '#c0c0c0' }}>Events Translation: </Text>
        <Text style={{ color: '#ffffff', fontSize: '16px' }}>
          "{t('common.events')}"
        </Text>
      </div>
      
      <div style={{ margin: '10px 0' }}>
        <Text style={{ color: '#c0c0c0' }}>Profile Translation: </Text>
        <Text style={{ color: '#ffffff', fontSize: '16px' }}>
          "{t('common.profile')}"
        </Text>
      </div>
      
      <Space style={{ marginTop: '20px' }}>
        <Button 
          type={i18n.language === 'zh' ? 'primary' : 'default'}
          onClick={() => changeLanguage('zh')}
          style={{ 
            background: i18n.language === 'zh' ? '#ffd700' : 'transparent',
            borderColor: '#ffd700',
            color: i18n.language === 'zh' ? '#000000' : '#ffd700',
            fontSize: '16px',
            padding: '8px 16px'
          }}
        >
          🇨🇳 切换到中文
        </Button>
        
        <Button 
          type={i18n.language === 'en' ? 'primary' : 'default'}
          onClick={() => changeLanguage('en')}
          style={{ 
            background: i18n.language === 'en' ? '#ffd700' : 'transparent',
            borderColor: '#ffd700',
            color: i18n.language === 'en' ? '#000000' : '#ffd700',
            fontSize: '16px',
            padding: '8px 16px'
          }}
        >
          🇺🇸 Switch to English
        </Button>
      </Space>
      
      <div style={{ marginTop: '15px' }}>
        <Text style={{ color: '#888', fontSize: '12px' }}>
          Force Update Counter: {forceUpdate}
        </Text>
      </div>
    </div>
  )
}

export default BasicTranslationTest
