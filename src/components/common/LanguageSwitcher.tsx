import React from 'react'
import { Select, Space } from 'antd'
import { GlobalOutlined } from '@ant-design/icons'
import { useI18nStore, type SupportedLanguage } from '../../store/modules/i18n'
import { useTranslation } from 'react-i18next'

const LanguageSwitcher: React.FC = () => {
  const { language, setLanguage } = useI18nStore()
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
    setLanguage(value)
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
