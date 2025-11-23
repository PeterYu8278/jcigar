import React from 'react'
import ReactDOM from 'react-dom/client'
import { App as AntdApp } from 'antd'
import App from './App.tsx'
import './style.css'
import { cigarTheme } from './config/theme'
import './i18n' // 初始化国际化（i18next会自动加载保存的语言设置）
import LocalizedApp from './components/common/LocalizedApp'
import { initializePWA, unregisterServiceWorker } from './utils/pwa'
// import { initMobileDebug } from './utils/mobileDebug'

// 在开发环境中，预加载 messaging 模块以确保测试函数暴露到全局对象
if (import.meta.env.DEV) {
  import('./services/firebase/messaging').catch(() => {
    // 静默失败，不影响应用启动
  });
}

// 初始化移动端调试工具（仅在移动设备上显示）
// initMobileDebug() // 暂时禁用，解决重定向循环后再启用

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

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <LocalizedApp>
      <AntdApp>
        <App />
      </AntdApp>
    </LocalizedApp>
  </React.StrictMode>,
)
