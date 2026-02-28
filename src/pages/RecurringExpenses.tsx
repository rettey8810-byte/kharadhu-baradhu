import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useProfile } from '../hooks/useProfile'
import { useLanguage } from '../hooks/useLanguage'
import type { RecurringExpense, ExpenseCategory } from '../types'
import { formatDateLocal } from '../utils/date'
import { Plus, Calendar, Trash2, RefreshCw, CheckCircle2, Zap, Droplets, Wifi, Tv, GraduationCap, Home, Smartphone, CreditCard, Bell } from 'lucide-react'

function formatMVR(value: number | null) {
  if (!value) return 'MVR --'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'MVR' }).format(value)
}

// Maldives common bill presets
const BILL_PRESETS = [
  { type: 'stelco', name: 'STELCO Electricity', icon: Zap, color: '#f59e0b', category: 'Utilities' },
  { type: 'mwsc', name: 'MWSC Water', icon: Droplets, color: '#3b82f6', category: 'Utilities' },
  { type: 'dhiraagu', name: 'Dhiraagu Phone', icon: Smartphone, color: '#ef4444', category: 'Phone' },
  { type: 'ooredoo', name: 'Ooredoo Phone', icon: Smartphone, color: '#8b5cf6', category: 'Phone' },
  { type: 'medianet', name: 'Medianet TV/Internet', icon: Tv, color: '#10b981', category: 'Internet' },
  { type: 'netflix', name: 'Netflix', icon: Tv, color: '#e50914', category: 'Entertainment' },
  { type: 'disney', name: 'Disney+', icon: Tv, color: '#113ccf', category: 'Entertainment' },
  { type: 'youtube', name: 'YouTube Premium', icon: Tv, color: '#ff0000', category: 'Entertainment' },
  { type: 'rent', name: 'House Rent', icon: Home, color: '#6366f1', category: 'Housing' },
  { type: 'tuition', name: 'Tuition Fee', icon: GraduationCap, color: '#14b8a6', category: 'Education' },
  { type: 'school', name: 'School Fee', icon: GraduationCap, color: '#06b6d4', category: 'Education' },
  { type: 'internet', name: 'Internet Service', icon: Wifi, color: '#8b5cf6', category: 'Internet' },
  { type: 'other', name: 'Other Bill', icon: CreditCard, color: '#6b7280', category: 'Other' },
]


export default function RecurringExpenses() {
  const { currentProfile } = useProfile()
  const { t } = useLanguage()
  const [expenses, setExpenses] = useState<(RecurringExpense & { category: ExpenseCategory })[]>([])
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [markingPaidId, setMarkingPaidId] = useState<string | null>(null)
  const [paidStatus, setPaidStatus] = useState<Record<string, boolean>>({})
  const [showAdd, setShowAdd] = useState(false)
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null)
  const [showPresets, setShowPresets] = useState(true)
  
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    is_variable_amount: false,
    category_id: '',
    frequency: 'monthly' as const,
    start_date: new Date().toISOString().slice(0, 10),
    due_day_of_month: '',
    reminder_days: '3',
    grace_period_days: '5',
    bill_type: '',
    provider: '',
    account_number: '',
    meter_number: ''
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

    const ids = (data || []).map((d: any) => d.id)
    if (ids.length > 0) {
      const dueDates = Array.from(new Set((data || []).map((d: any) => d.next_due_date)))

      const { data: payments } = await supabase
        .from('bill_payments')
        .select('recurring_expense_id, due_date, is_paid')
        .eq('profile_id', currentProfile.id)
        .in('recurring_expense_id', ids)
        .in('due_date', dueDates)

      const map: Record<string, boolean> = {}
      ;(payments || []).forEach((p: any) => {
        map[`${p.recurring_expense_id}|${p.due_date}`] = Boolean(p.is_paid)
      })
      setPaidStatus(map)
    } else {
      setPaidStatus({})
    }

    setLoading(false)
  }

  const clampDayOfMonth = (year: number, monthIndex0: number, day: number) => {
    const lastDay = new Date(year, monthIndex0 + 1, 0).getDate()
    return Math.max(1, Math.min(day, lastDay))
  }

  const calcNextDueDate = (exp: RecurringExpense) => {
    const current = new Date(exp.next_due_date)

    if (exp.frequency === 'daily') {
      current.setDate(current.getDate() + 1)
      return formatDateLocal(current)
    }

    if (exp.frequency === 'weekly') {
      current.setDate(current.getDate() + 7)
      return formatDateLocal(current)
    }

    if (exp.frequency === 'yearly') {
      current.setFullYear(current.getFullYear() + 1)
      return formatDateLocal(current)
    }

    // monthly
    const y = current.getFullYear()
    const m = current.getMonth()
    const nextMonthIndex = m + 1
    const nextYear = y + Math.floor(nextMonthIndex / 12)
    const nextMonth0 = nextMonthIndex % 12
    const targetDay = exp.due_day_of_month ?? current.getDate()
    const day = clampDayOfMonth(nextYear, nextMonth0, targetDay)
    const next = new Date(nextYear, nextMonth0, day)
    return formatDateLocal(next)
  }

  const markAsPaid = async (exp: RecurringExpense & { category: ExpenseCategory }) => {
    if (!currentProfile) return
    if (markingPaidId) return

    const defaultAmount = exp.amount ?? ''
    const input = window.prompt(t('enter_paid_amount') || 'Enter paid amount (MVR)', defaultAmount === null ? '' : String(defaultAmount))
    if (input === null) return
    const num = Number(input)
    if (!Number.isFinite(num) || num <= 0) {
      window.alert(t('enter_valid_amount') || 'Please enter a valid amount')
      return
    }

    setMarkingPaidId(exp.id)
    try {
      // 1) Create transaction
      const { data: tx, error: txErr } = await supabase
        .from('transactions')
        .insert({
          profile_id: currentProfile.id,
          category_id: exp.category_id,
          type: 'expense',
          amount: num,
          description: exp.name,
          transaction_date: exp.next_due_date,
        })
        .select('id')
        .single()
      if (txErr) throw txErr

      // 2) Upsert bill_payments
      const { error: payErr } = await supabase
        .from('bill_payments')
        .upsert(
          {
            recurring_expense_id: exp.id,
            profile_id: currentProfile.id,
            transaction_id: tx.id,
            due_date: exp.next_due_date,
            paid_date: formatDateLocal(new Date()),
            amount: num,
            is_paid: true,
          },
          { onConflict: 'recurring_expense_id,due_date' }
        )
      if (payErr) throw payErr

      // 3) Advance next due date
      const nextDue = calcNextDueDate(exp)
      const { error: updErr } = await supabase
        .from('recurring_expenses')
        .update({ next_due_date: nextDue })
        .eq('id', exp.id)
      if (updErr) throw updErr

      await loadData()
    } catch (e: any) {
      window.alert(e?.message ?? (t('failed_mark_paid') || 'Failed to mark as paid'))
    } finally {
      setMarkingPaidId(null)
    }
  }

  const addExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentProfile) return
    
    const amountNum = Number(formData.amount)
    const amountValue = Number.isFinite(amountNum) ? amountNum : null

    const insertData: any = {
      profile_id: currentProfile.id,
      name: formData.name,
      amount: formData.is_variable_amount ? amountValue : amountValue,
      is_variable_amount: formData.is_variable_amount,
      category_id: formData.category_id || null,
      frequency: formData.frequency,
      start_date: formData.start_date,
      next_due_date: formData.start_date,
      due_day_of_month: formData.due_day_of_month ? parseInt(formData.due_day_of_month) : null,
      reminder_days: parseInt(formData.reminder_days),
      grace_period_days: parseInt(formData.grace_period_days),
      bill_type: formData.bill_type,
      provider: formData.provider,
      account_number: formData.account_number || null,
      meter_number: formData.meter_number || null
    }

    const { error } = await supabase.from('recurring_expenses').insert(insertData)

    if (!error) {
      setShowAdd(false)
      setShowPresets(true)
      setSelectedPreset(null)
      setFormData({
        name: '', amount: '', is_variable_amount: false, category_id: '', frequency: 'monthly',
        start_date: new Date().toISOString().slice(0, 10), due_day_of_month: '', reminder_days: '3',
        grace_period_days: '5', bill_type: '', provider: '', account_number: '', meter_number: ''
      })
      loadData()
    }
  }

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from('recurring_expenses').update({ is_active: !current }).eq('id', id)
    loadData()
  }

  const deleteExpense = async (id: string) => {
    if (!confirm(t('delete_recurring_bill') || 'Delete this recurring bill?')) return
    await supabase.from('recurring_expenses').delete().eq('id', id)
    loadData()
  }

  const selectPreset = (preset: typeof BILL_PRESETS[0]) => {
    setSelectedPreset(preset.type)
    setFormData({
      ...formData,
      name: preset.name,
      bill_type: preset.type,
      category_id: categories.find(c => c.name === preset.category)?.id || '',
    })
    setShowPresets(false)
  }

  const isOverdue = (date: string, graceDays: number = 0) => {
    const dueDate = new Date(date)
    const graceDate = new Date(dueDate)
    graceDate.setDate(graceDate.getDate() + graceDays)
    return new Date() > graceDate
  }

  const isInGracePeriod = (date: string, graceDays: number = 0) => {
    const dueDate = new Date(date)
    const graceDate = new Date(dueDate)
    graceDate.setDate(graceDate.getDate() + graceDays)
    const today = new Date()
    return today >= dueDate && today <= graceDate
  }

  const isToday = (date: string) => new Date(date).toDateString() === new Date().toDateString()

  const getBillIcon = (billType: string) => {
    const preset = BILL_PRESETS.find(p => p.type === billType)
    return preset?.icon || CreditCard
  }

  const getBillColor = (billType: string) => {
    const preset = BILL_PRESETS.find(p => p.type === billType)
    return preset?.color || '#6b7280'
  }

  const getDaysStatus = (exp: any) => {
    const due = new Date(exp.next_due_date)
    const today = new Date()
    const diffTime = due.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays < 0) return { text: `${Math.abs(diffDays)} ${t('days_overdue')}`, color: 'text-red-600', bg: 'bg-red-50' }
    if (diffDays === 0) return { text: t('due_today'), color: 'text-yellow-600', bg: 'bg-yellow-50' }
    if (diffDays <= (exp.reminder_days || 3)) return { text: `${diffDays} ${t('days_left')}`, color: 'text-orange-600', bg: 'bg-orange-50' }
    return { text: `${diffDays} ${t('days_until_due')}`, color: 'text-gray-500', bg: 'bg-gray-50' }
  }

  const frequencies = {
    daily: t('freq_daily'),
    weekly: t('freq_weekly'),
    monthly: t('freq_monthly'),
    yearly: t('freq_yearly')
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">{t('recurring_bills_title')}</h2>
          <p className="text-sm text-gray-500">{t('recurring_bills_subtitle')}</p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl p-2"
        >
          <Plus size={20} />
        </button>
      </div>

      {showAdd && (
        <div className="bg-white rounded-2xl p-4 border border-gray-200 space-y-4">
          {/* Bill Type Presets */}
          {showPresets && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">{t('select_bill_type')}</p>
              <div className="grid grid-cols-3 gap-2">
                {BILL_PRESETS.map(preset => {
                  const Icon = preset.icon
                  return (
                    <button
                      key={preset.type}
                      onClick={() => selectPreset(preset)}
                      className="flex flex-col items-center p-3 rounded-xl border border-gray-200 hover:border-emerald-500 hover:bg-emerald-50 transition-colors"
                    >
                      <Icon size={24} style={{ color: preset.color }} />
                      <span className="text-xs text-center mt-1 text-gray-600">{preset.name}</span>
                    </button>
                  )
                })}
              </div>
              <button
                onClick={() => setShowPresets(false)}
                className="text-sm text-emerald-600 font-medium"
              >
                {t('skip_presets')}
              </button>
            </div>
          )}

          {/* Manual Entry Form */}
          {!showPresets && (
            <form onSubmit={addExpense} className="space-y-3">
              <div className="flex items-center gap-2">
                {selectedPreset && (
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: getBillColor(selectedPreset) + '20' }}
                  >
                    {(() => {
                      const Icon = getBillIcon(selectedPreset)
                      return <Icon size={20} style={{ color: getBillColor(selectedPreset) }} />
                    })()}
                  </div>
                )}
                <input
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2"
                  placeholder="Bill name"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  required
                />
              </div>

              {/* Fixed vs Variable Amount */}
              <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => setFormData({...formData, is_variable_amount: false})}
                  className={`flex-1 py-2 text-sm rounded-md transition-colors ${
                    !formData.is_variable_amount ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
                  }`}
                >
                  {t('fixed_amount')}
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({...formData, is_variable_amount: true, amount: ''})}
                  className={`flex-1 py-2 text-sm rounded-md transition-colors ${
                    formData.is_variable_amount ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
                  }`}
                >
                  {t('varies_each_month')}
                </button>
              </div>

              {/* Amount */}
              <input
                type="number"
                step="0.01"
                className="w-full border border-gray-200 rounded-lg px-3 py-2"
                placeholder={formData.is_variable_amount ? t('estimated_amount_optional') : t('form_amount')}
                value={formData.amount}
                onChange={e => setFormData({...formData, amount: e.target.value})}
                required={!formData.is_variable_amount}
              />

              <div className="grid grid-cols-2 gap-3">
                <select
                  className="border border-gray-200 rounded-lg px-3 py-2"
                  value={formData.frequency}
                  onChange={e => setFormData({...formData, frequency: e.target.value as any})}
                >
                  {Object.entries(frequencies).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <select
                  className="border border-gray-200 rounded-lg px-3 py-2"
                  value={formData.category_id}
                  onChange={e => setFormData({...formData, category_id: e.target.value})}
                >
                  <option value="">{t('form_category')}</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              {/* Due Date Settings */}
              <div className="border-t border-gray-100 pt-3 space-y-3">
                <p className="text-sm font-medium text-gray-700">{t('due_date_settings')}</p>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500">{t('due_day_of_month')}</label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-1"
                      placeholder="e.g., 5"
                      value={formData.due_day_of_month}
                      onChange={e => setFormData({...formData, due_day_of_month: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">{t('first_due_date')}</label>
                    <input
                      type="date"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-1"
                      value={formData.start_date}
                      onChange={e => setFormData({...formData, start_date: e.target.value})}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500">{t('remind_me_days')}</label>
                    <input
                      type="number"
                      min="0"
                      max="30"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-1"
                      value={formData.reminder_days}
                      onChange={e => setFormData({...formData, reminder_days: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">{t('grace_period_days')}</label>
                    <input
                      type="number"
                      min="0"
                      max="30"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-1"
                      value={formData.grace_period_days}
                      onChange={e => setFormData({...formData, grace_period_days: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              {/* Provider Info */}
              <div className="border-t border-gray-100 pt-3 space-y-3">
                <p className="text-sm font-medium text-gray-700">{t('provider_details_optional')}</p>
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2"
                  placeholder={t('provider_name_placeholder')}
                  value={formData.provider}
                  onChange={e => setFormData({...formData, provider: e.target.value})}
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    className="border border-gray-200 rounded-lg px-3 py-2"
                    placeholder={t('account_number')}
                    value={formData.account_number}
                    onChange={e => setFormData({...formData, account_number: e.target.value})}
                  />
                  <input
                    className="border border-gray-200 rounded-lg px-3 py-2"
                    placeholder={t('meter_number')}
                    value={formData.meter_number}
                    onChange={e => setFormData({...formData, meter_number: e.target.value})}
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => {setShowAdd(false); setShowPresets(true); setSelectedPreset(null)}} 
                  className="flex-1 py-2 rounded-lg border border-gray-200"
                >
                  {t('cancel')}
                </button>
                <button type="submit" className="flex-1 py-2 rounded-lg bg-emerald-600 text-white">
                  {t('add_bill')}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {loading ? (
        <div className="animate-pulse space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-20 bg-gray-200 rounded-xl" />)}
        </div>
      ) : expenses.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <RefreshCw size={48} className="mx-auto mb-3 opacity-50" />
          <p>{t('no_recurring_expenses')}</p>
          <p className="text-sm">{t('add_bills_repeat')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {expenses.map(exp => {
            const Icon = getBillIcon(exp.bill_type || '')
            const color = getBillColor(exp.bill_type || '')
            const status = getDaysStatus(exp)
            const overdue = isOverdue(exp.next_due_date, exp.grace_period_days || 0)
            const inGrace = isInGracePeriod(exp.next_due_date, exp.grace_period_days || 0)
            const todayDue = isToday(exp.next_due_date)
            const isPaid = paidStatus[`${exp.id}|${exp.next_due_date}`] === true
            
            return (
              <div key={exp.id} className={`bg-white rounded-xl p-4 border-2 ${
                overdue ? 'border-red-200 bg-red-50/50' : 
                todayDue ? 'border-yellow-200 bg-yellow-50/50' : 
                inGrace ? 'border-orange-200 bg-orange-50/50' :
                'border-gray-200'
              }`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: color + '20' }}
                    >
                      <Icon size={20} style={{ color }} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">{exp.name}</h3>
                      <p className="text-sm text-gray-500">
                        {exp.category?.name} • {frequencies[exp.frequency as keyof typeof frequencies]}
                        {exp.is_variable_amount && ` • ${t('variable')}`}
                      </p>
                      
                      {/* Due Date & Status */}
                      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs mt-2 ${status.bg} ${status.color}`}>
                        <Calendar size={12} />
                        {status.text}
                        {(exp.grace_period_days || 0) > 0 && !overdue && (
                          <span className="text-gray-400">({t('grace_short')}: {exp.grace_period_days}d)</span>
                        )}
                      </div>
                      
                      {exp.account_number && (
                        <p className="text-xs text-gray-400 mt-1">{t('account_short')}: {exp.account_number}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-right flex-shrink-0">
                    <p className="font-semibold text-gray-900">
                      {exp.is_variable_amount ? t('variable') : formatMVR(exp.amount)}
                    </p>
                    
                    {(exp.reminder_days || 0) > 0 && (
                      <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                        <Bell size={12} />
                        <span>{t('remind_before').replace('{days}', String(exp.reminder_days))}</span>
                      </div>
                    )}
                    
                    <div className="flex gap-1 mt-2">
                      {!isPaid && (
                        <button
                          onClick={() => markAsPaid(exp as any)}
                          className="px-2 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                          disabled={markingPaidId === exp.id}
                          title="Create expense transaction and mark paid"
                        >
                          {markingPaidId === exp.id ? t('form_saving') : t('mark_paid')}
                        </button>
                      )}
                      {isPaid && (
                        <span className="px-2 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-semibold">
                          {t('paid')}
                        </span>
                      )}
                      <button 
                        onClick={() => toggleActive(exp.id, exp.is_active)} 
                        className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200"
                        title={exp.is_active ? 'Active' : 'Paused'}
                      >
                        <CheckCircle2 size={16} className={exp.is_active ? 'text-emerald-600' : 'text-gray-400'} />
                      </button>
                      <button 
                        onClick={() => deleteExpense(exp.id)} 
                        className="p-1.5 rounded-lg bg-gray-100 hover:bg-red-100 text-gray-600 hover:text-red-600"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Action buttons for variable bills */}
                {exp.is_variable_amount && (
                  <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2">
                    <button className="flex-1 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
                      {t('enter_this_month_amount')}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
