import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useProfile } from '../hooks/useProfile'
import type { ExpenseCategory, IncomeSource } from '../types'
import { Camera, X, FileText, Hash } from 'lucide-react'

export default function AddTransaction() {
  const { currentProfile } = useProfile()
  const [type, setType] = useState<'expense' | 'income'>('expense')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [description, setDescription] = useState('')
  const [notes, setNotes] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [categoryId, setCategoryId] = useState<string>('')
  const [incomeSourceId, setIncomeSourceId] = useState<string>('')
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [receipt, setReceipt] = useState<File | null>(null)
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const load = async () => {
      if (!currentProfile) return
      const { data: cats } = await supabase
        .from('expense_categories')
        .select('*')
        .eq('profile_id', currentProfile.id)
        .eq('is_archived', false)
        .order('sort_order')

      const { data: sources } = await supabase
        .from('income_sources')
        .select('*')
        .eq('profile_id', currentProfile.id)
        .eq('is_archived', false)
        .order('created_at')

      setCategories(cats ?? [])
      setIncomeSources(sources ?? [])
      if ((cats?.length ?? 0) > 0) setCategoryId(cats![0].id)
      if ((sources?.length ?? 0) > 0) setIncomeSourceId(sources![0].id)
    }

    load()
  }, [currentProfile])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setReceipt(file)
      const reader = new FileReader()
      reader.onloadend = () => setReceiptPreview(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()])
      setTagInput('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove))
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentProfile) return

    setError(null)
    setLoading(true)

    try {
      const amt = Number(amount)
      if (!Number.isFinite(amt) || amt <= 0) throw new Error('Enter a valid amount')

      const payload: any = {
        profile_id: currentProfile.id,
        type,
        amount: amt,
        transaction_date: date,
        description: description.trim() || null,
        notes: notes.trim() || null,
        tags: tags.length > 0 ? tags : null,
        category_id: type === 'expense' ? categoryId || null : null,
        income_source_id: type === 'income' ? incomeSourceId || null : null,
      }

      const { data: transaction, error: txError } = await supabase
        .from('transactions')
        .insert(payload)
        .select()
        .single()

      if (txError) throw txError

      // Upload receipt if exists
      if (receipt && transaction) {
        const fileExt = receipt.name.split('.').pop()
        const fileName = `${currentProfile.id}/${transaction.id}/${Date.now()}.${fileExt}`
        
        const { error: uploadError } = await supabase.storage
          .from('receipts')
          .upload(fileName, receipt)

        if (!uploadError) {
          await supabase.from('receipts').insert({
            transaction_id: transaction.id,
            storage_path: fileName,
            file_name: receipt.name,
            file_size: receipt.size,
            mime_type: receipt.type
          })
        }
      }

      setAmount('')
      setDescription('')
      setNotes('')
      setTags([])
      setReceipt(null)
      setReceiptPreview(null)
    } catch (err: any) {
      setError(err?.message ?? 'Failed to add transaction')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4">
      <div className="text-lg font-semibold">Add transaction</div>

      <form onSubmit={submit} className="mt-4 space-y-4">
        {/* Type */}
        <div>
          <label className="text-sm text-gray-600">Type</label>
          <select
            className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2"
            value={type}
            onChange={(e) => setType(e.target.value as any)}
          >
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
        </div>

        {/* Amount */}
        <div>
          <label className="text-sm text-gray-600">Amount (MVR)</label>
          <input
            className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
            placeholder="0.00"
            required
          />
        </div>

        {/* Date */}
        <div>
          <label className="text-sm text-gray-600">Date</label>
          <input
            className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            type="date"
            required
          />
        </div>

        {/* Category/Income Source */}
        {type === 'expense' ? (
          <div>
            <label className="text-sm text-gray-600">Category</label>
            <select
              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        ) : (
          <div>
            <label className="text-sm text-gray-600">Income source</label>
            <select
              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2"
              value={incomeSourceId}
              onChange={(e) => setIncomeSourceId(e.target.value)}
            >
              {incomeSources.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Description */}
        <div>
          <label className="text-sm text-gray-600">Description</label>
          <input
            className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Lunch at restaurant"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="text-sm text-gray-600 flex items-center gap-1">
            <FileText size={14} />
            Notes
          </label>
          <textarea
            className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 h-20 resize-none"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Additional details..."
          />
        </div>

        {/* Tags */}
        <div>
          <label className="text-sm text-gray-600 flex items-center gap-1">
            <Hash size={14} />
            Tags
          </label>
          <div className="flex gap-2 mt-1">
            <input
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
              placeholder="Add tag and press Enter"
            />
            <button
              type="button"
              onClick={addTag}
              className="px-3 py-2 bg-gray-100 rounded-lg text-sm"
            >
              Add
            </button>
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {tags.map(tag => (
                <span key={tag} className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full text-sm">
                  #{tag}
                  <button type="button" onClick={() => removeTag(tag)} className="hover:text-emerald-900">
                    <X size={14} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Receipt Upload */}
        <div>
          <label className="text-sm text-gray-600">Receipt Photo</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          
          {receiptPreview ? (
            <div className="mt-2 relative">
              <img src={receiptPreview} alt="Receipt preview" className="w-full h-40 object-cover rounded-lg" />
              <button
                type="button"
                onClick={() => { setReceipt(null); setReceiptPreview(null); }}
                className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-2 w-full py-8 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center gap-2 text-gray-500 hover:border-emerald-400 hover:text-emerald-600"
            >
              <Camera size={24} />
              <span className="text-sm">Tap to add receipt photo</span>
            </button>
          )}
        </div>

        {error && <div className="text-sm text-red-600 bg-red-50 p-2 rounded-lg">{error}</div>}

        <button
          type="submit"
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-3 py-3 font-semibold disabled:opacity-60"
          disabled={loading}
        >
          {loading ? 'Saving…' : 'Save Transaction'}
        </button>
      </form>
    </div>
  )
}
