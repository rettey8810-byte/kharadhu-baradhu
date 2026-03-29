import { useEffect, useState } from 'react'
import { firebaseDb } from '../lib/firebase'
import { collection, query, where, getDocs, addDoc, doc, updateDoc, orderBy } from 'firebase/firestore'
import { useProfile } from '../hooks/useProfile'
import { useAuth } from '../hooks/useAuth'
import type { IncomeSource } from '../types'
import { Wand2 } from 'lucide-react'

// Default income sources for new profiles
const DEFAULT_INCOME_SOURCES = [
  { name: 'Salary' },
  { name: 'Freelance' },
  { name: 'Business' },
  { name: 'Investment' },
  { name: 'Other' }
]

export default function IncomeSources() {
  const { currentProfile } = useProfile()
  const { user } = useAuth()
  const [sources, setSources] = useState<IncomeSource[]>([])
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    if (!user || !currentProfile) return
    const q = query(
      collection(firebaseDb, 'users', user.uid, 'incomeSources'),
      where('profile_id', '==', currentProfile.id),
      orderBy('created_at')
    )
    const snap = await getDocs(q)
    setSources(snap.docs.map(d => ({ id: d.id, ...d.data() }) as IncomeSource))
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
      await addDoc(collection(firebaseDb, 'users', user.uid, 'incomeSources'), {
        profile_id: currentProfile.id,
        name: name.trim(),
        is_archived: false,
        created_at: new Date().toISOString()
      })
      setName('')
      await load()
    } catch (err: any) {
      setError(err?.message ?? 'Failed to add income source')
    } finally {
      setLoading(false)
    }
  }

  const toggleArchive = async (source: IncomeSource) => {
    if (!user) return
    const ref = doc(firebaseDb, 'users', user.uid, 'incomeSources', source.id)
    await updateDoc(ref, { is_archived: !source.is_archived })
    await load()
  }

  const createDefaults = async () => {
    if (!user || !currentProfile) return
    setLoading(true)
    setError(null)
    try {
      const now = new Date().toISOString()
      const existingNames = new Set(sources.map(s => s.name.toLowerCase()))
      
      const promises = DEFAULT_INCOME_SOURCES
        .filter(src => !existingNames.has(src.name.toLowerCase()))
        .map((src) => 
          addDoc(collection(firebaseDb, 'users', user.uid, 'incomeSources'), {
            profile_id: currentProfile.id,
            name: src.name,
            is_archived: false,
            created_at: now,
            updated_at: now
          })
        )
      
      await Promise.all(promises)
      await load()
    } catch (err: any) {
      setError(err?.message ?? 'Failed to create default income sources')
    } finally {
      setLoading(false)
    }
  }

  const rename = async (source: IncomeSource, nextName: string) => {
    if (!user) return
    const trimmed = nextName.trim()
    if (!trimmed || trimmed === source.name) return
    const ref = doc(firebaseDb, 'users', user.uid, 'incomeSources', source.id)
    await updateDoc(ref, { name: trimmed })
    await load()
  }

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-200 rounded-2xl p-4">
        <div className="text-lg font-semibold">Income Sources</div>
        <form onSubmit={add} className="mt-3 flex gap-2">
          <input
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="New income source (e.g. Salary)"
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

      {sources.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 text-amber-800 font-medium mb-2">
            <Wand2 size={18} />
            No income sources found
          </div>
          <p className="text-sm text-amber-700 mb-3">
            You don't have any income sources yet. Create default sources to get started quickly.
          </p>
          <button
            onClick={createDefaults}
            disabled={loading}
            className="w-full bg-amber-600 hover:bg-amber-700 text-white rounded-lg px-4 py-2 font-semibold disabled:opacity-60 flex items-center justify-center gap-2"
          >
            <Wand2 size={16} />
            {loading ? 'Creating...' : 'Create Default Income Sources'}
          </button>
          {error && <div className="text-sm text-red-600 mt-2">{error}</div>}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-2xl p-4">
        <div className="font-semibold">All income sources</div>
        <div className="mt-3 divide-y">
          {sources.map(s => (
            <div key={s.id} className="py-2 flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <input
                  className={`w-full border border-transparent bg-transparent px-0 py-1 font-medium outline-none focus:bg-white focus:border-gray-200 focus:rounded-lg focus:px-2 ${s.is_archived ? 'text-gray-400' : 'text-gray-900'}`}
                  defaultValue={s.name}
                  onBlur={(e) => rename(s, e.target.value)}
                />
                <div className="text-xs text-gray-500">{s.is_archived ? 'Archived' : 'Active'}</div>
              </div>
              <button
                type="button"
                className="text-sm text-gray-600 hover:text-gray-900 flex-shrink-0"
                onClick={() => toggleArchive(s)}
              >
                {s.is_archived ? 'Unarchive' : 'Archive'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
