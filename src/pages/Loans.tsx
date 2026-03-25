import { useState, useEffect } from 'react'
import { useProfile } from '../hooks/useProfile'
import { useAuth } from '../hooks/useAuth'
import { firebaseDb } from '../lib/firebase'
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, updateDoc, orderBy } from 'firebase/firestore'
import { HandCoins, Plus, Trash2, TrendingUp, TrendingDown, ArrowRightLeft, AlertCircle, X, Pencil } from 'lucide-react'

// Format currency as MVR
const formatMVR = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'MVR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
}

interface ExpenseCategory {
  id: string
  name: string
  profile_id: string
  is_archived?: boolean
  sort_order?: number | null
}

function EditLoanModal({
  formData,
  setFormData,
  onSubmit,
  onClose,
  profiles,
  savedLenders,
  savedBorrowers
}: {
  formData: any
  setFormData: (data: any) => void
  onSubmit: (e: React.FormEvent) => void
  onClose: () => void
  profiles: any[]
  savedLenders: string[]
  savedBorrowers: string[]
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-bold">Edit Loan</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={onSubmit} className="p-4 space-y-4">
          {/* Profile Selection */}
          <div>
            <label className="text-sm text-gray-600">Profile</label>
            <select
              value={formData.profile_id}
              onChange={(e) => setFormData({ ...formData, profile_id: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-1"
            >
              {profiles.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

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

          <div>
            <label className="text-sm text-gray-600">
              {formData.loan_type === 'borrowed' ? 'Lender/Bank Name' : 'Borrower Name'}
            </label>
            <input
              type="text"
              value={formData.party_name}
              onChange={(e) => setFormData({ ...formData, party_name: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-1"
              list={formData.loan_type === 'borrowed' ? 'edit-lender-list' : 'edit-borrower-list'}
              required
            />
            <datalist id="edit-lender-list">
              {savedLenders.map((name: string) => (
                <option key={name} value={name} />
              ))}
            </datalist>
            <datalist id="edit-borrower-list">
              {savedBorrowers.map((name: string) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </div>

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

          <div>
            <label className="text-sm text-gray-600">Total Amount to Pay (MVR)</label>
            <input
              type="number"
              step="0.01"
              value={formData.total_amount}
              onChange={(e) => setFormData({ ...formData, total_amount: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-1"
            />
          </div>

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

          <div>
            <label className="text-sm text-gray-600">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-1"
              rows={2}
            />
          </div>

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
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  )
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
  const { currentProfile, profiles } = useProfile()
  const { user } = useAuth()
  const [loans, setLoans] = useState<Loan[]>([])
  const [payments, setPayments] = useState<Record<string, LoanPayment[]>>({})
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [showPay, setShowPay] = useState<string | null>(null)
  const [showDetails, setShowDetails] = useState<string | null>(null)
  const [showEdit, setShowEdit] = useState<string | null>(null)
  const [savedLenders, setSavedLenders] = useState<string[]>([])
  const [savedBorrowers, setSavedBorrowers] = useState<string[]>([])

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

  const [editFormData, setEditFormData] = useState({
    loan_type: 'borrowed' as 'borrowed' | 'lended',
    profile_id: '',
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
    bank_name: ''
  })

  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    payment_date: new Date().toISOString().slice(0, 10),
    notes: '',
    category_id: '',
  })

  useEffect(() => {
    if (user && currentProfile) {
      loadLoans()
    }
  }, [currentProfile, user])

  useEffect(() => {
    const loadCategories = async () => {
      if (!user || !currentProfile) return
      const catQuery = query(
        collection(firebaseDb, 'users', user.uid, 'categories'),
        where('profile_id', '==', currentProfile.id),
        where('is_archived', '==', false),
        orderBy('sort_order')
      )
      const catSnap = await getDocs(catQuery)
      setCategories(catSnap.docs.map(d => ({ id: d.id, ...d.data() }) as ExpenseCategory))
    }

    loadCategories()
  }, [currentProfile, user])

  const loadLoans = async () => {
    if (!user || !currentProfile) return
    setLoading(true)

    const loansQuery = query(
      collection(firebaseDb, 'users', user.uid, 'loans'),
      where('profile_id', '==', currentProfile.id),
      orderBy('created_at', 'desc')
    )
    const loansSnap = await getDocs(loansQuery)
    const loansData = loansSnap.docs.map(d => ({ id: d.id, ...d.data() }) as Loan)
    setLoans(loansData)

    // Extract saved lenders and borrowers from all loans
    const lenders = new Set<string>()
    const borrowers = new Set<string>()
    loansData.forEach(loan => {
      if (loan.lender_name) lenders.add(loan.lender_name)
      if (loan.borrower_name) borrowers.add(loan.borrower_name)
    })
    setSavedLenders(Array.from(lenders).sort())
    setSavedBorrowers(Array.from(borrowers).sort())

    // Load payments for each loan
    const loanIds = loansData.map(l => l.id)
    if (loanIds.length > 0) {
      const paymentsMap: Record<string, LoanPayment[]> = {}
      for (const loanId of loanIds) {
        const payQuery = query(
          collection(firebaseDb, 'users', user.uid, 'loanPayments'),
          where('loan_id', '==', loanId),
          orderBy('payment_date', 'desc')
        )
        const paySnap = await getDocs(payQuery)
        paymentsMap[loanId] = paySnap.docs.map(d => ({ id: d.id, ...d.data() }) as LoanPayment)
      }
      setPayments(paymentsMap)
    }

    setLoading(false)
  }

  const handleAddLoan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !currentProfile) return

    const principal = Number(formData.principal_amount)
    const interestRate = Number(formData.interest_rate)
    let totalAmount = Number(formData.total_amount) || principal

    if (!formData.total_amount && interestRate > 0 && formData.interest_type === 'simple') {
      const years = 1
      totalAmount = principal + (principal * interestRate * years / 100)
    }

    await addDoc(collection(firebaseDb, 'users', user.uid, 'loans'), {
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
      amount_paid: 0,
      emi_amount: formData.emi_amount ? Number(formData.emi_amount) : null,
      total_installments: formData.total_installments ? Number(formData.total_installments) : null,
      installments_paid: 0,
      status: 'active',
      description: formData.description || null,
      account_number: formData.account_number || null,
      bank_name: formData.bank_name || null,
      created_at: new Date().toISOString()
    })

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
  }

  const openEdit = (loan: Loan) => {
    setEditFormData({
      loan_type: loan.loan_type,
      profile_id: loan.profile_id,
      category: loan.category || 'individual',
      party_name: loan.loan_type === 'borrowed' ? (loan.lender_name || '') : (loan.borrower_name || ''),
      principal_amount: String(loan.principal_amount ?? ''),
      interest_rate: String(loan.interest_rate ?? '0'),
      interest_type: loan.interest_type || 'none',
      loan_date: loan.loan_date,
      due_date: loan.due_date || '',
      total_amount: String(loan.total_amount ?? ''),
      emi_amount: loan.emi_amount != null ? String(loan.emi_amount) : '',
      total_installments: loan.total_installments != null ? String(loan.total_installments) : '',
      description: loan.description || '',
      account_number: loan.account_number || '',
      bank_name: loan.bank_name || ''
    })
    setShowEdit(loan.id)
  }

  const handleUpdateLoan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !showEdit) return

    const principal = Number(editFormData.principal_amount)
    const interestRate = Number(editFormData.interest_rate)
    let totalAmount = Number(editFormData.total_amount) || principal

    if (!editFormData.total_amount && interestRate > 0 && editFormData.interest_type === 'simple') {
      const years = 1
      totalAmount = principal + (principal * interestRate * years / 100)
    }

    await updateDoc(doc(firebaseDb, 'users', user.uid, 'loans', showEdit), {
      profile_id: editFormData.profile_id,
      loan_type: editFormData.loan_type,
      category: editFormData.category,
      lender_name: editFormData.loan_type === 'borrowed' ? editFormData.party_name : null,
      borrower_name: editFormData.loan_type === 'lended' ? editFormData.party_name : null,
      principal_amount: principal,
      interest_rate: interestRate,
      interest_type: editFormData.interest_type,
      loan_date: editFormData.loan_date,
      due_date: editFormData.due_date || null,
      total_amount: totalAmount,
      emi_amount: editFormData.emi_amount ? Number(editFormData.emi_amount) : null,
      total_installments: editFormData.total_installments ? Number(editFormData.total_installments) : null,
      description: editFormData.description || null,
      account_number: editFormData.account_number || null,
      bank_name: editFormData.bank_name || null
    })

    setShowEdit(null)
    loadLoans()
  }

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !currentProfile || !showPay) return

    const loan = loans.find(l => l.id === showPay)
    if (!loan) return

    const amount = Number(paymentForm.amount)

    // Create transaction for this payment
    const txRef = await addDoc(collection(firebaseDb, 'users', user.uid, 'transactions'), {
      profile_id: currentProfile.id,
      type: loan.loan_type === 'borrowed' ? 'expense' : 'income',
      amount: amount,
      description: `${loan.loan_type === 'borrowed' ? 'Loan Payment' : 'Loan Repayment'} - ${loan.loan_type === 'borrowed' ? loan.lender_name : loan.borrower_name}`,
      transaction_date: paymentForm.payment_date,
      category_id: paymentForm.category_id || null,
      created_at: new Date().toISOString()
    })

    // Add loan payment record
    await addDoc(collection(firebaseDb, 'users', user.uid, 'loanPayments'), {
      loan_id: showPay,
      profile_id: currentProfile.id,
      payment_date: paymentForm.payment_date,
      amount_paid: amount,
      transaction_id: txRef.id,
      notes: paymentForm.notes || null,
      installment_number: loan.installments_paid + 1,
      created_at: new Date().toISOString()
    })

    // Update loan amount paid
    await updateDoc(doc(firebaseDb, 'users', user.uid, 'loans', showPay), {
      amount_paid: loan.amount_paid + amount,
      installments_paid: loan.installments_paid + 1
    })

    setShowPay(null)
    setPaymentForm({
      amount: '',
      payment_date: new Date().toISOString().slice(0, 10),
      notes: '',
      category_id: '',
    })
    loadLoans()
  }

  const deleteLoan = async (id: string) => {
    if (!confirm('Delete this loan? This will also delete all payment records.')) return
    if (!user) return
    await deleteDoc(doc(firebaseDb, 'users', user.uid, 'loans', id))
    loadLoans()
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

  const todayStr = new Date().toISOString().slice(0, 10)
  const dueSoonThresholdStr = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() + 7)
    .toISOString()
    .slice(0, 10)

  const overdueLoans = loans
    .filter(l => l.status === 'active')
    .filter(l => !!l.due_date && l.due_date < todayStr)

  const dueSoonLoans = loans
    .filter(l => l.status === 'active')
    .filter(l => !!l.due_date && l.due_date >= todayStr && l.due_date <= dueSoonThresholdStr)

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

      {(overdueLoans.length > 0 || dueSoonLoans.length > 0) && (
        <div className="space-y-3">
          {overdueLoans.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-red-900">Overdue Loans</h3>
              <div className="mt-2 space-y-2">
                {overdueLoans.slice(0, 3).map((loan: Loan) => (
                  <button
                    key={loan.id}
                    type="button"
                    className="w-full text-left flex items-center justify-between bg-white/70 rounded-lg p-3 hover:bg-white"
                    onClick={() => setShowDetails(loan.id)}
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {loan.loan_type === 'borrowed' ? loan.lender_name : loan.borrower_name}
                      </p>
                      <p className="text-xs text-gray-600">Due: {loan.due_date}</p>
                    </div>
                    <p className="text-sm font-semibold text-red-700">{formatMVR(loan.total_amount - loan.amount_paid)}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {dueSoonLoans.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-yellow-900">Due Soon (Next 7 Days)</h3>
              <div className="mt-2 space-y-2">
                {dueSoonLoans.slice(0, 3).map((loan: Loan) => (
                  <button
                    key={loan.id}
                    type="button"
                    className="w-full text-left flex items-center justify-between bg-white/70 rounded-lg p-3 hover:bg-white"
                    onClick={() => setShowDetails(loan.id)}
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {loan.loan_type === 'borrowed' ? loan.lender_name : loan.borrower_name}
                      </p>
                      <p className="text-xs text-gray-600">Due: {loan.due_date}</p>
                    </div>
                    <p className="text-sm font-semibold text-yellow-800">{formatMVR(loan.total_amount - loan.amount_paid)}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

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
                  onPay={() => setShowPay(loan.id)}
                  onDetails={() => setShowDetails(loan.id)}
                  onEdit={() => openEdit(loan)}
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
                  onPay={() => setShowPay(loan.id)}
                  onDetails={() => setShowDetails(loan.id)}
                  onEdit={() => openEdit(loan)}
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
                  onPay={() => {}}
                  onDetails={() => setShowDetails(loan.id)}
                  onEdit={() => openEdit(loan)}
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
          savedLenders={savedLenders}
          savedBorrowers={savedBorrowers}
        />
      )}

      {showEdit && (
        <EditLoanModal
          formData={editFormData}
          setFormData={setEditFormData}
          onSubmit={handleUpdateLoan}
          onClose={() => setShowEdit(null)}
          profiles={profiles}
          savedLenders={savedLenders}
          savedBorrowers={savedBorrowers}
        />
      )}

      {/* Payment Modal */}
      {showPay && (
        <PaymentModal
          loan={loans.find(l => l.id === showPay)!}
          categories={categories}
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
  onPay,
  onDetails,
  onEdit,
  onDelete
}: {
  loan: Loan
  onPay: () => void
  onDetails: () => void
  onEdit: () => void
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
            onClick={onEdit}
            className="mt-2 ml-1 p-1 text-gray-600 hover:bg-gray-50 rounded"
          >
            <Pencil size={16} />
          </button>
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
  onClose,
  savedLenders,
  savedBorrowers
}: {
  formData: any
  setFormData: (data: any) => void
  onSubmit: (e: React.FormEvent) => void
  onClose: () => void
  savedLenders: string[]
  savedBorrowers: string[]
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
              list={formData.loan_type === 'borrowed' ? 'lender-list' : 'borrower-list'}
              required
            />
            <datalist id="lender-list">
              {savedLenders.map(name => (
                <option key={name} value={name} />
              ))}
            </datalist>
            <datalist id="borrower-list">
              {savedBorrowers.map(name => (
                <option key={name} value={name} />
              ))}
            </datalist>
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
  categories,
  formData,
  setFormData,
  onSubmit,
  onClose
}: {
  loan: Loan
  categories: ExpenseCategory[]
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

          {loan.loan_type === 'borrowed' && (
            <div>
              <label className="text-sm text-gray-600">Category (for budget)</label>
              <select
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-1"
              >
                <option value="">Uncategorized</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">This category is used for expense budgets and charts.</p>
            </div>
          )}

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

          {/* Enhanced Amount Breakdown */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-700">Amount Breakdown</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Principal Amount</p>
                <p className="font-semibold text-blue-700">{formatMVR(loan.principal_amount)}</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Interest ({loan.interest_rate}% {loan.interest_type})</p>
                <p className="font-semibold text-purple-700">{formatMVR(Math.max(0, loan.total_amount - loan.principal_amount))}</p>
              </div>
              <div className="bg-emerald-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Total Amount</p>
                <p className="font-semibold text-emerald-700">{formatMVR(loan.total_amount)}</p>
              </div>
              <div className="bg-orange-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Amount Paid</p>
                <p className="font-semibold text-orange-700">{formatMVR(loan.amount_paid)}</p>
              </div>
            </div>
          </div>

          {/* Installment Breakdown (if applicable) */}
          {(loan.emi_amount || loan.total_installments) && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-700">Installment Breakdown</h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                {loan.emi_amount && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">EMI Amount</span>
                    <span className="font-semibold">{formatMVR(loan.emi_amount)}</span>
                  </div>
                )}
                {loan.total_installments && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Installments</span>
                    <span className="font-semibold">{loan.installments_paid || 0} / {loan.total_installments} paid</span>
                  </div>
                )}
                {loan.emi_amount && loan.total_installments && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Expected Total</span>
                    <span className="font-semibold">{formatMVR(loan.emi_amount * loan.total_installments)}</span>
                  </div>
                )}
                {loan.total_installments && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Remaining</span>
                    <span className="font-semibold text-red-600">{loan.total_installments - (loan.installments_paid || 0)} installments</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Progress */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-700">Payment Progress</h3>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Paid: <span className="font-semibold text-emerald-600">{formatMVR(loan.amount_paid)}</span></span>
                <span className="text-gray-600">Remaining: <span className="font-semibold text-red-600">{formatMVR(remaining)}</span></span>
              </div>
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${loan.loan_type === 'borrowed' ? 'bg-red-500' : 'bg-emerald-500'}`}
                  style={{ width: `${Math.min(100, (loan.amount_paid / loan.total_amount) * 100)}%` }}
                />
              </div>
              <p className="text-xs text-center text-gray-500 mt-1">
                {((loan.amount_paid / loan.total_amount) * 100).toFixed(1)}% completed
              </p>
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
