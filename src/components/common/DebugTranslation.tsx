import React, { useEffect } from 'react'
import { Typography } from 'antd'
import { useTranslation } from 'react-i18next'

const { Text } = Typography

const DebugTranslation: React.FC = () => {
  const { t, i18n } = useTranslation()

  useEffect(() => {
    console.log('i18n instance:', i18n)
    console.log('Current language:', i18n.language)
    console.log('Available languages:', i18n.languages)
    console.log('Resources:', i18n.getResourceBundle('zh', 'common'))
    console.log('Resources EN:', i18n.getResourceBundle('en', 'common'))
    console.log('Translation test:', t('common.home'))
  }, [i18n, t])

  return (
    <div style={{ 
      padding: '10px', 
      background: 'rgba(0, 0, 0, 0.8)', 
      borderRadius: '4px',
      margin: '10px',
      border: '1px solid #ffd700'
    }}>
      <Text style={{ color: '#ffd700' }}>Debug Info (Check Console)</Text>
      <br />
      <Text style={{ color: '#ffffff' }}>Language: {i18n.language}</Text>
      <br />
      <Text style={{ color: '#ffffff' }}>Home: {t('common.home')}</Text>
      <br />
      <Text style={{ color: '#ffffff' }}>Events: {t('common.events')}</Text>
    </div>
  )
}

export default DebugTranslation
