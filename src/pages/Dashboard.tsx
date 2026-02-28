import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useProfile } from '../hooks/useProfile'
import { PWAInstallButton } from '../hooks/usePWAInstall'
import type { DashboardStats, MonthlyBudget, Transaction, ExpenseProfile } from '../types'
import { getDaysRemainingInMonth, getYearMonth } from '../utils/date'
import { TrendingDown, TrendingUp, Wallet, AlertCircle, Users } from 'lucide-react'

function formatMVR(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'MVR' }).format(value)
}

interface ProfileSpending {
  profile: ExpenseProfile
  totalSpent: number
  transactionCount: number
}

export default function Dashboard() {
  const { profiles, currentProfile } = useProfile()
  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [budgets, setBudgets] = useState<MonthlyBudget[]>([])
  const [profileSpendings, setProfileSpendings] = useState<ProfileSpending[]>([])

  const { year, month } = useMemo(() => getYearMonth(new Date()), [])

  useEffect(() => {
    const load = async () => {
      if (profiles.length === 0) return
      setLoading(true)

      const profileIds = profiles.map(p => p.id)
      const start = new Date(year, month - 1, 1)
      const end = new Date(year, month, 0)

      // Load all transactions from all profiles
      const { data: tx } = await supabase
        .from('transactions')
        .select('*, profile:profile_id(name), category:category_id(name), income_source:income_source_id(name)')
        .in('profile_id', profileIds)
        .gte('transaction_date', start.toISOString().slice(0, 10))
        .lte('transaction_date', end.toISOString().slice(0, 10))
        .order('transaction_date', { ascending: false })

      // Load all budgets from all profiles
      const { data: b } = await supabase
        .from('monthly_budgets')
        .select('*')
        .in('profile_id', profileIds)
        .eq('year', year)
        .eq('month', month)

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
            <p className="text-emerald-100 text-sm">Total Spent This Month (All Profiles)</p>
            <p className="text-3xl font-bold mt-1">{formatMVR(stats.totalExpense)}</p>
          </div>
          <div className="bg-white/20 rounded-2xl p-3">
            <TrendingDown size={28} className="text-white" />
          </div>
        </div>
        
        <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-4">
          <div className="bg-white/10 rounded-xl p-2 sm:p-3">
            <p className="text-emerald-100 text-[10px] sm:text-xs">Total Budget</p>
            <p className="text-sm sm:text-base font-semibold truncate">{formatMVR(stats.budget)}</p>
          </div>
          <div className="bg-white/10 rounded-xl p-2 sm:p-3">
            <p className="text-emerald-100 text-[10px] sm:text-xs">Remaining</p>
            <p className={`text-sm sm:text-base font-semibold truncate ${stats.remainingBalance < 0 ? 'text-red-200' : ''}`}>
              {formatMVR(stats.remainingBalance)}
            </p>
          </div>
          <div className="bg-white/10 rounded-xl p-2 sm:p-3">
            <p className="text-emerald-100 text-[10px] sm:text-xs">Days Left</p>
            <p className="text-sm sm:text-base font-semibold">{stats.daysRemaining}</p>
          </div>
        </div>
      </div>

      {stats.budget > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-600">Overall Budget Usage</span>
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
              Daily safe spend: {formatMVR(stats.dailySafeSpend)}
            </p>
          )}
        </div>
      )}

      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div className="flex items-center gap-3">
          <div className="bg-blue-50 rounded-xl p-3">
            <TrendingUp size={20} className="text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Income This Month (All Profiles)</p>
            <p className="text-xl font-semibold text-gray-900">{formatMVR(stats.totalIncome)}</p>
          </div>
        </div>
      </div>

      {profileSpendings.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Users size={18} className="text-emerald-600" />
              <h3 className="font-semibold text-gray-900">Spending by Profile</h3>
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
                    <p className="text-xs text-gray-500">{ps.transactionCount} transactions</p>
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
          <h3 className="font-semibold text-gray-900">Recent Transactions (All Profiles)</h3>
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
            <p className="text-sm">No transactions yet</p>
            <p className="text-xs mt-1">Add your first expense!</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {transactions.slice(0, 8).map(t => (
              <div key={t.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    t.type === 'income' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {t.type === 'income' ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {t.description || (t.type === 'income' ? 'Income' : 'Expense')}
                    </p>
                    <p className="text-xs text-gray-500">
                      {t.transaction_date} • {t.type === 'income' 
                        ? ((t.income_source as any)?.name || 'Income') 
                        : ((t.category as any)?.name || 'Expense')}
                    </p>
                  </div>
                </div>
                <span className={`text-sm font-semibold ${
                  t.type === 'income' ? 'text-blue-600' : 'text-gray-900'
                }`}>
                  {t.type === 'income' ? '+' : '-'}{formatMVR(Number(t.amount))}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
