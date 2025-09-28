import React from 'react'
import ReactDOM from 'react-dom/client'
import { App as AntdApp } from 'antd'
import App from './App.tsx'
import './style.css'
import { cigarTheme } from './config/theme'
import './i18n' // 初始化国际化
import LocalizedApp from './components/common/LocalizedApp'
import { initializePWA } from './utils/pwa'
import { initializeLanguage } from './store/modules/i18n'

// 初始化PWA
initializePWA().catch(console.error);

// 初始化语言设置
initializeLanguage();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <LocalizedApp>
      <AntdApp>
        <App />
      </AntdApp>
    </LocalizedApp>
  </React.StrictMode>,
)
