import React from 'react'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import enUS from 'antd/locale/en_US'
import dayjs from 'dayjs'
import { useI18nStore } from '../../store/modules/i18n'

interface LocalizedAppProps {
  children: React.ReactNode
}

const LocalizedApp: React.FC<LocalizedAppProps> = ({ children }) => {
  const store = useI18nStore()
  const language = store?.language || 'zh-CN'

  // 根据语言设置Ant Design的locale
  const antdLocale = language === 'zh-CN' ? zhCN : enUS
  
  // 根据语言设置dayjs的locale
  React.useEffect(() => {
    if (language) {
      dayjs.locale(language === 'zh-CN' ? 'zh-cn' : 'en')
    }
  }, [language])

  return (
    <ConfigProvider locale={antdLocale}>
      {children}
    </ConfigProvider>
  )
}

export default LocalizedApp
