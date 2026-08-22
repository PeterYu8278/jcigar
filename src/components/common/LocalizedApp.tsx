import React, { useEffect } from 'react'
import { ConfigProvider } from 'antd'
import { CloseOutlined } from '@ant-design/icons'
import zhCN from 'antd/locale/zh_CN'
import enUS from 'antd/locale/en_US'
import { useTranslation } from 'react-i18next'
import dayjs from 'dayjs'
import { cigarTheme } from '../../config/theme'

interface LocalizedAppProps {
  children: React.ReactNode
}

/**
 * 本地化应用包装器
 * 根据i18next的语言设置自动配置Ant Design和dayjs的locale
 */
const LocalizedApp: React.FC<LocalizedAppProps> = ({ children }) => {
  const { i18n } = useTranslation()
  
  // 根据当前语言设置Ant Design的locale
  const antdLocale = i18n.language === 'zh-CN' ? zhCN : enUS

  // 监听语言变化，同步更新dayjs locale
  useEffect(() => {
    dayjs.locale(i18n.language === 'zh-CN' ? 'zh-cn' : 'en')
  }, [i18n.language])

  return (
    <ConfigProvider
      locale={antdLocale}
      theme={cigarTheme}
      modal={{
        closeIcon: <CloseOutlined style={{ color: '#FFFFFF' }} />,
        styles: {
          content: {
            margin: 0,
            padding: 12,
          },
          footer: {
            columnGap: 8,
          },
        },
      }}
    >
      {children}
    </ConfigProvider>
  )
}

export default LocalizedApp
