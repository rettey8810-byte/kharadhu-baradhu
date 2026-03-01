import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setLoading(true)

    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        setMessage('Signed in successfully.')
        
        // Check for pending invite token and redirect
        const pendingToken = localStorage.getItem('pendingInviteToken')
        if (pendingToken) {
          window.location.href = `/accept-invite?token=${pendingToken}`
          return
        }
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password })
        if (error) throw error

        if (data.session) {
          setMessage('Account created and signed in.')
          
          // Check for pending invite token and redirect
          const pendingToken = localStorage.getItem('pendingInviteToken')
          if (pendingToken) {
            window.location.href = `/accept-invite?token=${pendingToken}`
            return
          }
        } else {
          setMessage('Account created. Check your email to confirm your account, then come back and sign in.')
        }
      }
    } catch (err: any) {
      setError(err?.message ?? 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white border border-gray-200 rounded-2xl p-6">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-2xl mb-3 overflow-hidden border border-gray-100">
            <img src="/logo.png" alt="Kharadhu Baradhu" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Kharadhu Baradhu</h1>
          <p className="text-sm text-gray-500 mt-1">Track Family Expenses</p>
        </div>

        <form onSubmit={submit} className="mt-6 space-y-3">
          <div>
            <label className="text-sm text-gray-600">Email</label>
            <input
              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
            />
          </div>

          <div>
            <label className="text-sm text-gray-600">Password</label>
            <input
              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
            />
          </div>

          {error && (
            <div className="text-sm text-red-600">{error}</div>
          )}

          {message && (
            <div className="text-sm text-emerald-700">{message}</div>
          )}

          <button
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-3 py-2 font-semibold disabled:opacity-60"
            disabled={loading}
            type="submit"
          >
            {loading ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>

          <button
            type="button"
            className="w-full text-sm text-gray-600 hover:text-gray-900"
            onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
          >
            {mode === 'signin' ? 'New here? Create an account' : 'Already have an account? Sign in'}
          </button>

          <div className="text-xs text-gray-500 pt-2">
            If you can’t log in after sign-up, your Supabase project may require email confirmation.
          </div>
        </form>
      </div>
    </div>
  )
}
