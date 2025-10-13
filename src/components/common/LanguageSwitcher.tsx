import React from 'react'
import { Select, Space } from 'antd'
import { GlobalOutlined } from '@ant-design/icons'
import { useLanguage } from '../../hooks/useCommonTranslation'
import { useTranslation } from 'react-i18next'

export type SupportedLanguage = 'zh-CN' | 'en-US'

/**
 * 语言切换器组件
 * 使用i18next直接管理语言状态
 */
const LanguageSwitcher: React.FC = () => {
  const { language, changeLanguage } = useLanguage()
  const { t } = useTranslation()

  const languageOptions = [
    {
      value: 'zh-CN' as SupportedLanguage,
      label: (
        <Space>
          <span>{t('language.chinese')}</span>
        </Space>
      )
    },
    {
      value: 'en-US' as SupportedLanguage,
      label: (
        <Space>
          <span>{t('language.english')}</span>
        </Space>
      )
    }
  ]

  const handleLanguageChange = (value: SupportedLanguage) => {
    changeLanguage(value)
  }

  return (
    <Select
      value={language}
      onChange={handleLanguageChange}
      options={languageOptions}
      style={{ minWidth: 70 }}
      suffixIcon={<GlobalOutlined />}
      size="small"
    />
  )
}

export default LanguageSwitcher
