import { useEffect, useState } from 'react'
import { firebaseDb } from '../lib/firebase'
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, orderBy } from 'firebase/firestore'
import { useProfile } from '../hooks/useProfile'
import { useAuth } from '../hooks/useAuth'
import type { CategoryBudget, ExpenseCategory } from '../types'
import { Target, AlertTriangle, Plus, Trash2 } from 'lucide-react'

function formatMVR(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'MVR' }).format(value)
}

export default function CategoryBudgets() {
  const { currentProfile } = useProfile()
  const { user } = useAuth()
  const [budgets, setBudgets] = useState<(CategoryBudget & { category: ExpenseCategory, spent: number })[]>([])
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [showAdd, setShowAdd] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('')
  const [budgetAmount, setBudgetAmount] = useState('')
  const [alertThreshold, setAlertThreshold] = useState('80')

  useEffect(() => {
    loadData()
  }, [currentProfile, month, year, user])

  const loadData = async () => {
    if (!user || !currentProfile) return
    setLoading(true)

    const catQuery = query(
      collection(firebaseDb, 'users', user.uid, 'categories'),
      where('profile_id', '==', currentProfile.id),
      where('is_archived', '==', false),
      orderBy('name')
    )
    const catSnap = await getDocs(catQuery)
    const cats = catSnap.docs.map(d => ({ id: d.id, ...d.data() }) as ExpenseCategory)
    setCategories(cats)

    const start = new Date(year, month - 1, 1).toISOString().slice(0, 10)
    const end = new Date(year, month, 0).toISOString().slice(0, 10)

    const budgetsQuery = query(
      collection(firebaseDb, 'users', user.uid, 'categoryBudgets'),
      where('profile_id', '==', currentProfile.id),
      where('year', '==', year),
      where('month', '==', month)
    )
    const budgetsSnap = await getDocs(budgetsQuery)

    const txQuery = query(
      collection(firebaseDb, 'users', user.uid, 'transactions'),
      where('profile_id', '==', currentProfile.id),
      where('type', '==', 'expense'),
      where('transaction_date', '>=', start),
      where('transaction_date', '<=', end)
    )
    const txSnap = await getDocs(txQuery)

    const spentByCategory: Record<string, number> = {}
    txSnap.docs.forEach(d => {
      const t = d.data()
      if (t.category_id) {
        spentByCategory[t.category_id] = (spentByCategory[t.category_id] || 0) + Number(t.amount)
      }
    })

    const budgetsWithSpent = budgetsSnap.docs.map(d => {
      const b = { id: d.id, ...d.data() } as CategoryBudget
      const cat = cats.find(c => c.id === b.category_id)
      return {
        ...b,
        category: cat || ({ name: 'Unknown', color: '#9ca3af' } as ExpenseCategory),
        spent: spentByCategory[b.category_id] || 0
      }
    })

    setBudgets(budgetsWithSpent)
    setLoading(false)
  }

  const addBudget = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !currentProfile) return

    await addDoc(collection(firebaseDb, 'users', user.uid, 'categoryBudgets'), {
      profile_id: currentProfile.id,
      category_id: selectedCategory,
      year,
      month,
      budget_amount: parseFloat(budgetAmount),
      alert_threshold: parseInt(alertThreshold),
      created_at: new Date().toISOString()
    })

    setShowAdd(false)
    setSelectedCategory('')
    setBudgetAmount('')
    setAlertThreshold('80')
    loadData()
  }

  const deleteBudget = async (id: string) => {
    if (!confirm('Delete this budget?')) return
    if (!user) return
    await deleteDoc(doc(firebaseDb, 'users', user.uid, 'categoryBudgets', id))
    loadData()
  }

  const months = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: new Date(2024, i, 1).toLocaleString('default', { month: 'long' }) }))
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i)

  const uncategorized = categories.filter(c => !budgets.some(b => b.category_id === c.id))

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Category Budgets</h2>
          <p className="text-sm text-gray-500">Set limits for each spending category</p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl p-2"
        >
          <Plus size={20} />
        </button>
      </div>

      <div className="flex gap-2">
        <select className="flex-1 border border-gray-200 rounded-lg px-3 py-2" value={month} onChange={e => setMonth(parseInt(e.target.value))}>
          {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
        <select className="flex-1 border border-gray-200 rounded-lg px-3 py-2" value={year} onChange={e => setYear(parseInt(e.target.value))}>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {showAdd && uncategorized.length > 0 && (
        <form onSubmit={addBudget} className="bg-white rounded-2xl p-4 border border-gray-200 space-y-3">
          <div>
            <label className="text-sm text-gray-600">Category</label>
            <select
              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2"
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              required
            >
              <option value="">Select category</option>
              {uncategorized.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-gray-600">Budget Amount</label>
              <input
                type="number"
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2"
                value={budgetAmount}
                onChange={e => setBudgetAmount(e.target.value)}
                placeholder="1000"
                required
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">Alert at (%)</label>
              <input
                type="number"
                min="1"
                max="100"
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2"
                value={alertThreshold}
                onChange={e => setAlertThreshold(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowAdd(false)} className="flex-1 py-2 rounded-lg border border-gray-200">Cancel</button>
            <button type="submit" className="flex-1 py-2 rounded-lg bg-emerald-600 text-white">Add Budget</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="animate-pulse space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-24 bg-gray-200 rounded-xl" />)}
        </div>
      ) : budgets.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <Target size={48} className="mx-auto mb-3 opacity-50" />
          <p>No category budgets set</p>
          <p className="text-sm">Add budgets to track spending by category</p>
        </div>
      ) : (
        <div className="space-y-3">
          {budgets.map(b => {
            const percent = Math.min(100, (b.spent / b.budget_amount) * 100)
            const isOverAlert = percent >= b.alert_threshold
            const isOverBudget = b.spent > b.budget_amount

            return (
              <div key={b.id} className="bg-white rounded-xl p-4 border border-gray-200">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: b.category.color }} />
                    <span className="font-semibold">{b.category.name}</span>
                    {isOverAlert && !isOverBudget && (
                      <AlertTriangle size={16} className="text-yellow-500" />
                    )}
                    {isOverBudget && (
                      <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Over</span>
                    )}
                  </div>
                  <button onClick={() => deleteBudget(b.id)} className="text-gray-400 hover:text-red-500">
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="flex justify-between text-sm mb-1">
                  <span className={isOverBudget ? 'text-red-600 font-medium' : ''}>{formatMVR(b.spent)}</span>
                  <span className="text-gray-500">of {formatMVR(b.budget_amount)}</span>
                </div>

                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      isOverBudget ? 'bg-red-500' : isOverAlert ? 'bg-yellow-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${percent}%` }}
                  />
                </div>

                <div className="flex justify-between text-xs mt-1 text-gray-500">
                  <span>{percent.toFixed(0)}% used</span>
                  <span>Alert at {b.alert_threshold}%</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
