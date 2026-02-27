import { useEffect, useState } from 'react'
import { useProfile } from '../hooks/useProfile'
import { supabase } from '../lib/supabase'
import type { ExpenseProfile } from '../types'
import { TrendingDown, Calendar, Wallet, Target } from 'lucide-react'

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
  const [stats, setStats] = useState<ProfileStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profileId) {
      setLoading(false)
      return
    }

    const load = async () => {
      setLoading(true)
      
      const { data: transactions } = await supabase
        .from('transactions')
        .select('*, category:category_id(name)')
        .eq('profile_id', profileId)
        .eq('type', 'expense')
        .order('transaction_date', { ascending: true })

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

      const dates = transactions.map(t => new Date(t.transaction_date))
      const firstDate = new Date(Math.min(...dates.map(d => d.getTime())))
      const lastDate = new Date(Math.max(...dates.map(d => d.getTime())))
      const daysActive = Math.max(1, Math.ceil((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)) + 1)
      const avgPerDay = totalSpent / daysActive

      const categoryTotals: Record<string, number> = {}
      transactions.forEach(t => {
        const catName = (t.category as any)?.name || 'Uncategorized'
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
  }, [profileId])

  return { stats, loading }
}

function ProfileCard({ profile, isActive, onClick }: { 
  profile: ExpenseProfile
  isActive: boolean
  onClick: () => void 
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
        {isActive && (
          <span className="text-xs bg-emerald-500 text-white px-2 py-1 rounded-full font-medium">
            Active
          </span>
        )}
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
  const { profiles, currentProfile, setCurrentProfile, createProfile } = useProfile()
  const [name, setName] = useState('')
  const [type, setType] = useState<'personal' | 'family' | 'business'>('personal')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
          />
        ))}
      </div>

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
