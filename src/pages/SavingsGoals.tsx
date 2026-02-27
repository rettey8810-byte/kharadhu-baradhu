import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useProfile } from '../hooks/useProfile'
import type { SavingsGoal } from '../types'
import { Plus, Target, Trash2, TrendingUp, Calendar } from 'lucide-react'

function formatMVR(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'MVR' }).format(value)
}

export default function SavingsGoals() {
  const { currentProfile } = useProfile()
  const [goals, setGoals] = useState<SavingsGoal[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    target_amount: '',
    current_amount: '',
    deadline: '',
    color: '#10b981'
  })

  useEffect(() => {
    loadGoals()
  }, [currentProfile])

  const loadGoals = async () => {
    if (!currentProfile) return
    setLoading(true)
    const { data } = await supabase
      .from('savings_goals')
      .select('*')
      .eq('profile_id', currentProfile.id)
      .order('created_at', { ascending: false })
    setGoals(data || [])
    setLoading(false)
  }

  const addGoal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentProfile) return
    
    const { error } = await supabase.from('savings_goals').insert({
      profile_id: currentProfile.id,
      name: formData.name,
      target_amount: parseFloat(formData.target_amount),
      current_amount: parseFloat(formData.current_amount) || 0,
      deadline: formData.deadline || null,
      color: formData.color
    })
    
    if (!error) {
      setFormData({ name: '', target_amount: '', current_amount: '', deadline: '', color: '#10b981' })
      setShowAdd(false)
      loadGoals()
    }
  }

  const updateProgress = async (id: string, newAmount: number) => {
    const { error } = await supabase
      .from('savings_goals')
      .update({ current_amount: newAmount })
      .eq('id', id)
    
    if (!error) loadGoals()
  }

  const deleteGoal = async (id: string) => {
    if (!confirm('Delete this savings goal?')) return
    await supabase.from('savings_goals').delete().eq('id', id)
    loadGoals()
  }

  const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1']

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Savings Goals</h2>
          <p className="text-sm text-gray-500">Track progress toward your financial targets</p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl p-2"
        >
          <Plus size={20} />
        </button>
      </div>

      {showAdd && (
        <form onSubmit={addGoal} className="bg-white rounded-2xl p-4 border border-gray-200 space-y-3">
          <div>
            <label className="text-sm text-gray-600">Goal Name</label>
            <input
              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              placeholder="e.g. New Car"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-gray-600">Target Amount</label>
              <input
                type="number"
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2"
                value={formData.target_amount}
                onChange={e => setFormData({...formData, target_amount: e.target.value})}
                placeholder="5000"
                required
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">Current Saved</label>
              <input
                type="number"
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2"
                value={formData.current_amount}
                onChange={e => setFormData({...formData, current_amount: e.target.value})}
                placeholder="0"
              />
            </div>
          </div>
          <div>
            <label className="text-sm text-gray-600">Deadline (optional)</label>
            <input
              type="date"
              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2"
              value={formData.deadline}
              onChange={e => setFormData({...formData, deadline: e.target.value})}
            />
          </div>
          <div>
            <label className="text-sm text-gray-600">Color</label>
            <div className="flex gap-2 mt-1">
              {colors.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setFormData({...formData, color: c})}
                  className={`w-8 h-8 rounded-full ${formData.color === c ? 'ring-2 ring-offset-2 ring-gray-400' : ''}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowAdd(false)} className="flex-1 py-2 rounded-lg border border-gray-200">
              Cancel
            </button>
            <button type="submit" className="flex-1 py-2 rounded-lg bg-emerald-600 text-white">
              Add Goal
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="animate-pulse space-y-3">
          {[1,2].map(i => <div key={i} className="h-32 bg-gray-200 rounded-2xl" />)}
        </div>
      ) : goals.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <Target size={48} className="mx-auto mb-3 opacity-50" />
          <p>No savings goals yet</p>
          <p className="text-sm">Create your first goal!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {goals.map(goal => {
            const percent = Math.min(100, (goal.current_amount / goal.target_amount) * 100)
            const remaining = goal.target_amount - goal.current_amount
            
            return (
              <div key={goal.id} className="bg-white rounded-2xl p-4 border border-gray-200">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: goal.color + '20' }}
                    >
                      <TrendingUp size={20} style={{ color: goal.color }} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{goal.name}</h3>
                      {goal.deadline && (
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <Calendar size={12} />
                          Due {new Date(goal.deadline).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <button 
                    onClick={() => deleteGoal(goal.id)}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

                <div className="mb-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-semibold text-gray-900">{formatMVR(goal.current_amount)}</span>
                    <span className="text-gray-500">of {formatMVR(goal.target_amount)}</span>
                  </div>
                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${percent}%`, backgroundColor: goal.color }}
                    />
                  </div>
                  <div className="flex justify-between text-xs mt-1">
                    <span className="text-gray-500">{percent.toFixed(0)}% complete</span>
                    <span className="text-gray-500">{formatMVR(remaining)} left</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const add = prompt('Add to savings:', '100')
                      if (add) updateProgress(goal.id, goal.current_amount + parseFloat(add))
                    }}
                    className="flex-1 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm font-medium"
                  >
                    + Add Money
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
