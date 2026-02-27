import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useProfile } from '../hooks/useProfile'
import { TrendingDown, TrendingUp, ArrowUpRight, ArrowDownRight, Calendar } from 'lucide-react'
import type { MonthlyComparison } from '../types'

function formatMVR(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'MVR' }).format(value)
}

export default function MonthlyComparison() {
  const { profiles } = useProfile()
  const [comparison, setComparison] = useState<MonthlyComparison | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadComparison()
  }, [profiles])

  const loadComparison = async () => {
    if (profiles.length === 0) return
    setLoading(true)

    const profileIds = profiles.map(p => p.id)
    const now = new Date()
    const currentMonth = now.getMonth() + 1
    const currentYear = now.getFullYear()
    const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1
    const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear

    // Current month data
    const currStart = new Date(currentYear, currentMonth - 1, 1)
    const currEnd = new Date(currentYear, currentMonth, 0)
    
    const { data: currTransactions } = await supabase
      .from('transactions')
      .select('type, amount')
      .in('profile_id', profileIds)
      .gte('transaction_date', currStart.toISOString().slice(0, 10))
      .lte('transaction_date', currEnd.toISOString().slice(0, 10))

    // Previous month data
    const prevStart = new Date(prevYear, prevMonth - 1, 1)
    const prevEnd = new Date(prevYear, prevMonth, 0)
    
    const { data: prevTransactions } = await supabase
      .from('transactions')
      .select('type, amount')
      .in('profile_id', profileIds)
      .gte('transaction_date', prevStart.toISOString().slice(0, 10))
      .lte('transaction_date', prevEnd.toISOString().slice(0, 10))

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

  const monthName = new Date().toLocaleString('default', { month: 'long' })
  const prevMonthName = new Date(new Date().setMonth(new Date().getMonth() - 1)).toLocaleString('default', { month: 'long' })

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Monthly Comparison</h2>
        <p className="text-sm text-gray-500">{monthName} vs {prevMonthName}</p>
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
