import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useProfile } from '../hooks/useProfile'
import { TrendingDown, TrendingUp, ArrowUpRight, ArrowDownRight, Calendar } from 'lucide-react'
import type { MonthlyComparison } from '../types'
import { formatDateLocal } from '../utils/date'

function formatMVR(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'MVR' }).format(value)
}

export default function MonthlyComparison() {
  const { profiles } = useProfile()
  const [comparison, setComparison] = useState<MonthlyComparison | null>(null)
  const [loading, setLoading] = useState(true)

  const now = useMemo(() => new Date(), [])
  const [selectedYear, setSelectedYear] = useState(() => now.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(() => now.getMonth() + 1)

  useEffect(() => {
    loadComparison()
  }, [profiles, selectedYear, selectedMonth])

  const loadComparison = async () => {
    if (profiles.length === 0) return
    setLoading(true)

    const profileIds = profiles.map(p => p.id)
    const currentMonth = selectedMonth
    const currentYear = selectedYear
    const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1
    const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear

    // Current month data
    const currStart = new Date(currentYear, currentMonth - 1, 1)
    const currEnd = new Date(currentYear, currentMonth, 0)
    
    const { data: currTransactions } = await supabase
      .from('transactions')
      .select('type, amount')
      .in('profile_id', profileIds)
      .gte('transaction_date', formatDateLocal(currStart))
      .lte('transaction_date', formatDateLocal(currEnd))

    // Previous month data
    const prevStart = new Date(prevYear, prevMonth - 1, 1)
    const prevEnd = new Date(prevYear, prevMonth, 0)
    
    const { data: prevTransactions } = await supabase
      .from('transactions')
      .select('type, amount')
      .in('profile_id', profileIds)
      .gte('transaction_date', formatDateLocal(prevStart))
      .lte('transaction_date', formatDateLocal(prevEnd))

    const currExpenses = currTransactions?.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0) || 0
    const currIncome = currTransactions?.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0) || 0
    
    const prevExpenses = prevTransactions?.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0) || 0
    const prevIncome = prevTransactions?.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0) || 0

    setComparison({
      currentMonth: {
        totalExpense: currExpenses,
        totalIncome: currIncome,
        transactionCount: currTransactions?.length || 0
      },
      previousMonth: {
        totalExpense: prevExpenses,
        totalIncome: prevIncome,
        transactionCount: prevTransactions?.length || 0
      },
      change: {
        expenseChange: currExpenses - prevExpenses,
        expenseChangePercent: prevExpenses > 0 ? ((currExpenses - prevExpenses) / prevExpenses) * 100 : 0,
        incomeChange: currIncome - prevIncome,
        incomeChangePercent: prevIncome > 0 ? ((currIncome - prevIncome) / prevIncome) * 100 : 0
      }
    })
    setLoading(false)
  }

  const monthName = useMemo(() => {
    return new Date(selectedYear, selectedMonth - 1, 1).toLocaleString('default', { month: 'long' })
  }, [selectedMonth, selectedYear])
  const prevMonthName = useMemo(() => {
    const prevMonth = selectedMonth === 1 ? 12 : selectedMonth - 1
    const prevYear = selectedMonth === 1 ? selectedYear - 1 : selectedYear
    return new Date(prevYear, prevMonth - 1, 1).toLocaleString('default', { month: 'long' })
  }, [selectedMonth, selectedYear])

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Monthly Comparison</h2>
        <p className="text-sm text-gray-500">{monthName} {selectedYear} vs {prevMonthName}</p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <select
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
          >
            {Array.from({ length: 12 }).map((_, i) => {
              const m = i + 1
              const label = new Date(2000, i, 1).toLocaleString('default', { month: 'long' })
              return (
                <option key={m} value={m}>
                  {label}
                </option>
              )
            })}
          </select>

          <select
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
          >
            {[0, 1, 2, 3].map(i => {
              const y = new Date().getFullYear() - i
              return (
                <option key={y} value={y}>
                  {y}
                </option>
              )
            })}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-3">
          <div className="h-24 bg-gray-200 rounded-xl" />
          <div className="h-24 bg-gray-200 rounded-xl" />
        </div>
      ) : comparison ? (
        <div className="space-y-3">
          {/* Expenses Card */}
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-red-50 rounded-lg">
                  <TrendingDown size={18} className="text-red-500" />
                </div>
                <span className="font-medium text-gray-900">Expenses</span>
              </div>
              <div className={`flex items-center gap-1 text-sm ${comparison.change.expenseChange > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                {comparison.change.expenseChange > 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                <span>{Math.abs(comparison.change.expenseChangePercent).toFixed(1)}%</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">{monthName}</p>
                <p className="text-lg font-semibold text-gray-900">{formatMVR(comparison.currentMonth.totalExpense)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">{prevMonthName}</p>
                <p className="text-lg font-semibold text-gray-500">{formatMVR(comparison.previousMonth.totalExpense)}</p>
              </div>
            </div>
          </div>

          {/* Income Card */}
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <TrendingUp size={18} className="text-blue-500" />
                </div>
                <span className="font-medium text-gray-900">Income</span>
              </div>
              <div className={`flex items-center gap-1 text-sm ${comparison.change.incomeChange > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {comparison.change.incomeChange > 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                <span>{Math.abs(comparison.change.incomeChangePercent).toFixed(1)}%</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">{monthName}</p>
                <p className="text-lg font-semibold text-gray-900">{formatMVR(comparison.currentMonth.totalIncome)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">{prevMonthName}</p>
                <p className="text-lg font-semibold text-gray-500">{formatMVR(comparison.previousMonth.totalIncome)}</p>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
            <div className="flex items-center gap-2 mb-2">
              <Calendar size={18} className="text-emerald-600" />
              <span className="font-medium text-emerald-900">Transaction Count</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-emerald-700">{monthName}: {comparison.currentMonth.transactionCount} transactions</span>
              <span className="text-emerald-600">{prevMonthName}: {comparison.previousMonth.transactionCount} transactions</span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
