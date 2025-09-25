import React from 'react'
import ReactDOM from 'react-dom/client'
import { App as AntdApp } from 'antd'
import App from './App.tsx'
import './style.css'
import { cigarTheme } from './config/theme'
import './i18n' // 初始化国际化
import LocalizedApp from './components/common/LocalizedApp'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <LocalizedApp>
      <AntdApp>
        <App />
      </AntdApp>
    </LocalizedApp>
  </React.StrictMode>,
)
