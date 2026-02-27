import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useProfile } from '../hooks/useProfile'
import type { IncomeSource } from '../types'

export default function IncomeSources() {
  const { currentProfile } = useProfile()
  const [sources, setSources] = useState<IncomeSource[]>([])
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    if (!currentProfile) return
    const { data, error } = await supabase
      .from('income_sources')
      .select('*')
      .eq('profile_id', currentProfile.id)
      .order('created_at')

    if (!error) setSources((data ?? []) as any)
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
        .from('income_sources')
        .insert({ profile_id: currentProfile.id, name: name.trim() })

      if (error) throw error
      setName('')
      await load()
    } catch (err: any) {
      setError(err?.message ?? 'Failed to add income source')
    } finally {
      setLoading(false)
    }
  }

  const toggleArchive = async (source: IncomeSource) => {
    await supabase
      .from('income_sources')
      .update({ is_archived: !source.is_archived })
      .eq('id', source.id)
    await load()
  }

  const rename = async (source: IncomeSource, nextName: string) => {
    const trimmed = nextName.trim()
    if (!trimmed || trimmed === source.name) return
    await supabase.from('income_sources').update({ name: trimmed }).eq('id', source.id)
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
