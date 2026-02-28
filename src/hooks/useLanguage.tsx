import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react'

export type Language = 'en' | 'dv'

type TranslationKey =
  | 'app_name'
  | 'active_profile'
  | 'sign_out'
  | 'nav_home'
  | 'nav_add'
  | 'nav_charts'
  | 'nav_savings'
  | 'nav_profiles'
  | 'menu_dashboard'
  | 'menu_add_transaction'
  | 'menu_analytics'
  | 'menu_savings_goals'
  | 'menu_monthly_budget'
  | 'menu_category_budgets'
  | 'menu_recurring_bills'
  | 'menu_recurring_income'
  | 'menu_reminders'
  | 'menu_all_transactions'
  | 'menu_search'
  | 'menu_categories'
  | 'menu_income_sources'
  | 'menu_yearly_view'
  | 'menu_monthly_compare'
  | 'menu_export_reports'
  | 'menu_quick_add'
  | 'menu_profile_sharing'
  | 'menu_profiles'
  | 'page_export_reports'
  | 'page_profile_sharing'
  | 'page_recurring_income'
  | 'page_quick_add'
  | 'page_add_transaction'
  | 'page_all_transactions'

const translations: Record<Language, Record<TranslationKey, string>> = {
  en: {
    app_name: 'Kharadhu Baradhu',
    active_profile: 'Active Profile',
    sign_out: 'Sign Out',
    nav_home: 'Home',
    nav_add: 'Add',
    nav_charts: 'Charts',
    nav_savings: 'Savings',
    nav_profiles: 'Profiles',
    menu_dashboard: 'Dashboard',
    menu_add_transaction: 'Add Transaction',
    menu_analytics: 'Analytics',
    menu_savings_goals: 'Savings Goals',
    menu_monthly_budget: 'Monthly Budget',
    menu_category_budgets: 'Category Budgets',
    menu_recurring_bills: 'Recurring Bills',
    menu_recurring_income: 'Recurring Income',
    menu_reminders: 'Reminders',
    menu_all_transactions: 'All Transactions',
    menu_search: 'Search',
    menu_categories: 'Categories',
    menu_income_sources: 'Income Sources',
    menu_yearly_view: 'Yearly View',
    menu_monthly_compare: 'Monthly Compare',
    menu_export_reports: 'Export Reports',
    menu_quick_add: 'Quick Add',
    menu_profile_sharing: 'Profile Sharing',
    menu_profiles: 'Profiles',
    page_export_reports: 'Export Reports',
    page_profile_sharing: 'Profile Sharing',
    page_recurring_income: 'Recurring Income',
    page_quick_add: 'Quick Add',
    page_add_transaction: 'Add transaction',
    page_all_transactions: 'All Transactions',
  },
  dv: {
    app_name: 'ކަރަދު ބަރަދު',
    active_profile: 'އެކްޓިވް ޕްރޮފައިލް',
    sign_out: 'ލޮގް އައުޓް',
    nav_home: 'ހޯމް',
    nav_add: 'އެޑް',
    nav_charts: 'ޗާޓްސް',
    nav_savings: 'ސޭވިންގސް',
    nav_profiles: 'ޕްރޮފައިލްސް',
    menu_dashboard: 'ޑޭޝްބޯޑް',
    menu_add_transaction: 'ޓްރާންޒެކްޝަން އެޑް',
    menu_analytics: 'އެނަލިޓިކްސް',
    menu_savings_goals: 'ސޭވިންގސް ގޯލްސް',
    menu_monthly_budget: 'މަހުން ބަޖެޓް',
    menu_category_budgets: 'ކެޓަގަރީ ބަޖެޓްސް',
    menu_recurring_bills: 'ރިކަރިންގ ބިލްސް',
    menu_recurring_income: 'ރިކަރިންގ އިންކަމް',
    menu_reminders: 'ރިމައިންޑަރސް',
    menu_all_transactions: 'ހުރިހާ ޓްރާންޒެކްޝަންސް',
    menu_search: 'ސާރޗް',
    menu_categories: 'ކެޓަގަރީސް',
    menu_income_sources: 'އިންކަމް ސޯސް',
    menu_yearly_view: 'އަހަރީ ވިއު',
    menu_monthly_compare: 'މަހުން ކޮމްޕެއާރ',
    menu_export_reports: 'ރިޕޯޓްސް އެކްސްޕޯޓް',
    menu_quick_add: 'ކުއިކް އެޑް',
    menu_profile_sharing: 'ޕްރޮފައިލް ޝެއާރ',
    menu_profiles: 'ޕްރޮފައިލްސް',
    page_export_reports: 'ރިޕޯޓްސް އެކްސްޕޯޓް',
    page_profile_sharing: 'ޕްރޮފައިލް ޝެއާރ',
    page_recurring_income: 'ރިކަރިންގ އިންކަމް',
    page_quick_add: 'ކުއިކް އެޑް',
    page_add_transaction: 'ޓްރާންޒެކްޝަން އެޑް',
    page_all_transactions: 'ހުރިހާ ޓްރާންޒެކްޝަންސް',
  },
}

interface LanguageContextValue {
  language: Language
  setLanguage: (lang: Language) => void
  toggleLanguage: () => void
  t: (key: TranslationKey) => string
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    const stored = localStorage.getItem('language')
    if (stored === 'en' || stored === 'dv') return stored

    if (localStorage.getItem('dhivehiMode') === 'true') return 'dv'
    return 'en'
  })

  useEffect(() => {
    localStorage.setItem('language', language)
    localStorage.setItem('dhivehiMode', String(language === 'dv'))

    const root = document.documentElement
    const dhivehi = language === 'dv'
    root.classList.toggle('dhivehi-font', dhivehi)
    root.setAttribute('dir', dhivehi ? 'rtl' : 'ltr')
  }, [language])

  const value = useMemo<LanguageContextValue>(() => {
    const toggleLanguage = () => setLanguage(prev => (prev === 'dv' ? 'en' : 'dv'))
    const t = (key: TranslationKey) => translations[language][key] ?? translations.en[key] ?? key
    return { language, setLanguage, toggleLanguage, t }
  }, [language])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider')
  return ctx
}
