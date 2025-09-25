import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

interface LanguageContextType {
  language: string
  setLanguage: (lang: string) => void
  t: (key: string, options?: any) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

interface LanguageProviderProps {
  children: ReactNode
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const { i18n, t } = useTranslation()
  const [language, setLanguageState] = useState(i18n.language || 'en')
  const [key, setKey] = useState(0) // Force re-render key

  const setLanguage = async (lang: string) => {
    try {
      await i18n.changeLanguage(lang)
      setLanguageState(lang)
      setKey(prev => prev + 1) // Force re-render
      localStorage.setItem('i18nextLng', lang)
    } catch (error) {
      console.error('Failed to change language:', error)
    }
  }

  useEffect(() => {
    // Listen for language changes
    const handleLanguageChange = (lng: string) => {
      setLanguageState(lng)
      setKey(prev => prev + 1) // Force re-render
    }

    i18n.on('languageChanged', handleLanguageChange)

    return () => {
      i18n.off('languageChanged', handleLanguageChange)
    }
  }, [i18n])

  const value: LanguageContextType = {
    language,
    setLanguage,
    t
  }

  return (
    <LanguageContext.Provider value={value} key={key}>
      {children}
    </LanguageContext.Provider>
  )
}

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
