import { useState, useEffect, useMemo } from 'react'
import { useProfile } from '../hooks/useProfile'
import { useAuth } from '../hooks/useAuth'
import { firebaseDb } from '../lib/firebase'
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, updateDoc, orderBy, getDoc, arrayUnion, onSnapshot } from 'firebase/firestore'
import { HandCoins, Plus, Trash2, TrendingUp, TrendingDown, ArrowRightLeft, AlertCircle, X, Pencil, Share2, CreditCard } from 'lucide-react'

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
  savedParties
}: {
  formData: any
  setFormData: (data: any) => void
  onSubmit: (e: React.FormEvent) => void
  onClose: () => void
  profiles: any[]
  savedParties: string[]
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
              list="edit-party-list"
              required
            />
            <datalist id="edit-party-list">
              {savedParties.map((name: string) => (
                <option key={name} value={name} />
              ))}
            </datalist>
            <p className="text-xs text-gray-500 mt-1">Select from dropdown to reassign to existing person</p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="text-sm text-gray-600">Principal Amount</label>
              <input
                type="number"
                step="0.01"
                value={formData.principal_amount}
                onChange={(e) => setFormData({ ...formData, principal_amount: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-1"
                required
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">Currency</label>
              <select
                value={formData.currency || 'MVR'}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-1"
              >
                <option value="MVR">MVR</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="INR">INR</option>
              </select>
            </div>
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
  card_id?: string
  card_name?: string
  lender_name: string | null
  borrower_name: string | null
  principal_amount: number
  currency: string
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
  is_recurring?: boolean
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
  status?: 'pending' | 'accepted' | 'rejected'
  added_by_user_id?: string
  added_by_email?: string
  approved_by_user_id?: string | null
  rejection_reason?: string | null
  created_at?: string
  responded_at?: string | null
  owner_user_id?: string // For shared loan payments, tracks which user owns this payment record
}

// Shared Loan interfaces
interface SharedLoan {
  id: string
  loan_id: string
  owner_user_id: string
  shared_with_user_id: string
  shared_with_email: string
  status: 'pending' | 'accepted' | 'rejected'
  created_at: string
  accepted_at: string | null
  loan?: Loan // populated when loading
}

interface LoanInvite {
  id: string
  loan_id: string
  from_user_id: string
  from_user_email: string
  to_user_email: string
  status: 'pending' | 'accepted' | 'rejected'
  created_at: string
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
  const [selectedDetailsLoan, setSelectedDetailsLoan] = useState<Loan | null>(null)
  const [showEdit, setShowEdit] = useState<string | null>(null)
  const [editOwnerUserId, setEditOwnerUserId] = useState<string | null>(null)
  const [savedParties, setSavedParties] = useState<string[]>([])
  
  // Shared loans state
  const [activeTab, setActiveTab] = useState<'my' | 'shared'>('my')
  const [sharedLoans, setSharedLoans] = useState<SharedLoan[]>([])
  const [showShareModal, setShowShareModal] = useState<string | null>(null)
  const [shareEmail, setShareEmail] = useState('')
  const [pendingInvites, setPendingInvites] = useState<LoanInvite[]>([])

  const [formData, setFormData] = useState({
    loan_type: 'borrowed' as 'borrowed' | 'lended',
    category: 'individual',
    party_name: '',
    principal_amount: '',
    currency: 'MVR',
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
    offset_mode: false,
    // Calculator fields
    use_calculator: false,
    calculator_amount: '',
    calculator_years: '',
    calculator_rate: '',
    calculator_type: 'simple',
    // Recurring payment
    is_recurring: false,
  })

  const [editFormData, setEditFormData] = useState({
    loan_type: 'borrowed' as 'borrowed' | 'lended',
    profile_id: '',
    category: 'individual',
    party_name: '',
    principal_amount: '',
    currency: 'MVR',
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
  
  // State for shared loan payments
  const [showSharedPay, setShowSharedPay] = useState<string | null>(null)
  const [sharedPayOwnerId, setSharedPayOwnerId] = useState<string | null>(null)
  const [pendingPayments, setPendingPayments] = useState<LoanPayment[]>([])
  // Track payments I submitted that are waiting for approval
  const [myPendingSubmissions, setMyPendingSubmissions] = useState<LoanPayment[]>([])
  // Store payment history for shared loans (from owners' collections)
  const [sharedPayments, setSharedPayments] = useState<Record<string, LoanPayment[]>>({})
  // Date range filter
  const [dateFilterType, setDateFilterType] = useState<'all' | 'month' | 'custom'>('all')
  const [selectedMonth, setSelectedMonth] = useState<string>('')
  const [customStartDate, setCustomStartDate] = useState<string>('')
  const [customEndDate, setCustomEndDate] = useState<string>('')

  useEffect(() => {
    if (user && currentProfile) {
      loadLoans()
      loadSharedLoans()
      loadPendingInvites()
    }
  }, [currentProfile, user])

  useEffect(() => {
    if (!user) return

    const invitesQuery = query(
      collection(firebaseDb, 'loanInvites'),
      where('to_user_email', '==', user.email),
      where('status', '==', 'pending')
    )

    const unsubInvites = onSnapshot(invitesQuery, (snap) => {
      setPendingInvites(snap.docs.map(d => ({ id: d.id, ...d.data() }) as LoanInvite))
    })

    const sharesQuery = query(
      collection(firebaseDb, 'loanShares'),
      where('shared_with_user_id', '==', user.uid),
      where('status', '==', 'accepted')
    )

    const unsubShares = onSnapshot(sharesQuery, async (snap) => {
      const sharedData = snap.docs.map(d => ({ id: d.id, ...d.data() }) as SharedLoan)

      const loansWithData = (await Promise.all(
        sharedData.map(async (shared) => {
          const loanRef = doc(firebaseDb, 'users', shared.owner_user_id, 'loans', shared.loan_id)
          const loanSnap = await getDoc(loanRef)
          if (!loanSnap.exists()) return null
          return {
            ...shared,
            loan: { id: loanSnap.id, ...loanSnap.data() } as Loan
          } as SharedLoan
        })
      )).filter(Boolean) as SharedLoan[]

      setSharedLoans(loansWithData)
    })

    return () => {
      unsubInvites()
      unsubShares()
    }
  }, [user])

  // Real-time listener for pending shared loan payments (need my approval)
  useEffect(() => {
    if (!user) return

    // Load pending payments for loans I own that were added by shared users
    const pendingQuery = query(
      collection(firebaseDb, 'users', user.uid, 'loanPayments'),
      where('status', '==', 'pending')
    )

    const unsubPending = onSnapshot(pendingQuery, (snap) => {
      setPendingPayments(snap.docs.map(d => ({ id: d.id, ...d.data() }) as LoanPayment))
    })

    return () => unsubPending()
  }, [user])

  // Real-time listener for my pending payment submissions (waiting for owner approval)
  useEffect(() => {
    if (!user) return

    // We need to check all loanShares where I'm the shared user and load payments I added
    const loadMyPendingSubmissions = async () => {
      // Get all shared loans where I'm the shared user
      const sharesQuery = query(
        collection(firebaseDb, 'loanShares'),
        where('shared_with_user_id', '==', user.uid),
        where('status', '==', 'accepted')
      )
      const sharesSnap = await getDocs(sharesQuery)
      
      const allMyPending: LoanPayment[] = []
      
      // For each shared loan, check the owner's loanPayments for payments I added
      for (const shareDoc of sharesSnap.docs) {
        const share = shareDoc.data() as SharedLoan
        const ownerId = share.owner_user_id
        const loanId = share.loan_id
        
        // Query owner's loanPayments for payments I added to this loan that are pending
        const myPendingQuery = query(
          collection(firebaseDb, 'users', ownerId, 'loanPayments'),
          where('loan_id', '==', loanId),
          where('added_by_user_id', '==', user.uid),
          where('status', '==', 'pending')
        )
        const pendingSnap = await getDocs(myPendingQuery)
        pendingSnap.docs.forEach(d => {
          const paymentData = d.data() as LoanPayment
          allMyPending.push({ ...paymentData, id: d.id, owner_user_id: ownerId })
        })
      }
      
      setMyPendingSubmissions(allMyPending)
    }

    loadMyPendingSubmissions()
    
    // Set up a timer to refresh this data periodically (every 30 seconds)
    const interval = setInterval(loadMyPendingSubmissions, 30000)
    return () => clearInterval(interval)
  }, [user, sharedLoans])

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

    // Extract all unique party names from loans
    const allParties = loansData
      .map(l => l.lender_name || l.borrower_name)
      .filter((name): name is string => !!name && name.trim() !== '')
    const uniqueParties = [...new Set(allParties)].sort()
    setSavedParties(uniqueParties)

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

  const loadSharedLoans = async () => {
    if (!user) return
    
    // Load loans shared with me
    const sharedQuery = query(
      collection(firebaseDb, 'loanShares'),
      where('shared_with_user_id', '==', user.uid),
      where('status', '==', 'accepted')
    )
    const sharedSnap = await getDocs(sharedQuery)
    const sharedData = sharedSnap.docs.map(d => ({ id: d.id, ...d.data() }) as SharedLoan)
    
    // Load the actual loan data and payment history for each shared loan
    const loansWithData: SharedLoan[] = []
    const sharedPaymentsMap: Record<string, LoanPayment[]> = {}
    
    for (const shared of sharedData) {
      const loanRef = doc(firebaseDb, 'users', shared.owner_user_id, 'loans', shared.loan_id)
      const loanSnap = await getDoc(loanRef)
      if (loanSnap.exists()) {
        loansWithData.push({
          ...shared,
          loan: { id: loanSnap.id, ...loanSnap.data() } as Loan
        })
        
        // Load payment history from owner's collection for this shared loan
        const payQuery = query(
          collection(firebaseDb, 'users', shared.owner_user_id, 'loanPayments'),
          where('loan_id', '==', shared.loan_id),
          orderBy('payment_date', 'desc')
        )
        const paySnap = await getDocs(payQuery)
        sharedPaymentsMap[shared.loan_id] = paySnap.docs.map(d => {
          const paymentData = d.data() as LoanPayment
          return { ...paymentData, id: d.id, owner_user_id: shared.owner_user_id }
        })
      }
    }
    
    setSharedLoans(loansWithData)
    setSharedPayments(sharedPaymentsMap)
  }

  const loadPendingInvites = async () => {
    if (!user) return
    
    // Load invites sent to me
    const invitesQuery = query(
      collection(firebaseDb, 'loanInvites'),
      where('to_user_email', '==', user.email),
      where('status', '==', 'pending')
    )
    const invitesSnap = await getDocs(invitesQuery)
    setPendingInvites(invitesSnap.docs.map(d => ({ id: d.id, ...d.data() }) as LoanInvite))
  }

  const shareLoan = async (loanId: string, email: string) => {
    if (!user) return
    
    // Create invite
    await addDoc(collection(firebaseDb, 'loanInvites'), {
      loan_id: loanId,
      from_user_id: user.uid,
      from_user_email: user.email,
      to_user_email: email,
      status: 'pending',
      created_at: new Date().toISOString()
    })
    
    setShowShareModal(null)
    setShareEmail('')
    alert('Invite sent! The user will see this loan once they accept.')
  }

  const acceptInvite = async (invite: LoanInvite) => {
    if (!user) return
    
    // Create loan share record
    await addDoc(collection(firebaseDb, 'loanShares'), {
      loan_id: invite.loan_id,
      owner_user_id: invite.from_user_id,
      shared_with_user_id: user.uid,
      shared_with_email: user.email,
      status: 'accepted',
      created_at: new Date().toISOString(),
      accepted_at: new Date().toISOString()
    })
    
    // Update invite status
    await updateDoc(doc(firebaseDb, 'loanInvites', invite.id), {
      status: 'accepted'
    })

    // Grant shared user access on the owner's loan document
    await updateDoc(doc(firebaseDb, 'users', invite.from_user_id, 'loans', invite.loan_id), {
      shared_with_user_ids: arrayUnion(user.uid)
    })
    
    loadPendingInvites()
    loadSharedLoans()
  }

  const rejectInvite = async (inviteId: string) => {
    await updateDoc(doc(firebaseDb, 'loanInvites', inviteId), {
      status: 'rejected'
    })
    loadPendingInvites()
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

    // Check if offset mode is enabled
    if (formData.offset_mode && formData.party_name) {
      // Find the opposite loan to offset against
      const oppositeType = formData.loan_type === 'borrowed' ? 'lended' : 'borrowed'
      const oppositeLoans = loans.filter(l => 
        l.status === 'active' && 
        l.loan_type === oppositeType &&
        (oppositeType === 'lended' ? l.borrower_name === formData.party_name : l.lender_name === formData.party_name)
      )
      
      if (oppositeLoans.length > 0) {
        // Sort by remaining amount (largest first)
        oppositeLoans.sort((a, b) => (b.total_amount - b.amount_paid) - (a.total_amount - a.amount_paid))
        const targetLoan = oppositeLoans[0]
        
        // Add payment to offset
        const paymentAmount = Math.min(principal, targetLoan.total_amount - targetLoan.amount_paid)
        
        // Add loan payment record
        await addDoc(collection(firebaseDb, 'users', user.uid, 'loanPayments'), {
          loan_id: targetLoan.id,
          profile_id: currentProfile.id,
          payment_date: formData.loan_date,
          amount_paid: paymentAmount,
          transaction_id: null,
          notes: `Offset from ${formData.loan_type === 'borrowed' ? 'borrowing' : 'lending'} ${principal} MVR`,
          installment_number: targetLoan.installments_paid + 1,
          created_at: new Date().toISOString()
        })
        
        // Update loan amount paid
        await updateDoc(doc(firebaseDb, 'users', user.uid, 'loans', targetLoan.id), {
          amount_paid: targetLoan.amount_paid + paymentAmount,
          installments_paid: targetLoan.installments_paid + 1
        })
        
        // If there's remaining amount after offset, create the new loan for remainder
        const remainingAfterOffset = principal - paymentAmount
        if (remainingAfterOffset > 0) {
          await addDoc(collection(firebaseDb, 'users', user.uid, 'loans'), {
            profile_id: currentProfile.id,
            loan_type: formData.loan_type,
            category: formData.category,
            lender_name: formData.loan_type === 'borrowed' ? formData.party_name : null,
            borrower_name: formData.loan_type === 'lended' ? formData.party_name : null,
            principal_amount: remainingAfterOffset,
            interest_rate: interestRate,
            interest_type: formData.interest_type,
            loan_date: formData.loan_date,
            due_date: formData.due_date || null,
            total_amount: remainingAfterOffset,
            amount_paid: 0,
            emi_amount: formData.emi_amount ? Number(formData.emi_amount) : null,
            total_installments: formData.total_installments ? Number(formData.total_installments) : null,
            installments_paid: 0,
            status: 'active',
            description: `Remaining after offset: ${formData.description || ''}`,
            account_number: formData.account_number || null,
            bank_name: formData.bank_name || null,
            created_at: new Date().toISOString()
          })
        }
        
        setShowAdd(false)
        setFormData({
          loan_type: 'borrowed',
          category: 'individual',
          party_name: '',
          principal_amount: '',
          currency: 'MVR',
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
          offset_mode: false,
          use_calculator: false,
          calculator_amount: '',
          calculator_years: '',
          calculator_rate: '',
          calculator_type: 'simple',
          is_recurring: false,
        })
        loadLoans()
        return
      }
    }

    // Regular loan creation (no offset)
    await addDoc(collection(firebaseDb, 'users', user.uid, 'loans'), {
      profile_id: currentProfile.id,
      loan_type: formData.loan_type,
      category: formData.category,
      lender_name: formData.loan_type === 'borrowed' ? formData.party_name : null,
      borrower_name: formData.loan_type === 'lended' ? formData.party_name : null,
      principal_amount: principal,
      currency: formData.currency || 'MVR',
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
      is_recurring: formData.is_recurring || false,
      created_at: new Date().toISOString()
    })

    setShowAdd(false)
    setFormData({
      loan_type: 'borrowed',
      category: 'individual',
      party_name: '',
      principal_amount: '',
      currency: 'MVR',
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
      offset_mode: false,
      use_calculator: false,
      calculator_amount: '',
      calculator_years: '',
      calculator_rate: '',
      calculator_type: 'simple',
      is_recurring: false,
    })
    loadLoans()
  }

  const openEdit = (loan: Loan, ownerUserId?: string) => {
    setEditFormData({
      loan_type: loan.loan_type,
      profile_id: loan.profile_id,
      category: loan.category || 'individual',
      party_name: loan.loan_type === 'borrowed' ? (loan.lender_name || '') : (loan.borrower_name || ''),
      principal_amount: String(loan.principal_amount ?? ''),
      currency: loan.currency || 'MVR',
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
    setEditOwnerUserId(ownerUserId || user?.uid || null)
    setShowEdit(loan.id)
  }

  const handleUpdateLoan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !showEdit) return
    const ownerUid = editOwnerUserId || user.uid

    const principal = Number(editFormData.principal_amount)
    const interestRate = Number(editFormData.interest_rate)
    let totalAmount = Number(editFormData.total_amount) || principal

    if (!editFormData.total_amount && interestRate > 0 && editFormData.interest_type === 'simple') {
      const years = 1
      totalAmount = principal + (principal * interestRate * years / 100)
    }

    await updateDoc(doc(firebaseDb, 'users', ownerUid, 'loans', showEdit), {
      profile_id: editFormData.profile_id,
      loan_type: editFormData.loan_type,
      category: editFormData.category,
      lender_name: editFormData.loan_type === 'borrowed' ? editFormData.party_name : null,
      borrower_name: editFormData.loan_type === 'lended' ? editFormData.party_name : null,
      principal_amount: principal,
      currency: editFormData.currency || 'MVR',
      interest_rate: interestRate,
      interest_type: editFormData.interest_type,
      loan_date: editFormData.loan_date,
      due_date: editFormData.due_date || null,
      total_amount: totalAmount,
      emi_amount: editFormData.emi_amount ? Number(editFormData.emi_amount) : null,
      total_installments: editFormData.total_installments ? Number(editFormData.total_installments) : null,
      description: editFormData.description || null,
      account_number: editFormData.account_number || null,
      bank_name: editFormData.bank_name || null,
    })

    setShowEdit(null)
    setEditOwnerUserId(null)
    loadLoans()
    loadSharedLoans()
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

  // Handle payment for shared loans - creates pending payment that needs approval
  const handleSharedPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !showSharedPay || !sharedPayOwnerId) return

    const sharedLoan = sharedLoans.find(s => s.loan?.id === showSharedPay)
    if (!sharedLoan || !sharedLoan.loan) {
      alert('Error: Shared loan not found')
      return
    }

    const amount = Number(paymentForm.amount)
    if (!amount || amount <= 0) {
      alert('Error: Please enter a valid amount')
      return
    }

    const loan = sharedLoan.loan

    try {
      // Add PENDING payment record to the OWNER's loanPayments collection
      // This payment needs to be approved by the loan owner
      await addDoc(collection(firebaseDb, 'users', sharedPayOwnerId, 'loanPayments'), {
        loan_id: showSharedPay,
        profile_id: loan.profile_id,
        payment_date: paymentForm.payment_date,
        amount_paid: amount,
        notes: paymentForm.notes || `Payment added by ${user.email}`,
        installment_number: loan.installments_paid + 1,
        status: 'pending',
        added_by_user_id: user.uid,
        added_by_email: user.email,
        approved_by_user_id: null,
        rejection_reason: null,
        created_at: new Date().toISOString()
      })

      // Add notification record for the owner
      await addDoc(collection(firebaseDb, 'users', sharedPayOwnerId, 'notifications'), {
        type: 'payment_pending',
        title: 'New Payment Pending Approval',
        message: `${user.email} added a payment of ${formatMVR(amount)} for loan "${loan.loan_type === 'borrowed' ? loan.lender_name : loan.borrower_name}"`,
        loan_id: showSharedPay,
        payment_amount: amount,
        from_user_id: user.uid,
        from_user_email: user.email,
        status: 'unread',
        created_at: new Date().toISOString()
      })

      setShowSharedPay(null)
      setSharedPayOwnerId(null)
      setPaymentForm({
        amount: '',
        payment_date: new Date().toISOString().slice(0, 10),
        notes: '',
        category_id: '',
      })
      alert('Payment submitted! The loan owner needs to approve it.')
      loadSharedLoans()
    } catch (error: any) {
      console.error('Failed to submit shared payment:', error)
      if (error.code === 'permission-denied') {
        alert('Permission denied. Please make sure you have access to this loan.')
      } else {
        alert(`Error submitting payment: ${error.message}`)
      }
    }
  }

  // Accept a pending payment (called by loan owner)
  const acceptPayment = async (payment: LoanPayment) => {
    if (!user || !payment.id) return

    // Get the loan details
    const loanRef = doc(firebaseDb, 'users', user.uid, 'loans', payment.loan_id)
    const loanSnap = await getDoc(loanRef)
    if (!loanSnap.exists()) return

    const loan = loanSnap.data() as Loan

    // Update payment status to accepted
    await updateDoc(doc(firebaseDb, 'users', user.uid, 'loanPayments', payment.id), {
      status: 'accepted',
      approved_by_user_id: user.uid,
      responded_at: new Date().toISOString()
    })

    // Update loan amount paid
    await updateDoc(loanRef, {
      amount_paid: loan.amount_paid + payment.amount_paid,
      installments_paid: (loan.installments_paid || 0) + 1
    })

    // Create transaction for the payment
    await addDoc(collection(firebaseDb, 'users', user.uid, 'transactions'), {
      profile_id: loan.profile_id,
      type: loan.loan_type === 'borrowed' ? 'income' : 'expense',
      amount: payment.amount_paid,
      description: `Loan Payment Accepted - ${loan.loan_type === 'borrowed' ? loan.lender_name : loan.borrower_name}`,
      transaction_date: payment.payment_date,
      category_id: null,
      created_at: new Date().toISOString()
    })

    // Notify the user who added the payment
    if (payment.added_by_user_id) {
      await addDoc(collection(firebaseDb, 'users', payment.added_by_user_id, 'notifications'), {
        type: 'payment_accepted',
        title: 'Payment Accepted',
        message: `Your payment of ${formatMVR(payment.amount_paid)} for loan "${loan.loan_type === 'borrowed' ? loan.lender_name : loan.borrower_name}" was accepted.`,
        loan_id: payment.loan_id,
        status: 'unread',
        created_at: new Date().toISOString()
      })
    }

    loadLoans()
    alert('Payment accepted! Loan balance updated.')
  }

  // Reject a pending payment (called by loan owner)
  const rejectPayment = async (payment: LoanPayment, reason: string) => {
    if (!user || !payment.id) return

    // Update payment status to rejected
    await updateDoc(doc(firebaseDb, 'users', user.uid, 'loanPayments', payment.id), {
      status: 'rejected',
      approved_by_user_id: null,
      rejection_reason: reason,
      responded_at: new Date().toISOString()
    })

    // Notify the user who added the payment
    if (payment.added_by_user_id) {
      await addDoc(collection(firebaseDb, 'users', payment.added_by_user_id, 'notifications'), {
        type: 'payment_rejected',
        title: 'Payment Rejected',
        message: `Your payment of ${formatMVR(payment.amount_paid)} was rejected. Reason: ${reason}`,
        loan_id: payment.loan_id,
        status: 'unread',
        created_at: new Date().toISOString()
      })
    }

    alert('Payment rejected. The other user will be notified.')
  }

  const deleteLoan = async (id: string) => {
    if (!confirm('Delete this loan? This will also delete all payment records and transactions.')) return
    if (!user) return
    
    // First, get all loan payments for this loan
    const paymentsQuery = query(
      collection(firebaseDb, 'users', user.uid, 'loanPayments'),
      where('loan_id', '==', id)
    )
    const paymentsSnap = await getDocs(paymentsQuery)
    
    // Delete associated transactions and loan payments
    const deletePromises = paymentsSnap.docs.map(async (paymentDoc) => {
      const paymentData = paymentDoc.data()
      // Delete the associated transaction if it exists
      if (paymentData.transaction_id) {
        await deleteDoc(doc(firebaseDb, 'users', user.uid, 'transactions', paymentData.transaction_id))
        // Track deleted transaction ID in localStorage for dashboard display
        try {
          const stored = localStorage.getItem('deletedTransactionIds')
          const deletedIds = stored ? JSON.parse(stored) : []
          if (!deletedIds.includes(paymentData.transaction_id)) {
            deletedIds.push(paymentData.transaction_id)
            if (deletedIds.length > 100) deletedIds.shift()
            localStorage.setItem('deletedTransactionIds', JSON.stringify(deletedIds))
          }
        } catch (e) {
          console.error('Failed to track deleted transaction:', e)
        }
      }
      // Delete the loan payment record
      await deleteDoc(doc(firebaseDb, 'users', user.uid, 'loanPayments', paymentDoc.id))
    })
    
    await Promise.all(deletePromises)
    
    // Finally, delete the loan itself
    await deleteDoc(doc(firebaseDb, 'users', user.uid, 'loans', id))
    loadLoans()
  }

  // Calculate net balance per person
  const netBalances = loans
    .filter(l => l.status === 'active')
    .reduce((acc, loan) => {
      const partyName = loan.loan_type === 'borrowed' ? loan.lender_name : loan.borrower_name
      if (!partyName) return acc
      
      const remaining = loan.total_amount - loan.amount_paid
      if (!acc[partyName]) {
        acc[partyName] = { lent: 0, borrowed: 0 }
      }
      
      if (loan.loan_type === 'lended') {
        acc[partyName].lent += remaining
      } else {
        acc[partyName].borrowed += remaining
      }
      
      return acc
    }, {} as Record<string, { lent: number; borrowed: number }>)

  // Convert to array and calculate net
  const netBalanceList = Object.entries(netBalances)
    .map(([name, amounts]) => ({
      name,
      lent: amounts.lent,
      borrowed: amounts.borrowed,
      net: amounts.lent - amounts.borrowed // positive = they owe you, negative = you owe them
    }))
    .filter(p => p.net !== 0) // Only show if there's a balance
    .sort((a, b) => Math.abs(b.net) - Math.abs(a.net)) // Sort by largest balance first
  // Filter loans by date range
  const filteredLoans = useMemo(() => {
    if (dateFilterType === 'all') return loans
    
    return loans.filter(loan => {
      const loanDate = loan.loan_date
      
      if (dateFilterType === 'month' && selectedMonth) {
        return loanDate.startsWith(selectedMonth)
      }
      
      if (dateFilterType === 'custom') {
        if (customStartDate && loanDate < customStartDate) return false
        if (customEndDate && loanDate > customEndDate) return false
        return true
      }
      
      return true
    })
  }, [loans, dateFilterType, selectedMonth, customStartDate, customEndDate])

  // Update derived lists based on filtered loans
  const filteredBorrowedLoans = filteredLoans.filter(l => l.loan_type === 'borrowed' && l.status === 'active')
  const filteredLendedLoans = filteredLoans.filter(l => l.loan_type === 'lended' && l.status === 'active')

  const totalBorrowed = filteredBorrowedLoans.reduce((sum, l) => sum + l.principal_amount, 0)
  const totalBorrowedPaid = filteredBorrowedLoans.reduce((sum, l) => sum + l.amount_paid, 0)
  const totalBorrowedRemaining = filteredBorrowedLoans.reduce((sum, l) => sum + (l.total_amount - l.amount_paid), 0)

  const totalLended = filteredLendedLoans.reduce((sum, l) => sum + l.principal_amount, 0)
  const totalLendedReceived = filteredLendedLoans.reduce((sum, l) => sum + l.amount_paid, 0)
  const totalLendedOutstanding = filteredLendedLoans.reduce((sum, l) => sum + (l.total_amount - l.amount_paid), 0)

  // Credit Card Loans calculation
  const creditCardLoans = loans.filter(l => l.category === 'credit_card' && l.status === 'active')
  const totalCreditCardDebt = creditCardLoans.reduce((sum, l) => sum + (l.total_amount - l.amount_paid), 0)

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

      {/* Tab Navigation */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('my')}
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === 'my'
              ? 'text-emerald-600 border-b-2 border-emerald-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          My Loans
        </button>
        <button
          onClick={() => setActiveTab('shared')}
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === 'shared'
              ? 'text-emerald-600 border-b-2 border-emerald-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Shared Loans ({sharedLoans.length})
        </button>
      </div>

      {/* Date Range Filter */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm font-medium text-gray-700">Filter by Date</span>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setDateFilterType('all')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
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
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                dateFilterType === 'month'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Month
            </button>
            <button
              type="button"
              onClick={() => setDateFilterType('custom')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                dateFilterType === 'custom'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Custom
            </button>
          </div>
        </div>

        {dateFilterType === 'month' && (
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
        )}

        {dateFilterType === 'custom' && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Start Date</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">End Date</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>
        )}
      </div>

      {/* Pending Invites */}
      {pendingInvites.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">Pending Loan Invites</h3>
          <div className="space-y-2">
            {pendingInvites.map(invite => (
              <div key={invite.id} className="flex items-center justify-between bg-white rounded-lg p-3">
                <div>
                  <p className="text-sm font-medium">From: {invite.from_user_email}</p>
                  <p className="text-xs text-gray-500">Loan ID: {invite.loan_id.slice(0, 8)}...</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => acceptInvite(invite)}
                    className="px-3 py-1 bg-emerald-600 text-white text-xs rounded-lg hover:bg-emerald-700"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => rejectInvite(invite.id)}
                    className="px-3 py-1 bg-red-100 text-red-600 text-xs rounded-lg hover:bg-red-200"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending Payments - Need Approval */}
      {pendingPayments.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-yellow-900 mb-2">
            Pending Payments (Need Your Approval)
          </h3>
          <div className="space-y-2">
            {pendingPayments.map(payment => {
              // Look for loan in both own loans and shared loans
              const loan = loans.find(l => l.id === payment.loan_id) || sharedLoans.find(s => s.loan?.id === payment.loan_id)?.loan
              return (
                <div key={payment.id} className="flex items-center justify-between bg-white rounded-lg p-3">
                  <div>
                    <p className="text-sm font-medium">
                      {payment.added_by_email} paid {formatMVR(payment.amount_paid)}
                    </p>
                    <p className="text-xs text-gray-500">
                      For: {loan?.loan_type === 'borrowed' ? loan?.lender_name : loan?.borrower_name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {payment.payment_date}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => acceptPayment(payment)}
                      className="px-3 py-1 bg-emerald-600 text-white text-xs rounded-lg hover:bg-emerald-700"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => {
                        const reason = prompt('Reason for rejecting this payment:')
                        if (reason) rejectPayment(payment, reason)
                      }}
                      className="px-3 py-1 bg-red-100 text-red-600 text-xs rounded-lg hover:bg-red-200"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* My Pending Submissions - Waiting for Owner Approval */}
      {myPendingSubmissions.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-orange-900 mb-2">
            My Pending Submissions (Waiting for Approval)
          </h3>
          <div className="space-y-2">
            {myPendingSubmissions.map(payment => {
              const loan = sharedLoans.find(s => s.loan?.id === payment.loan_id)?.loan
              return (
                <div key={payment.id} className="flex items-center justify-between bg-white rounded-lg p-3">
                  <div>
                    <p className="text-sm font-medium">
                      You paid {formatMVR(payment.amount_paid)}
                    </p>
                    <p className="text-xs text-gray-500">
                      For: {loan?.loan_type === 'borrowed' ? loan?.lender_name : loan?.borrower_name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {payment.payment_date}
                    </p>
                  </div>
                  <div className="px-3 py-1 bg-orange-100 text-orange-700 text-xs rounded-lg">
                    Waiting for approval
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
      {netBalanceList.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <ArrowRightLeft size={16} />
            Net Balance by Person
          </h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {netBalanceList.map(person => (
              <div 
                key={person.name}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  person.net > 0 ? 'bg-emerald-50' : 'bg-red-50'
                }`}
              >
                <div>
                  <p className="font-medium text-gray-900">{person.name}</p>
                  <p className="text-xs text-gray-500">
                    {person.lent > 0 && `You lent: ${formatMVR(person.lent)}`}
                    {person.lent > 0 && person.borrowed > 0 && ' · '}
                    {person.borrowed > 0 && `You borrowed: ${formatMVR(person.borrowed)}`}
                  </p>
                </div>
                <div className={`text-right ${person.net > 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                  <p className="font-bold">
                    {person.net > 0 ? '+' : '-'}{formatMVR(Math.abs(person.net))}
                  </p>
                  <p className="text-xs">
                    {person.net > 0 ? 'owes you' : 'you owe'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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

      {/* Credit Card Balance Section */}
      {creditCardLoans.length > 0 && (
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <CreditCard className="text-indigo-600" size={20} />
            <span className="text-sm font-medium text-indigo-900">Credit Card Balance</span>
          </div>
          <div className="space-y-2">
            {creditCardLoans.map(loan => (
              <div key={loan.id} className="flex items-center justify-between bg-white/70 rounded-lg p-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{loan.card_name || loan.lender_name}</p>
                  <p className="text-xs text-gray-500">Outstanding Balance</p>
                </div>
                <p className="text-lg font-bold text-indigo-700">{formatMVR(loan.total_amount - loan.amount_paid)}</p>
              </div>
            ))}
            {creditCardLoans.length > 1 && (
              <div className="flex items-center justify-between pt-2 border-t border-indigo-200">
                <p className="text-sm font-medium text-indigo-900">Total Credit Card Debt</p>
                <p className="text-xl font-bold text-indigo-700">{formatMVR(totalCreditCardDebt)}</p>
              </div>
            )}
          </div>
        </div>
      )}

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
          {activeTab === 'my' && filteredBorrowedLoans.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Borrowed (You Owe)</h3>
              {filteredBorrowedLoans.map(loan => (
                <LoanCard
                  key={loan.id}
                  loan={loan}
                  onPay={() => setShowPay(loan.id)}
                  onDetails={() => {
                    setSelectedDetailsLoan(null)
                    setShowDetails(loan.id)
                  }}
                  onEdit={() => openEdit(loan)}
                  onDelete={() => deleteLoan(loan.id)}
                  onShare={() => setShowShareModal(loan.id)}
                />
              ))}
            </div>
          )}

          {/* Active Lended Loans */}
          {activeTab === 'my' && filteredLendedLoans.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Lended (Owed to You)</h3>
              {filteredLendedLoans.map(loan => (
                <LoanCard
                  key={loan.id}
                  loan={loan}
                  onPay={() => setShowPay(loan.id)}
                  onDetails={() => {
                    setSelectedDetailsLoan(null)
                    setShowDetails(loan.id)
                  }}
                  onEdit={() => openEdit(loan)}
                  onDelete={() => deleteLoan(loan.id)}
                  onShare={() => setShowShareModal(loan.id)}
                />
              ))}
            </div>
          )}

          {/* Shared Loans */}
          {activeTab === 'shared' && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Shared With You</h3>
              {sharedLoans.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Share2 size={32} className="mx-auto mb-2 opacity-50" />
                  <p>No shared loans yet</p>
                  <p className="text-xs">When someone shares a loan with you, it will appear here</p>
                </div>
              ) : (
                sharedLoans.map(shared => (
                  <LoanCard
                    key={shared.id}
                    loan={shared.loan!}
                    onPay={() => {
                      setShowSharedPay(shared.loan!.id)
                      setSharedPayOwnerId(shared.owner_user_id)
                    }}
                    onDetails={() => {
                      setSelectedDetailsLoan(shared.loan!)
                      setShowDetails(shared.loan!.id)
                    }}
                    onEdit={() => openEdit(shared.loan!, shared.owner_user_id)}
                    onDelete={() => {}}
                  />
                ))
              )}
            </div>
          )}

          {/* Paid/Closed Loans */}
          {filteredLoans.filter(l => l.status === 'paid').length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Paid Off</h3>
              {filteredLoans.filter(l => l.status === 'paid').map(loan => (
                <LoanCard
                  key={loan.id}
                  loan={loan}
                  onPay={() => {}}
                  onDetails={() => {
                    setSelectedDetailsLoan(null)
                    setShowDetails(loan.id)
                  }}
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
          savedParties={savedParties}
          netBalanceList={netBalanceList}
        />
      )}

      {showEdit && (
        <EditLoanModal
          formData={editFormData}
          setFormData={setEditFormData}
          onSubmit={handleUpdateLoan}
          onClose={() => setShowEdit(null)}
          profiles={profiles}
          savedParties={savedParties}
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

      {/* Shared Loan Payment Modal */}
      {showSharedPay && sharedPayOwnerId && (
        <PaymentModal
          loan={sharedLoans.find(s => s.loan?.id === showSharedPay)?.loan!}
          categories={categories}
          formData={paymentForm}
          setFormData={setPaymentForm}
          onSubmit={handleSharedPayment}
          onClose={() => {
            setShowSharedPay(null)
            setSharedPayOwnerId(null)
          }}
        />
      )}

      {/* Share Loan Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Share Loan</h2>
              <button onClick={() => setShowShareModal(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Share this loan with another user. They will be able to see and edit the loan details.
              </p>

              <div>
                <label className="text-sm text-gray-600">User Email</label>
                <input
                  type="email"
                  value={shareEmail}
                  onChange={(e) => setShareEmail(e.target.value)}
                  placeholder="Enter email address"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-1"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowShareModal(null)}
                  className="flex-1 py-2 border border-gray-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={() => shareLoan(showShareModal, shareEmail)}
                  disabled={!shareEmail}
                  className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  Send Invite
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetails && (
        <DetailsModal
          loan={selectedDetailsLoan || loans.find(l => l.id === showDetails) || sharedLoans.find(s => s.loan?.id === showDetails)?.loan!}
          payments={
            // Check if it's a shared loan first, use sharedPayments
            sharedPayments[showDetails] || 
            // Otherwise use own payments
            payments[showDetails] || 
            []
          }
          onClose={() => {
            setShowDetails(null)
            setSelectedDetailsLoan(null)
          }}
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
  onDelete,
  onShare
}: {
  loan: Loan
  onPay: () => void
  onDetails: () => void
  onEdit: () => void
  onDelete: () => void
  onShare?: () => void
}) {
  const remaining = loan.total_amount - loan.amount_paid
  const progress = Math.min(100, (loan.amount_paid / loan.total_amount) * 100)

  return (
    <div 
      className="bg-white rounded-xl p-4 border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
      onClick={onDetails}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`px-2 py-0.5 rounded-full text-xs ${getStatusColor(loan.status)}`}>
              {loan.status}
            </span>
            <span className="text-xs text-gray-500">{loan.category}</span>
            <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{loan.currency || 'MVR'}</span>
            {loan.is_recurring && (
              <span className="text-xs font-medium text-purple-600 bg-purple-50 px-2 py-0.5 rounded flex items-center gap-1">
                ⟳ Monthly
              </span>
            )}
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

        <div className="text-right ml-3" onClick={(e) => e.stopPropagation()}>
          <p className="font-bold text-gray-900">{loan.principal_amount.toLocaleString()} <span className="text-sm text-gray-500">{loan.currency || 'MVR'}</span></p>
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
          {onShare && (
            <button
              onClick={onShare}
              className="mt-2 ml-1 p-1 text-blue-600 hover:bg-blue-50 rounded"
              title="Share loan"
            >
              <Share2 size={16} />
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
  onClose,
  savedParties,
  netBalanceList
}: {
  formData: any
  setFormData: (data: any) => void
  onSubmit: (e: React.FormEvent) => void
  onClose: () => void
  savedParties: string[]
  netBalanceList: { name: string; lent: number; borrowed: number; net: number }[]
}) {
  // Find net balance for selected party
  const selectedPartyBalance = netBalanceList.find(p => p.name === formData.party_name)
  const showNetWarning = selectedPartyBalance && (
    (formData.loan_type === 'borrowed' && selectedPartyBalance.net > 0) ||
    (formData.loan_type === 'lended' && selectedPartyBalance.net < 0)
  )
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
              list="party-list"
              required
            />
            <datalist id="party-list">
              {savedParties.map((name: string) => (
                <option key={name} value={name} />
              ))}
            </datalist>
            
            {/* Net Balance Warning & Offset Option */}
            {showNetWarning && selectedPartyBalance && (
              <div className={`mt-2 p-3 rounded-lg text-sm ${
                formData.loan_type === 'borrowed' ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'
              }`}>
                <p className="font-medium">
                  {formData.loan_type === 'borrowed' 
                    ? `${selectedPartyBalance.name} currently owes you ${formatMVR(selectedPartyBalance.net)}`
                    : `You currently owe ${selectedPartyBalance.name} ${formatMVR(Math.abs(selectedPartyBalance.net))}`
                  }
                </p>
                
                {/* Offset Mode Checkbox */}
                <label className="flex items-center gap-2 mt-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.offset_mode}
                    onChange={(e) => setFormData({ ...formData, offset_mode: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <span className="text-xs">
                    Offset this amount against existing balance
                  </span>
                </label>
                
                {formData.offset_mode && (
                  <p className="text-xs mt-1 text-gray-600">
                    {formData.loan_type === 'borrowed'
                      ? `After offset: ${selectedPartyBalance.name} will owe you ${formatMVR(Math.max(0, selectedPartyBalance.net - Number(formData.principal_amount || 0)))}`
                      : `After offset: You will owe ${selectedPartyBalance.name} ${formatMVR(Math.max(0, Math.abs(selectedPartyBalance.net) - Number(formData.principal_amount || 0)))}`
                    }
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Loan Calculator Toggle */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.use_calculator}
                onChange={(e) => setFormData({ ...formData, use_calculator: e.target.checked })}
                className="rounded border-gray-300"
              />
              <span className="text-sm font-medium text-blue-700">Use Loan Calculator</span>
            </label>
            <p className="text-xs text-blue-600 mt-1">Auto-calculate EMI and installments</p>
          </div>

          {/* Loan Calculator Fields */}
          {formData.use_calculator && (
            <div className="space-y-3 border-l-4 border-blue-400 pl-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-gray-600">Loan Amount (MVR)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.calculator_amount}
                    onChange={(e) => setFormData({ ...formData, calculator_amount: e.target.value })}
                    placeholder="Total amount"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600">Years</label>
                  <input
                    type="number"
                    value={formData.calculator_years}
                    onChange={(e) => setFormData({ ...formData, calculator_years: e.target.value })}
                    placeholder="e.g., 2"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-1"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-gray-600">Interest Rate (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.calculator_rate}
                    onChange={(e) => setFormData({ ...formData, calculator_rate: e.target.value })}
                    placeholder="e.g., 6"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600">Interest Type</label>
                  <select
                    value={formData.calculator_type}
                    onChange={(e) => setFormData({ ...formData, calculator_type: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-1"
                  >
                    <option value="simple">Simple</option>
                    <option value="compound">Compound (Monthly)</option>
                  </select>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  const P = Number(formData.calculator_amount) || 0
                  const years = Number(formData.calculator_years) || 0
                  const r = (Number(formData.calculator_rate) || 0) / 100
                  const months = years * 12
                  
                  if (P > 0 && years > 0) {
                    let totalAmount = P
                    if (formData.calculator_type === 'simple') {
                      totalAmount = P + (P * r * years)
                    } else {
                      // Compound monthly
                      totalAmount = P * Math.pow(1 + r / 12, months)
                    }
                    
                    const emi = totalAmount / months
                    
                    setFormData({
                      ...formData,
                      principal_amount: String(P),
                      total_amount: String(Math.round(totalAmount * 100) / 100),
                      emi_amount: String(Math.round(emi * 100) / 100),
                      total_installments: String(months),
                      interest_rate: String(formData.calculator_rate),
                      interest_type: formData.calculator_type
                    })
                  }
                }}
                className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
              >
                Calculate EMI
              </button>

              {(formData.emi_amount || formData.total_installments) && (
                <div className="bg-emerald-50 rounded-lg p-3 space-y-1">
                  <p className="text-sm"><strong>Total Amount:</strong> {formatMVR(Number(formData.total_amount) || 0)}</p>
                  <p className="text-sm"><strong>Monthly EMI:</strong> {formatMVR(Number(formData.emi_amount) || 0)}</p>
                  <p className="text-sm"><strong>Installments:</strong> {formData.total_installments} months</p>
                </div>
              )}
            </div>
          )}

          {/* Principal Amount with Currency */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="text-sm text-gray-600">Principal Amount</label>
              <input
                type="number"
                step="0.01"
                value={formData.principal_amount}
                onChange={(e) => setFormData({ ...formData, principal_amount: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-1"
                required
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">Currency</label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-1"
              >
                <option value="MVR">MVR</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="INR">INR</option>
              </select>
            </div>
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

          {/* Recurring Payment Reminder */}
          {formData.emi_amount && formData.loan_type === 'borrowed' && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_recurring}
                  onChange={(e) => setFormData({ ...formData, is_recurring: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <span className="text-sm font-medium text-purple-700">Monthly Payment Reminder</span>
              </label>
              <p className="text-xs text-purple-600 mt-1">
                Remind me to pay {formatMVR(Number(formData.emi_amount) || 0)} every month
              </p>
            </div>
          )}

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
