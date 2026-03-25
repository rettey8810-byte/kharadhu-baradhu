import { useEffect, useState } from 'react'
import { useProfile } from '../hooks/useProfile'
import { useAuth } from '../hooks/useAuth'
import { firebaseDb } from '../lib/firebase'
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore'
import type { ExpenseProfile } from '../types'
import { TrendingDown, Calendar, Wallet, Target, Pencil } from 'lucide-react'

function formatMVR(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'MVR' }).format(value)
}

interface ProfileStats {
  totalSpent: number
  transactionCount: number
  avgPerDay: number
  daysActive: number
  topCategory: string | null
  topCategoryAmount: number
}

function useProfileStats(profileId: string | undefined) {
  const { user } = useAuth()
  const [stats, setStats] = useState<ProfileStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user || !profileId) {
      setLoading(false)
      return
    }

    const load = async () => {
      setLoading(true)
      
      const q = query(
        collection(firebaseDb, 'users', user.uid, 'transactions'),
        where('profile_id', '==', profileId),
        where('type', '==', 'expense'),
        orderBy('transaction_date', 'asc')
      )
      const snap = await getDocs(q)
      const transactions = snap.docs.map(d => d.data())

      if (!transactions || transactions.length === 0) {
        setStats({
          totalSpent: 0,
          transactionCount: 0,
          avgPerDay: 0,
          daysActive: 0,
          topCategory: null,
          topCategoryAmount: 0,
        })
        setLoading(false)
        return
      }

      const totalSpent = transactions.reduce((sum, t) => sum + Number(t.amount), 0)
      const transactionCount = transactions.length

      // Parse dates with Firestore Timestamp support
      const parseDate = (value: any): Date | null => {
        if (!value) return null
        if (value?.toDate && typeof value.toDate === 'function') {
          return value.toDate()
        }
        if (typeof value === 'string') {
          const d = new Date(value)
          return isNaN(d.getTime()) ? null : d
        }
        if (value instanceof Date) {
          return isNaN(value.getTime()) ? null : value
        }
        return null
      }

      const dates = transactions
        .map(t => parseDate(t.transaction_date))
        .filter((d): d is Date => d !== null)

      let daysActive = 1
      let avgPerDay = 0

      if (dates.length > 0) {
        const firstDate = new Date(Math.min(...dates.map(d => d.getTime())))
        const lastDate = new Date(Math.max(...dates.map(d => d.getTime())))
        daysActive = Math.max(1, Math.ceil((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)) + 1)
        
        // Calculate avg/day based on days elapsed in current month (not just days with transactions)
        const today = new Date()
        const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1)
        const daysElapsedThisMonth = Math.max(1, Math.ceil((today.getTime() - currentMonthStart.getTime()) / (1000 * 60 * 60 * 24)))
        avgPerDay = totalSpent / daysElapsedThisMonth
      }

      // Load categories for names
      const catSnap = await getDocs(collection(firebaseDb, 'users', user.uid, 'categories'))
      const categoryById = new Map(catSnap.docs.map(d => [d.id, d.data().name]))

      const categoryTotals: Record<string, number> = {}
      transactions.forEach(t => {
        const catName = categoryById.get(t.category_id) || 'Uncategorized'
        categoryTotals[catName] = (categoryTotals[catName] || 0) + Number(t.amount)
      })
      
      const topCategoryEntry = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0]
      const topCategory = topCategoryEntry?.[0] || null
      const topCategoryAmount = topCategoryEntry?.[1] || 0

      setStats({
        totalSpent,
        transactionCount,
        avgPerDay,
        daysActive,
        topCategory,
        topCategoryAmount,
      })
      setLoading(false)
    }

    load()
  }, [profileId, user])

  return { stats, loading }
}

function ProfileCard({ profile, isActive, onClick, onEdit }: { 
  profile: ExpenseProfile
  isActive: boolean
  onClick: () => void
  onEdit: () => void
}) {
  const { stats, loading } = useProfileStats(profile.id)

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left rounded-2xl border-2 p-4 transition-all ${
        isActive 
          ? 'border-emerald-500 bg-emerald-50 shadow-md' 
          : 'border-gray-200 bg-white hover:border-emerald-300'
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="font-bold text-gray-900">{profile.name}</div>
          <div className="text-xs text-gray-500 uppercase tracking-wide">{profile.type}</div>
        </div>
        <div className="flex items-center gap-2">
          {isActive && (
            <span className="text-xs bg-emerald-500 text-white px-2 py-1 rounded-full font-medium">
              Active
            </span>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onEdit()
            }}
            className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
            title="Edit profile"
          >
            <Pencil size={16} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="mt-4 space-y-2 animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-24"></div>
          <div className="h-3 bg-gray-200 rounded w-32"></div>
        </div>
      ) : stats ? (
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-2">
            <TrendingDown size={16} className="text-red-500" />
            <span className="text-sm text-gray-600">Total spent:</span>
            <span className="font-semibold text-gray-900">{formatMVR(stats.totalSpent)}</span>
          </div>

          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-blue-500" />
            <span className="text-sm text-gray-600">Avg/day:</span>
            <span className="font-semibold text-gray-900">{formatMVR(stats.avgPerDay)}</span>
          </div>

          <div className="flex items-center gap-2">
            <Wallet size={16} className="text-emerald-500" />
            <span className="text-sm text-gray-600">Transactions:</span>
            <span className="font-semibold text-gray-900">{stats.transactionCount}</span>
          </div>

          {stats.topCategory && (
            <div className="flex items-center gap-2">
              <Target size={16} className="text-purple-500" />
              <span className="text-sm text-gray-600">Top:</span>
              <span className="font-semibold text-gray-900">{stats.topCategory}</span>
              <span className="text-xs text-gray-500">({formatMVR(stats.topCategoryAmount)})</span>
            </div>
          )}

          <div className="pt-2 border-t border-gray-100">
            <span className="text-xs text-gray-400">
              Active for {stats.daysActive} day{stats.daysActive !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      ) : null}
    </button>
  )
}

export default function Profiles() {
  const { profiles, currentProfile, setCurrentProfile, createProfile, updateProfile } = useProfile()
  const [name, setName] = useState('')
  const [type, setType] = useState<'personal' | 'family' | 'business'>('personal')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Edit modal state
  const [editingProfile, setEditingProfile] = useState<ExpenseProfile | null>(null)
  const [editName, setEditName] = useState('')
  const [editType, setEditType] = useState<'personal' | 'family' | 'business'>('personal')
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  const add = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await createProfile(name.trim(), type)
      setName('')
      setType('personal')
    } catch (err: any) {
      setError(err?.message ?? 'Failed to create profile')
    } finally {
      setLoading(false)
    }
  }

  const startEdit = (profile: ExpenseProfile) => {
    setEditingProfile(profile)
    setEditName(profile.name)
    setEditType(profile.type)
    setEditError(null)
  }

  const cancelEdit = () => {
    setEditingProfile(null)
    setEditName('')
    setEditType('personal')
    setEditError(null)
  }

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingProfile) return
    
    setEditError(null)
    setEditLoading(true)
    try {
      await updateProfile(editingProfile.id, editName.trim(), editType)
      setEditingProfile(null)
      setEditName('')
      setEditType('personal')
    } catch (err: any) {
      setEditError(err?.message ?? 'Failed to update profile')
    } finally {
      setEditLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="text-lg font-semibold text-gray-900">Profiles</div>
        <div className="text-sm text-gray-500">View spending stats and switch between profiles.</div>
      </div>

      <div className="space-y-3">
        {profiles.map((p: ExpenseProfile) => (
          <ProfileCard
            key={p.id}
            profile={p}
            isActive={currentProfile?.id === p.id}
            onClick={() => setCurrentProfile(p)}
            onEdit={() => startEdit(p)}
          />
        ))}
      </div>

      {/* Edit Profile Modal */}
      {editingProfile && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <form 
            onSubmit={saveEdit}
            className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Edit Profile</h3>
              <button
                type="button"
                onClick={cancelEdit}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-600">Name</label>
                <input
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="e.g. Family"
                  required
                />
              </div>

              <div>
                <label className="text-sm text-gray-600">Type</label>
                <select
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2"
                  value={editType}
                  onChange={(e) => setEditType(e.target.value as any)}
                >
                  <option value="personal">Personal</option>
                  <option value="family">Family</option>
                  <option value="business">Business</option>
                </select>
              </div>

              {editError && <div className="text-sm text-red-600">{editError}</div>}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={cancelEdit}
                className="flex-1 border border-gray-200 text-gray-700 rounded-lg px-4 py-2 font-semibold hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-4 py-2 font-semibold disabled:opacity-60"
                disabled={editLoading}
              >
                {editLoading ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      <form onSubmit={add} className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3">
        <div className="font-semibold text-gray-900">Add profile</div>
        <div className="grid grid-cols-1 gap-3">
          <div>
            <label className="text-sm text-gray-600">Name</label>
            <input
              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Family"
              required
            />
          </div>

          <div>
            <label className="text-sm text-gray-600">Type</label>
            <select
              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2"
              value={type}
              onChange={(e) => setType(e.target.value as any)}
            >
              <option value="personal">Personal</option>
              <option value="family">Family</option>
              <option value="business">Business</option>
            </select>
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}

          <button
            type="submit"
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-3 py-2 font-semibold disabled:opacity-60"
            disabled={loading}
          >
            {loading ? 'Adding…' : 'Add profile'}
          </button>
        </div>
      </form>
    </div>
  )
}
