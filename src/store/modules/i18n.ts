import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import i18n from '../../i18n'

export type SupportedLanguage = 'zh-CN' | 'en-US'

interface I18nState {
  language: SupportedLanguage
  setLanguage: (language: SupportedLanguage) => void
  t: (key: string, options?: any) => string
}

export const useI18nStore = create<I18nState>()(
  persist(
    (set, get) => ({
      language: 'zh-CN',
      
      setLanguage: (language: SupportedLanguage) => {
        set({ language })
        i18n.changeLanguage(language)
      },
      
      t: (key: string, options?: any) => {
        return i18n.t(key, options) as string
      }
    }),
    {
      name: 'i18n-storage',
      partialize: (state) => ({ language: state.language }),
    }
  )
)

// 初始化语言
const initializeLanguage = () => {
  const store = useI18nStore.getState()
  i18n.changeLanguage(store.language)
}

// 导出初始化函数
export { initializeLanguage }
