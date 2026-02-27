import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useProfile } from '../hooks/useProfile'
import type { Transaction } from '../types'
import { Search, X, Filter, TrendingDown, TrendingUp } from 'lucide-react'

function formatMVR(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'MVR' }).format(value)
}

export default function SearchTransactions() {
  const { profiles } = useProfile()
  const [query, setQuery] = useState('')
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [filtered, setFiltered] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState({
    type: 'all' as 'all' | 'expense' | 'income',
    minAmount: '',
    maxAmount: '',
    dateFrom: '',
    dateTo: ''
  })
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    loadTransactions()
  }, [profiles])

  const loadTransactions = async () => {
    if (profiles.length === 0) return
    setLoading(true)
    
    const profileIds = profiles.map(p => p.id)
    const { data } = await supabase
      .from('transactions')
      .select('*, profile:profile_id(name), category:category_id(name, color)')
      .in('profile_id', profileIds)
      .order('transaction_date', { ascending: false })
      .limit(100)
    
    setTransactions(data || [])
    setFiltered(data || [])
    setLoading(false)
  }

  useEffect(() => {
    let result = transactions

    // Search query
    if (query.trim()) {
      const q = query.toLowerCase()
      result = result.filter(t => 
        (t.description && t.description.toLowerCase().includes(q)) ||
        (t.notes && t.notes.toLowerCase().includes(q)) ||
        (t.tags && t.tags.some(tag => tag.toLowerCase().includes(q))) ||
        t.amount.toString().includes(q) ||
        ((t.category as any)?.name && (t.category as any).name.toLowerCase().includes(q))
      )
    }

    // Type filter
    if (filters.type !== 'all') {
      result = result.filter(t => t.type === filters.type)
    }

    // Amount filters
    if (filters.minAmount) {
      result = result.filter(t => t.amount >= parseFloat(filters.minAmount))
    }
    if (filters.maxAmount) {
      result = result.filter(t => t.amount <= parseFloat(filters.maxAmount))
    }

    // Date filters
    if (filters.dateFrom) {
      result = result.filter(t => t.transaction_date >= filters.dateFrom)
    }
    if (filters.dateTo) {
      result = result.filter(t => t.transaction_date <= filters.dateTo)
    }

    setFiltered(result)
  }, [query, transactions, filters])

  const clearFilters = () => {
    setFilters({
      type: 'all',
      minAmount: '',
      maxAmount: '',
      dateFrom: '',
      dateTo: ''
    })
    setQuery('')
  }

  const hasActiveFilters = query || filters.type !== 'all' || filters.minAmount || filters.maxAmount || filters.dateFrom || filters.dateTo

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Search Transactions</h2>
        <p className="text-sm text-gray-500">Find by description, amount, or tags</p>
      </div>

      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            className="w-full pl-10 pr-10 py-2 border border-gray-200 rounded-lg"
            placeholder="Search transactions..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={16} />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`px-3 py-2 rounded-lg border ${showFilters ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'border-gray-200'}`}
        >
          <Filter size={18} />
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white rounded-xl p-4 border border-gray-200 space-y-3">
          <div>
            <label className="text-sm text-gray-600">Type</label>
            <select
              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2"
              value={filters.type}
              onChange={e => setFilters({...filters, type: e.target.value as any})}
            >
              <option value="all">All</option>
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-gray-600">Min Amount</label>
              <input
                type="number"
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2"
                placeholder="0"
                value={filters.minAmount}
                onChange={e => setFilters({...filters, minAmount: e.target.value})}
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">Max Amount</label>
              <input
                type="number"
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2"
                placeholder="∞"
                value={filters.maxAmount}
                onChange={e => setFilters({...filters, maxAmount: e.target.value})}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-gray-600">From Date</label>
              <input
                type="date"
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2"
                value={filters.dateFrom}
                onChange={e => setFilters({...filters, dateFrom: e.target.value})}
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">To Date</label>
              <input
                type="date"
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2"
                value={filters.dateTo}
                onChange={e => setFilters({...filters, dateTo: e.target.value})}
              />
            </div>
          </div>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="w-full py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}

      {/* Results */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center">
          <h3 className="font-semibold text-gray-900">
            {filtered.length} result{filtered.length !== 1 ? 's' : ''}
          </h3>
        </div>
        
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-pulse flex justify-center">
              <div className="h-4 w-32 bg-gray-200 rounded"></div>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <Search size={40} className="mx-auto mb-3 opacity-50" />
            <p className="text-sm">No transactions found</p>
            {hasActiveFilters && <p className="text-xs mt-1">Try adjusting your filters</p>}
          </div>
        ) : (
          <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
            {filtered.map(t => (
              <div key={t.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    t.type === 'income' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {t.type === 'income' ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {t.description || (t.type === 'income' ? 'Income' : 'Expense')}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>{t.transaction_date}</span>
                      <span>•</span>
                      <span>{(t.profile as any)?.name}</span>
                      {(t.category as any)?.name && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <span 
                              className="w-2 h-2 rounded-full" 
                              style={{ backgroundColor: (t.category as any).color }}
                            />
                            {(t.category as any).name}
                          </span>
                        </>
                      )}
                    </div>
                    {t.tags && t.tags.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {t.tags.map(tag => (
                          <span key={tag} className="text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <span className={`text-sm font-semibold ${t.type === 'income' ? 'text-blue-600' : 'text-gray-900'}`}>
                  {t.type === 'income' ? '+' : '-'}{formatMVR(Number(t.amount))}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
