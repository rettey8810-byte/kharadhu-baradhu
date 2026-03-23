import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { firebaseDb } from '../lib/firebase'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { useProfile } from '../hooks/useProfile'
import { useAuth } from '../hooks/useAuth'
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

interface DashboardLoan {
  id: string
  profile_id: string
  loan_type: 'borrowed' | 'lended'
  lender_name: string | null
  borrower_name: string | null
  due_date: string | null
  total_amount: number
  amount_paid: number
  status: string
  profile?: { name?: string } | null
}

export default function Dashboard() {
  const { profiles, currentProfile, setCurrentProfile } = useProfile()
  const { user } = useAuth()
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [budgets, setBudgets] = useState<MonthlyBudget[]>([])
  const [profileSpendings, setProfileSpendings] = useState<ProfileSpending[]>([])
  const [pendingBills, setPendingBills] = useState<PendingBill[]>([])
  const [loansSummary, setLoansSummary] = useState<{
    borrowedRemaining: number
    lendedOutstanding: number
    net: number
    dueSoonCount: number
    overdueCount: number
  } | null>(null)

  const { year, month } = useMemo(() => getYearMonth(new Date()), [])

  useEffect(() => {
    const load = async () => {
      if (!user || profiles.length === 0) return
      setLoading(true)
      console.log('Dashboard loading for profiles:', profiles.map(p => ({ id: p.id, name: p.name })))

      const profileIds = profiles.map(p => p.id)
      const start = new Date(year, month - 1, 1)
      const end = new Date(year, month, 0)
      const monthStart = formatDateLocal(start)
      const monthEnd = formatDateLocal(end)

      try {
        // Load transactions for this month
        const txQuery = query(
          collection(firebaseDb, 'users', user.uid, 'transactions'),
          where('transaction_date', '>=', monthStart),
          where('transaction_date', '<=', monthEnd)
        )
        const txSnap = await getDocs(txQuery)

        // Load categories and income sources for enrichment
        const catSnap = await getDocs(collection(firebaseDb, 'users', user.uid, 'categories'))
        const sourceSnap = await getDocs(collection(firebaseDb, 'users', user.uid, 'incomeSources'))

        const categoryById = new Map(catSnap.docs.map(d => [d.id, { id: d.id, ...d.data() } as any]))
        const sourceById = new Map(sourceSnap.docs.map(d => [d.id, { id: d.id, ...d.data() } as any]))
        const profileById = new Map(profiles.map(p => [p.id, p]))

        const txData: Transaction[] = txSnap.docs.map(d => {
          const raw = d.data()
          return {
            id: d.id,
            profile_id: raw.profile_id || '',
            type: raw.type || 'expense',
            amount: Number(raw.amount) || 0,
            transaction_date: raw.transaction_date || '',
            description: raw.description || '',
            notes: raw.notes || '',
            tags: raw.tags || [],
            category_id: raw.category_id || null,
            income_source_id: raw.income_source_id || null,
            created_at: raw.created_at?.toDate ? raw.created_at.toDate().toISOString() : (raw.created_at || ''),
            updated_at: raw.updated_at?.toDate ? raw.updated_at.toDate().toISOString() : (raw.updated_at || ''),
            category: raw.category_id ? categoryById.get(raw.category_id) : undefined,
            income_source: raw.income_source_id ? sourceById.get(raw.income_source_id) : undefined,
            profile: { name: profileById.get(raw.profile_id)?.name ?? 'Profile' }
          }
        })

        txData.sort((a, b) => b.transaction_date.localeCompare(a.transaction_date))

        // Load budgets from all profiles
        const budgetPromises = profileIds.map(async (pid) => {
          const bQuery = query(
            collection(firebaseDb, 'users', user.uid, 'budgets'),
            where('profile_id', '==', pid),
            where('year', '==', year),
            where('month', '==', month)
          )
          const bSnap = await getDocs(bQuery)
          return bSnap.docs.map(d => ({ id: d.id, ...d.data() }) as MonthlyBudget)
        })
        const budgetsData = (await Promise.all(budgetPromises)).flat()

        // Load pending bills - variable (bill_payments)
        const billPaymentPromises = profileIds.map(async (pid) => {
          const bpQuery = query(
            collection(firebaseDb, 'users', user.uid, 'billPayments'),
            where('profile_id', '==', pid),
            where('is_paid', '==', false),
            where('due_date', '>=', monthStart),
            where('due_date', '<=', monthEnd)
          )
          return getDocs(bpQuery)
        })
        const billPaymentSnaps = await Promise.all(billPaymentPromises)
        const billPaymentsData = billPaymentSnaps.flatMap(snap =>
          snap.docs.map(d => ({ id: d.id, ...d.data() } as any))
        )

        // Load recurring expenses for fixed bills and amount lookup
        const recurringPromises = profileIds.map(async (pid) => {
          const reQuery = query(
            collection(firebaseDb, 'users', user.uid, 'recurringExpenses'),
            where('profile_id', '==', pid),
            where('is_active', '==', true)
          )
          return getDocs(reQuery)
        })
        const recurringSnaps = await Promise.all(recurringPromises)
        const allRecurring = recurringSnaps.flatMap(snap =>
          snap.docs.map(d => ({ id: d.id, ...d.data() } as any))
        )

        const bestAmountByName: Record<string, number | null> = {}
        allRecurring.forEach((re: any) => {
          const name = re.name
          const amt = re.amount != null ? Number(re.amount) : null
          if (amt != null && amt > 0) {
            if (bestAmountByName[name] == null || amt > bestAmountByName[name]!) {
              bestAmountByName[name] = amt
            }
          }
        })

        const upcomingFixed = allRecurring.filter((re: any) =>
          !re.is_variable_amount &&
          re.next_due_date >= monthStart &&
          re.next_due_date <= monthEnd
        )

        const pending: PendingBill[] = []

        billPaymentsData.forEach((row: any) => {
          const paymentAmount = row.amount == null ? null : Number(row.amount)
          const joinAmount = row.recurring_expense?.amount == null ? null : Number(row.recurring_expense.amount)
          const bestAmount = bestAmountByName[row.recurring_expense?.name] ?? null
          const defaultAmount = bestAmount ?? joinAmount
          const effectiveAmount = paymentAmount == null || paymentAmount === 0 ? defaultAmount : paymentAmount

          pending.push({
            id: row.id,
            profile_id: row.profile_id,
            profile_name: profileById.get(row.profile_id)?.name ?? 'Profile',
            name: row.recurring_expense?.name ?? 'Bill',
            due_date: row.due_date,
            amount: effectiveAmount,
            source: 'variable',
          })
        })

        upcomingFixed.forEach((row: any) => {
          pending.push({
            id: row.id,
            profile_id: row.profile_id,
            profile_name: profileById.get(row.profile_id)?.name ?? 'Profile',
            name: row.name,
            due_date: row.next_due_date,
            amount: row.amount == null ? null : Number(row.amount),
            source: 'fixed',
          })
        })

        pending.sort((a, b) => a.due_date.localeCompare(b.due_date))
        setPendingBills(pending)

        // Loans summary
        const todayStr = formatDateLocal(new Date())
        const dueSoonThreshold = formatDateLocal(new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() + 7))

        const loanPromises = profileIds.map(async (pid) => {
          const lQuery = query(
            collection(firebaseDb, 'users', user.uid, 'loans'),
            where('profile_id', '==', pid),
            where('status', '==', 'active')
          )
          return getDocs(lQuery)
        })
        const loanSnaps = await Promise.all(loanPromises)
        const loans = loanSnaps.flatMap(snap =>
          snap.docs.map(d => ({ id: d.id, ...d.data() }) as DashboardLoan)
        )

        const borrowedRemaining = loans
          .filter(l => l.loan_type === 'borrowed')
          .reduce((sum, l) => sum + (Number(l.total_amount) - Number(l.amount_paid)), 0)
        const lendedOutstanding = loans
          .filter(l => l.loan_type === 'lended')
          .reduce((sum, l) => sum + (Number(l.total_amount) - Number(l.amount_paid)), 0)

        const dueSoonCount = loans.filter(l => !!l.due_date && l.due_date >= todayStr && l.due_date <= dueSoonThreshold).length
        const overdueCount = loans.filter(l => !!l.due_date && l.due_date < todayStr).length

        setLoansSummary({
          borrowedRemaining,
          lendedOutstanding,
          net: lendedOutstanding - borrowedRemaining,
          dueSoonCount,
          overdueCount,
        })

        setTransactions(txData)
        setBudgets(budgetsData)

        // Calculate spending per profile
        const spendings: ProfileSpending[] = profiles.map(profile => {
          const profileTransactions = txData.filter((t: any) => t.profile_id === profile.id && t.type === 'expense')
          return {
            profile,
            totalSpent: profileTransactions.reduce((sum: number, t: any) => sum + Number(t.amount), 0),
            transactionCount: profileTransactions.length,
          }
        }).sort((a, b) => b.totalSpent - a.totalSpent)

        setProfileSpendings(spendings)
      } catch (err) {
        console.error('Dashboard load error:', err)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [profiles, year, month, user])

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

      {loansSummary && (
        <button
          type="button"
          className="w-full text-left bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:bg-gray-50 transition-colors"
          onClick={() => navigate('/loans')}
        >
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">Loans</h3>
              <p className="text-xs text-gray-500 mt-1">Borrowed & lended overview</p>
            </div>
            {(loansSummary.overdueCount > 0 || loansSummary.dueSoonCount > 0) && (
              <div className="text-right">
                {loansSummary.overdueCount > 0 && (
                  <p className="text-xs font-semibold text-red-600">{loansSummary.overdueCount} overdue</p>
                )}
                {loansSummary.dueSoonCount > 0 && (
                  <p className="text-xs font-semibold text-yellow-600">{loansSummary.dueSoonCount} due soon</p>
                )}
              </div>
            )}
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-4">
            <div className="bg-red-50 border border-red-100 rounded-xl p-3">
              <p className="text-[10px] sm:text-xs text-red-700">You Owe</p>
              <p className="text-sm sm:text-base font-semibold text-red-900 break-words whitespace-normal">{formatMVR(loansSummary.borrowedRemaining)}</p>
            </div>
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
              <p className="text-[10px] sm:text-xs text-emerald-700">Owed to You</p>
              <p className="text-sm sm:text-base font-semibold text-emerald-900 break-words whitespace-normal">{formatMVR(loansSummary.lendedOutstanding)}</p>
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
              <p className="text-[10px] sm:text-xs text-blue-700">Net</p>
              <p className="text-sm sm:text-base font-semibold text-blue-900 break-words whitespace-normal">{formatMVR(loansSummary.net)}</p>
            </div>
          </div>
        </button>
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
