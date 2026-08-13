import { useEffect, useState } from 'react'
import type { User } from 'firebase/auth'
import { onAuthStateChanged } from 'firebase/auth'
import { firebaseAuth } from '../lib/firebase'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, (nextUser) => {
      setUser(nextUser)
      setLoading(false)

      // Check for pending invitation after login
      if (nextUser) {
        const pendingToken = localStorage.getItem('pendingInviteToken')
        if (pendingToken) {
          console.log('User logged in, found pending invitation token:', pendingToken)
          // Redirect to accept invite page with the token
          window.location.href = `/accept-invite?token=${pendingToken}`
        }
      }
    })

    return () => unsubscribe()
  }, [])

  return { user, loading }
}
