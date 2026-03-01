import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useProfile } from '../hooks/useProfile'
import { PWAInstallButton } from '../hooks/usePWAInstall'
import { useLanguage } from '../hooks/useLanguage'
import SmartInsights from '../components/SmartInsights'
import CashFlowForecast from '../components/CashFlowForecast'
import type { DashboardStats, MonthlyBudget, Transaction, ExpenseProfile } from '../types'
import { getDaysRemainingInMonth, getYearMonth, formatDateLocal } from '../utils/date'
import { TrendingDown, TrendingUp, Wallet, AlertCircle, Users } from 'lucide-react'

function formatMVR(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'MVR' }).format(value)
}

function formatPendingAmount(value: number | null) {
  if (value == null) return 'MVR --'
  const n = Number(value)
  if (!Number.isFinite(n) || n === 0) return 'MVR --'
  return formatMVR(n)
}

interface ProfileSpending {
  profile: ExpenseProfile
  totalSpent: number
  transactionCount: number
}

interface PendingBill {
  id: string
  profile_id: string
  profile_name: string
  name: string
  due_date: string
  amount: number | null
  source: 'variable' | 'fixed'
}

export default function Dashboard() {
  const { profiles, currentProfile, setCurrentProfile } = useProfile()
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [budgets, setBudgets] = useState<MonthlyBudget[]>([])
  const [profileSpendings, setProfileSpendings] = useState<ProfileSpending[]>([])
  const [pendingBills, setPendingBills] = useState<PendingBill[]>([])

  const processedRecurringRef = useRef<string>('')

  const { year, month } = useMemo(() => getYearMonth(new Date()), [])
  // v2 - Show all transactions regardless of profile_id

  useEffect(() => {
    const load = async () => {
      if (profiles.length === 0) return
      setLoading(true)
      console.log('Dashboard loading for profiles:', profiles.map(p => ({id: p.id, name: p.name})))

      const profileIds = profiles.map(p => p.id)
      const start = new Date(year, month - 1, 1)
      const end = new Date(year, month, 0)

      const monthKey = `${year}-${String(month).padStart(2, '0')}`
      if (processedRecurringRef.current !== monthKey) {
        processedRecurringRef.current = monthKey

        const today = formatDateLocal(new Date())
        const maxIterations = 24

        const processExpensesOnce = async () => {
          const { error } = await supabase.rpc('process_recurring_expenses_v2')
          if (error) {
            await supabase.rpc('process_recurring_expenses')
          }
        }

        const processIncomeOnce = async () => {
          await supabase.rpc('process_recurring_income')
        }

        try {
          for (let i = 0; i < maxIterations; i++) {
            const { data: due } = await supabase
              .from('recurring_expenses')
              .select('id')
              .in('profile_id', profileIds)
              .eq('is_active', true)
              .lte('next_due_date', today)
              .limit(1)

            if (!due || due.length === 0) break
            await processExpensesOnce()
          }
        } catch {
          // ignore
        }

        try {
          for (let i = 0; i < maxIterations; i++) {
            const { data: due } = await supabase
              .from('recurring_income')
              .select('id')
              .in('profile_id', profileIds)
              .eq('is_active', true)
              .lte('next_due_date', today)
              .limit(1)

            if (!due || due.length === 0) break
            await processIncomeOnce()
          }
        } catch {
          // ignore
        }
      }

      // Load all transactions for this month (including those with no/mismatched profile)
      const { data: tx, error: txError } = await supabase
        .from('transactions')
        .select('*, profile:profile_id(name), category:category_id(name), income_source:income_source_id(name)')
        .gte('transaction_date', formatDateLocal(start))
        .lte('transaction_date', formatDateLocal(end))
        .order('transaction_date', { ascending: false })

      if (txError) {
        // no-op
      }

      // Load all budgets from all profiles
      const { data: b } = await supabase
        .from('monthly_budgets')
        .select('*')
        .in('profile_id', profileIds)
        .eq('year', year)
        .eq('month', month)

      // Pending bills - ONLY current month (from 1st to end), not next month
      const monthStart = formatDateLocal(start)
      const monthEnd = formatDateLocal(end)

      const { data: unpaidVariable, error: varError } = await supabase
        .from('bill_payments')
        .select('id, profile_id, due_date, amount, profile:profile_id(name), recurring_expense:recurring_expense_id(name, amount)')
        .in('profile_id', profileIds)
        .eq('is_paid', false)
        .gte('due_date', monthStart)
        .lte('due_date', monthEnd)
        .order('due_date', { ascending: true })

      // Debug: Check raw bill_payments data
      const { data: rawBP } = await supabase
        .from('bill_payments')
        .select('*')
        .in('profile_id', profileIds)
        .eq('is_paid', false)
        .gte('due_date', monthStart)
        .lte('due_date', monthEnd)
      console.log('Raw bill_payments:', rawBP?.map((b: any) => ({ id: b.id, recurring_expense_id: b.recurring_expense_id, amount: b.amount, due_date: b.due_date })))

      // Build a lookup of best amounts for each bill name (across all recurring expenses)
      const { data: allRecurring } = await supabase
        .from('recurring_expenses')
        .select('name, amount, profile_id')
        .in('profile_id', profileIds)
      
      const bestAmountByName: Record<string, number | null> = {}
      ;(allRecurring ?? []).forEach((re: any) => {
        const name = re.name
        const amt = re.amount != null ? Number(re.amount) : null
        if (amt != null && amt > 0) {
          if (bestAmountByName[name] == null || amt > bestAmountByName[name]!) {
            bestAmountByName[name] = amt
          }
        }
      })
      console.log('Best amounts by name:', bestAmountByName)

      const { data: upcomingFixed } = await supabase
        .from('recurring_expenses')
        .select('id, profile_id, name, amount, next_due_date, is_variable_amount, profile:profile_id(name)')
        .in('profile_id', profileIds)
        .eq('is_active', true)
        .eq('is_variable_amount', false)
        .gte('next_due_date', monthStart)
        .lte('next_due_date', monthEnd)
        .order('next_due_date', { ascending: true })

      console.log('Dashboard bills query:', {
        profileIds,
        monthStart,
        monthEnd,
        unpaidVariable: unpaidVariable?.length ?? 0,
        varError: varError?.message,
        upcomingFixed: upcomingFixed?.length ?? 0,
        unpaidVariableData: unpaidVariable?.map((u: any) => ({
          id: u.id,
          amount: u.amount,
          recurring_expense_id: u.recurring_expense_id,
          recurring_expense: u.recurring_expense
        }))
      })

      const pending: PendingBill[] = []

      ;(unpaidVariable ?? []).forEach((row: any) => {
        const paymentAmount = row.amount == null ? null : Number(row.amount)
        const joinAmount = row.recurring_expense?.amount == null ? null : Number(row.recurring_expense.amount)
        // Use best amount from any recurring expense with same name (handles duplicate records)
        const bestAmount = bestAmountByName[row.recurring_expense?.name] ?? null
        const defaultAmount = bestAmount ?? joinAmount
        const effectiveAmount = paymentAmount == null || paymentAmount === 0 ? defaultAmount : paymentAmount
        console.log('Processing variable bill:', {
          name: row.recurring_expense?.name,
          paymentAmount,
          joinAmount,
          bestAmount,
          defaultAmount,
          effectiveAmount,
          row_amount: row.amount,
          recurring_expense_amount: row.recurring_expense?.amount
        })
        pending.push({
          id: row.id,
          profile_id: row.profile_id,
          profile_name: row.profile?.name ?? 'Profile',
          name: row.recurring_expense?.name ?? 'Bill',
          due_date: row.due_date,
          amount: effectiveAmount,
          source: 'variable',
        })
      })

      ;(upcomingFixed ?? []).forEach((row: any) => {
        pending.push({
          id: row.id,
          profile_id: row.profile_id,
          profile_name: row.profile?.name ?? 'Profile',
          name: row.name,
          due_date: row.next_due_date,
          amount: row.amount == null ? null : Number(row.amount),
          source: 'fixed',
        })
      })

      setPendingBills(pending)

      setTransactions(tx ?? [])
      setBudgets(b ?? [])

      // Calculate spending per profile
      const spendings: ProfileSpending[] = profiles.map(profile => {
        const profileTransactions = (tx ?? []).filter(t => t.profile_id === profile.id && t.type === 'expense')
        return {
          profile,
          totalSpent: profileTransactions.reduce((sum, t) => sum + Number(t.amount), 0),
          transactionCount: profileTransactions.length,
        }
      }).sort((a, b) => b.totalSpent - a.totalSpent)

      setProfileSpendings(spendings)
      setLoading(false)
    }

    load()
  }, [profiles, year, month])

  const stats: DashboardStats = useMemo(() => {
    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0)
    const totalExpense = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0)

    const totalBudget = budgets.reduce((sum, b) => sum + Number(b.total_budget), 0)
    const remainingBalance = totalBudget - totalExpense
    const daysRemaining = getDaysRemainingInMonth(new Date())
    const dailySafeSpend = daysRemaining > 0 ? Math.max(0, remainingBalance) / daysRemaining : 0
    const progressPercent = totalBudget > 0 ? Math.min(100, (totalExpense / totalBudget) * 100) : 0

    return {
      totalIncome,
      totalExpense,
      remainingBalance,
      budget: totalBudget,
      daysRemaining,
      dailySafeSpend,
      progressPercent,
    }
  }, [transactions, budgets])

  return (
    <div className="space-y-5">
      <PWAInstallButton />
      <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-3xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-emerald-100 text-sm">{t('dashboard_total_spent_month_all')}</p>
            <p className="text-3xl font-bold mt-1">{formatMVR(stats.totalExpense)}</p>
          </div>
          <div className="bg-white/20 rounded-2xl p-3">
            <TrendingDown size={28} className="text-white" />
          </div>
        </div>
        
        <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-4">
          <div className="bg-white/10 rounded-xl p-2 sm:p-3">
            <p className="text-emerald-100 text-[10px] sm:text-xs">{t('dashboard_total_budget')}</p>
            <p className="text-[11px] sm:text-base font-semibold leading-tight break-words whitespace-normal">{formatMVR(stats.budget)}</p>
          </div>
          <div className="bg-white/10 rounded-xl p-2 sm:p-3">
            <p className="text-emerald-100 text-[10px] sm:text-xs">{t('dashboard_remaining')}</p>
            <p className={`text-[11px] sm:text-base font-semibold leading-tight break-words whitespace-normal ${stats.remainingBalance < 0 ? 'text-red-200' : ''}`}>
              {formatMVR(stats.remainingBalance)}
            </p>
          </div>
          <div className="bg-white/10 rounded-xl p-2 sm:p-3">
            <p className="text-emerald-100 text-[10px] sm:text-xs">{t('dashboard_days_left')}</p>
            <p className="text-sm sm:text-base font-semibold">{stats.daysRemaining}</p>
          </div>
        </div>
      </div>

      {stats.budget > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-600">{t('dashboard_overall_budget_usage')}</span>
            <span className="text-sm font-semibold text-gray-900">{stats.progressPercent.toFixed(0)}%</span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${
                stats.progressPercent > 90 ? 'bg-red-500' : 
                stats.progressPercent > 75 ? 'bg-yellow-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${stats.progressPercent}%` }}
            />
          </div>
          {stats.remainingBalance > 0 && (
            <p className="mt-3 text-xs text-gray-500 flex items-center gap-1">
              <AlertCircle size={12} />
              {t('dashboard_daily_safe_spend')}: {formatMVR(stats.dailySafeSpend)}
            </p>
          )}
        </div>
      )}

      {pendingBills.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Pending Bills</h3>
            <p className="text-xs text-gray-500 mt-1">Bills due this month</p>
          </div>
          <div className="divide-y divide-gray-100">
            {pendingBills.slice(0, 8).map((b) => (
              <button
                key={`${b.source}-${b.id}-${b.due_date}`}
                type="button"
                className="w-full text-left p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                onClick={async () => {
                  const next = profiles.find(p => p.id === b.profile_id)
                  if (next) await setCurrentProfile(next)
                  navigate('/recurring')
                }}
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{b.profile_name} • {b.name}</p>
                  <p className="text-xs text-gray-500">Due: {b.due_date}{b.source === 'variable' ? ' • Variable' : ''}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">{formatPendingAmount(b.amount)}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <SmartInsights />
      <CashFlowForecast />

      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div className="flex items-center gap-3">
          <div className="bg-blue-50 rounded-xl p-3">
            <TrendingUp size={20} className="text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">{t('dashboard_total_income_month_all')}</p>
            <p className="text-xl font-semibold text-gray-900">{formatMVR(stats.totalIncome)}</p>
          </div>
        </div>
      </div>

      {profileSpendings.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Users size={18} className="text-emerald-600" />
              <h3 className="font-semibold text-gray-900">{t('dashboard_spending_by_profile')}</h3>
            </div>
          </div>
          <div className="divide-y divide-gray-100">
            {profileSpendings.map((ps) => (
              <div key={ps.profile.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${
                    ps.profile.id === currentProfile?.id ? 'bg-emerald-500' : 'bg-gray-300'
                  }`} />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{ps.profile.name}</p>
                    <p className="text-xs text-gray-500">{ps.transactionCount} {t('dashboard_transactions')}</p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-gray-900">
                  {formatMVR(ps.totalSpent)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">{t('dashboard_recent_transactions_all')}</h3>
        </div>
        
        {loading ? (
          <div className="p-8 text-center text-gray-500">
            <div className="animate-pulse flex justify-center">
              <div className="h-4 w-32 bg-gray-200 rounded"></div>
            </div>
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <Wallet size={40} className="mx-auto mb-3 opacity-50" />
            <p className="text-sm">{t('dashboard_no_transactions')}</p>
            <p className="text-xs mt-1">{t('dashboard_add_first_expense')}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {transactions.slice(0, 8).map(tx => (
              <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    tx.type === 'income' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {tx.type === 'income' ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {tx.description || (tx.type === 'income' ? t('common_income') : t('common_expense'))}
                    </p>
                    <p className="text-xs text-gray-500">
                      {tx.transaction_date} • {tx.type === 'income' 
                        ? ((tx.income_source as any)?.name || t('common_income')) 
                        : ((tx.category as any)?.name || t('common_expense'))}
                    </p>
                  </div>
                </div>
                <span className={`text-sm font-semibold ${
                  tx.type === 'income' ? 'text-blue-600' : 'text-gray-900'
                }`}>
                  {tx.type === 'income' ? '+' : '-'}{formatMVR(Number(tx.amount))}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
