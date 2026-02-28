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
  | 'form_type'
  | 'form_expense'
  | 'form_income'
  | 'form_amount'
  | 'form_date'
  | 'form_category'
  | 'form_income_source'
  | 'form_no_income_sources'
  | 'form_go_to_income_sources'
  | 'form_description'
  | 'form_description_placeholder'
  | 'form_notes'
  | 'form_notes_placeholder'
  | 'form_tags'
  | 'form_tags_placeholder'
  | 'form_add'
  | 'form_receipt_photo'
  | 'form_required'
  | 'form_optional'
  | 'form_tap_add_receipt'
  | 'form_groceries_bill'
  | 'form_receipt_required_auto'
  | 'form_reading'
  | 'form_extract_bill'
  | 'form_shop_name'
  | 'form_shop_placeholder'
  | 'form_bill_date'
  | 'form_subtotal'
  | 'form_gst'
  | 'form_total'
  | 'form_items'
  | 'form_extract_bill_hint'
  | 'form_item_placeholder'
  | 'form_qty_placeholder'
  | 'form_price_placeholder'
  | 'form_line_total_placeholder'
  | 'form_add_item'
  | 'form_saving'
  | 'form_save_transaction'
  | 'recurring_bills_title'
  | 'recurring_bills_subtitle'
  | 'select_bill_type'
  | 'skip_presets'
  | 'fixed_amount'
  | 'varies_each_month'
  | 'estimated_amount_optional'
  | 'due_date_settings'
  | 'due_day_of_month'
  | 'first_due_date'
  | 'remind_me_days'
  | 'grace_period_days'
  | 'provider_details_optional'
  | 'provider_name_placeholder'
  | 'account_number'
  | 'meter_number'
  | 'cancel'
  | 'add_bill'
  | 'no_recurring_expenses'
  | 'add_bills_repeat'
  | 'days_overdue'
  | 'due_today'
  | 'days_left'
  | 'days_until_due'
  | 'grace_short'
  | 'account_short'
  | 'variable'
  | 'remind_before'
  | 'mark_paid'
  | 'paid'
  | 'enter_this_month_amount'
  | 'freq_daily'
  | 'freq_weekly'
  | 'freq_monthly'
  | 'freq_yearly'
  | 'enter_paid_amount'
  | 'enter_valid_amount'
  | 'failed_mark_paid'
  | 'delete_recurring_bill'
  | 'transactions_subtitle'
  | 'placeholder_search_tx'
  | 'filter_all'
  | 'filter_expenses'
  | 'filter_income'
  | 'total_expenses'
  | 'total_income'
  | 'no_transactions_found'
  | 'edit_amount_placeholder'
  | 'edit_description_placeholder'
  | 'select_category'
  | 'select_income_source'
  | 'edit_title'
  | 'delete_title'
  | 'confirm_delete_tx'

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
    form_type: 'Type',
    form_expense: 'Expense',
    form_income: 'Income',
    form_amount: 'Amount (MVR)',
    form_date: 'Date',
    form_category: 'Category',
    form_income_source: 'Income source',
    form_no_income_sources: 'No income sources (add one)',
    form_go_to_income_sources: 'Go to Income Sources',
    form_description: 'Description',
    form_description_placeholder: 'e.g. Lunch at restaurant',
    form_notes: 'Notes',
    form_notes_placeholder: 'Additional details...',
    form_tags: 'Tags',
    form_tags_placeholder: 'Add tag and press Enter',
    form_add: 'Add',
    form_receipt_photo: 'Receipt Photo',
    form_required: 'required',
    form_optional: 'optional',
    form_tap_add_receipt: 'Tap to add receipt photo',
    form_groceries_bill: 'Groceries bill',
    form_receipt_required_auto: 'Receipt is required and will be read automatically',
    form_reading: 'Reading…',
    form_extract_bill: 'Extract bill',
    form_shop_name: 'Shop name',
    form_shop_placeholder: 'Shop',
    form_bill_date: 'Bill date',
    form_subtotal: 'Subtotal',
    form_gst: 'GST',
    form_total: 'Total',
    form_items: 'Items',
    form_extract_bill_hint: 'Extract the bill to get item list (you can edit).',
    form_item_placeholder: 'Item',
    form_qty_placeholder: 'Qty',
    form_price_placeholder: 'Price',
    form_line_total_placeholder: 'Total',
    form_add_item: 'Add item',
    form_saving: 'Saving…',
    form_save_transaction: 'Save Transaction',
    recurring_bills_title: 'Recurring Bills',
    recurring_bills_subtitle: 'Track bills with due dates & reminders',
    select_bill_type: 'Select Bill Type',
    skip_presets: 'Skip presets, enter manually →',
    fixed_amount: 'Fixed Amount',
    varies_each_month: 'Varies Each Month',
    estimated_amount_optional: 'Estimated amount (optional)',
    due_date_settings: 'Due Date Settings',
    due_day_of_month: 'Due Day of Month',
    first_due_date: 'First Due Date',
    remind_me_days: 'Remind me (days before)',
    grace_period_days: 'Grace period (days to pay)',
    provider_details_optional: 'Provider Details (optional)',
    provider_name_placeholder: 'Provider name (e.g., STELCO, MWSC)',
    account_number: 'Account number',
    meter_number: 'Meter number',
    cancel: 'Cancel',
    add_bill: 'Add Bill',
    no_recurring_expenses: 'No recurring expenses',
    add_bills_repeat: 'Add bills that repeat monthly/weekly',
    days_overdue: 'days overdue',
    due_today: 'Due today',
    days_left: 'days left',
    days_until_due: 'days until due',
    grace_short: 'Grace',
    account_short: 'Acc',
    variable: 'Variable',
    remind_before: 'Remind {days}d before',
    mark_paid: 'Mark Paid',
    paid: 'Paid',
    enter_this_month_amount: "Enter This Month's Amount",
    freq_daily: 'Daily',
    freq_weekly: 'Weekly',
    freq_monthly: 'Monthly',
    freq_yearly: 'Yearly',
    enter_paid_amount: 'Enter paid amount (MVR)',
    enter_valid_amount: 'Please enter a valid amount',
    failed_mark_paid: 'Failed to mark as paid',
    delete_recurring_bill: 'Delete this recurring bill?',
    transactions_subtitle: 'View, edit and delete expenses & income',
    placeholder_search_tx: 'Search transactions...',
    filter_all: 'All',
    filter_expenses: 'Expenses',
    filter_income: 'Income',
    total_expenses: 'Total Expenses',
    total_income: 'Total Income',
    no_transactions_found: 'No transactions found',
    edit_amount_placeholder: 'Amount',
    edit_description_placeholder: 'Description',
    select_category: 'Select Category',
    select_income_source: 'Select Income Source',
    edit_title: 'Edit',
    delete_title: 'Delete',
    confirm_delete_tx: 'Are you sure you want to delete this transaction?',
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
    form_type: 'ޓައިޕް',
    form_expense: 'ހޭދަ',
    form_income: 'އިންކަމް',
    form_amount: 'އަދަދު (MVR)',
    form_date: 'ތާރީޚު',
    form_category: 'ކެޓަގަރީ',
    form_income_source: 'އިންކަމް ސޯސް',
    form_no_income_sources: 'އިންކަމް ސޯސް ނެތް (އެޑްކުރޭ)',
    form_go_to_income_sources: 'އިންކަމް ސޯސްތަކަށް ދާން',
    form_description: 'ޑިސްކްރިޕްޝަން',
    form_description_placeholder: 'މިސާލަ: ރެސްޓޯރެންޓްގައި މަސް',
    form_notes: 'ނޯޓްސް',
    form_notes_placeholder: 'އިތުރު ތަފްސީލް...',
    form_tags: 'ޓެގްސް',
    form_tags_placeholder: 'ޓެގް އެޑްކުރި އިންޓަރ ފިއްސް',
    form_add: 'އެޑް',
    form_receipt_photo: 'ރިސީޕް ފޮޓޯ',
    form_required: 'މަޖުބޫރު',
    form_optional: 'އިޚްތިޔާރީ',
    form_tap_add_receipt: 'ރިސީޕް ފޮޓޯ އެޑްކުރުމަށް ޓެޕް',
    form_groceries_bill: 'ގުރޫސަރީ ބިލް',
    form_receipt_required_auto: 'ރިސީޕް މަޖުބޫރު އަދި އޮޓޮމެޓިކްލީ ކިޔާނީ',
    form_reading: 'ކިޔާ...',
    form_extract_bill: 'ބިލް އެކްސްޓްރެކްޓް',
    form_shop_name: 'ޝޮޕު ނަން',
    form_shop_placeholder: 'ޝޮޕު',
    form_bill_date: 'ބިލް ތާރީޚު',
    form_subtotal: 'ސަބް ޓޮޓަލް',
    form_gst: 'ޖީއެސްޓީ',
    form_total: 'ޖުމްލަ',
    form_items: 'އެތަކެއް',
    form_extract_bill_hint: 'ބިލް އެކްސްޓްރެކްޓް ކުރީ އެތަކެއް ލިސްޓު ލިބޭނެ (އެޑިޓް ކުރެވޭނެ).',
    form_item_placeholder: 'އެތަކު',
    form_qty_placeholder: 'އަދަދު',
    form_price_placeholder: 'ރޭޓު',
    form_line_total_placeholder: 'ޖުމްލަ',
    form_add_item: 'އެތަކު އެޑް',
    form_saving: 'ސޭވް ކުރާ...',
    form_save_transaction: 'ޓްރާންޒެކްޝަން ސޭވް',
    recurring_bills_title: 'ރިކަރިންގ ބިލްސް',
    recurring_bills_subtitle: 'ދުވަސް ބާކީ އަދި ރިމައިންޑަރުން މަތީ ބިލްތައް ޓްރެކް',
    select_bill_type: 'ބިލް ޓައިޕް ހޮވާ',
    skip_presets: 'ޕްރީސެޓްސް ދޫކޮށް މެނުއަލް ލިޔާ →',
    fixed_amount: 'ފިކްސްޓް އަދަދު',
    varies_each_month: 'ހަމަނުވާ އަދަދު',
    estimated_amount_optional: 'އެސްޓިމޭޓް އަދަދު (އިޚްތިޔާރީ)',
    due_date_settings: 'ދުވަސް ސެޓިންގސް',
    due_day_of_month: 'މަހުގެ ދުވަސް',
    first_due_date: 'ފުރަތަމަ ދުވަސް',
    remind_me_days: 'ރިމައިންޑް (ދުވަސް ކުރިން)',
    grace_period_days: 'ގްރޭސް ޕީރިއަޑް (ދުވަސް ދެއް)',
    provider_details_optional: 'ޕްރޮވައިޑަރ ޑީޓެއިލްސް (އިޚްތިޔާރީ)',
    provider_name_placeholder: 'ޕްރޮވައިޑަރ (މިސާލަ: ސްޓެލްކޯ، އެމްވުސްސީ)',
    account_number: 'އެކައުންޓް ނަންބަރު',
    meter_number: 'މީޓަރ ނަންބަރު',
    cancel: 'ކެންސަލް',
    add_bill: 'ބިލް އެޑް',
    no_recurring_expenses: 'ރިކަރިންގ ހޭދައެއް ނެތް',
    add_bills_repeat: 'މަހުން/ހަފަތަކުން ތަކުރާރު ވާ ބިލްތައް އެޑްކުރޭ',
    days_overdue: 'ދުވަސް ހަލާކު',
    due_today: 'މިއަދު ދުވަސް',
    days_left: 'ދުވަސް ބާކީ',
    days_until_due: 'ދުވަސް ވެރި',
    grace_short: 'ގްރޭސް',
    account_short: 'އެކް',
    variable: 'ބަދަލުވާ',
    remind_before: '{days}ދުވަސް ކުރިން ރިމައިންޑް',
    mark_paid: 'ދެއްވިކަމަށް ފާހަގަ',
    paid: 'ދެއްވި',
    enter_this_month_amount: 'މި މަހުގެ އަދަދު ލިޔާ',
    freq_daily: 'ދުވަސުން',
    freq_weekly: 'ހަފަތަކުން',
    freq_monthly: 'މަހުން',
    freq_yearly: 'އަހަރުން',
    enter_paid_amount: 'ދެއްވި އަދަދު (MVR)',
    enter_valid_amount: 'ރަނގަޅު އަދަދެއް ލިޔާ',
    failed_mark_paid: 'ދެއްވިކަމަށް ފާހަގަ ކުރުމުގައި މަސްރަހު',
    delete_recurring_bill: 'މި ރިކަރިންގ ބިލް ފޮހެލާ؟',
    transactions_subtitle: 'ހޭދަ އަދި އިންކަމް ފެންވާ، އެޑިޓް އަދި ފޮހައިލާ',
    placeholder_search_tx: 'ޓްރާންޒެކްޝަންސް ހޯދާ...',
    filter_all: 'ހުރިހާ',
    filter_expenses: 'ހޭދަތައް',
    filter_income: 'އިންކަމް',
    total_expenses: 'ޖުމްލަ ހޭދަ',
    total_income: 'ޖުމްލަ އިންކަމް',
    no_transactions_found: 'ޓްރާންޒެކްޝަން ނެތް',
    edit_amount_placeholder: 'އަދަދު',
    edit_description_placeholder: 'ޑިސްކްރިޕްޝަން',
    select_category: 'ކެޓަގަރީ ހޮވާ',
    select_income_source: 'އިންކަމް ސޯސް ހޮވާ',
    edit_title: 'އެޑިޓް',
    delete_title: 'ފޮހައިލާ',
    confirm_delete_tx: 'މި ޓްރާންޒެކްޝަން ފޮހެލަން ބޭނުންތަ؟',
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
