import { useEffect, useMemo, useState } from 'react'
import { useProfile } from '../hooks/useProfile'
import { useLanguage } from '../hooks/useLanguage'
import { supabase } from '../lib/supabase'
import { BarChart3, Plus, X, Pencil, TrendingUp, TrendingDown } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

function formatMVR(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'MVR' }).format(value)
}

type MT5Trade = {
  id: string
  user_id: string
  trade_date: string
  symbol: string
  trade_type: 'buy' | 'sell'
  lot_size: number
  entry_price: number
  exit_price: number
  profit_loss: number
  transaction_id: string | null
  notes: string | null
  created_at: string
}

type MT5Expense = {
  id: string
  user_id: string
  expense_date: string
  expense_type: string
  amount: number
  transaction_id: string | null
  notes: string | null
  created_at: string
}

const EXPENSE_TYPES = [
  { value: 'account_fees', label: 'Account Fees' },
  { value: 'commission', label: 'Commission' },
  { value: 'spread_costs', label: 'Spread Costs' },
  { value: 'vps', label: 'VPS/Hosting' },
  { value: 'signals', label: 'Trading Signals' },
  { value: 'education', label: 'Education/Courses' },
  { value: 'tools', label: 'Trading Tools' },
  { value: 'other', label: 'Other' },
]

export default function MT5() {
  const { currentProfile } = useProfile()
  const { t } = useLanguage()
  const navigate = useNavigate()

  const [trades, setTrades] = useState<MT5Trade[]>([])
  const [expenses, setExpenses] = useState<MT5Expense[]>([])
  const [mt5IncomeSourceId, setMt5IncomeSourceId] = useState<string | null>(null)
  const [mt5ExpenseCategoryId, setMt5ExpenseCategoryId] = useState<string | null>(null)

  const [showAddTrade, setShowAddTrade] = useState(false)
  const [tradeForm, setTradeForm] = useState({
    trade_date: new Date().toISOString().slice(0, 10),
    symbol: '',
    trade_type: 'buy' as 'buy' | 'sell',
    lot_size: '',
    entry_price: '',
    exit_price: '',
    notes: '',
  })

  const [showAddExpense, setShowAddExpense] = useState(false)
  const [expenseForm, setExpenseForm] = useState({
    expense_date: new Date().toISOString().slice(0, 10),
    expense_type: 'commission',
    amount: '',
    notes: '',
  })

  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!currentProfile) return
    load()
    ensureMt5Category()
    ensureMt5IncomeSource()
  }, [currentProfile])

  const ensureMt5Category = async () => {
    if (!currentProfile) return
    try {
      const { data: cats } = await supabase
        .from('expense_categories')
        .select('id, name')
        .eq('profile_id', currentProfile.id)
        .eq('is_archived', false)

      const existing = (cats ?? []).find((c: any) => (c.name ?? '').trim().toLowerCase() === 'mt5')
      if (existing?.id) {
        setMt5ExpenseCategoryId(existing.id)
        return
      }

      const { data: created } = await supabase
        .from('expense_categories')
        .insert({
          profile_id: currentProfile.id,
          name: 'MT5',
          color: '#8b5cf6',
          icon: 'BarChart3',
          is_default: false,
          sort_order: 0,
        })
        .select('id')
        .single()

      setMt5ExpenseCategoryId(created?.id ?? null)
    } catch {
      setMt5ExpenseCategoryId(null)
    }
  }

  const ensureMt5IncomeSource = async () => {
    if (!currentProfile) return
    try {
      const { data: sources } = await supabase
        .from('income_sources')
        .select('id, name')
        .eq('profile_id', currentProfile.id)
        .eq('is_archived', false)

      const existing = (sources ?? []).find((s: any) => (s.name ?? '').trim().toLowerCase() === 'mt5')
      if (existing?.id) {
        setMt5IncomeSourceId(existing.id)
        return
      }

      const { data: created } = await supabase
        .from('income_sources')
        .insert({
          profile_id: currentProfile.id,
          name: 'MT5',
          color: '#10b981',
          icon: 'BarChart3',
          is_archived: false,
        })
        .select('id')
        .single()

      setMt5IncomeSourceId(created?.id ?? null)
    } catch {
      setMt5IncomeSourceId(null)
    }
  }

  const load = async () => {
    setError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setTrades([])
        setExpenses([])
        return
      }

      const [{ data: tData }, { data: eData }] = await Promise.all([
        supabase
          .from('mt5_trades')
          .select('*')
          .eq('user_id', user.id)
          .order('trade_date', { ascending: false })
          .limit(30),
        supabase
          .from('mt5_expenses')
          .select('*')
          .eq('user_id', user.id)
          .order('expense_date', { ascending: false })
          .limit(30)
      ])

      setTrades((tData ?? []) as any)
      setExpenses((eData ?? []) as any)
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load MT5 data')
    }
  }

  const summary = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    const monthKey = new Date().toISOString().slice(0, 7)
    const yearKey = new Date().toISOString().slice(0, 4)

    // Day to Date
    const dayProfit = trades
      .filter(t => t.trade_date === today)
      .reduce((sum, it) => sum + Number(it.profit_loss), 0)
    const dayExpense = expenses
      .filter(e => e.expense_date === today)
      .reduce((sum, it) => sum + Number(it.amount), 0)

    // Month to Date
    const monthlyProfit = trades
      .filter(t => t.trade_date.startsWith(monthKey))
      .reduce((sum, it) => sum + Number(it.profit_loss), 0)
    const monthlyExpense = expenses
      .filter(e => e.expense_date.startsWith(monthKey))
      .reduce((sum, it) => sum + Number(it.amount), 0)

    // Year to Date
    const yearlyProfit = trades
      .filter(t => t.trade_date.startsWith(yearKey))
      .reduce((sum, it) => sum + Number(it.profit_loss), 0)
    const yearlyExpense = expenses
      .filter(e => e.expense_date.startsWith(yearKey))
      .reduce((sum, it) => sum + Number(it.amount), 0)

    // Overall (all time)
    const overallProfit = trades.reduce((sum, it) => sum + Number(it.profit_loss), 0)
    const overallExpense = expenses.reduce((sum, it) => sum + Number(it.amount), 0)

    return {
      dayProfit,
      dayExpense,
      dayNet: dayProfit - dayExpense,
      monthlyProfit,
      monthlyExpense,
      monthlyNet: monthlyProfit - monthlyExpense,
      yearlyProfit,
      yearlyExpense,
      yearlyNet: yearlyProfit - yearlyExpense,
      overallProfit,
      overallExpense,
      overallNet: overallProfit - overallExpense,
    }
  }, [trades, expenses])

  const addTrade = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!currentProfile) return

    const lotSize = Number(tradeForm.lot_size)
    const entryPrice = Number(tradeForm.entry_price)
    const exitPrice = Number(tradeForm.exit_price)
    if (!Number.isFinite(lotSize) || lotSize <= 0) return
    if (!Number.isFinite(entryPrice) || entryPrice <= 0) return
    if (!Number.isFinite(exitPrice) || exitPrice <= 0) return

    const profitLoss = (exitPrice - entryPrice) * lotSize * 100000 // Standard lot = 100,000 units

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: txData, error: txErr } = await supabase
        .from('transactions')
        .insert({
          profile_id: currentProfile.id,
          type: profitLoss >= 0 ? 'income' : 'expense',
          amount: Math.abs(profitLoss),
          description: `MT5 ${tradeForm.trade_type.toUpperCase()} ${tradeForm.symbol}`,
          notes: `Symbol: ${tradeForm.symbol}\nType: ${tradeForm.trade_type}\nLot: ${lotSize}\nEntry: ${entryPrice}\nExit: ${exitPrice}\n${tradeForm.notes.trim()}`,
          transaction_date: tradeForm.trade_date,
          category_id: profitLoss < 0 ? mt5ExpenseCategoryId : null,
          income_source_id: profitLoss >= 0 ? mt5IncomeSourceId : null,
        })
        .select()
        .single()
      if (txErr) throw txErr

      const { error: tradeErr } = await supabase
        .from('mt5_trades')
        .insert({
          user_id: user.id,
          trade_date: tradeForm.trade_date,
          symbol: tradeForm.symbol.toUpperCase(),
          trade_type: tradeForm.trade_type,
          lot_size: lotSize,
          entry_price: entryPrice,
          exit_price: exitPrice,
          profit_loss: profitLoss,
          transaction_id: txData?.id ?? null,
          notes: tradeForm.notes.trim() ? tradeForm.notes.trim() : null,
        })
      if (tradeErr) throw tradeErr

      setTradeForm({
        trade_date: new Date().toISOString().slice(0, 10),
        symbol: '',
        trade_type: 'buy',
        lot_size: '',
        entry_price: '',
        exit_price: '',
        notes: '',
      })
      setShowAddTrade(false)
      await load()
    } catch (e: any) {
      setError(e?.message ?? 'Failed to add trade')
    }
  }

  const addExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!currentProfile) return

    const amt = Number(expenseForm.amount)
    if (!Number.isFinite(amt) || amt <= 0) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: txData, error: txErr } = await supabase
        .from('transactions')
        .insert({
          profile_id: currentProfile.id,
          type: 'expense',
          amount: amt,
          description: `MT5 expense - ${EXPENSE_TYPES.find(t => t.value === expenseForm.expense_type)?.label || expenseForm.expense_type}`,
          notes: expenseForm.notes.trim() ? expenseForm.notes.trim() : null,
          transaction_date: expenseForm.expense_date,
          category_id: mt5ExpenseCategoryId,
          income_source_id: null,
        })
        .select()
        .single()
      if (txErr) throw txErr

      const { error: expErr } = await supabase
        .from('mt5_expenses')
        .insert({
          user_id: user.id,
          expense_date: expenseForm.expense_date,
          expense_type: expenseForm.expense_type,
          amount: amt,
          transaction_id: txData?.id ?? null,
          notes: expenseForm.notes.trim() ? expenseForm.notes.trim() : null,
        })
      if (expErr) throw expErr

      setExpenseForm({
        expense_date: new Date().toISOString().slice(0, 10),
        expense_type: 'commission',
        amount: '',
        notes: '',
      })
      setShowAddExpense(false)
      await load()
    } catch (e: any) {
      setError(e?.message ?? 'Failed to add expense')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="text-violet-600" />
            MetaTrader 5
          </h1>
          <p className="text-sm text-gray-500">Track trading profits, losses, and expenses</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setShowAddTrade(true)}
          className="bg-emerald-600 text-white py-2 rounded-lg hover:bg-emerald-700 flex items-center justify-center gap-1"
        >
          <Plus size={18} /> Add Trade
        </button>
        <button
          type="button"
          onClick={() => setShowAddExpense(true)}
          className="bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 flex items-center justify-center gap-1"
        >
          <Plus size={18} /> Add Expense
        </button>
      </div>

      <button
        type="button"
        onClick={() => navigate('/transactions?mt5=1')}
        className="w-full border border-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-50"
      >
        View in All Transactions
      </button>

      {/* Profit summary */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        {/* Day to Date */}
        <div className="mb-4 pb-4 border-b border-gray-100">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Day to Date</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
              <p className="text-xs text-emerald-700 flex items-center gap-1">
                <TrendingUp size={12} /> Profit
              </p>
              <p className="text-sm font-semibold text-emerald-900">{formatMVR(summary.dayProfit > 0 ? summary.dayProfit : 0)}</p>
            </div>
            <div className="bg-red-50 border border-red-100 rounded-xl p-3">
              <p className="text-xs text-red-700 flex items-center gap-1">
                <TrendingDown size={12} /> Loss
              </p>
              <p className="text-sm font-semibold text-red-900">{formatMVR(summary.dayProfit < 0 ? Math.abs(summary.dayProfit) : 0)}</p>
            </div>
          </div>
          <div className="mt-2 bg-gray-50 rounded-xl p-2 text-center">
            <p className="text-xs text-gray-500">Net P/L</p>
            <p className={`text-sm font-semibold ${summary.dayNet >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {formatMVR(summary.dayNet)}
            </p>
          </div>
        </div>

        {/* Month to Date */}
        <div className="mb-4 pb-4 border-b border-gray-100">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Month to Date</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
              <p className="text-xs text-emerald-700 flex items-center gap-1">
                <TrendingUp size={12} /> Profit
              </p>
              <p className="text-sm font-semibold text-emerald-900">{formatMVR(summary.monthlyProfit > 0 ? summary.monthlyProfit : 0)}</p>
            </div>
            <div className="bg-red-50 border border-red-100 rounded-xl p-3">
              <p className="text-xs text-red-700 flex items-center gap-1">
                <TrendingDown size={12} /> Loss
              </p>
              <p className="text-sm font-semibold text-red-900">{formatMVR(summary.monthlyProfit < 0 ? Math.abs(summary.monthlyProfit) : 0)}</p>
            </div>
          </div>
          <div className="mt-2 bg-gray-50 rounded-xl p-2 text-center">
            <p className="text-xs text-gray-500">Net P/L</p>
            <p className={`text-sm font-semibold ${summary.monthlyNet >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {formatMVR(summary.monthlyNet)}
            </p>
          </div>
        </div>

        {/* Year to Date */}
        <div className="mb-4 pb-4 border-b border-gray-100">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Year to Date</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
              <p className="text-xs text-emerald-700 flex items-center gap-1">
                <TrendingUp size={12} /> Profit
              </p>
              <p className="text-sm font-semibold text-emerald-900">{formatMVR(summary.yearlyProfit > 0 ? summary.yearlyProfit : 0)}</p>
            </div>
            <div className="bg-red-50 border border-red-100 rounded-xl p-3">
              <p className="text-xs text-red-700 flex items-center gap-1">
                <TrendingDown size={12} /> Loss
              </p>
              <p className="text-sm font-semibold text-red-900">{formatMVR(summary.yearlyProfit < 0 ? Math.abs(summary.yearlyProfit) : 0)}</p>
            </div>
          </div>
          <div className="mt-2 bg-gray-50 rounded-xl p-2 text-center">
            <p className="text-xs text-gray-500">Net P/L</p>
            <p className={`text-sm font-semibold ${summary.yearlyNet >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {formatMVR(summary.yearlyNet)}
            </p>
          </div>
        </div>

        {/* Overall */}
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Overall (All Time)</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
              <p className="text-xs text-emerald-700 flex items-center gap-1">
                <TrendingUp size={12} /> Profit
              </p>
              <p className="text-sm font-semibold text-emerald-900">{formatMVR(summary.overallProfit > 0 ? summary.overallProfit : 0)}</p>
            </div>
            <div className="bg-red-50 border border-red-100 rounded-xl p-3">
              <p className="text-xs text-red-700 flex items-center gap-1">
                <TrendingDown size={12} /> Loss
              </p>
              <p className="text-sm font-semibold text-red-900">{formatMVR(summary.overallProfit < 0 ? Math.abs(summary.overallProfit) : 0)}</p>
            </div>
          </div>
          <div className="mt-2 bg-violet-50 rounded-xl p-2 text-center">
            <p className="text-xs text-gray-500">Total Net P/L</p>
            <p className={`text-sm font-semibold ${summary.overallNet >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {formatMVR(summary.overallNet)}
            </p>
          </div>
        </div>
      </div>

      {/* Recent Trades */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <h3 className="font-semibold text-gray-900">Recent Trades</h3>
        {trades.length === 0 ? (
          <p className="text-sm text-gray-500 mt-2">No trades yet</p>
        ) : (
          <div className="mt-3 space-y-2">
            {trades.slice(0, 8).map(tr => (
              <div key={tr.id} className="p-3 rounded-xl border border-gray-100 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{tr.trade_date} • {tr.symbol} {tr.trade_type.toUpperCase()}</p>
                  <p className="text-xs text-gray-500">{tr.lot_size} lots @ {tr.entry_price} → {tr.exit_price}</p>
                  <p className="text-xs text-gray-400">{tr.notes ?? ''}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-semibold ${tr.profit_loss >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                    {tr.profit_loss >= 0 ? '+' : ''}{formatMVR(Number(tr.profit_loss))}
                  </span>
                  <button
                    type="button"
                    onClick={() => navigate(`/transactions?mt5=1&month=${tr.trade_date.slice(0, 7)}&edit=${tr.transaction_id}`)}
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                    title="Edit transaction"
                  >
                    <Pencil size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Expenses */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <h3 className="font-semibold text-gray-900">Recent Expenses</h3>
        {expenses.length === 0 ? (
          <p className="text-sm text-gray-500 mt-2">No expenses yet</p>
        ) : (
          <div className="mt-3 space-y-2">
            {expenses.slice(0, 8).map(ex => (
              <div key={ex.id} className="p-3 rounded-xl border border-gray-100 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{ex.expense_date} • {EXPENSE_TYPES.find(t => t.value === ex.expense_type)?.label || ex.expense_type}</p>
                  <p className="text-xs text-gray-500">{ex.notes ?? ''}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-red-700">-{formatMVR(Number(ex.amount))}</span>
                  <button
                    type="button"
                    onClick={() => navigate(`/transactions?mt5=1&month=${ex.expense_date.slice(0, 7)}&edit=${ex.transaction_id}`)}
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                    title="Edit transaction"
                  >
                    <Pencil size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Trade Modal */}
      {showAddTrade && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-gray-900">Add Trade</h2>
              <button type="button" onClick={() => setShowAddTrade(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={addTrade} className="space-y-4">
              <div>
                <label className="text-sm text-gray-600">Date</label>
                <input
                  type="date"
                  value={tradeForm.trade_date}
                  onChange={(e) => setTradeForm({ ...tradeForm, trade_date: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-gray-600">Symbol</label>
                  <input
                    type="text"
                    value={tradeForm.symbol}
                    onChange={(e) => setTradeForm({ ...tradeForm, symbol: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-1"
                    placeholder="EURUSD"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600">Type</label>
                  <select
                    value={tradeForm.trade_type}
                    onChange={(e) => setTradeForm({ ...tradeForm, trade_type: e.target.value as 'buy' | 'sell' })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-1"
                  >
                    <option value="buy">Buy</option>
                    <option value="sell">Sell</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-sm text-gray-600">Lots</label>
                  <input
                    type="number"
                    step="0.01"
                    value={tradeForm.lot_size}
                    onChange={(e) => setTradeForm({ ...tradeForm, lot_size: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-1"
                    placeholder="0.10"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600">Entry</label>
                  <input
                    type="number"
                    step="0.00001"
                    value={tradeForm.entry_price}
                    onChange={(e) => setTradeForm({ ...tradeForm, entry_price: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-1"
                    placeholder="1.08500"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600">Exit</label>
                  <input
                    type="number"
                    step="0.00001"
                    value={tradeForm.exit_price}
                    onChange={(e) => setTradeForm({ ...tradeForm, exit_price: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-1"
                    placeholder="1.09000"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-600">Notes</label>
                <textarea
                  value={tradeForm.notes}
                  onChange={(e) => setTradeForm({ ...tradeForm, notes: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-1"
                  rows={2}
                  placeholder="Optional"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddTrade(false)}
                  className="flex-1 border border-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-50"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-emerald-600 text-white py-2 rounded-lg hover:bg-emerald-700"
                >
                  Add Trade
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Expense Modal */}
      {showAddExpense && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-gray-900">Add Expense</h2>
              <button type="button" onClick={() => setShowAddExpense(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={addExpense} className="space-y-4">
              <div>
                <label className="text-sm text-gray-600">Date</label>
                <input
                  type="date"
                  value={expenseForm.expense_date}
                  onChange={(e) => setExpenseForm({ ...expenseForm, expense_date: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-1"
                />
              </div>

              <div>
                <label className="text-sm text-gray-600">Expense Type</label>
                <select
                  value={expenseForm.expense_type}
                  onChange={(e) => setExpenseForm({ ...expenseForm, expense_type: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-1"
                >
                  {EXPENSE_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm text-gray-600">Amount (MVR)</label>
                <input
                  type="number"
                  step="0.01"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-1"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="text-sm text-gray-600">Notes</label>
                <textarea
                  value={expenseForm.notes}
                  onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-1"
                  rows={2}
                  placeholder="Optional"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddExpense(false)}
                  className="flex-1 border border-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-50"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700"
                >
                  Add Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
