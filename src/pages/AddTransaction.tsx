import { useEffect, useMemo, useRef, useState } from 'react'
import { firebaseDb } from '../lib/firebase'
import { collection, query, where, getDocs, addDoc, orderBy, updateDoc, doc } from 'firebase/firestore'
import { useProfile } from '../hooks/useProfile'
import { useAuth } from '../hooks/useAuth'
import { useLanguage } from '../hooks/useLanguage'
import type { ExpenseCategory, IncomeSource } from '../types'
import { Camera, X, FileText, Hash, CreditCard } from 'lucide-react'
import VoiceInput from '../components/VoiceInput'
import { recognize } from 'tesseract.js'
import { useNavigate } from 'react-router-dom'

export default function AddTransaction() {
  const { currentProfile } = useProfile()
  const { user } = useAuth()
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
  const [, setReceipt] = useState<File | null>(null)
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  // Credit card states
  const [creditCards, setCreditCards] = useState<Array<{ id: string; title: string; issuer: string; card_number?: string }>>([])
  const [chargeToCreditCard, setChargeToCreditCard] = useState(false)
  const [selectedCreditCardId, setSelectedCreditCardId] = useState<string>('')

  const [ocrLoading, setOcrLoading] = useState(false)
  const [ocrText, setOcrText] = useState<string | null>(null)
  const [billShopName, setBillShopName] = useState('')
  const [billDate, setBillDate] = useState('')
  const [billGst, setBillGst] = useState('')
  const [billGstPercent, setBillGstPercent] = useState('')
  const [billSubtotal, setBillSubtotal] = useState('')
  const [billTotal, setBillTotal] = useState('')
  const [billItems, setBillItems] = useState<Array<{ item_name: string; qty: string; unit_price: string; line_total: string }>>([])
  const [activeAutocompleteIndex, setActiveAutocompleteIndex] = useState<number | null>(null)
  const [autocompleteQuery, setAutocompleteQuery] = useState('')
  const [groceryItemHistory, setGroceryItemHistory] = useState<string[]>([])
  const [shopNames, setShopNames] = useState<string[]>([])
  const [itemPriceHistory, setItemPriceHistory] = useState<Record<string, Array<{shop: string, price: number, date: string}>>>({})
  const [priceAlert, setPriceAlert] = useState<{item: string, currentPrice: number, history: Array<{shop: string, price: number, date: string}>} | null>(null)

  const selectedCategory = categories.find(c => c.id === categoryId)
  const isGroceries = type === 'expense' && (selectedCategory?.name ?? '').trim().toLowerCase() === 'groceries'

  // Load grocery item history when in groceries mode
  useEffect(() => {
    if (!isGroceries || !user) {
      setGroceryItemHistory([])
      return
    }
    
    const loadGroceryHistory = async () => {
      try {
        const historyRef = collection(firebaseDb, 'users', user.uid, 'groceryHistory')
        const snap = await getDocs(historyRef)
        const items = snap.docs
          .map(d => ({ name: d.data().item_name as string, count: d.data().use_count as number || 0 }))
          .filter(item => item.name)
          .sort((a, b) => b.count - a.count)
          .map(item => item.name)
        setGroceryItemHistory(items)
      } catch (err) {
        console.log('Failed to load grocery history:', err)
        setGroceryItemHistory([])
      }
    }
    
    loadGroceryHistory()
  }, [isGroceries, user])

  // Load shop names and item price history
  useEffect(() => {
    if (!isGroceries || !user) {
      setShopNames([])
      setItemPriceHistory({})
      return
    }
    
    const loadShopAndPriceHistory = async () => {
      try {
        // Load all grocery bills to extract shop names and prices
        const billsQuery = query(
          collection(firebaseDb, 'users', user.uid, 'groceryBills'),
          orderBy('bill_date', 'desc')
        )
        const billsSnap = await getDocs(billsQuery)
        
        const shops = new Set<string>()
        const priceMap: Record<string, Array<{shop: string, price: number, date: string}>> = {}
        
        for (const billDoc of billsSnap.docs) {
          const bill = billDoc.data()
          if (bill.shop_name) shops.add(bill.shop_name)
          
          // Load items for this bill
          const itemsQuery = query(
            collection(firebaseDb, 'users', user.uid, 'groceryBillItems'),
            where('grocery_bill_id', '==', billDoc.id)
          )
          const itemsSnap = await getDocs(itemsQuery)
          
          itemsSnap.docs.forEach(itemDoc => {
            const item = itemDoc.data()
            if (item.item_name && item.unit_price) {
              const key = item.item_name.toLowerCase().trim()
              if (!priceMap[key]) priceMap[key] = []
              priceMap[key].push({
                shop: bill.shop_name || 'Unknown',
                price: item.unit_price,
                date: bill.bill_date || ''
              })
            }
          })
        }
        
        setShopNames(Array.from(shops).sort())
        setItemPriceHistory(priceMap)
      } catch (err) {
        console.log('Failed to load shop/price history:', err)
      }
    }
    
    loadShopAndPriceHistory()
  }, [isGroceries, user])

  // Filtered autocomplete suggestions
  const getAutocompleteSuggestions = (query: string) => {
    if (!query.trim()) return groceryItemHistory.slice(0, 10)
    const lowerQuery = query.toLowerCase()
    return groceryItemHistory
      .filter(item => item.toLowerCase().includes(lowerQuery))
      .slice(0, 10)
  }

  const getNumeric = (v: string) => {
    const n = v.trim() ? Number(v) : NaN
    return Number.isFinite(n) ? n : null
  }

  const groceryTotals = useMemo(() => {
    const totalQty = billItems.reduce((acc, it) => acc + (getNumeric(it.qty) ?? 0), 0)

    const totalValue = billItems.reduce((acc, it) => {
      const lt = getNumeric(it.line_total)
      if (lt != null) return acc + lt
      const qty = getNumeric(it.qty)
      const unit = getNumeric(it.unit_price)
      if (qty != null && unit != null) return acc + qty * unit
      return acc
    }, 0)

    return {
      totalQty,
      totalValue,
    }
  }, [billItems])

  useEffect(() => {
    if (!isGroceries) return

    const sum = billItems.reduce((acc, it) => {
      const lt = it.line_total.trim() ? Number(it.line_total) : null
      const qty = it.qty.trim() ? Number(it.qty) : null
      const unit = it.unit_price.trim() ? Number(it.unit_price) : null
      const derived = lt != null && Number.isFinite(lt)
        ? lt
        : (qty != null && unit != null && Number.isFinite(qty) && Number.isFinite(unit) ? qty * unit : null)
      return acc + (derived != null && Number.isFinite(derived) ? derived : 0)
    }, 0)

    const subtotal = sum > 0 ? sum : 0
    const pct = billGstPercent.trim() ? Number(billGstPercent) : null
    const gstFromPct = pct != null && Number.isFinite(pct) && pct > 0 ? subtotal * (pct / 100) : null

    // Always update subtotal from items (POS style)
    setBillSubtotal(subtotal > 0 ? subtotal.toFixed(2) : '')

    if (gstFromPct != null) {
      setBillGst(gstFromPct.toFixed(2))
    }

    const gst = (gstFromPct != null)
      ? gstFromPct
      : (billGst.trim() ? Number(billGst) : 0)

    const total = subtotal + (Number.isFinite(gst) ? gst : 0)
    // Always update total from items
    const totalStr = total > 0 ? total.toFixed(2) : ''
    setBillTotal(totalStr)
    if (total > 0) setAmount(totalStr)
  }, [isGroceries, billItems, billGstPercent, billGst])

  useEffect(() => {
    const load = async () => {
      if (!user || !currentProfile) return
      const catQuery = query(
        collection(firebaseDb, 'users', user.uid, 'categories'),
        where('profile_id', '==', currentProfile.id),
        where('is_archived', '==', false),
        orderBy('sort_order')
      )
      const sourceQuery = query(
        collection(firebaseDb, 'users', user.uid, 'incomeSources'),
        where('profile_id', '==', currentProfile.id),
        where('is_archived', '==', false),
        orderBy('created_at')
      )
      const [catSnap, sourceSnap] = await Promise.all([getDocs(catQuery), getDocs(sourceQuery)])

      const cats = catSnap.docs.map(d => ({ id: d.id, ...d.data() }) as ExpenseCategory)
      const sources = sourceSnap.docs.map(d => ({ id: d.id, ...d.data() }) as IncomeSource)

      setCategories(cats)
      setIncomeSources(sources)
      if (cats.length > 0) setCategoryId(cats[0].id)
      if (sources.length > 0) setIncomeSourceId(sources[0].id)
      else setIncomeSourceId('')

      // Load credit cards
      const cardsQuery = query(
        collection(firebaseDb, 'users', user.uid, 'cards'),
        where('user_id', '==', user.uid),
        where('card_type', 'in', ['credit', 'debit'])
      )
      const cardsSnap = await getDocs(cardsQuery)
      const cards = cardsSnap.docs.map(d => ({
        id: d.id,
        title: d.data().title,
        issuer: d.data().issuer,
        card_number: d.data().card_number
      }))
      setCreditCards(cards)
    }

    load()
  }, [currentProfile, user])

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
      setBillGstPercent('')
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
    
    // Find the item section - look for table headers
    let itemSectionStart = -1
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase()
      // Look for item/qty/price headers
      if (/item.*name|item\s+qty|qty.*price|ext\s*price/i.test(line) || 
          (/\bitem\b/i.test(line) && /\b(qty|price)\b/i.test(line))) {
        itemSectionStart = i + 1
        break
      }
    }
    
    // If no header found, try to find where items start (after shop/date info)
    if (itemSectionStart === -1) {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        // Skip until we see a line that looks like an item (has price at end)
        if (/\d+(?:\.\d{1,2})?\s*[Tt]?$/.test(line.trim()) && 
            !/total|subtotal|gst|tax/i.test(line)) {
          itemSectionStart = i
          break
        }
      }
    }
    
    if (itemSectionStart === -1) itemSectionStart = 0
    
    // Skip patterns for non-item lines
    const skipPatterns = /\b(total|subtotal|gst|vat|tax|change|cash|card|debit|credit|amount|receipt|invoice|date|time|cashier|local sales|thanks|store|workstation|company|shop|ufanveli|dharavandhoo|uthuruge|madihaa|sales receipt|debit card|thanks for shopping)\b/i
    const headerPatterns = /\b(item name|item\s+qty|qty|price|ext price|subtotal|gst|tax|total)\b/i
    const unitWords = /\b(pcs|kg|g|ml|l|pack|bottle|box|bag|can|dozen|pce)\b/i
    
    // Process only lines in the item section
    const endIdx = lines.findIndex((l, i) => i > itemSectionStart && /\b(subtotal|total|gst|tax)\b/i.test(l))
    const itemLines = lines.slice(itemSectionStart, endIdx > 0 ? endIdx : undefined)
    
    for (let i = 0; i < itemLines.length; i++) {
      const line = itemLines[i].trim()
      
      // Skip empty/short lines
      if (!line || line.length < 3) continue
      
      // Skip header/footer patterns
      if (skipPatterns.test(line)) continue
      if (headerPatterns.test(line)) continue
      
      // Skip date-like lines
      if (/^\d{1,2}[\/\-]/.test(line)) continue
      
      // Skip lines that are just numbers (receipt numbers, etc.)
      if (/^#?\d+$/.test(line)) continue
      if (/^\d{4,}$/.test(line)) continue // Large numbers like receipt #59262
      
      // Skip unit-of-measure lines that appear on their own
      if (/^(pcs|kg|g|ml|l|pack|d%|pce)$/i.test(line)) continue
      
      // Skip damage/discount percentage lines
      if (/^\d+%\s*damage|\d+%\s*d\s*\$/i.test(line)) continue
      
      // Must have at least one number that could be a price
      const nums = line.match(/(\d+(?:[\.,]\d{1,2})?)/g) ?? []
      if (nums.length < 1) continue
      
      // Extract line total (usually the last number, may have 'T' suffix)
      let lineTotalStr = nums[nums.length - 1]
      const lineTotalRaw = lineTotalStr.replace(',', '.')
      const lineTotal = Number(lineTotalRaw)
      
      // Line total should be reasonable (not a receipt number)
      if (!Number.isFinite(lineTotal) || lineTotal > 10000 || lineTotal < 0.01) continue
      
      // Determine qty and unit_price based on number count
      let qty = '1'
      let unitPrice = lineTotalRaw
      
      if (nums.length >= 3) {
        // Format: ITEM QTY PRICE TOTAL (like: BANANA 0.6 25.00 15.00)
        const possibleQty = Number(nums[0]?.replace(',', '.'))
        const possiblePrice = Number(nums[1]?.replace(',', '.'))
        
        // Validate qty is reasonable (0.01 to 1000)
        if (possibleQty >= 0.01 && possibleQty <= 1000) {
          qty = nums[0] ?? '1'
        }
        // Validate price is reasonable (0.01 to 5000)
        if (possiblePrice >= 0.01 && possiblePrice <= 5000 && possiblePrice !== lineTotal) {
          unitPrice = nums[1] ?? lineTotalRaw
        }
      } else if (nums.length === 2) {
        // Format: ITEM PRICE TOTAL
        const possiblePrice = Number(nums[0]?.replace(',', '.'))
        if (possiblePrice >= 0.01 && possiblePrice <= 5000) {
          unitPrice = nums[0] ?? lineTotalRaw
        }
      }
      
      // Clean up item name
      let name = line
        .replace(/\d+(?:[\.,]\d{1,2})?/g, ' ')  // Remove numbers
        .replace(/\bT\b/g, ' ')                    // Remove T markers
        .replace(/\bEE\b/g, ' ')                   // Remove EE markers
        .replace(/\s{2,}/g, ' ')                  // Collapse spaces
        .replace(/[\.,\-]+$/, '')                 // Remove trailing punctuation
        .replace(/^[\s\-]+/, '')                  // Remove leading punctuation/spaces
        .trim()
      
      // Skip if name is too short or looks like garbage
      if (!name || name.length < 3) continue
      if (/^(mvr|rf|mr|usd|\$|#)/i.test(name)) continue
      
      // Skip lines that still look like headers
      if (/workstation|store:|company|shop|sales|receipt|debit|credit/i.test(name)) continue
      
      // Look ahead for unit of measure on next line
      const nextLine = itemLines[i + 1]
      if (nextLine && unitWords.test(nextLine.trim()) && nextLine.trim().length < 10) {
        name = `${name} (${nextLine.trim()})`
        i++ // Skip the unit line
      }
      
      // Clean up the name more
      name = name
        .replace(/\s*\(\s*/g, ' (')            // Clean up spacing around parentheses
        .replace(/\s*\)\s*/g, ') ')
        .replace(/\s{2,}/g, ' ')
        .trim()
        .replace(/[\.,\-]+$/, '')
      
      items.push({
        item_name: name,
        qty: qty.replace(',', '.'),
        unit_price: unitPrice.replace(',', '.'),
        line_total: lineTotalRaw,
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
    if (!currentProfile || !user) return

    setError(null)
    setSuccess(null)
    setLoading(true)

    try {
      if (isGroceries) {
        const hasAnyItem = billItems.some(i => i.item_name.trim())
        if (!hasAnyItem) throw new Error('Please add at least 1 grocery item (manual or extracted)')
        if (!billShopName.trim()) throw new Error('Please enter shop name')
        if (!billDate) throw new Error('Please enter bill date')
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
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      // Add transaction to Firestore
      const transactionRef = await addDoc(collection(firebaseDb, 'users', user.uid, 'transactions'), payload)
      const transaction = { id: transactionRef.id, ...payload }

      // Handle Credit Card Charge
      if (type === 'expense' && chargeToCreditCard && selectedCreditCardId) {
        const selectedCard = creditCards.find(c => c.id === selectedCreditCardId)
        if (selectedCard) {
          // Find existing credit card loan or create new one
          const loansQuery = query(
            collection(firebaseDb, 'users', user.uid, 'loans'),
            where('category', '==', 'credit_card'),
            where('card_id', '==', selectedCreditCardId),
            where('status', '==', 'active')
          )
          const loansSnap = await getDocs(loansQuery)
          
          if (loansSnap.empty) {
            // Create new credit card loan
            await addDoc(collection(firebaseDb, 'users', user.uid, 'loans'), {
              profile_id: currentProfile.id,
              loan_type: 'borrowed',
              category: 'credit_card',
              card_id: selectedCreditCardId,
              card_name: selectedCard.title,
              lender_name: selectedCard.issuer,
              principal_amount: amt,
              currency: 'MVR',
              interest_rate: 0,
              interest_type: 'none',
              loan_date: date,
              due_date: null,
              total_amount: amt,
              amount_paid: 0,
              emi_amount: null,
              total_installments: null,
              installments_paid: 0,
              status: 'active',
              description: `Credit card charge: ${description || 'Expense'}`,
              created_at: new Date().toISOString()
            })
          } else {
            // Update existing credit card loan - add to total_amount
            const loanDoc = loansSnap.docs[0]
            const loanData = loanDoc.data()
            const newTotal = (loanData.total_amount || 0) + amt
            await updateDoc(doc(firebaseDb, 'users', user.uid, 'loans', loanDoc.id), {
              total_amount: newTotal,
              principal_amount: (loanData.principal_amount || 0) + amt,
              updated_at: new Date().toISOString()
            })
          }
        }
      }

      // Note: Receipt upload and grocery bills simplified for migration
      // These features would need Cloudinary integration for full functionality

      if (isGroceries && transaction) {
        const totalNum = billTotal.trim() ? Number(billTotal) : null
        const subtotalNum = billSubtotal.trim() ? Number(billSubtotal) : null
        const gstNum = billGst.trim() ? Number(billGst) : null

        const groceryBillData = {
          transaction_id: transaction.id,
          profile_id: currentProfile.id,
          shop_name: billShopName.trim() || null,
          bill_date: billDate || null,
          subtotal: Number.isFinite(subtotalNum as any) ? subtotalNum : null,
          gst_amount: Number.isFinite(gstNum as any) ? gstNum : null,
          total: Number.isFinite(totalNum as any) ? totalNum : null,
          raw_text: ocrText || null,
          created_at: new Date().toISOString()
        }

        const gbRef = await addDoc(collection(firebaseDb, 'users', user.uid, 'groceryBills'), groceryBillData)

        const cleanedItems = billItems
          .map(i => ({
            item_name: i.item_name.trim(),
            qty: i.qty.trim() ? Number(i.qty) : null,
            unit_price: i.unit_price.trim() ? Number(i.unit_price) : null,
            line_total: i.line_total.trim() ? Number(i.line_total) : null,
          }))
          .filter(i => i.item_name)

        if (cleanedItems.length > 0) {
          const batchPromises = cleanedItems.map(i => 
            addDoc(collection(firebaseDb, 'users', user.uid, 'groceryBillItems'), {
              grocery_bill_id: gbRef.id,
              item_name: i.item_name,
              qty: Number.isFinite(i.qty as any) ? i.qty : null,
              unit_price: Number.isFinite(i.unit_price as any) ? i.unit_price : null,
              line_total: Number.isFinite(i.line_total as any)
                ? i.line_total
                : (Number.isFinite(i.qty as any) && Number.isFinite(i.unit_price as any)
                  ? Number(i.qty) * Number(i.unit_price)
                  : null),
              created_at: new Date().toISOString()
            })
          )
          await Promise.all(batchPromises)
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
      setBillGstPercent('')
      setBillSubtotal('')
      setBillTotal('')
      setBillItems([])
      setChargeToCreditCard(false)
      setSelectedCreditCardId('')

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
          <label className="text-sm text-gray-600">{t('form_type')}</label>
          <select
            className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2"
            value={type}
            onChange={(e) => setType(e.target.value as any)}
          >
            <option value="expense">{t('form_expense')}</option>
            <option value="income">{t('form_income')}</option>
          </select>
        </div>

        {/* Amount */}
        <div>
          <label className="text-sm text-gray-600">{t('form_amount')}</label>
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
          <label className="text-sm text-gray-600">{t('form_date')}</label>
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
            <label className="text-sm text-gray-600">{t('form_category')}</label>
            <select
              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            {/* Credit Card Charge Option */}
            {creditCards.length > 0 && (
              <div className="mt-3 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={chargeToCreditCard}
                    onChange={(e) => {
                      setChargeToCreditCard(e.target.checked)
                      if (!e.target.checked) setSelectedCreditCardId('')
                    }}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <span className="text-sm text-gray-700 flex items-center gap-1">
                    <CreditCard size={14} />
                    Charge to Credit Card
                  </span>
                </label>

                {chargeToCreditCard && (
                  <select
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                    value={selectedCreditCardId}
                    onChange={(e) => setSelectedCreditCardId(e.target.value)}
                    required={chargeToCreditCard}
                  >
                    <option value="">Select a credit card...</option>
                    {creditCards.map(card => (
                      <option key={card.id} value={card.id}>
                        {card.title} ({card.issuer}) {card.card_number ? `****${card.card_number.slice(-4)}` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </div>
        ) : (
          <div>
            <label className="text-sm text-gray-600">{t('form_income_source')}</label>
            <select
              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2"
              value={incomeSourceId}
              onChange={(e) => setIncomeSourceId(e.target.value)}
            >
              {incomeSources.length === 0 && (
                <option value="" disabled>
                  {t('form_no_income_sources')}
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
                {t('form_go_to_income_sources')}
              </button>
            )}
          </div>
        )}

        {/* Description with Voice Input */}
        <div>
          <div className="flex items-center justify-between">
            <label className="text-sm text-gray-600">{t('form_description')}</label>
            <VoiceInput onResult={handleVoiceResult} />
          </div>
          <input
            className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('form_description_placeholder')}
          />
        </div>

        {/* Notes */}
        <div>
          <label className="text-sm text-gray-600 flex items-center gap-1">
            <FileText size={14} />
            {t('form_notes')}
          </label>
          <textarea
            className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 h-20 resize-none"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t('form_notes_placeholder')}
          />
        </div>

        {/* Tags */}
        <div>
          <label className="text-sm text-gray-600 flex items-center gap-1">
            <Hash size={14} />
            {t('form_tags')}
          </label>
          <div className="flex gap-2 mt-1">
            <input
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
              placeholder={t('form_tags_placeholder')}
            />
            <button
              type="button"
              onClick={addTag}
              className="px-3 py-2 bg-gray-100 rounded-lg text-sm"
            >
              {t('form_add')}
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
            {t('form_receipt_photo')} {isGroceries ? <span className="text-red-500">*</span> : <span className="text-gray-400">({t('form_optional')})</span>}
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="hidden"
          />
          <input
            ref={galleryInputRef}
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
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="py-6 border-2 border-dashed border-emerald-300 rounded-lg flex flex-col items-center gap-2 text-emerald-600 hover:bg-emerald-50"
              >
                <Camera size={24} />
                <span className="text-sm font-medium">Scan with Camera</span>
              </button>
              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                className="py-6 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center gap-2 text-gray-500 hover:border-gray-400 hover:text-gray-600"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/><line x1="12" x2="12" y1="8" y2="16"/><line x1="8" x2="16" y1="12" y2="12"/></svg>
                <span className="text-sm">From Gallery</span>
              </button>
            </div>
          )}
        </div>

        {isGroceries && (
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-sm font-semibold text-emerald-900">{t('form_groceries_bill')}</div>
                <div className="text-xs text-emerald-700">{t('form_receipt_required_auto')}</div>
              </div>
              <button
                type="button"
                onClick={runOcr}
                disabled={!receiptPreview || ocrLoading}
                className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold disabled:opacity-60"
              >
                {ocrLoading ? t('form_reading') : t('form_extract_bill')}
              </button>
            </div>

            {/* Credit Card Option for Groceries */}
            {creditCards.length > 0 && (
              <div className="bg-white rounded-lg p-3 border border-emerald-200">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={chargeToCreditCard}
                    onChange={(e) => {
                      setChargeToCreditCard(e.target.checked)
                      if (!e.target.checked) setSelectedCreditCardId('')
                    }}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <span className="text-sm text-gray-700 flex items-center gap-1">
                    <CreditCard size={14} />
                    Charge grocery bill to Credit Card
                  </span>
                </label>

                {chargeToCreditCard && (
                  <select
                    className="w-full mt-2 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                    value={selectedCreditCardId}
                    onChange={(e) => setSelectedCreditCardId(e.target.value)}
                    required={chargeToCreditCard}
                  >
                    <option value="">Select a credit card...</option>
                    {creditCards.map(card => (
                      <option key={card.id} value={card.id}>
                        {card.title} ({card.issuer}) {card.card_number ? `****${card.card_number.slice(-4)}` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-emerald-800">{t('form_shop_name')}</label>
                <div className="relative">
                  <input
                    className="mt-1 w-full border border-emerald-200 rounded-lg px-3 py-2 text-sm"
                    value={billShopName}
                    onChange={(e) => setBillShopName(e.target.value)}
                    placeholder={t('form_shop_placeholder')}
                    list="shop-suggestions"
                  />
                  <datalist id="shop-suggestions">
                    {shopNames.map(shop => (
                      <option key={shop} value={shop} />
                    ))}
                  </datalist>
                </div>
              </div>
              <div>
                <label className="text-xs text-emerald-800">{t('form_bill_date')}</label>
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
                <label className="text-xs text-emerald-800">{t('form_subtotal')}</label>
                <input
                  className="mt-1 w-full border border-emerald-200 rounded-lg px-3 py-2 text-sm"
                  value={billSubtotal}
                  onChange={(e) => setBillSubtotal(e.target.value)}
                  inputMode="decimal"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="text-xs text-emerald-800">{t('form_gst')}</label>
                <input
                  className="mt-1 w-full border border-emerald-200 rounded-lg px-3 py-2 text-sm"
                  value={billGst}
                  onChange={(e) => setBillGst(e.target.value)}
                  inputMode="decimal"
                  placeholder="0"
                />
                <input
                  className="mt-2 w-full border border-emerald-200 rounded-lg px-3 py-2 text-sm"
                  value={billGstPercent}
                  onChange={(e) => setBillGstPercent(e.target.value)}
                  inputMode="decimal"
                  placeholder="GST % (optional)"
                />
              </div>
              <div>
                <label className="text-xs text-emerald-800">{t('form_total')}</label>
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
              <div className="text-xs text-emerald-800 mb-2">{t('form_items')}</div>
              {billItems.length === 0 && (
                <div className="text-xs text-emerald-700">{t('form_extract_bill_hint')}</div>
              )}

              {billItems.length > 0 && (
                <div className="flex items-center justify-between text-xs text-emerald-800 mb-2">
                  <span>Total Qty: {groceryTotals.totalQty.toFixed(2)}</span>
                  <span>Total Value: {groceryTotals.totalValue.toFixed(2)}</span>
                </div>
              )}

              <div className="space-y-2">
                {billItems.map((it, idx) => {
                  const suggestions = activeAutocompleteIndex === idx 
                    ? getAutocompleteSuggestions(autocompleteQuery) 
                    : []
                  return (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-start">
                      <div className="col-span-6 relative">
                        {priceAlert && priceAlert.item === it.item_name.toLowerCase().trim() && (
                          <div className="absolute -top-16 left-0 right-0 z-20 bg-amber-50 border border-amber-200 rounded-lg p-2 shadow-lg">
                            <div className="text-xs font-semibold text-amber-800 mb-1">Previous Prices:</div>
                            <div className="space-y-1 max-h-20 overflow-auto">
                              {priceAlert.history.slice(0, 3).map((h, i) => (
                                <div key={i} className="flex justify-between text-xs">
                                  <span className="text-amber-700">{h.shop}</span>
                                  <span className={h.price < priceAlert.currentPrice ? 'text-green-600' : 'text-red-600'}>
                                    MVR {h.price.toFixed(2)}
                                  </span>
                                </div>
                              ))}
                            </div>
                            <button 
                              onClick={() => setPriceAlert(null)}
                              className="absolute top-1 right-1 text-amber-400 hover:text-amber-600"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        )}
                        <input
                          className="w-full border border-emerald-200 rounded-lg px-2 py-1.5 text-sm"
                          value={it.item_name}
                          onChange={(e) => {
                            const next = [...billItems]
                            next[idx] = { ...next[idx], item_name: e.target.value }
                            setBillItems(next)
                            setActiveAutocompleteIndex(idx)
                            setAutocompleteQuery(e.target.value)
                          }}
                          onFocus={() => {
                            setActiveAutocompleteIndex(idx)
                            setAutocompleteQuery(it.item_name)
                          }}
                          onBlur={() => {
                            setTimeout(() => setActiveAutocompleteIndex(null), 200)
                          }}
                          placeholder={t('form_item_placeholder')}
                        />
                        {suggestions.length > 0 && (
                          <div className="absolute z-10 w-full mt-1 bg-white border border-emerald-200 rounded-lg shadow-lg max-h-40 overflow-auto">
                            {suggestions.map((suggestion, sIdx) => (
                              <button
                                key={sIdx}
                                type="button"
                                onClick={() => {
                                  const next = [...billItems]
                                  next[idx] = { ...next[idx], item_name: suggestion }
                                  setBillItems(next)
                                  setActiveAutocompleteIndex(null)
                                  
                                  // Show price alert
                                  const key = suggestion.toLowerCase().trim()
                                  const history = itemPriceHistory[key]
                                  if (history && history.length > 0) {
                                    setPriceAlert({
                                      item: key,
                                      currentPrice: Number(next[idx].unit_price) || 0,
                                      history: history.slice(0, 5)
                                    })
                                  }
                                }}
                                className="w-full px-3 py-2 text-left text-sm hover:bg-emerald-50 focus:bg-emerald-50"
                              >
                                {suggestion}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    <input
                      className="col-span-2 border border-emerald-200 rounded-lg px-2 py-1.5 text-sm"
                      value={it.qty}
                      onChange={(e) => {
                        const next = [...billItems]
                        const qty = e.target.value
                        const unit = next[idx]?.unit_price ?? ''
                        const qn = qty.trim() ? Number(qty) : NaN
                        const un = unit.trim() ? Number(unit) : NaN
                        const lineTotal = Number.isFinite(qn) && Number.isFinite(un) ? (qn * un).toFixed(2) : ''
                        next[idx] = { ...next[idx], qty, line_total: lineTotal }
                        setBillItems(next)
                      }}
                      placeholder={t('form_qty_placeholder')}
                      inputMode="decimal"
                    />
                    <input
                      className="col-span-2 border border-emerald-200 rounded-lg px-2 py-1.5 text-sm"
                      value={it.unit_price}
                      onChange={(e) => {
                        const next = [...billItems]
                        const unit_price = e.target.value
                        const qty = next[idx]?.qty ?? ''
                        const qn = qty.trim() ? Number(qty) : NaN
                        const un = unit_price.trim() ? Number(unit_price) : NaN
                        const lineTotal = Number.isFinite(qn) && Number.isFinite(un) ? (qn * un).toFixed(2) : ''
                        next[idx] = { ...next[idx], unit_price, line_total: lineTotal }
                        setBillItems(next)
                      }}
                      placeholder={t('form_price_placeholder')}
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
                        placeholder={t('form_line_total_placeholder')}
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
                  )
                })}

                <button
                  type="button"
                  onClick={() => setBillItems([...billItems, { item_name: '', qty: '', unit_price: '', line_total: '' }])}
                  className="w-full py-2 rounded-lg bg-white border border-emerald-200 text-emerald-700 text-sm font-semibold"
                >
                  {t('form_add_item')}
                </button>
              </div>
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
          {loading ? t('form_saving') : t('form_save_transaction')}
        </button>
      </form>
    </div>
  )
}
