import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useProfile } from '../hooks/useProfile'

function formatMVR(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'MVR' }).format(value)
}

export default function YearlyView() {
  const { currentProfile } = useProfile()
  const [year, setYear] = useState(() => new Date().getFullYear())
  const [monthlyTotals, setMonthlyTotals] = useState<number[]>(Array(12).fill(0))

  const startEnd = useMemo(() => {
    const start = new Date(year, 0, 1).toISOString().slice(0, 10)
    const end = new Date(year, 11, 31).toISOString().slice(0, 10)
    return { start, end }
  }, [year])

  useEffect(() => {
    const load = async () => {
      if (!currentProfile) return

      const { data } = await supabase
        .from('transactions')
        .select('amount, transaction_date, type')
        .eq('profile_id', currentProfile.id)
        .eq('type', 'expense')
        .gte('transaction_date', startEnd.start)
        .lte('transaction_date', startEnd.end)

      const totals = Array(12).fill(0)
      for (const row of data ?? []) {
        const d = new Date(row.transaction_date)
        const m = d.getMonth()
        totals[m] += Number(row.amount)
      }
      setMonthlyTotals(totals)
    }

    load()
  }, [currentProfile, startEnd])

  const total = monthlyTotals.reduce((a, b) => a + b, 0)

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-200 rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-lg font-semibold">Yearly expenses</div>
            <div className="text-sm text-gray-500">Total: {formatMVR(total)}</div>
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
          {monthlyTotals.map((v, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="text-sm text-gray-700">{String(i + 1).padStart(2, '0')}</div>
              <div className="text-sm font-semibold text-gray-900">{formatMVR(v)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
