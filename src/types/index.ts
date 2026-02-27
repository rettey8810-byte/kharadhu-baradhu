export interface ExpenseProfile {
  id: string
  user_id: string
  name: string
  type: 'personal' | 'family' | 'business'
  currency: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface UserSettings {
  user_id: string
  default_profile_id: string | null
  created_at: string
  updated_at: string
}

export interface ExpenseCategory {
  id: string
  profile_id: string
  name: string
  color: string
  icon: string
  is_default: boolean
  is_archived: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface IncomeSource {
  id: string
  profile_id: string
  name: string
  color: string
  icon: string
  is_archived: boolean
  created_at: string
  updated_at: string
}

export interface MonthlyBudget {
  id: string
  profile_id: string
  year: number
  month: number
  total_budget: number
  income_goal: number
  notes: string | null
  created_at: string
  updated_at: string
}

export interface CategoryBudget {
  id: string
  profile_id: string
  category_id: string
  year: number
  month: number
  budget_amount: number
  created_at: string
  updated_at: string
}

export interface Transaction {
  id: string
  profile_id: string
  type: 'expense' | 'income'
  amount: number
  category_id: string | null
  income_source_id: string | null
  description: string | null
  notes: string | null
  tags: string[] | null
  transaction_date: string
  created_at: string
  updated_at: string
  category?: ExpenseCategory
  income_source?: IncomeSource
  profile?: { name: string }
  receipts?: Receipt[]
}

export interface SavingsGoal {
  id: string
  profile_id: string
  name: string
  target_amount: number
  current_amount: number
  deadline: string | null
  color: string
  is_completed: boolean
  created_at: string
  updated_at: string
}

export interface RecurringExpense {
  id: string
  profile_id: string
  category_id: string | null
  name: string
  amount: number | null
  is_variable_amount: boolean
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'
  start_date: string
  end_date: string | null
  next_due_date: string
  due_day_of_month: number | null
  reminder_days: number
  grace_period_days: number
  is_active: boolean
  bill_type: string | null
  provider: string | null
  account_number: string | null
  meter_number: string | null
  created_at: string
  updated_at: string
  category?: ExpenseCategory
}

export interface Receipt {
  id: string
  transaction_id: string
  storage_path: string
  file_name: string
  file_size: number | null
  mime_type: string | null
  created_at: string
  url?: string
}

export interface GroceryBill {
  id: string
  transaction_id: string
  shop_name: string | null
  bill_date: string | null
  subtotal: number | null
  gst_amount: number | null
  total: number | null
  raw_text: string | null
  created_at: string
  items?: GroceryBillItem[]
}

export interface GroceryBillItem {
  id: string
  grocery_bill_id: string
  item_name: string
  qty: number | null
  unit_price: number | null
  line_total: number | null
}

export interface BillReminder {
  id: string
  profile_id: string
  recurring_expense_id: string | null
  title: string
  amount: number | null
  due_date: string
  is_read: boolean
  is_dismissed: boolean
  created_at: string
  profile?: { name: string }
}

export interface CategoryBudget {
  id: string
  profile_id: string
  category_id: string
  year: number
  month: number
  budget_amount: number
  alert_threshold: number
  created_at: string
  updated_at: string
  category?: ExpenseCategory
  spent?: number
}

export interface MonthlyComparison {
  currentMonth: {
    totalExpense: number
    totalIncome: number
    transactionCount: number
  }
  previousMonth: {
    totalExpense: number
    totalIncome: number
    transactionCount: number
  }
  change: {
    expenseChange: number
    expenseChangePercent: number
    incomeChange: number
    incomeChangePercent: number
  }
}

export interface MonthlySummary {
  id: string
  profile_id: string
  year: number
  month: number
  total_income: number
  total_expense: number
  remaining_balance: number
  days_remaining: number
  daily_safe_spend: number
  created_at: string
  updated_at: string
}

export interface DashboardStats {
  totalIncome: number
  totalExpense: number
  remainingBalance: number
  budget: number
  daysRemaining: number
  dailySafeSpend: number
  progressPercent: number
}
