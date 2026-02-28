import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useProfile } from '../hooks/useProfile'
import type { Transaction, ExpenseCategory } from '../types'
import { AlertTriangle, TrendingUp, TrendingDown, Lightbulb, Sparkles, ChevronRight } from 'lucide-react'

function formatMVR(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'MVR' }).format(value)
}

interface Insight {
  id: string
  type: 'alert' | 'warning' | 'info' | 'success'
  title: string
  message: string
  action?: string
}

export default function SmartInsights() {
  const { profiles, currentProfile } = useProfile()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (profiles.length > 0) {
      loadData()
    }
  }, [profiles])

  const loadData = async () => {
    setLoading(true)
    const profileIds = profiles.map(p => p.id)
    
    // Get current and previous month dates
    const now = new Date()
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)

    // Load current month transactions
    const { data: currentTx } = await supabase
      .from('transactions')
      .select('*, category:category_id(name)')
      .in('profile_id', profileIds)
      .gte('transaction_date', currentMonth.toISOString().slice(0, 10))
      .lte('transaction_date', now.toISOString().slice(0, 10))

    // Load previous month transactions for comparison
    const { data: prevTx } = await supabase
      .from('transactions')
      .select('*, category:category_id(name)')
      .in('profile_id', profileIds)
      .gte('transaction_date', prevMonth.toISOString().slice(0, 10))
      .lte('transaction_date', prevMonthEnd.toISOString().slice(0, 10))

    // Load categories
    const { data: cats } = await supabase
      .from('expense_categories')
      .select('*')
      .in('profile_id', profileIds)

    setTransactions(currentTx || [])
    setCategories(cats || [])
    setLoading(false)
  }

  const insights = useMemo<Insight[]>(() => {
    const insights: Insight[] = []
    
    if (transactions.length === 0) return insights

    const currentMonthExpenses = transactions.filter(t => t.type === 'expense')
    const currentMonthIncome = transactions.filter(t => t.type === 'income')
    
    // Calculate totals
    const totalExpense = currentMonthExpenses.reduce((sum, t) => sum + Number(t.amount), 0)
    const totalIncome = currentMonthIncome.reduce((sum, t) => sum + Number(t.amount), 0)

    // 1. Spending vs Income Alert
    if (totalExpense > totalIncome && totalIncome > 0) {
      insights.push({
        id: 'overspending',
        type: 'alert',
        title: 'Overspending Alert',
        message: `You've spent ${formatMVR(totalExpense)} but only earned ${formatMVR(totalIncome)}. You're ${formatMVR(totalExpense - totalIncome)} over budget.`,
        action: 'review'
      })
    }

    // 2. Category spending comparison
    const categoryTotals: Record<string, number> = {}
    currentMonthExpenses.forEach(t => {
      const catName = (t.category as any)?.name || 'Other'
      categoryTotals[catName] = (categoryTotals[catName] || 0) + Number(t.amount)
    })

    // Find highest spending category
    const topCategory = Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1])[0]
    
    if (topCategory && totalExpense > 0) {
      const percentage = ((topCategory[1] / totalExpense) * 100).toFixed(0)
      if (Number(percentage) > 30) {
        insights.push({
          id: 'top-category',
          type: 'warning',
          title: `High ${topCategory[0]} Spending`,
          message: `You're spending ${percentage}% of your budget on ${topCategory[0]} (${formatMVR(topCategory[1])}).`,
          action: 'review'
        })
      }
    }

    // 3. Unusual expense detection (transactions over 500 MVR)
    const largeExpenses = currentMonthExpenses.filter(t => Number(t.amount) > 500)
    if (largeExpenses.length > 0) {
      const largest = largeExpenses.sort((a, b) => Number(b.amount) - Number(a.amount))[0]
      insights.push({
        id: 'large-expense',
        type: 'info',
        title: 'Large Expense Detected',
        message: `You spent ${formatMVR(Number(largest.amount))} on ${largest.description || 'a transaction'}. Make sure this was planned!`,
        action: 'review'
      })
    }

    // 4. Daily average insight
    const daysInMonth = new Date().getDate()
    const dailyAverage = totalExpense / daysInMonth
    const daysRemaining = 30 - daysInMonth
    const projectedTotal = totalExpense + (dailyAverage * daysRemaining)
    
    if (totalIncome > 0 && projectedTotal > totalIncome) {
      insights.push({
        id: 'projection',
        type: 'warning',
        title: 'Spending Projection',
        message: `At your current rate, you'll spend ${formatMVR(projectedTotal)} this month. That's ${formatMVR(projectedTotal - totalIncome)} more than your income.`,
        action: ' slowdown'
      })
    }

    // 5. No income logged alert
    if (currentMonthIncome.length === 0 && totalExpense > 100) {
      insights.push({
        id: 'no-income',
        type: 'alert',
        title: 'No Income Logged',
        message: `You've spent ${formatMVR(totalExpense)} but haven't logged any income this month. Don't forget to track your earnings!`,
        action: 'add-income'
      })
    }

    // 6. Savings opportunity
    if (totalIncome > 0 && totalExpense < totalIncome * 0.8) {
      const savings = totalIncome - totalExpense
      insights.push({
        id: 'savings-opportunity',
        type: 'success',
        title: 'Great Saving!',
        message: `You're ${formatMVR(savings)} under budget. Consider adding this to your savings goals!`,
        action: 'save'
      })
    }

    return insights.slice(0, 4) // Show max 4 insights
  }, [transactions])

  const getIcon = (type: string) => {
    switch (type) {
      case 'alert': return <AlertTriangle size={20} className="text-red-500" />
      case 'warning': return <TrendingUp size={20} className="text-yellow-500" />
      case 'success': return <Sparkles size={20} className="text-emerald-500" />
      default: return <Lightbulb size={20} className="text-blue-500" />
    }
  }

  const getBgColor = (type: string) => {
    switch (type) {
      case 'alert': return 'bg-red-50 border-red-200'
      case 'warning': return 'bg-yellow-50 border-yellow-200'
      case 'success': return 'bg-emerald-50 border-emerald-200'
      default: return 'bg-blue-50 border-blue-200'
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={20} className="text-emerald-500" />
          <h3 className="font-semibold text-gray-900">Smart Insights</h3>
        </div>
        <div className="animate-pulse space-y-2">
          <div className="h-16 bg-gray-100 rounded-xl" />
          <div className="h-16 bg-gray-100 rounded-xl" />
        </div>
      </div>
    )
  }

  if (insights.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={20} className="text-emerald-500" />
          <h3 className="font-semibold text-gray-900">Smart Insights</h3>
        </div>
        <p className="text-gray-500 text-sm">
          No insights yet. Add more transactions to get personalized spending analysis!
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles size={20} className="text-emerald-500" />
        <h3 className="font-semibold text-gray-900">Smart Insights</h3>
        <span className="ml-auto text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">
          {insights.length} alerts
        </span>
      </div>

      <div className="space-y-3">
        {insights.map((insight) => (
          <div
            key={insight.id}
            className={`p-3 rounded-xl border ${getBgColor(insight.type)}`}
          >
            <div className="flex items-start gap-3">
              {getIcon(insight.type)}
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 text-sm">
                  {insight.title}
                </h4>
                <p className="text-gray-600 text-sm mt-1">
                  {insight.message}
                </p>
                {insight.action && (
                  <button className="mt-2 text-sm font-medium text-emerald-600 flex items-center gap-1 hover:underline">
                    {insight.action}
                    <ChevronRight size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
