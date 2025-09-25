import React from 'react'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import enUS from 'antd/locale/en_US'
import { cigarTheme } from '../../config/theme'
import { useTranslation } from 'react-i18next'

interface DynamicConfigProviderProps {
  children: React.ReactNode
}

const DynamicConfigProvider: React.FC<DynamicConfigProviderProps> = ({ children }) => {
  const { i18n } = useTranslation()
  
  const getAntdLocale = () => {
    return i18n.language === 'zh' ? zhCN : enUS
  }

  return (
    <ConfigProvider 
      locale={getAntdLocale()}
      theme={cigarTheme}
    >
      {children}
    </ConfigProvider>
  )
}

export default DynamicConfigProvider
