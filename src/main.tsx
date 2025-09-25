import React from 'react'
import ReactDOM from 'react-dom/client'
import { ConfigProvider, App as AntdApp } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import enUS from 'antd/locale/en_US'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import App from './App.tsx'
import './style.css'
import { cigarTheme } from './config/theme'
import './i18n' // Initialize i18n
import { LanguageProvider } from './contexts/LanguageContext'

// 配置dayjs中文
dayjs.locale('zh-cn')

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <LanguageProvider>
      <AntdApp>
        <App />
      </AntdApp>
    </LanguageProvider>
  </React.StrictMode>,
)
