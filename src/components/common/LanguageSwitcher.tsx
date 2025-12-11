import React from 'react'
import { Button, Space } from 'antd'
import { GlobalOutlined } from '@ant-design/icons'
import { useLanguage } from '../../hooks/useCommonTranslation'
import { useTranslation } from 'react-i18next'

export type SupportedLanguage = 'zh-CN' | 'en-US'

/**
 * 语言切换器组件
 * 使用i18next直接管理语言状态
 * 只有2个选项，点击直接切换
 */
const LanguageSwitcher: React.FC = () => {
  const { language, changeLanguage } = useLanguage()
  const { t } = useTranslation()

  const handleToggleLanguage = () => {
    const nextLanguage: SupportedLanguage = language === 'zh-CN' ? 'en-US' : 'zh-CN'
    changeLanguage(nextLanguage)
  }

  const currentLanguageLabel = language === 'zh-CN' ? t('language.chinese') : t('language.english')

  return (
    <Button
      onClick={handleToggleLanguage}
      icon={<GlobalOutlined />}
      size="small"
      style={{ 
        minWidth: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6
      }}
    >
      {currentLanguageLabel}
    </Button>
  )
}

export default LanguageSwitcher
