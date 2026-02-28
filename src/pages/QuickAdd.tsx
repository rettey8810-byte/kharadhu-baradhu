import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useProfile } from '../hooks/useProfile'
import type { ExpenseCategory } from '../types'
import { ArrowLeft, Plus, Coffee, Utensils, Car, ShoppingBag, Zap, Check } from 'lucide-react'

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
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null)
  const [customAmount, setCustomAmount] = useState('')
  const [customDescription, setCustomDescription] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Get preset from URL param (for PWA shortcuts)
  const presetName = searchParams.get('preset')

  useEffect(() => {
    if (currentProfile) {
      loadCategories()
    }
    // Auto-select if preset passed in URL
    if (presetName) {
      const preset = QUICK_PRESETS.find(p => p.name.toLowerCase() === presetName.toLowerCase())
      if (preset) {
        setSelectedPreset(preset.name)
        setCustomAmount(preset.amount.toString())
        setCustomDescription(preset.name)
      }
    }
  }, [currentProfile, presetName])

  const loadCategories = async () => {
    const { data } = await supabase
      .from('expense_categories')
      .select('*')
      .eq('profile_id', currentProfile!.id)
      .eq('is_archived', false)
      .order('name')
    setCategories(data || [])
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
    if (!currentProfile || !customAmount || !selectedCategory) return
    
    setSaving(true)
    const { error } = await supabase.from('transactions').insert({
      profile_id: currentProfile.id,
      type: 'expense',
      amount: parseFloat(customAmount),
      category_id: selectedCategory,
      description: customDescription || 'Quick Add',
      transaction_date: new Date().toISOString().slice(0, 10),
    })
    setSaving(false)
    
    if (!error) {
      setSaved(true)
      setTimeout(() => {
        navigate('/')
      }, 1500)
    }
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
