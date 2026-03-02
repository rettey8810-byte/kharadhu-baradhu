import { useState, useEffect } from 'react'
import { useProfile } from '../hooks/useProfile'
import { supabase } from '../lib/supabase'
import { HandCoins, Plus, Trash2, TrendingUp, TrendingDown, ArrowRightLeft, AlertCircle, X } from 'lucide-react'

// Format currency as MVR
const formatMVR = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'MVR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
}

interface Loan {
  id: string
  profile_id: string
  loan_type: 'borrowed' | 'lended'
  category: string
  lender_name: string | null
  borrower_name: string | null
  principal_amount: number
  interest_rate: number
  interest_type: string
  loan_date: string
  due_date: string | null
  total_amount: number
  amount_paid: number
  emi_amount: number | null
  total_installments: number | null
  installments_paid: number
  status: 'active' | 'paid' | 'overdue' | 'defaulted' | 'cancelled'
  description: string | null
  account_number: string | null
  bank_name: string | null
  created_at: string
}

interface LoanPayment {
  id: string
  loan_id: string
  payment_date: string
  amount_paid: number
  principal_paid: number | null
  interest_paid: number | null
  notes: string | null
  installment_number: number | null
}

// Helper functions (must be outside component to be accessible by LoanCard)
const getStatusColor = (status: string) => {
  switch (status) {
    case 'paid': return 'bg-emerald-100 text-emerald-700'
    case 'overdue': return 'bg-red-100 text-red-700'
    case 'active': return 'bg-blue-100 text-blue-700'
    default: return 'bg-gray-100 text-gray-700'
  }
}

export default function Loans() {
  const { currentProfile } = useProfile()
  const [loans, setLoans] = useState<Loan[]>([])
  const [payments, setPayments] = useState<Record<string, LoanPayment[]>>({})
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [showPay, setShowPay] = useState<string | null>(null)
  const [showDetails, setShowDetails] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    loan_type: 'borrowed' as 'borrowed' | 'lended',
    category: 'individual',
    party_name: '',
    principal_amount: '',
    interest_rate: '0',
    interest_type: 'none',
    loan_date: new Date().toISOString().slice(0, 10),
    due_date: '',
    total_amount: '',
    emi_amount: '',
    total_installments: '',
    description: '',
    account_number: '',
    bank_name: '',
  })

  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    payment_date: new Date().toISOString().slice(0, 10),
    notes: '',
  })

  useEffect(() => {
    loadLoans()
  }, [currentProfile])

  const loadLoans = async () => {
    if (!currentProfile) return
    setLoading(true)

    const { data: loansData, error } = await supabase
      .from('loans')
      .select('*')
      .eq('profile_id', currentProfile.id)
      .order('created_at', { ascending: false })

    if (!error && loansData) {
      setLoans(loansData as Loan[])

      // Load payments for each loan
      const loanIds = loansData.map((l: any) => l.id)
      if (loanIds.length > 0) {
        const { data: paymentsData } = await supabase
          .from('loan_payments')
          .select('*')
          .in('loan_id', loanIds)
          .order('payment_date', { ascending: false })

        if (paymentsData) {
          const paymentsMap: Record<string, LoanPayment[]> = {}
          paymentsData.forEach((p: any) => {
            if (!paymentsMap[p.loan_id]) paymentsMap[p.loan_id] = []
            paymentsMap[p.loan_id].push(p)
          })
          setPayments(paymentsMap)
        }
      }
    }

    setLoading(false)
  }

  const handleAddLoan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentProfile) return

    const principal = Number(formData.principal_amount)
    const interestRate = Number(formData.interest_rate)
    let totalAmount = Number(formData.total_amount) || principal

    // Calculate total with simple interest if not provided
    if (!formData.total_amount && interestRate > 0 && formData.interest_type === 'simple') {
      const years = 1 // Default 1 year if no due date
      totalAmount = principal + (principal * interestRate * years / 100)
    }

    const insertData = {
      profile_id: currentProfile.id,
      loan_type: formData.loan_type,
      category: formData.category,
      lender_name: formData.loan_type === 'borrowed' ? formData.party_name : null,
      borrower_name: formData.loan_type === 'lended' ? formData.party_name : null,
      principal_amount: principal,
      interest_rate: interestRate,
      interest_type: formData.interest_type,
      loan_date: formData.loan_date,
      due_date: formData.due_date || null,
      total_amount: totalAmount,
      emi_amount: formData.emi_amount ? Number(formData.emi_amount) : null,
      total_installments: formData.total_installments ? Number(formData.total_installments) : null,
      description: formData.description || null,
      account_number: formData.account_number || null,
      bank_name: formData.bank_name || null,
    }

    const { error } = await supabase.from('loans').insert(insertData)

    if (!error) {
      setShowAdd(false)
      setFormData({
        loan_type: 'borrowed',
        category: 'individual',
        party_name: '',
        principal_amount: '',
        interest_rate: '0',
        interest_type: 'none',
        loan_date: new Date().toISOString().slice(0, 10),
        due_date: '',
        total_amount: '',
        emi_amount: '',
        total_installments: '',
        description: '',
        account_number: '',
        bank_name: '',
      })
      loadLoans()
    } else {
      alert('Failed to add loan: ' + error.message)
    }
  }

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentProfile || !showPay) return

    const loan = loans.find(l => l.id === showPay)
    if (!loan) return

    const amount = Number(paymentForm.amount)

    // Create transaction for this payment
    const { data: txData, error: txError } = await supabase
      .from('transactions')
      .insert({
        profile_id: currentProfile.id,
        type: loan.loan_type === 'borrowed' ? 'expense' : 'income',
        amount: amount,
        description: `${loan.loan_type === 'borrowed' ? 'Loan Payment' : 'Loan Repayment'} - ${loan.loan_type === 'borrowed' ? loan.lender_name : loan.borrower_name}`,
        transaction_date: paymentForm.payment_date,
        category_id: null,
      })
      .select()
      .single()

    if (txError) {
      alert('Failed to create transaction: ' + txError.message)
      return
    }

    // Add loan payment record
    const { error: payError } = await supabase.from('loan_payments').insert({
      loan_id: showPay,
      profile_id: currentProfile.id,
      payment_date: paymentForm.payment_date,
      amount_paid: amount,
      transaction_id: txData?.id,
      notes: paymentForm.notes || null,
      installment_number: loan.installments_paid + 1,
    })

    if (!payError) {
      setShowPay(null)
      setPaymentForm({
        amount: '',
        payment_date: new Date().toISOString().slice(0, 10),
        notes: '',
      })
      loadLoans()
    } else {
      alert('Failed to record payment: ' + payError.message)
    }
  }

  const deleteLoan = async (id: string) => {
    if (!confirm('Delete this loan? This will also delete all payment records.')) return

    const { error } = await supabase.from('loans').delete().eq('id', id)
    if (!error) {
      loadLoans()
    }
  }

  // Calculate statistics
  const borrowedLoans = loans.filter(l => l.loan_type === 'borrowed' && l.status === 'active')
  const lendedLoans = loans.filter(l => l.loan_type === 'lended' && l.status === 'active')

  const totalBorrowed = borrowedLoans.reduce((sum, l) => sum + l.principal_amount, 0)
  const totalBorrowedPaid = borrowedLoans.reduce((sum, l) => sum + l.amount_paid, 0)
  const totalBorrowedRemaining = borrowedLoans.reduce((sum, l) => sum + (l.total_amount - l.amount_paid), 0)

  const totalLended = lendedLoans.reduce((sum, l) => sum + l.principal_amount, 0)
  const totalLendedReceived = lendedLoans.reduce((sum, l) => sum + l.amount_paid, 0)
  const totalLendedOutstanding = lendedLoans.reduce((sum, l) => sum + (l.total_amount - l.amount_paid), 0)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <HandCoins className="text-emerald-600" />
            Loans
          </h1>
          <p className="text-sm text-gray-500">Manage borrowed and lended money</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="bg-emerald-600 text-white p-2 rounded-lg hover:bg-emerald-700"
        >
          <Plus size={24} />
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        {/* Borrowed Summary */}
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="text-red-600" size={20} />
            <span className="text-sm font-medium text-red-900">You Owe</span>
          </div>
          <p className="text-lg font-bold text-red-700">{formatMVR(totalBorrowedRemaining)}</p>
          <p className="text-xs text-red-600">of {formatMVR(totalBorrowed)} borrowed</p>
          <p className="text-xs text-emerald-600 mt-1">{formatMVR(totalBorrowedPaid)} paid</p>
        </div>

        {/* Lended Summary */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="text-emerald-600" size={20} />
            <span className="text-sm font-medium text-emerald-900">Owed to You</span>
          </div>
          <p className="text-lg font-bold text-emerald-700">{formatMVR(totalLendedOutstanding)}</p>
          <p className="text-xs text-emerald-600">of {formatMVR(totalLended)} lended</p>
          <p className="text-xs text-emerald-600 mt-1">{formatMVR(totalLendedReceived)} received</p>
        </div>
      </div>

      {/* Net Position */}
      <div className={`rounded-xl p-4 ${totalBorrowedRemaining > totalLendedOutstanding ? 'bg-red-50 border border-red-200' : 'bg-emerald-50 border border-emerald-200'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ArrowRightLeft size={20} className={totalBorrowedRemaining > totalLendedOutstanding ? 'text-red-600' : 'text-emerald-600'} />
            <span className="text-sm font-medium">Net Position</span>
          </div>
          <span className={`text-lg font-bold ${totalBorrowedRemaining > totalLendedOutstanding ? 'text-red-700' : 'text-emerald-700'}`}>
            {totalBorrowedRemaining > totalLendedOutstanding ? '-' : '+'}{formatMVR(Math.abs(totalLendedOutstanding - totalBorrowedRemaining))}
          </span>
        </div>
      </div>

      {/* Loans List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : loans.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <HandCoins size={48} className="mx-auto mb-3 opacity-50" />
          <p>No loans recorded</p>
          <p className="text-sm">Add loans you have borrowed or lended</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Active Borrowed Loans */}
          {borrowedLoans.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Borrowed (You Owe)</h3>
              {borrowedLoans.map(loan => (
                <LoanCard
                  key={loan.id}
                  loan={loan}
                  payments={payments[loan.id] || []}
                  onPay={() => setShowPay(loan.id)}
                  onDetails={() => setShowDetails(loan.id)}
                  onDelete={() => deleteLoan(loan.id)}
                />
              ))}
            </div>
          )}

          {/* Active Lended Loans */}
          {lendedLoans.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Lended (Owed to You)</h3>
              {lendedLoans.map(loan => (
                <LoanCard
                  key={loan.id}
                  loan={loan}
                  payments={payments[loan.id] || []}
                  onPay={() => setShowPay(loan.id)}
                  onDetails={() => setShowDetails(loan.id)}
                  onDelete={() => deleteLoan(loan.id)}
                />
              ))}
            </div>
          )}

          {/* Paid/Closed Loans */}
          {loans.filter(l => l.status === 'paid').length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Paid Off</h3>
              {loans.filter(l => l.status === 'paid').map(loan => (
                <LoanCard
                  key={loan.id}
                  loan={loan}
                  payments={payments[loan.id] || []}
                  onPay={() => {}}
                  onDetails={() => setShowDetails(loan.id)}
                  onDelete={() => deleteLoan(loan.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Loan Modal */}
      {showAdd && (
        <AddLoanModal
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleAddLoan}
          onClose={() => setShowAdd(false)}
        />
      )}

      {/* Payment Modal */}
      {showPay && (
        <PaymentModal
          loan={loans.find(l => l.id === showPay)!}
          formData={paymentForm}
          setFormData={setPaymentForm}
          onSubmit={handlePayment}
          onClose={() => setShowPay(null)}
        />
      )}

      {/* Details Modal */}
      {showDetails && (
        <DetailsModal
          loan={loans.find(l => l.id === showDetails)!}
          payments={payments[showDetails] || []}
          onClose={() => setShowDetails(null)}
        />
      )}
    </div>
  )
}

// Loan Card Component
function LoanCard({
  loan,
  payments,
  onPay,
  onDetails,
  onDelete
}: {
  loan: Loan
  payments: LoanPayment[]
  onPay: () => void
  onDetails: () => void
  onDelete: () => void
}) {
  const remaining = loan.total_amount - loan.amount_paid
  const progress = Math.min(100, (loan.amount_paid / loan.total_amount) * 100)

  return (
    <div className="bg-white rounded-xl p-4 border border-gray-200">
      <div className="flex items-start justify-between">
        <div className="flex-1" onClick={onDetails}>
          <div className="flex items-center gap-2 mb-1">
            <span className={`px-2 py-0.5 rounded-full text-xs ${getStatusColor(loan.status)}`}>
              {loan.status}
            </span>
            <span className="text-xs text-gray-500">{loan.category}</span>
          </div>
          <h4 className="font-semibold text-gray-900">
            {loan.loan_type === 'borrowed' ? loan.lender_name : loan.borrower_name}
          </h4>
          <p className="text-sm text-gray-500">{loan.description}</p>
          
          {/* Progress Bar */}
          <div className="mt-2">
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${loan.loan_type === 'borrowed' ? 'bg-red-500' : 'bg-emerald-500'}`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between text-xs mt-1">
              <span className="text-gray-500">{formatMVR(loan.amount_paid)} paid</span>
              <span className="font-medium text-gray-700">{formatMVR(remaining)} remaining</span>
            </div>
          </div>

          {loan.due_date && (
            <p className="text-xs text-gray-500 mt-1">Due: {loan.due_date}</p>
          )}
        </div>

        <div className="text-right ml-3">
          <p className="font-bold text-gray-900">{formatMVR(loan.principal_amount)}</p>
          {loan.interest_rate > 0 && (
            <p className="text-xs text-gray-500">{loan.interest_rate}% {loan.interest_type}</p>
          )}
          {loan.status === 'active' && (
            <button
              onClick={onPay}
              className="mt-2 px-3 py-1 bg-emerald-600 text-white text-xs rounded-lg hover:bg-emerald-700"
            >
              Pay
            </button>
          )}
          <button
            onClick={onDelete}
            className="mt-2 ml-1 p-1 text-red-600 hover:bg-red-50 rounded"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}

// Add Loan Modal
function AddLoanModal({
  formData,
  setFormData,
  onSubmit,
  onClose
}: {
  formData: any
  setFormData: (data: any) => void
  onSubmit: (e: React.FormEvent) => void
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-bold">Add Loan</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-4 space-y-4">
          {/* Loan Type */}
          <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, loan_type: 'borrowed' })}
              className={`flex-1 py-2 text-sm rounded-md ${formData.loan_type === 'borrowed' ? 'bg-white shadow-sm text-red-600' : 'text-gray-500'}`}
            >
              You Borrowed
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, loan_type: 'lended' })}
              className={`flex-1 py-2 text-sm rounded-md ${formData.loan_type === 'lended' ? 'bg-white shadow-sm text-emerald-600' : 'text-gray-500'}`}
            >
              You Lended
            </button>
          </div>

          {/* Category */}
          <div>
            <label className="text-sm text-gray-600">Category</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-1"
            >
              <option value="individual">Individual (Personal)</option>
              <option value="bank">Bank Loan</option>
              <option value="credit_card">Credit Card</option>
              <option value="family">Family</option>
              <option value="friend">Friend</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Party Name */}
          <div>
            <label className="text-sm text-gray-600">
              {formData.loan_type === 'borrowed' ? 'Lender/Bank Name' : 'Borrower Name'}
            </label>
            <input
              type="text"
              value={formData.party_name}
              onChange={(e) => setFormData({ ...formData, party_name: e.target.value })}
              placeholder={formData.loan_type === 'borrowed' ? 'e.g., BML, MIB, John' : 'e.g., John, Ahmed'}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-1"
              required
            />
          </div>

          {/* Principal Amount */}
          <div>
            <label className="text-sm text-gray-600">Principal Amount (MVR)</label>
            <input
              type="number"
              step="0.01"
              value={formData.principal_amount}
              onChange={(e) => setFormData({ ...formData, principal_amount: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-1"
              required
            />
          </div>

          {/* Interest */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-gray-600">Interest Rate (%)</label>
              <input
                type="number"
                step="0.01"
                value={formData.interest_rate}
                onChange={(e) => setFormData({ ...formData, interest_rate: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-1"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">Interest Type</label>
              <select
                value={formData.interest_type}
                onChange={(e) => setFormData({ ...formData, interest_type: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-1"
              >
                <option value="none">None</option>
                <option value="simple">Simple</option>
                <option value="compound">Compound</option>
              </select>
            </div>
          </div>

          {/* Total Amount (calculated or manual) */}
          <div>
            <label className="text-sm text-gray-600">Total Amount to Pay (MVR)</label>
            <input
              type="number"
              step="0.01"
              value={formData.total_amount}
              onChange={(e) => setFormData({ ...formData, total_amount: e.target.value })}
              placeholder="Leave blank to auto-calculate"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-1"
            />
            <p className="text-xs text-gray-500 mt-1">Leave blank to auto-calculate with interest</p>
          </div>

          {/* EMI Details */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-gray-600">EMI Amount (Optional)</label>
              <input
                type="number"
                step="0.01"
                value={formData.emi_amount}
                onChange={(e) => setFormData({ ...formData, emi_amount: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-1"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">Total Installments</label>
              <input
                type="number"
                value={formData.total_installments}
                onChange={(e) => setFormData({ ...formData, total_installments: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-1"
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-gray-600">Loan Date</label>
              <input
                type="date"
                value={formData.loan_date}
                onChange={(e) => setFormData({ ...formData, loan_date: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-1"
                required
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">Due Date (Optional)</label>
              <input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-1"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-sm text-gray-600">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="e.g., Personal loan for emergency, Business loan"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-1"
              rows={2}
            />
          </div>

          {/* Bank Details (if bank loan) */}
          {formData.category === 'bank' && (
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-600">Bank Name</label>
                <input
                  type="text"
                  value={formData.bank_name}
                  onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-1"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">Account Number</label>
                <input
                  type="text"
                  value={formData.account_number}
                  onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-1"
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 border border-gray-200 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
            >
              Add Loan
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Payment Modal
function PaymentModal({
  loan,
  formData,
  setFormData,
  onSubmit,
  onClose
}: {
  loan: Loan
  formData: any
  setFormData: (data: any) => void
  onSubmit: (e: React.FormEvent) => void
  onClose: () => void
}) {
  const remaining = loan.total_amount - loan.amount_paid

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-md p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Record Payment</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <div className="bg-gray-50 rounded-lg p-3 mb-4">
          <p className="text-sm text-gray-600">{loan.loan_type === 'borrowed' ? loan.lender_name : loan.borrower_name}</p>
          <p className="text-lg font-bold">Remaining: {formatMVR(remaining)}</p>
          {loan.emi_amount && (
            <p className="text-sm text-gray-500">EMI: {formatMVR(loan.emi_amount)}</p>
          )}
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-gray-600">Payment Amount (MVR)</label>
            <input
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder={loan.emi_amount ? String(loan.emi_amount) : ''}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-1"
              required
            />
          </div>

          <div>
            <label className="text-sm text-gray-600">Payment Date</label>
            <input
              type="date"
              value={formData.payment_date}
              onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-1"
              required
            />
          </div>

          <div>
            <label className="text-sm text-gray-600">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="e.g., First installment, Partial payment"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-1"
              rows={2}
            />
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-700 flex items-center gap-2">
              <AlertCircle size={16} />
              This will create a {loan.loan_type === 'borrowed' ? 'expense' : 'income'} transaction linked to your budget.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 border border-gray-200 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
            >
              Record Payment
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Details Modal
function DetailsModal({
  loan,
  payments,
  onClose
}: {
  loan: Loan
  payments: LoanPayment[]
  onClose: () => void
}) {
  const remaining = loan.total_amount - loan.amount_paid

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-bold">Loan Details</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Summary */}
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-sm text-gray-500">{loan.loan_type === 'borrowed' ? 'Borrowed From' : 'Lended To'}</p>
            <p className="text-lg font-bold">{loan.loan_type === 'borrowed' ? loan.lender_name : loan.borrower_name}</p>
            <p className="text-sm text-gray-500 mt-2">{loan.description}</p>
          </div>

          {/* Amount Breakdown */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Principal</p>
              <p className="font-semibold">{formatMVR(loan.principal_amount)}</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Interest ({loan.interest_rate}%)</p>
              <p className="font-semibold">{formatMVR(loan.total_amount - loan.principal_amount)}</p>
            </div>
          </div>

          {/* Progress */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Paid: {formatMVR(loan.amount_paid)}</span>
              <span>Remaining: {formatMVR(remaining)}</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${loan.loan_type === 'borrowed' ? 'bg-red-500' : 'bg-emerald-500'}`}
                style={{ width: `${Math.min(100, (loan.amount_paid / loan.total_amount) * 100)}%` }}
              />
            </div>
          </div>

          {/* Payment History */}
          {payments.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-2">Payment History</h3>
              <div className="space-y-2">
                {payments.map((payment, idx) => (
                  <div key={payment.id} className="flex justify-between items-center bg-gray-50 rounded-lg p-2">
                    <div>
                      <p className="text-sm font-medium">#{payment.installment_number || idx + 1}</p>
                      <p className="text-xs text-gray-500">{payment.payment_date}</p>
                    </div>
                    <p className="font-semibold text-emerald-600">{formatMVR(payment.amount_paid)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Additional Info */}
          <div className="text-sm text-gray-500 space-y-1">
            <p>Loan Date: {loan.loan_date}</p>
            {loan.due_date && <p>Due Date: {loan.due_date}</p>}
            {loan.bank_name && <p>Bank: {loan.bank_name}</p>}
            {loan.account_number && <p>Account: {loan.account_number}</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
