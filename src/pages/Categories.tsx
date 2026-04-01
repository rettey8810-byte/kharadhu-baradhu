import { useEffect, useState } from 'react'
import { firebaseDb } from '../lib/firebase'
import { collection, query, where, getDocs, addDoc, doc, updateDoc, orderBy } from 'firebase/firestore'
import { useProfile } from '../hooks/useProfile'
import { useAuth } from '../hooks/useAuth'
import type { ExpenseCategory } from '../types'
import { Wand2 } from 'lucide-react'

// Default categories for new profiles
const DEFAULT_CATEGORIES = [
  { name: 'Groceries', color: '#22C55E', icon: 'shopping-cart' },
  { name: 'Food & Dining', color: '#EF4444', icon: 'utensils' },
  { name: 'Transport', color: '#3B82F6', icon: 'car' },
  { name: 'Utilities', color: '#F59E0B', icon: 'bolt' },
  { name: 'Entertainment', color: '#8B5CF6', icon: 'film' },
  { name: 'Shopping', color: '#EC4899', icon: 'shopping-bag' },
  { name: 'Health', color: '#10B981', icon: 'heart' },
  { name: 'Education', color: '#6366F1', icon: 'graduation-cap' },
  { name: 'Home', color: '#14B8A6', icon: 'home' },
  { name: 'Other', color: '#6B7280', icon: 'circle' }
]

export default function Categories() {
  const { currentProfile } = useProfile()
  const { user } = useAuth()
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    if (!user || !currentProfile) return
    const q = query(
      collection(firebaseDb, 'users', user.uid, 'categories'),
      where('profile_id', '==', currentProfile.id),
      orderBy('sort_order')
    )
    const snap = await getDocs(q)
    setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() }) as ExpenseCategory))
  }

  useEffect(() => {
    load()
  }, [currentProfile, user])

  const add = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !currentProfile) return

    setError(null)
    setLoading(true)

    try {
      await addDoc(collection(firebaseDb, 'users', user.uid, 'categories'), {
        profile_id: currentProfile.id,
        name: name.trim(),
        sort_order: categories.length + 1,
        is_archived: false,
        created_at: new Date().toISOString()
      })
      setName('')
      await load()
    } catch (err: any) {
      setError(err?.message ?? 'Failed to add category')
    } finally {
      setLoading(false)
    }
  }

  const createDefaults = async () => {
    if (!user || !currentProfile) return
    setLoading(true)
    setError(null)
    try {
      const now = new Date().toISOString()
      const existingNames = new Set(categories.map(c => c.name.toLowerCase()))
      
      const promises = DEFAULT_CATEGORIES
        .filter(cat => !existingNames.has(cat.name.toLowerCase()))
        .map((cat, index) => 
          addDoc(collection(firebaseDb, 'users', user.uid, 'categories'), {
            profile_id: currentProfile.id,
            name: cat.name,
            color: cat.color,
            icon: cat.icon,
            is_default: true,
            is_archived: false,
            sort_order: categories.length + index + 1,
            created_at: now,
            updated_at: now
          })
        )
      
      await Promise.all(promises)
      await load()
    } catch (err: any) {
      setError(err?.message ?? 'Failed to create default categories')
    } finally {
      setLoading(false)
    }
  }

  const toggleArchive = async (category: ExpenseCategory) => {
    if (!user) return
    const ref = doc(firebaseDb, 'users', user.uid, 'categories', category.id)
    await updateDoc(ref, { is_archived: !category.is_archived })
    await load()
  }

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-200 rounded-2xl p-4">
        <div className="text-lg font-semibold">Categories</div>
        <form onSubmit={add} className="mt-3 flex gap-2">
          <input
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="New category name"
            required
          />
          <button
            type="submit"
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-4 py-2 font-semibold disabled:opacity-60"
            disabled={loading}
          >
            Add
          </button>
        </form>
        {error && <div className="text-sm text-red-600 mt-2">{error}</div>}
      </div>

      {categories.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 text-amber-800 font-medium mb-2">
            <Wand2 size={18} />
            No categories found
          </div>
          <p className="text-sm text-amber-700 mb-3">
            You don't have any categories yet. Create default categories to get started quickly.
          </p>
          <button
            onClick={createDefaults}
            disabled={loading}
            className="w-full bg-amber-600 hover:bg-amber-700 text-white rounded-lg px-4 py-2 font-semibold disabled:opacity-60 flex items-center justify-center gap-2"
          >
            <Wand2 size={16} />
            {loading ? 'Creating...' : 'Create Default Categories'}
          </button>
          {error && <div className="text-sm text-red-600 mt-2">{error}</div>}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-2xl p-4">
        <div className="font-semibold">All categories</div>
        <div className="mt-3 divide-y">
          {categories.map(c => (
            <div key={c.id} className="py-2 flex items-center justify-between">
              <div>
                <div className={`font-medium ${c.is_archived ? 'text-gray-400' : 'text-gray-900'}`}>{c.name}</div>
                <div className="text-xs text-gray-500">{c.is_archived ? 'Archived' : 'Active'}</div>
              </div>
              <button
                type="button"
                className="text-sm text-gray-600 hover:text-gray-900"
                onClick={() => toggleArchive(c)}
              >
                {c.is_archived ? 'Unarchive' : 'Archive'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
