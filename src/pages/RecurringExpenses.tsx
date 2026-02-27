import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useProfile } from '../hooks/useProfile'
import type { RecurringExpense, ExpenseCategory } from '../types'
import { Plus, Calendar, Trash2, RefreshCw, CheckCircle2 } from 'lucide-react'

function formatMVR(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'MVR' }).format(value)
}

export default function RecurringExpenses() {
  const { currentProfile } = useProfile()
  const [expenses, setExpenses] = useState<(RecurringExpense & { category: ExpenseCategory })[]>([])
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    category_id: '',
    frequency: 'monthly' as const,
    start_date: new Date().toISOString().slice(0, 10),
    reminder_days: '3'
  })

  useEffect(() => {
    loadData()
  }, [currentProfile])

  const loadData = async () => {
    if (!currentProfile) return
    setLoading(true)

    const { data: cats } = await supabase
      .from('expense_categories')
      .select('*')
      .eq('profile_id', currentProfile.id)
      .eq('is_archived', false)

    setCategories(cats || [])

    const { data } = await supabase
      .from('recurring_expenses')
      .select('*, category:category_id(*)')
      .eq('profile_id', currentProfile.id)
      .eq('is_active', true)
      .order('next_due_date')

    setExpenses((data || []) as any)
    setLoading(false)
  }

  const addExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentProfile) return

    const startDate = new Date(formData.start_date)
    const { error } = await supabase.from('recurring_expenses').insert({
      profile_id: currentProfile.id,
      name: formData.name,
      amount: parseFloat(formData.amount),
      category_id: formData.category_id || null,
      frequency: formData.frequency,
      start_date: formData.start_date,
      next_due_date: formData.start_date,
      reminder_days: parseInt(formData.reminder_days)
    })

    if (!error) {
      setShowAdd(false)
      setFormData({
        name: '', amount: '', category_id: '', frequency: 'monthly',
        start_date: new Date().toISOString().slice(0, 10), reminder_days: '3'
      })
      loadData()
    }
  }

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from('recurring_expenses').update({ is_active: !current }).eq('id', id)
    loadData()
  }

  const deleteExpense = async (id: string) => {
    if (!confirm('Delete this recurring expense?')) return
    await supabase.from('recurring_expenses').delete().eq('id', id)
    loadData()
  }

  const isOverdue = (date: string) => new Date(date) < new Date()
  const isToday = (date: string) => new Date(date).toDateString() === new Date().toDateString()

  const frequencies = {
    daily: 'Daily',
    weekly: 'Weekly',
    monthly: 'Monthly',
    yearly: 'Yearly'
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Recurring Expenses</h2>
          <p className="text-sm text-gray-500">Auto-track bills and subscriptions</p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl p-2"
        >
          <Plus size={20} />
        </button>
      </div>

      {showAdd && (
        <form onSubmit={addExpense} className="bg-white rounded-2xl p-4 border border-gray-200 space-y-3">
          <input
            className="w-full border border-gray-200 rounded-lg px-3 py-2"
            placeholder="Bill name (e.g. Rent, Netflix)"
            value={formData.name}
            onChange={e => setFormData({...formData, name: e.target.value})}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              type="number"
              className="border border-gray-200 rounded-lg px-3 py-2"
              placeholder="Amount"
              value={formData.amount}
              onChange={e => setFormData({...formData, amount: e.target.value})}
              required
            />
            <select
              className="border border-gray-200 rounded-lg px-3 py-2"
              value={formData.category_id}
              onChange={e => setFormData({...formData, category_id: e.target.value})}
            >
              <option value="">Category</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <select
              className="border border-gray-200 rounded-lg px-3 py-2"
              value={formData.frequency}
              onChange={e => setFormData({...formData, frequency: e.target.value as any})}
            >
              {Object.entries(frequencies).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <input
              type="date"
              className="border border-gray-200 rounded-lg px-3 py-2"
              value={formData.start_date}
              onChange={e => setFormData({...formData, start_date: e.target.value})}
              required
            />
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowAdd(false)} className="flex-1 py-2 rounded-lg border border-gray-200">Cancel</button>
            <button type="submit" className="flex-1 py-2 rounded-lg bg-emerald-600 text-white">Add</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="animate-pulse space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-20 bg-gray-200 rounded-xl" />)}
        </div>
      ) : expenses.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <RefreshCw size={48} className="mx-auto mb-3 opacity-50" />
          <p>No recurring expenses</p>
          <p className="text-sm">Add bills that repeat monthly/weekly</p>
        </div>
      ) : (
        <div className="space-y-3">
          {expenses.map(exp => (
            <div key={exp.id} className={`bg-white rounded-xl p-4 border-2 ${
              isOverdue(exp.next_due_date) ? 'border-red-200' : 
              isToday(exp.next_due_date) ? 'border-yellow-200' : 'border-gray-200'
            }`}>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className={`mt-1 ${isOverdue(exp.next_due_date) ? 'text-red-500' : 'text-emerald-500'}`}>
                    {isOverdue(exp.next_due_date) ? <Calendar size={20} /> : <CheckCircle2 size={20} />}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{exp.name}</h3>
                    <p className="text-sm text-gray-500">
                      {exp.category?.name} • {frequencies[exp.frequency]}
                    </p>
                    <p className={`text-sm mt-1 ${isOverdue(exp.next_due_date) ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                      {isToday(exp.next_due_date) ? 'Due today' :
                       isOverdue(exp.next_due_date) ? `Overdue - was due ${new Date(exp.next_due_date).toLocaleDateString()}` :
                       `Next: ${new Date(exp.next_due_date).toLocaleDateString()}`}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">{formatMVR(exp.amount)}</p>
                  <div className="flex gap-1 mt-2">
                    <button onClick={() => toggleActive(exp.id, exp.is_active)} className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200">
                      <CheckCircle2 size={16} className={exp.is_active ? 'text-emerald-600' : 'text-gray-400'} />
                    </button>
                    <button onClick={() => deleteExpense(exp.id)} className="p-1.5 rounded-lg bg-gray-100 hover:bg-red-100 text-gray-600 hover:text-red-600">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
