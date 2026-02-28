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
  | 'common_income'
  | 'common_expense'
  | 'common_other'
  | 'dashboard_total_spent_month_all'
  | 'dashboard_total_budget'
  | 'dashboard_remaining'
  | 'dashboard_days_left'
  | 'dashboard_overall_budget_usage'
  | 'dashboard_daily_safe_spend'
  | 'dashboard_total_income_month_all'
  | 'dashboard_spending_by_profile'
  | 'dashboard_transactions'
  | 'dashboard_recent_transactions_all'
  | 'dashboard_no_transactions'
  | 'dashboard_add_first_expense'
  | 'page_search_transactions'
  | 'page_search_transactions_desc'
  | 'placeholder_search_transactions'
  | 'smart_insights_title'
  | 'smart_insights_alerts'
  | 'smart_insights_no_insights_title'
  | 'smart_insights_no_insights_desc'
  | 'insight_action_review'
  | 'insight_action_save'
  | 'insight_action_slowdown'
  | 'insight_action_add_income'
  | 'insight_title_overspending'
  | 'insight_title_spending_projection'
  | 'insight_title_no_income'
  | 'insight_title_great_saving'
  | 'insight_title_large_expense'
  | 'insight_title_high_category_spending'
  | 'insight_msg_overspending_prefix'
  | 'insight_msg_overspending_suffix'
  | 'insight_msg_high_category_prefix'
  | 'insight_msg_large_expense_prefix'
  | 'insight_msg_large_expense_suffix'
  | 'insight_msg_spending_projection_prefix'
  | 'insight_msg_spending_projection_suffix'
  | 'insight_msg_no_income_prefix'
  | 'insight_msg_no_income_suffix'
  | 'insight_msg_great_saving_prefix'
  | 'insight_msg_great_saving_suffix'
  | 'cashflow_title'
  | 'cashflow_status_at_risk'
  | 'cashflow_status_healthy'
  | 'cashflow_status_warning'
  | 'cashflow_current_balance'
  | 'cashflow_projected_end'
  | 'cashflow_upcoming_income'
  | 'cashflow_upcoming_bills'
  | 'cashflow_daily_spending_rate'
  | 'cashflow_per_day'
  | 'cashflow_msg_runout_prefix'
  | 'cashflow_msg_runout_suffix'
  | 'cashflow_msg_negative'
  | 'cashflow_msg_small_buffer'
  | 'cashflow_msg_healthy'
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
    common_income: 'Income',
    common_expense: 'Expense',
    common_other: 'Other',
    dashboard_total_spent_month_all: 'Total Spent This Month (All Profiles)',
    dashboard_total_budget: 'Total Budget',
    dashboard_remaining: 'Remaining',
    dashboard_days_left: 'Days Left',
    dashboard_overall_budget_usage: 'Overall Budget Usage',
    dashboard_daily_safe_spend: 'Daily safe spend',
    dashboard_total_income_month_all: 'Total Income This Month (All Profiles)',
    dashboard_spending_by_profile: 'Spending by Profile',
    dashboard_transactions: 'transactions',
    dashboard_recent_transactions_all: 'Recent Transactions (All Profiles)',
    dashboard_no_transactions: 'No transactions yet',
    dashboard_add_first_expense: 'Add your first expense!',
    page_search_transactions: 'Search Transactions',
    page_search_transactions_desc: 'Find by description, amount, or tags',
    placeholder_search_transactions: 'Search transactions...',
    smart_insights_title: 'Smart Insights',
    smart_insights_alerts: 'alerts',
    smart_insights_no_insights_title: 'No insights yet.',
    smart_insights_no_insights_desc: 'Add more transactions to get personalized spending analysis!',
    insight_action_review: 'review',
    insight_action_save: 'save',
    insight_action_slowdown: 'slowdown',
    insight_action_add_income: 'add income',
    insight_title_overspending: 'Overspending Alert',
    insight_title_spending_projection: 'Spending Projection',
    insight_title_no_income: 'No Income Logged',
    insight_title_great_saving: 'Great Saving!',
    insight_title_large_expense: 'Large Expense Detected',
    insight_title_high_category_spending: 'High spending',
    insight_msg_overspending_prefix: "You've spent",
    insight_msg_overspending_suffix: "but only earned",
    insight_msg_high_category_prefix: "You're spending",
    insight_msg_large_expense_prefix: 'You spent',
    insight_msg_large_expense_suffix: 'Make sure this was planned!',
    insight_msg_spending_projection_prefix: 'At your current rate, you will spend',
    insight_msg_spending_projection_suffix: "more than your income.",
    insight_msg_no_income_prefix: "You've spent",
    insight_msg_no_income_suffix: "but haven't logged any income this month. Don't forget to track your earnings!",
    insight_msg_great_saving_prefix: "You're",
    insight_msg_great_saving_suffix: 'under budget. Consider adding this to your savings goals!',
    cashflow_title: 'Cash Flow Forecast',
    cashflow_status_at_risk: 'At Risk',
    cashflow_status_healthy: 'Healthy',
    cashflow_status_warning: 'Warning',
    cashflow_current_balance: 'Current Balance',
    cashflow_projected_end: 'Projected End',
    cashflow_upcoming_income: 'Upcoming Income',
    cashflow_upcoming_bills: 'Upcoming Bills',
    cashflow_daily_spending_rate: 'Daily spending rate:',
    cashflow_per_day: '/day',
    cashflow_msg_runout_prefix: "You're spending faster than you earn. At this rate, you'll run out of money around",
    cashflow_msg_runout_suffix: '.',
    cashflow_msg_negative: 'Your expenses exceed your expected income this month. Consider cutting back or finding additional income.',
    cashflow_msg_small_buffer: 'You have a small buffer left. Be careful with discretionary spending.',
    cashflow_msg_healthy: 'Great! You have a healthy balance and are on track to save this month.',
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
    common_income: 'އިންކަމް',
    common_expense: 'ހޭދަ',
    common_other: 'އެހެން',
    dashboard_total_spent_month_all: 'މި މަހުގެ ޖުމްލަ ހޭދަ (ހުރިހާ ޕްރޮފައިލްތަކުން)',
    dashboard_total_budget: 'ޖުމްލަ ބަޖެޓް',
    dashboard_remaining: 'ބާކީ',
    dashboard_days_left: 'ދުވަސް ބާކީ',
    dashboard_overall_budget_usage: 'ބަޖެޓް ބޭނުންކުރެވޭ ހިސާބު',
    dashboard_daily_safe_spend: 'ދުވާލުން އާމިނާ ހޭދަ',
    dashboard_total_income_month_all: 'މި މަހުގެ ޖުމްލަ އިންކަމް (ހުރިހާ ޕްރޮފައިލްތަކުން)',
    dashboard_spending_by_profile: 'ޕްރޮފައިލް މަތީ ހޭދަ',
    dashboard_transactions: 'ޓްރާންޒެކްޝަންސް',
    dashboard_recent_transactions_all: 'އައިރު ޓްރާންޒެކްޝަންސް (ހުރިހާ ޕްރޮފައިލްތަކުން)',
    dashboard_no_transactions: 'އަދި ޓްރާންޒެކްޝަން ނެތް',
    dashboard_add_first_expense: 'ފުރަތަމަ ހޭދަ އެޑްކުރޭ!',
    page_search_transactions: 'ޓްރާންޒެކްޝަންސް ސާރޗް',
    page_search_transactions_desc: 'ޑިސްކްރިޕްޝަން، އަމައުންޓް ނުވަތަ ޓެގްސް މަތީ ހޯދާ',
    placeholder_search_transactions: 'ޓްރާންޒެކްޝަންސް ހޯދާ...',
    smart_insights_title: 'ސްމާޓް އިންސައިޓްސް',
    smart_insights_alerts: 'އެލާޓްސް',
    smart_insights_no_insights_title: 'އިންސައިޓްސް އަދި ނެތް',
    smart_insights_no_insights_desc: 'އިންސައިޓްސް ލިބޭނެގޮތަށް އިތުރު ޓްރާންޒެކްޝަންތައް އެޑްކުރޭ!',
    insight_action_review: 'ރިވިއު',
    insight_action_save: 'ސޭވް',
    insight_action_slowdown: 'ހަލުވާލާ',
    insight_action_add_income: 'އިންކަމް އެޑް',
    insight_title_overspending: 'ހޭދަ ވާލު އެލާޓް',
    insight_title_spending_projection: 'ހޭދަ ޕްރޮޖެކްޝަން',
    insight_title_no_income: 'އިންކަމް ލޮގް ނުކުރެވި',
    insight_title_great_saving: 'މޮޅު ސޭވިންގ!',
    insight_title_large_expense: 'ބޮޑު ހޭދަ ފެނުން',
    insight_title_high_category_spending: 'ބޮޑު ހޭދަ',
    insight_msg_overspending_prefix: 'ތިބާ ހޭދަކުރީ',
    insight_msg_overspending_suffix: 'އަދި ލިބުނީ',
    insight_msg_high_category_prefix: 'ތިބާ ބަޖެޓުގެ',
    insight_msg_large_expense_prefix: 'ތިބާ ހޭދަކުރީ',
    insight_msg_large_expense_suffix: 'މިއީ ޕްލޭންކުރެވިފަ ކަމަށް ހަމަޖެހޭ!',
    insight_msg_spending_projection_prefix: 'މިހާރުގެ ރޭޓްމަތީ މި މަހު ހޭދަވާނީ',
    insight_msg_spending_projection_suffix: 'އިންކަމްއަށް ވުރެ އިތުރު.',
    insight_msg_no_income_prefix: 'ތިބާ ހޭދަކުރީ',
    insight_msg_no_income_suffix: 'އެކަމަކު މި މަހު އިންކަމް ލޮގް ނުކުރެވޭ. އިންކަމް ޓްރެކް ކުރުމަށް ނާންގާ!',
    insight_msg_great_saving_prefix: 'ތިބާ',
    insight_msg_great_saving_suffix: 'ބަޖެޓުގެ ތަށް މަދު. މިއީ ސޭވިންގ ގޯލްސްއަށް އެޑްކުރަން ފިކުރުކުރޭ!',
    cashflow_title: 'ކޭޝް ފްލޯ ފޯކާސްޓް',
    cashflow_status_at_risk: 'ރިސްކުގައި',
    cashflow_status_healthy: 'ހެލްތީ',
    cashflow_status_warning: 'ވޯނިންގ',
    cashflow_current_balance: 'މިހާރު ބެލެންސް',
    cashflow_projected_end: 'މަހުގެ ނިމުމުގައި',
    cashflow_upcoming_income: 'އަންނަ އިންކަމް',
    cashflow_upcoming_bills: 'އަންނަ ބިލްސް',
    cashflow_daily_spending_rate: 'ދުވާލު ހޭދަ ރޭޓް:',
    cashflow_per_day: '/ދުވަސް',
    cashflow_msg_runout_prefix: 'ތިބާ ހޭދަކުރަނީ ލިބޭއިން ވުރެ އިތުރު. މި ރޭޓްމަތީ ފައިސާ ނިމޭނީ',
    cashflow_msg_runout_suffix: 'އާކަމަށް.',
    cashflow_msg_negative: 'މި މަހު ހޭދަ އިންކަމްއަށް ވުރެ ބޮޑު. ކޮޅުކުރޭ ނުވަތަ އިތުރު އިންކަމް ހޯދާލާ.',
    cashflow_msg_small_buffer: 'ބާކީ ބަފާ މަދު. އިޚްތިޔާރީ ހޭދާގެ މަތީ އެއްޗެހި ރައްކާކުރޭ.',
    cashflow_msg_healthy: 'މޮޅު! ބެލެންސް ރަނގަޅު އަދި މި މަހު ސޭވް ކުރެވޭނެ.',
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
