import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useProfile } from '../hooks/useProfile'
import { useLanguage } from '../hooks/useLanguage'
import type { ExpenseCategory, IncomeSource } from '../types'
import { Camera, X, FileText, Hash } from 'lucide-react'
import VoiceInput from '../components/VoiceInput'
import { recognize } from 'tesseract.js'
import { useNavigate } from 'react-router-dom'

export default function AddTransaction() {
  const { currentProfile } = useProfile()
  const navigate = useNavigate()
  const { t } = useLanguage()
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
  const [success, setSuccess] = useState<string | null>(null)
  const [receipt, setReceipt] = useState<File | null>(null)
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [ocrLoading, setOcrLoading] = useState(false)
  const [ocrText, setOcrText] = useState<string | null>(null)
  const [billShopName, setBillShopName] = useState('')
  const [billDate, setBillDate] = useState('')
  const [billGst, setBillGst] = useState('')
  const [billSubtotal, setBillSubtotal] = useState('')
  const [billTotal, setBillTotal] = useState('')
  const [billItems, setBillItems] = useState<Array<{ item_name: string; qty: string; unit_price: string; line_total: string }>>([])

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
      else setIncomeSourceId('')
    }

    load()
  }, [currentProfile])

  const selectedCategory = categories.find(c => c.id === categoryId)
  const isGroceries = type === 'expense' && (selectedCategory?.name ?? '').trim().toLowerCase() === 'groceries'

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setReceipt(file)
      const reader = new FileReader()
      reader.onloadend = () => setReceiptPreview(reader.result as string)
      reader.readAsDataURL(file)
      setOcrText(null)
      setBillShopName('')
      setBillDate('')
      setBillGst('')
      setBillSubtotal('')
      setBillTotal('')
      setBillItems([])
    }
  }

  const extractNumberFromLine = (line: string) => {
    const matches = line.match(/(\d+(?:[\.,]\d{1,2})?)/g)
    if (!matches || matches.length === 0) return null
    const last = matches[matches.length - 1].replace(',', '.')
    const n = Number(last)
    return Number.isFinite(n) ? n : null
  }

  const handleVoiceResult = (result: string) => {
    try {
      const parsed = JSON.parse(result)
      if (parsed.amount) {
        setAmount(parsed.amount.toString())
      }
      if (parsed.description) {
        setDescription(parsed.description)
      }
    } catch (e) {
      // If not JSON, use as description
      setDescription(result)
    }
  }

  const parseOcrText = (text: string) => {
    const lines = text
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(Boolean)

    const shop = lines[0] ?? ''

    const dateMatch = text.match(/(\d{4}[\/-]\d{1,2}[\/-]\d{1,2})|(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/)
    let parsedDate = ''
    if (dateMatch?.[0]) {
      const d = dateMatch[0]
      if (/^\d{4}/.test(d)) {
        parsedDate = d.replace(/\//g, '-').slice(0, 10)
      } else {
        const parts = d.split(/[\/-]/)
        const dd = parts[0].padStart(2, '0')
        const mm = parts[1].padStart(2, '0')
        let yy = parts[2]
        if (yy.length === 2) yy = `20${yy}`
        parsedDate = `${yy}-${mm}-${dd}`
      }
    }

    let total: number | null = null
    let subtotal: number | null = null
    let gst: number | null = null

    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i]
      if (total == null && /\b(total|grand total|amount due|net total)\b/i.test(line)) {
        total = extractNumberFromLine(line)
      }
      if (subtotal == null && /\b(subtotal|sub total)\b/i.test(line)) {
        subtotal = extractNumberFromLine(line)
      }
      if (gst == null && /\b(gst|vat|tax)\b/i.test(line)) {
        gst = extractNumberFromLine(line)
      }
    }

    if (total == null) {
      const numericLines = lines
        .map(l => ({ l, n: extractNumberFromLine(l) }))
        .filter(x => x.n != null)
      if (numericLines.length > 0) total = numericLines[numericLines.length - 1].n
    }

    const items: Array<{ item_name: string; qty: string; unit_price: string; line_total: string }> = []
    for (const line of lines) {
      if (/\b(total|subtotal|gst|vat|tax|change|cash|card)\b/i.test(line)) continue
      const nums = line.match(/(\d+(?:[\.,]\d{1,2})?)/g) ?? []
      if (nums.length < 1) continue
      const name = line.replace(/(\d+(?:[\.,]\d{1,2})?)/g, '').replace(/\s{2,}/g, ' ').trim()
      if (!name) continue

      const lineTotalRaw = nums[nums.length - 1]?.replace(',', '.')
      const lineTotal = lineTotalRaw ? Number(lineTotalRaw) : NaN
      if (!Number.isFinite(lineTotal)) continue

      const qtyRaw = nums.length >= 3 ? nums[0] : nums.length === 2 ? '1' : '1'
      const unitPriceRaw = nums.length >= 3 ? nums[1] : nums.length === 2 ? nums[0] : lineTotalRaw

      items.push({
        item_name: name,
        qty: String(qtyRaw).replace(',', '.'),
        unit_price: String(unitPriceRaw).replace(',', '.'),
        line_total: String(lineTotalRaw).replace(',', '.'),
      })
    }

    return {
      shop,
      parsedDate,
      total,
      subtotal,
      gst,
      items: items.slice(0, 50),
    }
  }

  const runOcr = async () => {
    if (!receiptPreview) throw new Error('Please add a receipt photo first')
    setOcrLoading(true)
    setError(null)
    try {
      const { data } = await recognize(receiptPreview, 'eng')
      const text = (data?.text ?? '').trim()
      setOcrText(text)
      const parsed = parseOcrText(text)
      setBillShopName(parsed.shop)
      setBillDate(parsed.parsedDate || date)
      setBillTotal(parsed.total != null ? String(parsed.total) : '')
      setBillSubtotal(parsed.subtotal != null ? String(parsed.subtotal) : '')
      setBillGst(parsed.gst != null ? String(parsed.gst) : '')
      setBillItems(parsed.items)
      if (parsed.total != null) setAmount(String(parsed.total))
      if (!description.trim() && parsed.shop) setDescription(parsed.shop)
    } catch (err: any) {
      setError(err?.message ?? 'Failed to read the receipt')
    } finally {
      setOcrLoading(false)
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
    setSuccess(null)
    setLoading(true)

    try {
      if (isGroceries) {
        if (!receipt) throw new Error('Receipt photo is required for Groceries')
        if (!ocrText) throw new Error('Please extract the bill first')
      }

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

      if (isGroceries && transaction) {
        const totalNum = billTotal.trim() ? Number(billTotal) : null
        const subtotalNum = billSubtotal.trim() ? Number(billSubtotal) : null
        const gstNum = billGst.trim() ? Number(billGst) : null

        const { data: gb, error: gbErr } = await supabase
          .from('grocery_bills')
          .insert({
            transaction_id: transaction.id,
            shop_name: billShopName.trim() || null,
            bill_date: billDate || null,
            subtotal: Number.isFinite(subtotalNum as any) ? subtotalNum : null,
            gst_amount: Number.isFinite(gstNum as any) ? gstNum : null,
            total: Number.isFinite(totalNum as any) ? totalNum : null,
            raw_text: ocrText,
          })
          .select()
          .single()

        if (gbErr) throw gbErr

        const cleanedItems = billItems
          .map(i => ({
            item_name: i.item_name.trim(),
            qty: i.qty.trim() ? Number(i.qty) : null,
            unit_price: i.unit_price.trim() ? Number(i.unit_price) : null,
            line_total: i.line_total.trim() ? Number(i.line_total) : null,
          }))
          .filter(i => i.item_name)

        if (cleanedItems.length > 0) {
          const rows = cleanedItems.map(i => ({
            grocery_bill_id: gb.id,
            item_name: i.item_name,
            qty: Number.isFinite(i.qty as any) ? i.qty : null,
            unit_price: Number.isFinite(i.unit_price as any) ? i.unit_price : null,
            line_total: Number.isFinite(i.line_total as any) ? i.line_total : null,
          }))
          const { error: itemsErr } = await supabase.from('grocery_bill_items').insert(rows)
          if (itemsErr) throw itemsErr
        }
      }

      setAmount('')
      setDescription('')
      setNotes('')
      setTags([])
      setReceipt(null)
      setReceiptPreview(null)
      setOcrText(null)
      setBillShopName('')
      setBillDate('')
      setBillGst('')
      setBillSubtotal('')
      setBillTotal('')
      setBillItems([])

      setSuccess('Transaction saved')
      window.setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      setError(err?.message ?? 'Failed to add transaction')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4">
      <div className="text-lg font-semibold">{t('page_add_transaction')}</div>

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
              {incomeSources.length === 0 && (
                <option value="" disabled>
                  No income sources (add one)
                </option>
              )}
              {incomeSources.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>

            {incomeSources.length === 0 && (
              <button
                type="button"
                onClick={() => navigate('/income-sources')}
                className="mt-2 text-sm text-emerald-700 font-semibold"
              >
                Go to Income Sources
              </button>
            )}
          </div>
        )}

        {/* Description with Voice Input */}
        <div>
          <div className="flex items-center justify-between">
            <label className="text-sm text-gray-600">Description</label>
            <VoiceInput onResult={handleVoiceResult} />
          </div>
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
          <label className="text-sm text-gray-600">
            Receipt Photo {isGroceries ? <span className="text-red-500">*</span> : <span className="text-gray-400">(optional)</span>}
          </label>
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

        {isGroceries && (
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-sm font-semibold text-emerald-900">Groceries bill</div>
                <div className="text-xs text-emerald-700">Receipt is required and will be read automatically</div>
              </div>
              <button
                type="button"
                onClick={runOcr}
                disabled={!receiptPreview || ocrLoading}
                className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold disabled:opacity-60"
              >
                {ocrLoading ? 'Reading…' : 'Extract bill'}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-emerald-800">Shop name</label>
                <input
                  className="mt-1 w-full border border-emerald-200 rounded-lg px-3 py-2 text-sm"
                  value={billShopName}
                  onChange={(e) => setBillShopName(e.target.value)}
                  placeholder="Shop"
                />
              </div>
              <div>
                <label className="text-xs text-emerald-800">Bill date</label>
                <input
                  type="date"
                  className="mt-1 w-full border border-emerald-200 rounded-lg px-3 py-2 text-sm"
                  value={billDate}
                  onChange={(e) => setBillDate(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-emerald-800">Subtotal</label>
                <input
                  className="mt-1 w-full border border-emerald-200 rounded-lg px-3 py-2 text-sm"
                  value={billSubtotal}
                  onChange={(e) => setBillSubtotal(e.target.value)}
                  inputMode="decimal"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="text-xs text-emerald-800">GST</label>
                <input
                  className="mt-1 w-full border border-emerald-200 rounded-lg px-3 py-2 text-sm"
                  value={billGst}
                  onChange={(e) => setBillGst(e.target.value)}
                  inputMode="decimal"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="text-xs text-emerald-800">Total</label>
                <input
                  className="mt-1 w-full border border-emerald-200 rounded-lg px-3 py-2 text-sm font-semibold"
                  value={billTotal}
                  onChange={(e) => { setBillTotal(e.target.value); setAmount(e.target.value) }}
                  inputMode="decimal"
                  placeholder="0"
                />
              </div>
            </div>

            <div>
              <div className="text-xs text-emerald-800 mb-2">Items</div>
              {billItems.length === 0 ? (
                <div className="text-xs text-emerald-700">Extract the bill to get item list (you can edit).</div>
              ) : (
                <div className="space-y-2">
                  {billItems.map((it, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                      <input
                        className="col-span-6 border border-emerald-200 rounded-lg px-2 py-1.5 text-sm"
                        value={it.item_name}
                        onChange={(e) => {
                          const next = [...billItems]
                          next[idx] = { ...next[idx], item_name: e.target.value }
                          setBillItems(next)
                        }}
                        placeholder="Item"
                      />
                      <input
                        className="col-span-2 border border-emerald-200 rounded-lg px-2 py-1.5 text-sm"
                        value={it.qty}
                        onChange={(e) => {
                          const next = [...billItems]
                          next[idx] = { ...next[idx], qty: e.target.value }
                          setBillItems(next)
                        }}
                        placeholder="Qty"
                        inputMode="decimal"
                      />
                      <input
                        className="col-span-2 border border-emerald-200 rounded-lg px-2 py-1.5 text-sm"
                        value={it.unit_price}
                        onChange={(e) => {
                          const next = [...billItems]
                          next[idx] = { ...next[idx], unit_price: e.target.value }
                          setBillItems(next)
                        }}
                        placeholder="Price"
                        inputMode="decimal"
                      />
                      <div className="col-span-2 flex items-center gap-2">
                        <input
                          className="flex-1 border border-emerald-200 rounded-lg px-2 py-1.5 text-sm"
                          value={it.line_total}
                          onChange={(e) => {
                            const next = [...billItems]
                            next[idx] = { ...next[idx], line_total: e.target.value }
                            setBillItems(next)
                          }}
                          placeholder="Total"
                          inputMode="decimal"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const next = billItems.filter((_, i) => i !== idx)
                            setBillItems(next)
                          }}
                          className="p-1.5 rounded-lg bg-white border border-emerald-200 text-emerald-700"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setBillItems([...billItems, { item_name: '', qty: '', unit_price: '', line_total: '' }])}
                    className="w-full py-2 rounded-lg bg-white border border-emerald-200 text-emerald-700 text-sm font-semibold"
                  >
                    Add item
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {success && <div className="text-sm text-emerald-700 bg-emerald-50 p-2 rounded-lg">{success}</div>}

        {error && <div className="text-sm text-red-600 bg-red-50 p-2 rounded-lg">{error}</div>}

        <button
          type="submit"
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-3 py-3 font-semibold disabled:opacity-60"
          disabled={loading || ocrLoading}
        >
          {loading ? 'Saving…' : 'Save Transaction'}
        </button>
      </form>
    </div>
  )
}
