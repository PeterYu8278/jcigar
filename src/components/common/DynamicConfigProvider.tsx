import React from 'react'
import { ConfigProvider } from 'antd'
import zhfrom 'antd/locale/zh_CN'
import enUS from 'antd/locale/en_US'
import { cigarTheme } from '../../config/theme'
import { useLanguage } from '../../contexts/LanguageContext'

interface DynamicConfigProviderProps {
  children: React.ReactNode
}

const DynamicConfigProvider: React.FC<DynamicConfigProviderProps> = ({ children }) => {
  const { language } = useLanguage()
  
  const getAntdLocale = () => {
    return language === 'zh' ? zhCN : enUS
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
