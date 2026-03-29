import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { firebaseDb } from '../lib/firebase'
import { collection, query, where, getDocs, addDoc, orderBy } from 'firebase/firestore'
import { useProfile } from '../hooks/useProfile'
import { useAuth } from '../hooks/useAuth'
import type { ExpenseCategory } from '../types'
import { ArrowLeft, Plus, Coffee, Utensils, Car, ShoppingBag, Zap, Check, MessageSquare } from 'lucide-react'

// Quick expense presets
const QUICK_PRESETS = [
  { name: 'Coffee', amount: 35, icon: Coffee, category: 'Food & Dining' },
  { name: 'Lunch', amount: 80, icon: Utensils, category: 'Food & Dining' },
  { name: 'Transport', amount: 15, icon: Car, category: 'Transport' },
  { name: 'Groceries', amount: 200, icon: ShoppingBag, category: 'Groceries' },
  { name: 'Electricity', amount: 500, icon: Zap, category: 'Bills & Utilities' },
]

export default function QuickAdd() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { currentProfile } = useProfile()
  const { user } = useAuth()
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null)
  const [customAmount, setCustomAmount] = useState('')
  const [customDescription, setCustomDescription] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [smsText, setSmsText] = useState('')
  const [showSmsParser, setShowSmsParser] = useState(false)

  // Parse SMS to extract amount and merchant
  const parseSms = (text: string) => {
    // Extract amount - look for MVR followed by number (with optional comma and decimal)
    const amountMatch = text.match(/MVR\s*([\d,]+\.?\d*)/i)
    const amount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : null
    
    // Extract merchant - look for "at [MERCHANT]" pattern
    const merchantMatch = text.match(/at\s+([A-Z0-9\s]+?)(?:\s+was\s+processed|\s+Ref|\s*$)/i)
    let merchant = merchantMatch ? merchantMatch[1].trim() : null
    
    // Clean up merchant name (remove trailing numbers like 04)
    if (merchant) {
      merchant = merchant.replace(/\s+\d+\s*$/, '').trim()
    }
    
    return { amount, merchant }
  }

  const handleSmsPaste = () => {
    if (!smsText.trim()) return
    
    const { amount, merchant } = parseSms(smsText)
    
    if (amount) {
      setCustomAmount(amount.toString())
    }
    
    if (merchant) {
      setCustomDescription(merchant)
    }
    
    // Auto-suggest Groceries category if merchant contains certain keywords
    const groceryKeywords = ['FSM', 'FILL', 'GROCERY', 'SUPERMARKET', 'FOOD']
    const isGrocery = groceryKeywords.some(kw => 
      merchant?.toUpperCase().includes(kw)
    )
    
    if (isGrocery) {
      const groceryCat = categories.find(c => 
        c.name.toLowerCase().includes('grocer') || 
        c.name.toLowerCase().includes('food')
      )
      if (groceryCat) {
        setSelectedCategory(groceryCat.id)
      }
    }
    
    setShowSmsParser(false)
    setSmsText('')
  }

  // Get preset from URL param (for PWA shortcuts)
  const presetName = searchParams.get('preset')

  useEffect(() => {
    if (currentProfile && user) {
      loadCategories()
    }
    if (presetName) {
      const preset = QUICK_PRESETS.find(p => p.name.toLowerCase() === presetName.toLowerCase())
      if (preset) {
        setSelectedPreset(preset.name)
        setCustomAmount(preset.amount.toString())
        setCustomDescription(preset.name)
      }
    }
  }, [currentProfile, presetName, user])

  const loadCategories = async () => {
    if (!user || !currentProfile) return
    const q = query(
      collection(firebaseDb, 'users', user.uid, 'categories'),
      where('profile_id', '==', currentProfile.id),
      where('is_archived', '==', false),
      orderBy('name')
    )
    const snap = await getDocs(q)
    setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() }) as ExpenseCategory))
  }

  const selectPreset = (preset: typeof QUICK_PRESETS[0]) => {
    setSelectedPreset(preset.name)
    setCustomAmount(preset.amount.toString())
    setCustomDescription(preset.name)
    // Auto-select category if exists
    const cat = categories.find(c => c.name === preset.category)
    if (cat) setSelectedCategory(cat.id)
  }

  const saveExpense = async () => {
    if (!user || !currentProfile || !customAmount || !selectedCategory) return
    
    setSaving(true)
    await addDoc(collection(firebaseDb, 'users', user.uid, 'transactions'), {
      profile_id: currentProfile.id,
      type: 'expense',
      amount: parseFloat(customAmount),
      category_id: selectedCategory,
      description: customDescription || 'Quick Add',
      transaction_date: new Date().toISOString().slice(0, 10),
      created_at: new Date().toISOString()
    })
    setSaving(false)
    
    setSaved(true)
    setTimeout(() => {
      navigate('/')
    }, 1500)
  }

  if (saved) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-emerald-50 p-4">
        <div className="text-center">
          <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check size={40} className="text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Saved!</h2>
          <p className="text-gray-600">Expense added successfully</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center gap-3">
          <button 
            onClick={() => navigate('/')}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="font-bold text-gray-900">Quick Add Expense</h1>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-4 space-y-4">
      {/* SMS Parser Toggle */}
        <button
          onClick={() => setShowSmsParser(!showSmsParser)}
          className="w-full bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-center gap-3 text-blue-700 hover:bg-blue-100 transition-colors"
        >
          <MessageSquare size={24} />
          <div className="text-left">
            <p className="font-semibold">Paste SMS Transaction</p>
            <p className="text-sm text-blue-600">Copy & paste your bank SMS to auto-fill</p>
          </div>
        </button>

        {/* SMS Paste Area */}
        {showSmsParser && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
            <h3 className="font-semibold text-gray-900">Paste SMS</h3>
            <textarea
              value={smsText}
              onChange={(e) => setSmsText(e.target.value)}
              placeholder="Paste your SMS here...\n\nExample: Transaction from 0702 on 26/03/26 at 21:08:25 for MVR66.92 at FSM EASY FILL 04 was processed. Reference No:032646296907"
              className="w-full h-32 px-3 py-3 border border-gray-200 rounded-xl text-sm"
            />
            <button
              onClick={handleSmsPaste}
              disabled={!smsText.trim()}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold disabled:opacity-50"
            >
              Parse & Fill
            </button>
            <p className="text-xs text-gray-500">
              We'll extract: Amount (MVR), Merchant name, and suggest a category
            </p>
          </div>
        )}

        {/* Quick Presets */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-3">Common Expenses</h3>
          <div className="grid grid-cols-2 gap-2">
            {QUICK_PRESETS.map((preset) => {
              const Icon = preset.icon
              const isSelected = selectedPreset === preset.name
              return (
                <button
                  key={preset.name}
                  onClick={() => selectPreset(preset)}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                    isSelected 
                      ? 'border-emerald-500 bg-emerald-50' 
                      : 'border-gray-200 hover:border-emerald-300'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    isSelected ? 'bg-emerald-500' : 'bg-gray-100'
                  }`}>
                    <Icon size={20} className={isSelected ? 'text-white' : 'text-gray-600'} />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{preset.name}</p>
                    <p className="text-xs text-gray-500">MVR {preset.amount}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Custom Entry */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-4">
          <h3 className="font-semibold text-gray-900">Details</h3>
          
          <div>
            <label className="text-sm font-medium text-gray-700">Amount (MVR)</label>
            <input
              type="number"
              value={customAmount}
              onChange={(e) => {
                setCustomAmount(e.target.value)
                setSelectedPreset(null)
              }}
              placeholder="0.00"
              className="w-full mt-1 px-3 py-3 text-2xl font-bold border border-gray-200 rounded-xl"
              autoFocus
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Description</label>
            <input
              type="text"
              value={customDescription}
              onChange={(e) => setCustomDescription(e.target.value)}
              placeholder="What was this for?"
              className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg"
            >
              <option value="">Select category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={saveExpense}
          disabled={!customAmount || !selectedCategory || saving}
          className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-emerald-200"
        >
          <Plus size={24} />
          {saving ? 'Saving...' : 'Add Expense'}
        </button>

        {/* Tip */}
        <p className="text-center text-sm text-gray-500">
          Tip: You can bookmark this page or add to home screen for instant access!
        </p>
      </main>
    </div>
  )
}
