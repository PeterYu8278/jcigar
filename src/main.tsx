import React from 'react'
import ReactDOM from 'react-dom/client'
import { App as AntdApp } from 'antd'
import App from './App.tsx'
import './style.css'
import { cigarTheme } from './config/theme'
import './i18n' // 初始化国际化
import LocalizedApp from './components/common/LocalizedApp'
import { initializePWA, unregisterServiceWorker } from './utils/pwa'
import { initializeLanguage } from './store/modules/i18n'

// 开发环境：清理旧的Service Worker
if (import.meta.env.DEV) {
  unregisterServiceWorker().then(() => {
    // Service Worker已卸载，刷新页面以确保使用最新代码
    if (navigator.serviceWorker.controller) {
      window.location.reload()
    }
  })
} else {
  // 生产环境：初始化PWA
  initializePWA().catch(() => {});
}

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
