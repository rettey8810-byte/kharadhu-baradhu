import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useProfile } from '../hooks/useProfile'
import type { ExpenseCategory } from '../types'

export default function Categories() {
  const { currentProfile } = useProfile()
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    if (!currentProfile) return
    const { data } = await supabase
      .from('expense_categories')
      .select('*')
      .eq('profile_id', currentProfile.id)
      .order('sort_order')
    setCategories(data ?? [])
  }

  useEffect(() => {
    load()
  }, [currentProfile])

  const add = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentProfile) return

    setError(null)
    setLoading(true)

    try {
      const { error } = await supabase
        .from('expense_categories')
        .insert({ profile_id: currentProfile.id, name: name.trim(), sort_order: categories.length + 1 })

      if (error) throw error
      setName('')
      await load()
    } catch (err: any) {
      setError(err?.message ?? 'Failed to add category')
    } finally {
      setLoading(false)
    }
  }

  const toggleArchive = async (category: ExpenseCategory) => {
    await supabase
      .from('expense_categories')
      .update({ is_archived: !category.is_archived })
      .eq('id', category.id)
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
