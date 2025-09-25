import React from 'react'
import { Button, Dropdown, Space } from 'antd'
import { GlobalOutlined } from '@ant-design/icons'
import type { MenuProps } from 'antd'
import { useLanguage } from '../../contexts/LanguageContext'

const LanguageSwitcher: React.FC = () => {
  const { language, setLanguage, t } = useLanguage()

  const items: MenuProps['items'] = [
    {
      key: 'zh',
      label: (
        <Space>
          <span>🇨🇳</span>
          <span>{t('common.chinese')}</span>
        </Space>
      ),
    },
    {
      key: 'en',
      label: (
        <Space>
          <span>🇺🇸</span>
          <span>{t('common.english')}</span>
        </Space>
      ),
    },
  ]

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    setLanguage(key)
  }

  const getCurrentLanguageFlag = () => {
    return language === 'zh' ? '🇨🇳' : '🇺🇸'
  }

  const getCurrentLanguageText = () => {
    return language === 'zh' ? t('common.chinese') : t('common.english')
  }

  return (
    <Dropdown
      menu={{ items, onClick: handleMenuClick }}
      placement="bottomRight"
      arrow={{ pointAtCenter: true }}
      overlayStyle={{
        background: '#1a1a1a',
        border: '1px solid #333333',
        borderRadius: '8px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
      }}
    >
      <Button 
        type="text" 
        icon={<GlobalOutlined />}
        style={{ 
          color: '#c0c0c0',
          fontSize: '16px',
          border: '1px solid #333333',
          borderRadius: '8px',
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}
        className="hover-gold"
      >
        <span>{getCurrentLanguageFlag()}</span>
        <span>{getCurrentLanguageText()}</span>
      </Button>
    </Dropdown>
  )
}

export default LanguageSwitcher
