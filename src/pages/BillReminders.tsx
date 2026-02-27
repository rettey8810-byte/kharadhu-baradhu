import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useProfile } from '../hooks/useProfile'
import type { BillReminder } from '../types'
import { Bell, Check, X, Calendar, AlertCircle } from 'lucide-react'

function formatMVR(value: number | null) {
  if (!value) return 'MVR 0'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'MVR' }).format(value)
}

export default function BillReminders() {
  const { profiles } = useProfile()
  const [reminders, setReminders] = useState<BillReminder[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadReminders()
  }, [profiles])

  const loadReminders = async () => {
    if (profiles.length === 0) return
    setLoading(true)
    
    const profileIds = profiles.map(p => p.id)
    const { data } = await supabase
      .from('bill_reminders')
      .select('*, profile:profile_id(name)')
      .in('profile_id', profileIds)
      .eq('is_dismissed', false)
      .order('due_date', { ascending: true })
    
    setReminders(data || [])
    setLoading(false)
  }

  const dismissReminder = async (id: string) => {
    await supabase.from('bill_reminders').update({ is_dismissed: true }).eq('id', id)
    loadReminders()
  }

  const markAsRead = async (id: string) => {
    await supabase.from('bill_reminders').update({ is_read: true }).eq('id', id)
    loadReminders()
  }

  const isOverdue = (date: string) => new Date(date) < new Date()
  const isToday = (date: string) => new Date(date).toDateString() === new Date().toDateString()

  const unreadCount = reminders.filter(r => !r.is_read).length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-gray-900">Bill Reminders</h2>
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-20 bg-gray-200 rounded-xl" />)}
        </div>
      ) : reminders.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <Bell size={48} className="mx-auto mb-3 opacity-50" />
          <p>No upcoming bills</p>
          <p className="text-sm">Set up recurring expenses to get reminders</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reminders.map(reminder => (
            <div 
              key={reminder.id} 
              className={`bg-white rounded-xl p-4 border-2 ${
                isOverdue(reminder.due_date) ? 'border-red-200 bg-red-50' : 
                isToday(reminder.due_date) ? 'border-yellow-200 bg-yellow-50' : 
                'border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className={`mt-1 ${
                    isOverdue(reminder.due_date) ? 'text-red-500' : 
                    isToday(reminder.due_date) ? 'text-yellow-500' : 'text-blue-500'
                  }`}>
                    <AlertCircle size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{reminder.title}</h3>
                    <p className="text-sm text-gray-500">{(reminder.profile as any)?.name}</p>
                    <div className="flex items-center gap-2 mt-1 text-sm">
                      <Calendar size={14} />
                      <span className={isOverdue(reminder.due_date) ? 'text-red-600 font-medium' : ''}>
                        {isToday(reminder.due_date) ? 'Due today' : 
                         isOverdue(reminder.due_date) ? `Overdue by ${Math.ceil((new Date().getTime() - new Date(reminder.due_date).getTime()) / (1000 * 60 * 60 * 24))} days` :
                         `Due ${new Date(reminder.due_date).toLocaleDateString()}`}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">{formatMVR(reminder.amount)}</p>
                  <div className="flex gap-1 mt-2">
                    <button 
                      onClick={() => markAsRead(reminder.id)}
                      className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200"
                      title="Mark as read"
                    >
                      <Check size={16} className={reminder.is_read ? 'text-gray-400' : 'text-emerald-600'} />
                    </button>
                    <button 
                      onClick={() => dismissReminder(reminder.id)}
                      className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200"
                      title="Dismiss"
                    >
                      <X size={16} className="text-gray-600" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
