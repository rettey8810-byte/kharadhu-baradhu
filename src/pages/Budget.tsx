import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useProfile } from '../hooks/useProfile'
import type { MonthlyBudget } from '../types'

export default function Budget() {
  const { currentProfile } = useProfile()
  const [year, setYear] = useState(() => new Date().getFullYear())
  const [month, setMonth] = useState(() => new Date().getMonth() + 1)
  const [budget, setBudget] = useState<MonthlyBudget | null>(null)
  const [value, setValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    if (!currentProfile) return
    const { data } = await supabase
      .from('monthly_budgets')
      .select('*')
      .eq('profile_id', currentProfile.id)
      .eq('year', year)
      .eq('month', month)
      .maybeSingle()

    setBudget(data ?? null)
    setValue(data ? String(data.total_budget) : '')
  }

  useEffect(() => {
    load()
  }, [currentProfile, year, month])

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentProfile) return

    setError(null)
    setLoading(true)

    try {
      const num = Number(value)
      if (!Number.isFinite(num) || num < 0) throw new Error('Enter a valid budget amount')

      const { error } = await supabase
        .from('monthly_budgets')
        .upsert({
          profile_id: currentProfile.id,
          year,
          month,
          total_budget: num,
        })

      if (error) throw error
      await load()
    } catch (err: any) {
      setError(err?.message ?? 'Failed to save budget')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4">
      <div className="text-lg font-semibold">Monthly budget</div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm text-gray-600">Year</label>
          <select
            className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          >
            {[0, 1, 2, 3, 4].map((i) => {
              const y = new Date().getFullYear() - i
              return <option key={y} value={y}>{y}</option>
            })}
          </select>
        </div>
        <div>
          <label className="text-sm text-gray-600">Month</label>
          <select
            className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2"
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
              <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
            ))}
          </select>
        </div>
      </div>

      <form onSubmit={save} className="mt-4 space-y-3">
        <div>
          <label className="text-sm text-gray-600">Total budget (MVR)</label>
          <input
            className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            inputMode="decimal"
            placeholder="0.00"
          />
        </div>

        {error && <div className="text-sm text-red-600">{error}</div>}

        <button
          type="submit"
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-3 py-2 font-semibold disabled:opacity-60"
          disabled={loading}
        >
          {loading ? 'Saving…' : 'Save budget'}
        </button>
      </form>

      {budget && (
        <div className="mt-4 text-sm text-gray-600">
          Current saved budget: <span className="font-semibold text-gray-900">{budget.total_budget} MVR</span>
        </div>
      )}
    </div>
  )
}
