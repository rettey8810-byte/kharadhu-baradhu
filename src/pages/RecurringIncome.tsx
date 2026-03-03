import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useProfile } from '../hooks/useProfile'
import { useLanguage } from '../hooks/useLanguage'
import type { IncomeSource } from '../types'
import { formatDateLocal } from '../utils/date'
import { Plus, Calendar, Trash2, RefreshCw, CheckCircle2, Wallet, Briefcase, TrendingUp, Gift, CreditCard, Check } from 'lucide-react'

function formatMVR(value: number | null) {
  if (!value) return 'MVR --'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'MVR' }).format(value)
}

// Common income presets
const INCOME_PRESETS = [
  { type: 'salary', name: 'Monthly Salary', icon: Briefcase, color: '#10b981' },
  { type: 'allowance', name: 'Food Allowance', icon: Wallet, color: '#f59e0b' },
  { type: 'accommodation', name: 'Accommodation Allowance', icon: Wallet, color: '#3b82f6' },
  { type: 'transport', name: 'Transport Allowance', icon: Wallet, color: '#8b5cf6' },
  { type: 'bonus', name: 'Bonus/Commission', icon: TrendingUp, color: '#ef4444' },
  { type: 'freelance', name: 'Freelance Income', icon: CreditCard, color: '#6366f1' },
  { type: 'gift', name: 'Gift/Other Income', icon: Gift, color: '#ec4899' },
  { type: 'other', name: 'Other Income', icon: Wallet, color: '#6b7280' },
]

interface RecurringIncome {
  id: string
  name: string
  amount: number | null
  income_source_id: string
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'
  start_date: string
  next_due_date: string
  reminder_days: number
  is_active: boolean
  created_at: string
  income_source?: IncomeSource
}

export default function RecurringIncome() {
  const { currentProfile } = useProfile()
  const { t } = useLanguage()
  const [incomes, setIncomes] = useState<(RecurringIncome & { income_source: IncomeSource })[]>([])
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  
  // Mark as Received modal state
  const [showMarkReceived, setShowMarkReceived] = useState(false)
  const [markingReceivedId, setMarkingReceivedId] = useState<string | null>(null)
  const [markReceivedContext, setMarkReceivedContext] = useState<{ income: RecurringIncome | null; dueDateToReceive: string }>({ income: null, dueDateToReceive: '' })
  const [markReceivedForm, setMarkReceivedForm] = useState({
    amount: '',
    received_date: new Date().toISOString().slice(0, 10),
    notes: '',
  })
  
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    income_source_id: '',
    frequency: 'monthly' as const,
    start_date: formatDateLocal(new Date()),
    due_day_of_month: '',
    reminder_days: '3',
  })

  useEffect(() => {
    if (currentProfile) {
      loadData()
    }
  }, [currentProfile])

  const loadData = async () => {
    setLoading(true)
    
    // Load income sources
    const { data: sources } = await supabase
      .from('income_sources')
      .select('*')
      .eq('profile_id', currentProfile!.id)
      .eq('is_archived', false)
      .order('name')
    
    setIncomeSources(sources || [])
    
    // Load recurring incomes with source names
    const { data: recurring } = await supabase
      .from('recurring_income')
      .select('*, income_source:income_source_id(*)')
      .eq('profile_id', currentProfile!.id)
      .order('created_at', { ascending: false })
    
    setIncomes(recurring || [])
    setLoading(false)
  }

  const selectPreset = (preset: typeof INCOME_PRESETS[0]) => {
    setFormData(prev => ({
      ...prev,
      name: preset.name,
    }))
    setShowAdd(true)
  }

  const addIncome = async () => {
    if (!currentProfile || !formData.name || !formData.income_source_id) return
    
    // Calculate next due date based on start date and frequency
    const startDate = new Date(formData.start_date)
    let nextDueDate = new Date(startDate)
    
    if (formData.frequency === 'monthly' && formData.due_day_of_month) {
      const dueDay = parseInt(formData.due_day_of_month)
      nextDueDate.setDate(dueDay)
      if (nextDueDate < startDate) {
        nextDueDate.setMonth(nextDueDate.getMonth() + 1)
      }
    }
    
    const { error } = await supabase.from('recurring_income').insert({
      profile_id: currentProfile.id,
      name: formData.name,
      amount: formData.amount ? parseFloat(formData.amount) : null,
      income_source_id: formData.income_source_id,
      frequency: formData.frequency,
      start_date: formData.start_date,
      next_due_date: formatDateLocal(nextDueDate),
      reminder_days: parseInt(formData.reminder_days),
      is_active: true,
    })
    
    if (!error) {
      setFormData({
        name: '',
        amount: '',
        income_source_id: '',
        frequency: 'monthly',
        start_date: formatDateLocal(new Date()),
        due_day_of_month: '',
        reminder_days: '3',
      })
      setShowAdd(false)
      loadData()
    }
  }

  const toggleActive = async (id: string, current: boolean) => {
    await supabase
      .from('recurring_income')
      .update({ is_active: !current })
      .eq('id', id)
    loadData()
  }

  const deleteIncome = async (id: string) => {
    if (confirm('Delete this recurring income?')) {
      await supabase.from('recurring_income').delete().eq('id', id)
      loadData()
    }
  }

  const calcNextDueDate = (income: RecurringIncome) => {
    const current = new Date(income.next_due_date)

    if (income.frequency === 'daily') {
      current.setDate(current.getDate() + 1)
      return formatDateLocal(current)
    }

    if (income.frequency === 'weekly') {
      current.setDate(current.getDate() + 7)
      return formatDateLocal(current)
    }

    if (income.frequency === 'yearly') {
      current.setFullYear(current.getFullYear() + 1)
      return formatDateLocal(current)
    }

    // monthly - add one month
    const y = current.getFullYear()
    const m = current.getMonth()
    const nextMonthIndex = m + 1
    const nextYear = y + Math.floor(nextMonthIndex / 12)
    const nextMonth0 = nextMonthIndex % 12
    const targetDay = current.getDate()
    const day = Math.min(targetDay, new Date(nextYear, nextMonth0 + 1, 0).getDate())
    const next = new Date(nextYear, nextMonth0, day)
    return formatDateLocal(next)
  }

  const markAsReceived = async (income: RecurringIncome) => {
    if (!currentProfile) return
    if (markingReceivedId) return

    setMarkReceivedContext({ income, dueDateToReceive: income.next_due_date })
    setMarkReceivedForm({
      amount: income.amount == null ? '' : String(income.amount),
      received_date: new Date().toISOString().slice(0, 10),
      notes: '',
    })
    setShowMarkReceived(true)
  }

  const confirmMarkAsReceived = async () => {
    if (!currentProfile) return
    const income = markReceivedContext.income
    if (!income) return
    if (markingReceivedId) return

    const num = Number(markReceivedForm.amount)
    if (!Number.isFinite(num) || num <= 0) {
      window.alert('Please enter a valid amount')
      return
    }

    setMarkingReceivedId(income.id)
    try {
      // 1) Create income transaction
      const { error: txErr } = await supabase
        .from('transactions')
        .insert({
          profile_id: currentProfile.id,
          income_source_id: income.income_source_id,
          type: 'income',
          amount: num,
          description: income.name,
          notes: markReceivedForm.notes || null,
          transaction_date: markReceivedForm.received_date,
        })
      if (txErr) throw txErr

      // 2) Advance next due date
      const nextDue = calcNextDueDate(income)
      const { error: updErr } = await supabase
        .from('recurring_income')
        .update({ next_due_date: nextDue })
        .eq('id', income.id)
      if (updErr) throw updErr

      setShowMarkReceived(false)
      setMarkReceivedContext({ income: null, dueDateToReceive: '' })
      await loadData()
    } catch (e: any) {
      window.alert(e?.message ?? 'Failed to mark as received')
    } finally {
      setMarkingReceivedId(null)
    }
  }

  const getFrequencyLabel = (freq: string) => {
    const labels: Record<string, string> = {
      daily: 'Daily',
      weekly: 'Weekly',
      monthly: 'Monthly',
      yearly: 'Yearly'
    }
    return labels[freq] || freq
  }

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-500">
        <RefreshCw size={32} className="mx-auto mb-3 animate-spin" />
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">{t('page_recurring_income')}</h2>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="bg-emerald-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-medium"
        >
          <Plus size={20} />
          Add Recurring
        </button>
      </div>

      <p className="text-gray-600 text-sm">
        Set up automatic tracking for income that repeats monthly (salary, allowances, etc.). Never miss tracking your income!
      </p>

      {/* Preset Selection */}
      {!showAdd && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-3">Quick Add - Common Income Types</h3>
          <div className="grid grid-cols-2 gap-2">
            {INCOME_PRESETS.map((preset) => {
              const Icon = preset.icon
              return (
                <button
                  key={preset.type}
                  onClick={() => selectPreset(preset)}
                  className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:border-emerald-500 hover:bg-emerald-50 transition-all text-left"
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: preset.color + '20' }}
                  >
                    <Icon size={20} style={{ color: preset.color }} />
                  </div>
                  <span className="font-medium text-gray-900 text-sm">{preset.name}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Add Form */}
      {showAdd && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <button
              onClick={() => {
                setShowAdd(false)
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
            <h3 className="font-semibold text-gray-900">Add Recurring Income</h3>
          </div>
          
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700">Income Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Monthly Salary"
                className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Amount (MVR)</label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="5000"
                  className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Income Source</label>
                <select
                  value={formData.income_source_id}
                  onChange={(e) => setFormData({ ...formData, income_source_id: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg"
                >
                  <option value="">Select source</option>
                  {incomeSources.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Frequency</label>
                <select
                  value={formData.frequency}
                  onChange={(e) => setFormData({ ...formData, frequency: e.target.value as any })}
                  className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg"
                >
                  <option value="monthly">Monthly</option>
                  <option value="weekly">Weekly</option>
                  <option value="daily">Daily</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Due Day (of month)</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={formData.due_day_of_month}
                  onChange={(e) => setFormData({ ...formData, due_day_of_month: e.target.value })}
                  placeholder="e.g., 25"
                  className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg"
                />
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700">Start Date</label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700">Reminder (days before)</label>
              <input
                type="number"
                value={formData.reminder_days}
                onChange={(e) => setFormData({ ...formData, reminder_days: e.target.value })}
                min="0"
                max="30"
                className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg"
              />
            </div>
            
            <button
              onClick={addIncome}
              disabled={!formData.name || !formData.income_source_id}
              className="w-full bg-emerald-600 text-white py-3 rounded-xl font-semibold disabled:opacity-50"
            >
              Add Recurring Income
            </button>
          </div>
        </div>
      )}

      {/* Income List */}
      <div className="space-y-3">
        {incomes.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center text-gray-500">
            <Calendar size={40} className="mx-auto mb-3 opacity-50" />
            <p>No recurring income set up yet</p>
            <p className="text-sm mt-1">Add your salary or allowances to track automatically</p>
          </div>
        ) : (
          incomes.map((income) => (
            <div
              key={income.id}
              className={`bg-white rounded-2xl p-4 border ${income.is_active ? 'border-gray-100' : 'border-gray-200 opacity-60'}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-gray-900">{income.name}</h4>
                    {!income.is_active && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">Paused</span>
                    )}
                  </div>
                  <p className="text-emerald-600 font-bold text-lg mt-1">
                    +{formatMVR(income.amount)}
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Calendar size={14} />
                      {getFrequencyLabel(income.frequency)}
                    </span>
                    <span>Next: {income.next_due_date}</span>
                    {income.reminder_days > 0 && (
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 bg-blue-400 rounded-full" />
                        {income.reminder_days} days reminder
                      </span>
                    )}
                  </div>
                  {income.income_source && (
                    <p className="text-xs text-gray-400 mt-1">
                      Source: {income.income_source.name}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {income.is_active && (
                    <button
                      onClick={() => markAsReceived(income)}
                      disabled={markingReceivedId === income.id}
                      className="p-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg disabled:opacity-50"
                      title="Mark as Received"
                    >
                      <Check size={18} />
                    </button>
                  )}
                  <button
                    onClick={() => toggleActive(income.id, income.is_active)}
                    className={`p-2 rounded-lg ${income.is_active ? 'text-emerald-600 hover:bg-emerald-50' : 'text-gray-400 hover:bg-gray-100'}`}
                    title={income.is_active ? 'Pause' : 'Resume'}
                  >
                    <CheckCircle2 size={20} />
                  </button>
                  <button
                    onClick={() => deleteIncome(income.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    title="Delete"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      {/* Mark as Received Modal */}
      {showMarkReceived && markReceivedContext.income && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-4">
            <h3 className="font-bold text-lg text-gray-900">
              Mark as Received
            </h3>
            <p className="text-sm text-gray-600">
              {markReceivedContext.income.name} - Due {markReceivedContext.dueDateToReceive}
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Amount Received (MVR)</label>
                <input
                  type="number"
                  value={markReceivedForm.amount}
                  onChange={(e) => setMarkReceivedForm({ ...markReceivedForm, amount: e.target.value })}
                  placeholder="5000"
                  className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Date Received</label>
                <input
                  type="date"
                  value={markReceivedForm.received_date}
                  onChange={(e) => setMarkReceivedForm({ ...markReceivedForm, received_date: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Notes (optional)</label>
                <input
                  type="text"
                  value={markReceivedForm.notes}
                  onChange={(e) => setMarkReceivedForm({ ...markReceivedForm, notes: e.target.value })}
                  placeholder="e.g., July salary"
                  className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  setShowMarkReceived(false)
                  setMarkReceivedContext({ income: null, dueDateToReceive: '' })
                }}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmMarkAsReceived}
                disabled={markingReceivedId === markReceivedContext.income.id}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50"
              >
                {markingReceivedId === markReceivedContext.income.id ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
