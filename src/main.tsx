import React from 'react'
import ReactDOM from 'react-dom/client'
import { App as AntdApp } from 'antd'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import App from './App.tsx'
import './style.css'
import './i18n' // Initialize i18n
import { LanguageProvider } from './contexts/LanguageContext'
import DynamicConfigProvider from './components/common/DynamicConfigProvider'

// 配置dayjs中文
dayjs.locale('zh-cn')

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <LanguageProvider>
      <DynamicConfigProvider>
        <AntdApp>
          <App />
        </AntdApp>
      </DynamicConfigProvider>
    </LanguageProvider>
  </React.StrictMode>,
)
