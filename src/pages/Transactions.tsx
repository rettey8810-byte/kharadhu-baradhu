import { useEffect, useMemo, useState } from 'react'
import { useProfile } from '../hooks/useProfile'
import { useLanguage } from '../hooks/useLanguage'
import type { Transaction, ExpenseCategory, IncomeSource } from '../types'
import { ArrowUpCircle, ArrowDownCircle, Search, Calendar } from 'lucide-react'
import { formatDateLocal } from '../utils/date'
import { useLocation } from 'react-router-dom'
import { collection, getDocs, limit, orderBy, query, where } from 'firebase/firestore'
import { firebaseAuth, firebaseDb } from '../lib/firebase'

function formatMVR(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'MVR' }).format(value)
}

export default function Transactions() {
  const { profiles } = useProfile()
  const { t } = useLanguage()
  const location = useLocation()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'expense' | 'income'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  // Date range filter
  const [dateFilterType, setDateFilterType] = useState<'all' | 'month' | 'custom'>('month')
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [customStartDate, setCustomStartDate] = useState<string>('')
  const [customEndDate, setCustomEndDate] = useState<string>('')

  const isTaxiOnly = useMemo(() => {
    const params = new URLSearchParams(location.search)
    return params.get('taxi') === '1'
  }, [location.search])

  const isMt5Only = useMemo(() => {
    const params = new URLSearchParams(location.search)
    return params.get('mt5') === '1'
  }, [location.search])

  useEffect(() => {
    loadData()
  }, [profiles, selectedMonth, dateFilterType, customStartDate, customEndDate])

  const loadData = async () => {
    if (profiles.length === 0) return
    const user = firebaseAuth.currentUser
    if (!user) return
    setLoading(true)

    const profileIds = profiles.map(p => p.id)
    
    // Calculate date range based on filter type
    let startDate: string
    let endDate: string
    
    if (dateFilterType === 'all') {
      startDate = '1970-01-01'
      endDate = '2099-12-31'
    } else if (dateFilterType === 'custom' && (customStartDate || customEndDate)) {
      startDate = customStartDate || '1970-01-01'
      endDate = customEndDate || '2099-12-31'
    } else {
      const [year, month] = selectedMonth.split('-').map(Number)
      const start = new Date(year, month - 1, 1)
      const end = new Date(year, month, 0)
      startDate = formatDateLocal(start)
      endDate = formatDateLocal(end)
    }

    const txCol = collection(firebaseDb, 'users', user.uid, 'transactions')
    const catCol = collection(firebaseDb, 'users', user.uid, 'categories')
    const srcCol = collection(firebaseDb, 'users', user.uid, 'incomeSources')

    const chunk = <T,>(items: T[], size: number) => {
      const out: T[][] = []
      for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
      return out
    }

    const profileIdChunks = chunk(profileIds, 10)

    // Fetch all transactions and filter client-side (handles mixed Timestamp/string formats)
    const [txDocs, catDocs, srcDocs] = await Promise.all([
      Promise.all(
        profileIdChunks.map(async (ids) =>
          getDocs(
            query(
              txCol,
              where('profile_id', 'in', ids),
              orderBy('transaction_date', 'desc'),
              limit(5000)
            )
          )
        )
      ).then((snaps) => snaps.flatMap((s) => s.docs).filter(d => {
        const raw = d.data() as any
        const txDate: string = raw.transaction_date?.toDate ? formatDateLocal(raw.transaction_date.toDate()) : String(raw.transaction_date)
        return txDate >= startDate && txDate <= endDate
      })),
      Promise.all(profileIdChunks.map(async (ids) => getDocs(query(catCol, where('profile_id', 'in', ids)))))
        .then((snaps) => snaps.flatMap((s) => s.docs)),
      Promise.all(profileIdChunks.map(async (ids) => getDocs(query(srcCol, where('profile_id', 'in', ids)))))
        .then((snaps) => snaps.flatMap((s) => s.docs))
    ])

    const cats = catDocs.map((d) => d.data() as ExpenseCategory).filter((c) => !c.is_archived)
    const sources = srcDocs.map((d) => d.data() as IncomeSource)

    const categoryById = new Map(cats.map((c) => [c.id, c]))
    const sourceById = new Map(sources.map((s) => [s.id, s]))
    const profileById = new Map(profiles.map((p) => [p.id, p]))

    const txData = txDocs.map((d) => {
      const raw = d.data() as any
      const txDate: string = raw.transaction_date?.toDate ? formatDateLocal(raw.transaction_date.toDate()) : String(raw.transaction_date)

      const tx: Transaction = {
        id: raw.id ?? d.id,
        profile_id: raw.profile_id,
        type: raw.type,
        amount: raw.amount,
        category_id: raw.category_id ?? null,
        income_source_id: raw.income_source_id ?? null,
        description: raw.description ?? null,
        notes: raw.notes ?? null,
        tags: raw.tags ?? null,
        transaction_date: txDate,
        created_at: raw.created_at?.toDate ? raw.created_at.toDate().toISOString() : (raw.created_at ?? ''),
        updated_at: raw.updated_at?.toDate ? raw.updated_at.toDate().toISOString() : (raw.updated_at ?? ''),
        category: raw.category_id ? categoryById.get(raw.category_id) : undefined,
        income_source: raw.income_source_id ? sourceById.get(raw.income_source_id) : undefined,
        profile: { name: profileById.get(raw.profile_id)?.name ?? 'Profile' }
      }

      return tx
    })

    txData.sort((a, b) => b.transaction_date.localeCompare(a.transaction_date))

    setTransactions(txData)
    setLoading(false)
  }

  const filteredTransactions = transactions.filter(tx => {
    const matchesFilter = filter === 'all' || tx.type === filter
    const matchesSearch =
      tx.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tx.category?.name?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (tx.income_source?.name?.toLowerCase().includes(searchQuery.toLowerCase()))

    const taxiByCategory = (tx.category?.name ?? '').trim().toLowerCase() === 'taxi'
    const taxiBySource = (tx.income_source?.name ?? '').trim().toLowerCase() === 'taxi'
    const taxiByDesc = (tx.description ?? '').trim().toLowerCase().startsWith('taxi ')
    const matchesTaxi = !isTaxiOnly || taxiByCategory || taxiBySource || taxiByDesc

    const mt5ByCategory = (tx.category?.name ?? '').trim().toLowerCase() === 'mt5'
    const mt5BySource = (tx.income_source?.name ?? '').trim().toLowerCase() === 'mt5'
    const mt5ByDesc = (tx.description ?? '').trim().toLowerCase().startsWith('mt5 ')
    const matchesMt5 = !isMt5Only || mt5ByCategory || mt5BySource || mt5ByDesc

    return matchesFilter && matchesSearch && matchesTaxi && matchesMt5
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
        {/* Date Filter Type Toggle */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setDateFilterType('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              dateFilterType === 'all'
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setDateFilterType('month')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              dateFilterType === 'month'
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            By Month
          </button>
          <button
            type="button"
            onClick={() => setDateFilterType('custom')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              dateFilterType === 'custom'
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Custom Date
          </button>
        </div>

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
            {dateFilterType === 'month' ? (
              <input
                type="month"
                className="pl-10 pr-3 py-2 border border-gray-200 rounded-lg text-sm"
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
              />
            ) : dateFilterType === 'custom' ? (
              <div className="flex gap-1">
                <input
                  type="date"
                  className="pl-10 pr-2 py-2 border border-gray-200 rounded-lg text-sm w-32"
                  value={customStartDate}
                  onChange={e => setCustomStartDate(e.target.value)}
                  placeholder="Start"
                />
                <input
                  type="date"
                  className="px-2 py-2 border border-gray-200 rounded-lg text-sm w-32"
                  value={customEndDate}
                  onChange={e => setCustomEndDate(e.target.value)}
                  placeholder="End"
                />
              </div>
            ) : (
              <span className="pl-10 pr-3 py-2 text-sm text-gray-500">Showing all transactions</span>
            )}
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
            const isExpense = tx.type === 'expense'

            return (
              <div key={tx.id} className="bg-white rounded-xl p-3">
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
                      <p className="font-medium text-gray-900">{(tx.profile as any)?.name || 'Profile'} • {getTransactionName(tx)}</p>
                      <p className="text-xs text-gray-500">
                        {tx.transaction_date} {tx.description && `• ${tx.description}`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${isExpense ? 'text-red-600' : 'text-emerald-600'}`}>
                      {isExpense ? '-' : '+'}{formatMVR(tx.amount)}
                    </p>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
