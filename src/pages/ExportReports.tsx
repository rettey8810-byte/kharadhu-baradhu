import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useProfile } from '../hooks/useProfile'
import { useLanguage } from '../hooks/useLanguage'
import type { Transaction, MonthlyBudget } from '../types'
import { Download, FileSpreadsheet, FileText, Calendar, TrendingDown, TrendingUp, Wallet, Filter } from 'lucide-react'

function formatMVR(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'MVR' }).format(value)
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function ExportReports() {
  const { profiles } = useProfile()
  const { t } = useLanguage()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [budgets, setBudgets] = useState<MonthlyBudget[]>([])
  const [year, setYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [reportType, setReportType] = useState<'monthly' | 'yearly'>('monthly')
  const [exportFormat, setExportFormat] = useState<'csv' | 'json'>('csv')

  const profileIds = useMemo(() => profiles.map(p => p.id), [profiles])

  useEffect(() => {
    if (profiles.length > 0) {
      loadData()
    }
  }, [profiles, year, month, reportType])

  const loadData = async () => {
    let startDate: Date
    let endDate: Date
    
    if (reportType === 'monthly') {
      startDate = new Date(year, month - 1, 1)
      endDate = new Date(year, month, 0)
    } else {
      startDate = new Date(year, 0, 1)
      endDate = new Date(year, 11, 31)
    }

    // Load transactions
    const { data: tx } = await supabase
      .from('transactions')
      .select('*, category:category_id(name), income_source:income_source_id(name)')
      .in('profile_id', profileIds)
      .gte('transaction_date', startDate.toISOString().slice(0, 10))
      .lte('transaction_date', endDate.toISOString().slice(0, 10))
      .order('transaction_date', { ascending: false })

    // Load budgets for monthly report
    if (reportType === 'monthly') {
      const { data: b } = await supabase
        .from('monthly_budgets')
        .select('*')
        .in('profile_id', profileIds)
        .eq('year', year)
        .eq('month', month)
      setBudgets(b || [])
    }

    setTransactions(tx || [])
  }

  const stats = useMemo(() => {
    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0)
    const totalExpense = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0)
    const totalBudget = budgets.reduce((sum, b) => sum + Number(b.total_budget), 0)
    
    return {
      totalIncome,
      totalExpense,
      totalBudget,
      netSavings: totalIncome - totalExpense,
      transactionCount: transactions.length
    }
  }, [transactions, budgets])

  const generateCSV = () => {
    const headers = ['Date', 'Type', 'Category/Source', 'Description', 'Amount (MVR)', 'Profile']
    const rows = transactions.map(t => [
      t.transaction_date,
      t.type,
      t.type === 'income' 
        ? ((t.income_source as any)?.name || 'Income')
        : ((t.category as any)?.name || 'Expense'),
      t.description || '',
      t.amount.toString(),
      profiles.find(p => p.id === t.profile_id)?.name || ''
    ])
    
    // Add summary section
    rows.push([])
    rows.push(['SUMMARY'])
    rows.push(['Total Income', formatMVR(stats.totalIncome)])
    rows.push(['Total Expenses', formatMVR(stats.totalExpense)])
    rows.push(['Net Savings', formatMVR(stats.netSavings)])
    if (reportType === 'monthly') {
      rows.push(['Budget', formatMVR(stats.totalBudget)])
      rows.push(['Budget Remaining', formatMVR(stats.totalBudget - stats.totalExpense)])
    }
    rows.push(['Transaction Count', stats.transactionCount.toString()])
    
    return [headers, ...rows].map(row => row.join(',')).join('\n')
  }

  const generateJSON = () => {
    return JSON.stringify({
      reportPeriod: reportType === 'monthly' 
        ? `${new Date(year, month - 1).toLocaleString('default', { month: 'long' })} ${year}`
        : `Year ${year}`,
      generatedAt: new Date().toISOString(),
      summary: {
        totalIncome: stats.totalIncome,
        totalExpense: stats.totalExpense,
        netSavings: stats.netSavings,
        totalBudget: stats.totalBudget,
        transactionCount: stats.transactionCount
      },
      transactions: transactions.map(t => ({
        id: t.id,
        date: t.transaction_date,
        type: t.type,
        amount: Number(t.amount),
        description: t.description,
        category: t.type === 'income' 
          ? ((t.income_source as any)?.name || 'Income')
          : ((t.category as any)?.name || 'Expense'),
        profile: profiles.find(p => p.id === t.profile_id)?.name
      }))
    }, null, 2)
  }

  const downloadReport = () => {
    const content = exportFormat === 'csv' ? generateCSV() : generateJSON()
    const blob = new Blob([content], { 
      type: exportFormat === 'csv' ? 'text/csv;charset=utf-8;' : 'application/json' 
    })
    const link = document.createElement('a')
    const period = reportType === 'monthly' 
      ? `${year}-${month.toString().padStart(2, '0')}` 
      : `${year}`
    link.download = `kharadhu-report-${period}.${exportFormat}`
    link.href = URL.createObjectURL(blob)
    link.click()
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">{t('page_export_reports')}</h2>
      </div>

      <p className="text-gray-600 text-sm">
        Download your financial reports as CSV (Excel compatible) or JSON format for record keeping, tax preparation, or analysis.
      </p>

      {/* Report Settings */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
        <h3 className="font-semibold text-gray-900">Report Settings</h3>
        
        {/* Report Type */}
        <div>
          <label className="text-sm font-medium text-gray-700">Report Type</label>
          <div className="flex gap-2 mt-1">
            <button
              onClick={() => setReportType('monthly')}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium ${
                reportType === 'monthly' 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              <Calendar size={16} className="inline mr-1" />
              Monthly
            </button>
            <button
              onClick={() => setReportType('yearly')}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium ${
                reportType === 'yearly' 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              <Calendar size={16} className="inline mr-1" />
              Yearly
            </button>
          </div>
        </div>

        {/* Period Selection */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-gray-700">Year</label>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg"
            >
              {[2024, 2025, 2026].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          {reportType === 'monthly' && (
            <div>
              <label className="text-sm font-medium text-gray-700">Month</label>
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg"
              >
                {monthNames.map((name, i) => (
                  <option key={i + 1} value={i + 1}>{name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Export Format */}
        <div>
          <label className="text-sm font-medium text-gray-700">Export Format</label>
          <div className="flex gap-2 mt-1">
            <button
              onClick={() => setExportFormat('csv')}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium ${
                exportFormat === 'csv' 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              <FileSpreadsheet size={16} className="inline mr-1" />
              CSV (Excel)
            </button>
            <button
              onClick={() => setExportFormat('json')}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium ${
                exportFormat === 'json' 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              <FileText size={16} className="inline mr-1" />
              JSON
            </button>
          </div>
        </div>
      </div>

      {/* Preview Summary */}
      <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-2xl p-5 text-white">
        <h3 className="font-semibold mb-4">
          {reportType === 'monthly' ? monthNames[month - 1] : year} Summary
        </h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/10 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={16} className="text-emerald-200" />
              <span className="text-emerald-100 text-sm">Income</span>
            </div>
            <p className="text-xl font-bold">{formatMVR(stats.totalIncome)}</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown size={16} className="text-emerald-200" />
              <span className="text-emerald-100 text-sm">Expenses</span>
            </div>
            <p className="text-xl font-bold">{formatMVR(stats.totalExpense)}</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <Wallet size={16} className="text-emerald-200" />
              <span className="text-emerald-100 text-sm">Net Savings</span>
            </div>
            <p className={`text-xl font-bold ${stats.netSavings >= 0 ? '' : 'text-red-200'}`}>
              {formatMVR(stats.netSavings)}
            </p>
          </div>
          <div className="bg-white/10 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <Filter size={16} className="text-emerald-200" />
              <span className="text-emerald-100 text-sm">Transactions</span>
            </div>
            <p className="text-xl font-bold">{stats.transactionCount}</p>
          </div>
        </div>

        {reportType === 'monthly' && stats.totalBudget > 0 && (
          <div className="mt-4 pt-4 border-t border-white/20">
            <div className="flex justify-between items-center">
              <span className="text-emerald-100">Budget: {formatMVR(stats.totalBudget)}</span>
              <span className="text-emerald-100">
                Remaining: {formatMVR(stats.totalBudget - stats.totalExpense)}
              </span>
            </div>
            <div className="mt-2 h-2 bg-white/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white rounded-full transition-all"
                style={{ 
                  width: `${Math.min(100, (stats.totalExpense / stats.totalBudget) * 100)}%` 
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Transaction Preview */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center">
          <h3 className="font-semibold text-gray-900">Transactions ({stats.transactionCount})</h3>
          <span className="text-sm text-gray-500">
            {reportType === 'monthly' 
              ? `${monthNames[month - 1]} ${year}` 
              : `Year ${year}`
            }
          </span>
        </div>
        
        <div className="max-h-64 overflow-y-auto">
          {transactions.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Filter size={32} className="mx-auto mb-2 opacity-50" />
              <p>No transactions found for this period</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {transactions.slice(0, 10).map((t) => (
                <div key={t.id} className="p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {t.type === 'income' 
                        ? ((t.income_source as any)?.name || 'Income')
                        : ((t.category as any)?.name || 'Expense')
                      }
                    </p>
                    <p className="text-xs text-gray-500">{formatDate(t.transaction_date)}</p>
                  </div>
                  <span className={`font-semibold ${t.type === 'income' ? 'text-emerald-600' : 'text-gray-900'}`}>
                    {t.type === 'income' ? '+' : '-'}{formatMVR(Number(t.amount))}
                  </span>
                </div>
              ))}
              {transactions.length > 10 && (
                <p className="p-3 text-center text-sm text-gray-500">
                  ... and {transactions.length - 10} more transactions
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Download Button */}
      <button
        onClick={downloadReport}
        disabled={transactions.length === 0}
        className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-200"
      >
        <Download size={20} />
        Download {reportType === 'monthly' ? 'Monthly' : 'Yearly'} Report (.{exportFormat})
      </button>

      {/* Info */}
      <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-700">
        <p className="font-medium mb-1">What you get:</p>
        <ul className="list-disc list-inside space-y-1 text-blue-600">
          <li>Complete transaction list with categories/sources</li>
          <li>Summary with totals, savings, and budget status</li>
          <li>CSV opens in Excel, Google Sheets, or Numbers</li>
          <li>JSON for data analysis or backup</li>
        </ul>
      </div>
    </div>
  )
}
