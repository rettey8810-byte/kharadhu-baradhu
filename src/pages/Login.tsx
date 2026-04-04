import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createUserWithEmailAndPassword, sendPasswordResetEmail, signInWithEmailAndPassword } from 'firebase/auth'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { firebaseAuth, firebaseDb } from '../lib/firebase'

export default function Login() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const forgotPassword = async () => {
    setError(null)
    setMessage(null)

    const cleanEmail = email.trim()
    if (!cleanEmail) {
      setError('Please enter your email first')
      return
    }

    setLoading(true)
    try {
      await sendPasswordResetEmail(firebaseAuth, cleanEmail)
      setMessage('Password reset email sent. Please check your inbox.')
    } catch (err: any) {
      setError(err?.message ?? 'Failed to send password reset email')
    } finally {
      setLoading(false)
    }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setLoading(true)

    try {
      if (mode === 'signin') {
        await signInWithEmailAndPassword(firebaseAuth, email.trim(), password)
        setMessage('Signed in successfully.')
        
        // Check for pending invite token and redirect
        const pendingToken = localStorage.getItem('pendingInviteToken')
        if (pendingToken) {
          navigate(`/accept-invite?token=${pendingToken}`)
          return
        }
      } else {
        const userCredential = await createUserWithEmailAndPassword(firebaseAuth, email.trim(), password)
        const newUser = userCredential.user
        
        // Save user metadata to Firestore
        await setDoc(doc(firebaseDb, 'usersMetadata', newUser.uid), {
          email: newUser.email,
          displayName: newUser.displayName || '',
          created_at: serverTimestamp(),
          last_sign_in_at: serverTimestamp()
        })
        
        setMessage('Account created and signed in.')

        // Check for pending invite token and redirect
        const pendingToken = localStorage.getItem('pendingInviteToken')
        if (pendingToken) {
          window.location.href = `/accept-invite?token=${pendingToken}`
          return
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

          {mode === 'signin' && (
            <button
              type="button"
              className="w-full text-sm text-emerald-700 hover:text-emerald-800"
              disabled={loading}
              onClick={forgotPassword}
            >
              Forgot password?
            </button>
          )}

          <div className="text-xs text-gray-500 pt-2">
            If you don’t see the reset email, check your spam folder.
          </div>
        </form>
      </div>
    </div>
  )
}
