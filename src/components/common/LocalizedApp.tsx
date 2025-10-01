import React, { useState, useEffect } from 'react'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import enUS from 'antd/locale/en_US'
import dayjs from 'dayjs'

interface LocalizedAppProps {
  children: React.ReactNode
}

const LocalizedApp: React.FC<LocalizedAppProps> = ({ children }) => {
  const [language, setLanguage] = useState<'zh-CN' | 'en-US'>('zh-CN')

  // 根据语言设置Ant Design的locale
  const antdLocale = language === 'zh-CN' ? zhCN : enUS
  
  // 初始化语言设置
  useEffect(() => {
    // 从localStorage获取保存的语言设置
    const savedLanguage = localStorage.getItem('i18n-storage')
    if (savedLanguage) {
      try {
        const parsed = JSON.parse(savedLanguage)
        if (parsed.state?.language) {
          setLanguage(parsed.state.language)
        }
      } catch (error) {
        // 静默处理错误
      }
    }
  }, []) // 只在组件挂载时执行一次

  // 设置dayjs locale
  useEffect(() => {
    dayjs.locale(language === 'zh-CN' ? 'zh-cn' : 'en')
  }, [language])

  return (
    <ConfigProvider locale={antdLocale}>
      {children}
    </ConfigProvider>
  )
}

export default LocalizedApp
