import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useProfile } from '../hooks/useProfile'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import type { Transaction } from '../types'

function formatMVR(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'MVR' }).format(value)
}

export default function Charts() {
  const { profiles } = useProfile()
  const [data, setData] = useState<{ name: string; value: number; color: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())

  useEffect(() => {
    loadData()
  }, [profiles, month, year])

  const loadData = async () => {
    if (profiles.length === 0) return
    setLoading(true)

    const profileIds = profiles.map(p => p.id)
    const start = new Date(year, month - 1, 1)
    const end = new Date(year, month, 0)

    const { data: transactions } = await supabase
      .from('transactions')
      .select('*, category:category_id(name, color)')
      .in('profile_id', profileIds)
      .eq('type', 'expense')
      .gte('transaction_date', start.toISOString().slice(0, 10))
      .lte('transaction_date', end.toISOString().slice(0, 10))

    const categoryTotals: Record<string, { name: string; value: number; color: string }> = {}
    
    transactions?.forEach(t => {
      const catName = (t.category as any)?.name || 'Uncategorized'
      const catColor = (t.category as any)?.color || '#9ca3af'
      
      if (!categoryTotals[catName]) {
        categoryTotals[catName] = { name: catName, value: 0, color: catColor }
      }
      categoryTotals[catName].value += Number(t.amount)
    })

    setData(Object.values(categoryTotals).sort((a, b) => b.value - a.value))
    setLoading(false)
  }

  const months = [
    { value: 1, label: 'January' }, { value: 2, label: 'February' },
    { value: 3, label: 'March' }, { value: 4, label: 'April' },
    { value: 5, label: 'May' }, { value: 6, label: 'June' },
    { value: 7, label: 'July' }, { value: 8, label: 'August' },
    { value: 9, label: 'September' }, { value: 10, label: 'October' },
    { value: 11, label: 'November' }, { value: 12, label: 'December' }
  ]

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i)
  const total = data.reduce((sum, d) => sum + d.value, 0)

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Spending Analytics</h2>
        <p className="text-sm text-gray-500">Visual breakdown by category</p>
      </div>

      <div className="flex gap-2">
        <select
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2"
          value={month}
          onChange={e => setMonth(parseInt(e.target.value))}
        >
          {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
        <select
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2"
          value={year}
          onChange={e => setYear(parseInt(e.target.value))}
        >
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="h-64 bg-gray-100 rounded-2xl animate-pulse" />
      ) : data.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <p>No expense data for this period</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-4 border border-gray-200">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => formatMVR(value)}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm font-medium text-gray-500 border-b pb-2">
              <span>Category</span>
              <span>Amount</span>
            </div>
            {data.map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-sm">{item.name}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-medium">{formatMVR(item.value)}</span>
                  <span className="text-xs text-gray-500 ml-2">
                    ({((item.value / total) * 100).toFixed(1)}%)
                  </span>
                </div>
              </div>
            ))}
            <div className="pt-2 border-t font-semibold flex justify-between">
              <span>Total</span>
              <span>{formatMVR(total)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
