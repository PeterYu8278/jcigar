import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

// Import translation files
import zhCommon from '../locales/zh/common.json'
import enCommon from '../locales/en/common.json'

const resources = {
  zh: {
    common: zhCommon.common
  },
  en: {
    common: enCommon.common
  }
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    debug: false,
    
    // Language detection options
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },

    interpolation: {
      escapeValue: false, // React already does escaping
    },

    // Namespace configuration
    defaultNS: 'common',
    ns: ['common'],

    // React i18next options
    react: {
      useSuspense: false,
    },
  })

export default i18n
