import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useProfile } from '../hooks/useProfile'
import { AlertCircle, TrendingDown, Calendar, Wallet, ChevronRight } from 'lucide-react'

function formatMVR(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'MVR' }).format(value)
}

interface CashFlowData {
  currentBalance: number
  projectedEndBalance: number
  dailyBurnRate: number
  daysUntilZero: number | null
  upcomingExpenses: number
  upcomingIncome: number
  willRunOut: boolean
  runOutDate: string | null
}

export default function CashFlowForecast() {
  const { profiles, currentProfile } = useProfile()
  const [data, setData] = useState<CashFlowData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (profiles.length > 0) {
      calculateForecast()
    }
  }, [profiles])

  const calculateForecast = async () => {
    setLoading(true)
    const profileIds = profiles.map(p => p.id)
    
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
    const daysRemaining = daysInMonth - now.getDate() + 1

    // Get current month transactions
    const startOfMonth = new Date(currentYear, currentMonth, 1).toISOString().slice(0, 10)
    const today = now.toISOString().slice(0, 10)

    const { data: transactions } = await supabase
      .from('transactions')
      .select('*')
      .in('profile_id', profileIds)
      .gte('transaction_date', startOfMonth)
      .lte('transaction_date', today)

    // Get upcoming recurring expenses
    const { data: recurringExpenses } = await supabase
      .from('recurring_expenses')
      .select('*')
      .in('profile_id', profileIds)
      .eq('is_active', true)
      .gte('next_due_date', today)
      .lte('next_due_date', new Date(currentYear, currentMonth + 1, 0).toISOString().slice(0, 10))

    // Get upcoming recurring income
    const { data: recurringIncome } = await supabase
      .from('recurring_income')
      .select('*')
      .in('profile_id', profileIds)
      .eq('is_active', true)
      .gte('next_due_date', today)
      .lte('next_due_date', new Date(currentYear, currentMonth + 1, 0).toISOString().slice(0, 10))

    // Calculate current month totals
    const currentExpenses = (transactions || [])
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0)
    
    const currentIncome = (transactions || [])
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0)

    // Calculate upcoming amounts
    const upcomingExpensesTotal = (recurringExpenses || [])
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0)
    
    const upcomingIncomeTotal = (recurringIncome || [])
      .reduce((sum, i) => sum + (Number(i.amount) || 0), 0)

    // Current balance (income - expenses so far)
    const currentBalance = currentIncome - currentExpenses

    // Projected end of month
    const projectedEndBalance = currentBalance + upcomingIncomeTotal - upcomingExpensesTotal

    // Daily burn rate based on expenses so far
    const daysPassed = now.getDate()
    const dailyBurnRate = currentExpenses / daysPassed

    // Days until money runs out (if negative trend)
    let daysUntilZero: number | null = null
    let willRunOut = false
    let runOutDate: string | null = null

    if (dailyBurnRate > 0 && currentBalance > 0) {
      daysUntilZero = Math.floor(currentBalance / dailyBurnRate)
      if (daysUntilZero <= daysRemaining) {
        willRunOut = true
        const runOut = new Date()
        runOut.setDate(runOut.getDate() + daysUntilZero)
        runOutDate = runOut.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
      }
    }

    setData({
      currentBalance,
      projectedEndBalance,
      dailyBurnRate,
      daysUntilZero,
      upcomingExpenses: upcomingExpensesTotal,
      upcomingIncome: upcomingIncomeTotal,
      willRunOut,
      runOutDate
    })

    setLoading(false)
  }

  const getStatusColor = () => {
    if (!data) return 'gray'
    if (data.willRunOut) return 'red'
    if (data.projectedEndBalance < 0) return 'orange'
    if (data.projectedEndBalance < data.currentBalance * 0.2) return 'yellow'
    return 'green'
  }

  const getStatusMessage = () => {
    if (!data) return ''
    if (data.willRunOut) {
      return `You're spending faster than you earn. At this rate, you'll run out of money around ${data.runOutDate}.`
    }
    if (data.projectedEndBalance < 0) {
      return 'Your expenses exceed your expected income this month. Consider cutting back or finding additional income.'
    }
    if (data.projectedEndBalance < data.currentBalance * 0.2) {
      return 'You have a small buffer left. Be careful with discretionary spending.'
    }
    return 'Great! You have a healthy balance and are on track to save this month.'
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4" />
          <div className="h-20 bg-gray-200 rounded-xl" />
        </div>
      </div>
    )
  }

  if (!data) return null

  const statusColor = getStatusColor()
  const bgColors: Record<string, string> = {
    red: 'bg-red-50 border-red-200',
    orange: 'bg-orange-50 border-orange-200',
    yellow: 'bg-yellow-50 border-yellow-200',
    green: 'bg-emerald-50 border-emerald-200',
    gray: 'bg-gray-50 border-gray-200'
  }

  return (
    <div className={`rounded-2xl p-5 shadow-sm border ${bgColors[statusColor]}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Wallet size={20} className={statusColor === 'green' ? 'text-emerald-600' : 'text-gray-600'} />
          <h3 className="font-bold text-gray-900">Cash Flow Forecast</h3>
        </div>
        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
          statusColor === 'green' ? 'bg-emerald-100 text-emerald-700' :
          statusColor === 'red' ? 'bg-red-100 text-red-700' :
          statusColor === 'orange' ? 'bg-orange-100 text-orange-700' :
          'bg-yellow-100 text-yellow-700'
        }`}>
          {data.willRunOut ? '⚠️ At Risk' : data.projectedEndBalance > 0 ? '✓ Healthy' : '⚡ Warning'}
        </span>
      </div>

      {/* Current Status */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-white/60 rounded-xl p-3">
          <p className="text-xs text-gray-500 mb-1">Current Balance</p>
          <p className={`text-xl font-bold ${data.currentBalance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {formatMVR(data.currentBalance)}
          </p>
        </div>
        <div className="bg-white/60 rounded-xl p-3">
          <p className="text-xs text-gray-500 mb-1">Projected End</p>
          <p className={`text-xl font-bold ${data.projectedEndBalance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {formatMVR(data.projectedEndBalance)}
          </p>
        </div>
      </div>

      {/* Upcoming */}
      <div className="flex gap-3 mb-4">
        <div className="flex-1 bg-white/60 rounded-xl p-3 flex items-center gap-2">
          <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
            <TrendingDown size={16} className="text-emerald-600 rotate-180" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Upcoming Income</p>
            <p className="font-semibold text-emerald-600">+{formatMVR(data.upcomingIncome)}</p>
          </div>
        </div>
        <div className="flex-1 bg-white/60 rounded-xl p-3 flex items-center gap-2">
          <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
            <TrendingDown size={16} className="text-red-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Upcoming Bills</p>
            <p className="font-semibold text-red-600">-{formatMVR(data.upcomingExpenses)}</p>
          </div>
        </div>
      </div>

      {/* Alert */}
      <div className={`p-3 rounded-xl ${
        data.willRunOut ? 'bg-red-100' : 'bg-white/60'
      }`}>
        <div className="flex items-start gap-2">
          <AlertCircle size={18} className={data.willRunOut ? 'text-red-600' : 'text-gray-400'} />
          <p className={`text-sm ${data.willRunOut ? 'text-red-700' : 'text-gray-600'}`}>
            {getStatusMessage()}
          </p>
        </div>
      </div>

      {/* Daily Rate */}
      <div className="mt-4 pt-4 border-t border-gray-200/50">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Daily spending rate:</span>
          <span className="font-semibold text-gray-900">{formatMVR(data.dailyBurnRate)}/day</span>
        </div>
      </div>
    </div>
  )
}
