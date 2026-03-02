import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useProfile } from '../hooks/useProfile'
import { useLanguage } from '../hooks/useLanguage'
import type { Transaction, ExpenseCategory, IncomeSource } from '../types'
import { Edit2, Trash2, X, Check, ArrowUpCircle, ArrowDownCircle, Search, Calendar } from 'lucide-react'
import { formatDateLocal } from '../utils/date'

function formatMVR(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'MVR' }).format(value)
}

export default function Transactions() {
  const { profiles, currentProfile } = useProfile()
  const { t } = useLanguage()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'expense' | 'income'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({
    amount: '',
    description: '',
    transaction_date: '',
    category_id: '',
    income_source_id: ''
  })

  useEffect(() => {
    loadData()
  }, [profiles, selectedMonth])

  const loadData = async () => {
    if (profiles.length === 0) return
    setLoading(true)

    const profileIds = profiles.map(p => p.id)
    const [year, month] = selectedMonth.split('-').map(Number)
    const start = new Date(year, month - 1, 1)
    const end = new Date(year, month, 0)

    // Load transactions for ALL profiles for current month only
    const { data: txData } = await supabase
      .from('transactions')
      .select('*, category:category_id(*), income_source:income_source_id(*), profile:profile_id(name)')
      .in('profile_id', profileIds)
      .gte('transaction_date', formatDateLocal(start))
      .lte('transaction_date', formatDateLocal(end))
      .order('transaction_date', { ascending: false })

    console.log('Transactions query:', {
      profileIds,
      monthStart: formatDateLocal(start),
      monthEnd: formatDateLocal(end),
      count: txData?.length ?? 0,
      transactions: txData?.map((t: any) => ({ id: t.id, profile_id: t.profile_id, profile_name: t.profile?.name, amount: t.amount, date: t.transaction_date }))
    })

    setTransactions(txData || [])

    // Load categories and income sources from all profiles for editing
    const [{ data: cats }, { data: sources }] = await Promise.all([
      supabase.from('expense_categories').select('*').in('profile_id', profileIds).eq('is_archived', false),
      supabase.from('income_sources').select('*').in('profile_id', profileIds)
    ])

    setCategories(cats || [])
    setIncomeSources(sources || [])
    setLoading(false)
  }

  const handleEdit = (tx: Transaction) => {
    setEditingId(tx.id)
    setEditForm({
      amount: String(tx.amount),
      description: tx.description || '',
      transaction_date: tx.transaction_date,
      category_id: tx.category_id || '',
      income_source_id: tx.income_source_id || ''
    })
  }

  const handleSave = async (id: string) => {
    const updateData: any = {
      amount: parseFloat(editForm.amount),
      description: editForm.description,
      transaction_date: editForm.transaction_date
    }

    if (editForm.category_id) {
      updateData.category_id = editForm.category_id
    }
    if (editForm.income_source_id) {
      updateData.income_source_id = editForm.income_source_id
    }

    const { error } = await supabase
      .from('transactions')
      .update(updateData)
      .eq('id', id)

    if (!error) {
      setEditingId(null)
      loadData()
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm(t('confirm_delete_tx'))) return

    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id)

    if (!error) {
      loadData()
    }
  }

  const filteredTransactions = transactions.filter(tx => {
    const matchesFilter = filter === 'all' || tx.type === filter
    const matchesSearch = 
      tx.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tx.category?.name?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (tx.income_source?.name?.toLowerCase().includes(searchQuery.toLowerCase()))
    return matchesFilter && matchesSearch
  })

  const getTransactionName = (tx: Transaction) => {
    if (tx.type === 'income') {
      return tx.income_source?.name || 'Income'
    }
    return tx.category?.name || 'Expense'
  }

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-3">
          {[1,2,3,4,5].map(i => <div key={i} className="h-16 bg-gray-200 rounded-xl" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 pb-24">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-gray-900">{t('page_all_transactions')}</h1>
        <p className="text-sm text-gray-500">{t('transactions_subtitle')}</p>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-xl p-3 mb-4 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder={t('placeholder_search_tx')}
              className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="month"
              className="pl-10 pr-3 py-2 border border-gray-200 rounded-lg text-sm"
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
            />
          </div>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`flex-1 py-2 text-sm rounded-lg ${filter === 'all' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700'}`}
          >
            {t('filter_all')}
          </button>
          <button
            onClick={() => setFilter('expense')}
            className={`flex-1 py-2 text-sm rounded-lg ${filter === 'expense' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700'}`}
          >
            {t('filter_expenses')}
          </button>
          <button
            onClick={() => setFilter('income')}
            className={`flex-1 py-2 text-sm rounded-lg ${filter === 'income' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700'}`}
          >
            {t('filter_income')}
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white rounded-xl p-3">
          <p className="text-xs text-gray-500">{t('total_expenses')}</p>
          <p className="text-lg font-bold text-red-600">
            {formatMVR(filteredTransactions.filter(tx => tx.type === 'expense').reduce((sum, tx) => sum + tx.amount, 0))}
          </p>
        </div>
        <div className="bg-white rounded-xl p-3">
          <p className="text-xs text-gray-500">{t('total_income')}</p>
          <p className="text-lg font-bold text-emerald-600">
            {formatMVR(filteredTransactions.filter(tx => tx.type === 'income').reduce((sum, tx) => sum + tx.amount, 0))}
          </p>
        </div>
      </div>

      {/* Transactions List */}
      <div className="space-y-2">
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <p>{t('no_transactions_found')}</p>
          </div>
        ) : (
          filteredTransactions.map(tx => {
            const isEditing = editingId === tx.id
            const isExpense = tx.type === 'expense'

            return (
              <div key={tx.id} className="bg-white rounded-xl p-3">
                {isEditing ? (
                  // Edit Mode
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="number"
                        step="0.01"
                        className="flex-1 border border-gray-200 rounded-lg px-2 py-1 text-sm"
                        placeholder={t('edit_amount_placeholder')}
                        value={editForm.amount}
                        onChange={e => setEditForm({...editForm, amount: e.target.value})}
                      />
                      <input
                        type="date"
                        className="flex-1 border border-gray-200 rounded-lg px-2 py-1 text-sm"
                        value={editForm.transaction_date}
                        onChange={e => setEditForm({...editForm, transaction_date: e.target.value})}
                      />
                    </div>
                    <input
                      type="text"
                      className="w-full border border-gray-200 rounded-lg px-2 py-1 text-sm"
                      placeholder={t('edit_description_placeholder')}
                      value={editForm.description}
                      onChange={e => setEditForm({...editForm, description: e.target.value})}
                    />
                    {isExpense && (
                      <select
                        className="w-full border border-gray-200 rounded-lg px-2 py-1 text-sm"
                        value={editForm.category_id}
                        onChange={e => setEditForm({...editForm, category_id: e.target.value})}
                      >
                        <option value="">{t('select_category')}</option>
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    )}
                    {!isExpense && (
                      <select
                        className="w-full border border-gray-200 rounded-lg px-2 py-1 text-sm"
                        value={editForm.income_source_id}
                        onChange={e => setEditForm({...editForm, income_source_id: e.target.value})}
                      >
                        <option value="">{t('select_income_source')}</option>
                        {incomeSources.map(src => (
                          <option key={src.id} value={src.id}>{src.name}</option>
                        ))}
                      </select>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSave(tx.id)}
                        className="flex-1 py-1.5 bg-emerald-600 text-white rounded-lg text-sm"
                      >
                        <Check size={16} className="mx-auto" />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="flex-1 py-1.5 bg-gray-200 text-gray-700 rounded-lg text-sm"
                      >
                        <X size={16} className="mx-auto" />
                      </button>
                    </div>
                  </div>
                ) : (
                  // View Mode
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isExpense ? 'bg-red-100' : 'bg-emerald-100'}`}>
                        {isExpense ? (
                          <ArrowDownCircle size={20} className="text-red-600" />
                        ) : (
                          <ArrowUpCircle size={20} className="text-emerald-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{getTransactionName(tx)}</p>
                        <p className="text-xs text-gray-500">
                          {(tx.profile as any)?.name || 'Profile'} • {tx.transaction_date} {tx.description && `• ${tx.description}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${isExpense ? 'text-red-600' : 'text-emerald-600'}`}>
                        {isExpense ? '-' : '+'}{formatMVR(tx.amount)}
                      </p>
                      <div className="flex gap-1 mt-1">
                        <button
                          onClick={() => handleEdit(tx)}
                          className="p-1.5 rounded bg-gray-100 hover:bg-gray-200"
                          title={t('edit_title')}
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(tx.id)}
                          className="p-1.5 rounded bg-gray-100 hover:bg-red-100 text-gray-600 hover:text-red-600"
                          title={t('delete_title')}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
