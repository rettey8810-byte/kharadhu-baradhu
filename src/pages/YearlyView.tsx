import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useProfile } from '../hooks/useProfile'
import { formatDateLocal } from '../utils/date'

function formatMVR(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'MVR' }).format(value)
}

export default function YearlyView() {
  const { profiles } = useProfile()
  const [year, setYear] = useState(() => new Date().getFullYear())
  const [monthlyExpenseTotals, setMonthlyExpenseTotals] = useState<number[]>(Array(12).fill(0))
  const [monthlyIncomeTotals, setMonthlyIncomeTotals] = useState<number[]>(Array(12).fill(0))

  const startEnd = useMemo(() => {
    const start = formatDateLocal(new Date(year, 0, 1))
    const end = formatDateLocal(new Date(year, 11, 31))
    return { start, end }
  }, [year])

  useEffect(() => {
    const load = async () => {
      if (profiles.length === 0) return

      const profileIds = profiles.map(p => p.id)

      const { data } = await supabase
        .from('transactions')
        .select('amount, transaction_date, type')
        .in('profile_id', profileIds)
        .gte('transaction_date', startEnd.start)
        .lte('transaction_date', startEnd.end)

      const expenseTotals = Array(12).fill(0)
      const incomeTotals = Array(12).fill(0)
      for (const row of data ?? []) {
        const d = new Date(row.transaction_date)
        const m = d.getMonth()
        if (row.type === 'income') incomeTotals[m] += Number(row.amount)
        if (row.type === 'expense') expenseTotals[m] += Number(row.amount)
      }
      setMonthlyExpenseTotals(expenseTotals)
      setMonthlyIncomeTotals(incomeTotals)
    }

    load()
  }, [profiles, startEnd])

  const totalExpense = monthlyExpenseTotals.reduce((a, b) => a + b, 0)
  const totalIncome = monthlyIncomeTotals.reduce((a, b) => a + b, 0)

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-200 rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-lg font-semibold">Yearly totals</div>
            <div className="text-sm text-gray-500">Expense: {formatMVR(totalExpense)}</div>
            <div className="text-sm text-gray-500">Income: {formatMVR(totalIncome)}</div>
          </div>
          <select
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          >
            {[0,1,2,3].map(i => {
              const y = new Date().getFullYear() - i
              return <option key={y} value={y}>{y}</option>
            })}
          </select>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-4">
        <div className="font-semibold">By month</div>
        <div className="mt-3 space-y-2">
          {monthlyExpenseTotals.map((v, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="text-sm text-gray-700">{String(i + 1).padStart(2, '0')}</div>
              <div className="text-right">
                <div className="text-sm font-semibold text-gray-900">-{formatMVR(v)}</div>
                <div className="text-sm font-semibold text-gray-900">+{formatMVR(monthlyIncomeTotals[i] ?? 0)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
