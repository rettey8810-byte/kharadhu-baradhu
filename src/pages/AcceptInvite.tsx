import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { firebaseDb } from '../lib/firebase'
import { collection, query, where, getDocs, doc, addDoc, updateDoc } from 'firebase/firestore'
import { useAuth } from '../hooks/useAuth'
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

export default function AcceptInvite() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [loading, setLoading] = useState(true)
  const [needsLogin, setNeedsLogin] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [inviteDetails, setInviteDetails] = useState<{
    email: string
    share_all_profiles: boolean
    role: string
  } | null>(null)

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token')
    console.log('AcceptInvite page loaded, token from URL:', token)
    if (token) {
      verifyAndAcceptInvitation(token)
    } else {
      setError('No invitation token found in URL')
      setLoading(false)
    }
  }, [])

  // Watch for user login to process pending invitation
  useEffect(() => {
    const pendingToken = localStorage.getItem('pendingInviteToken')
    if (user && pendingToken && needsLogin) {
      console.log('User logged in, processing pending invitation')
      localStorage.removeItem('pendingInviteToken')
      setNeedsLogin(false)
      setLoading(true)
      verifyAndAcceptInvitation(pendingToken)
    }
  }, [user, needsLogin])

  const verifyAndAcceptInvitation = async (token: string) => {
    console.log('verifyAndAcceptInvitation called with token:', token)
    console.log('Current user:', user)

    try {
      if (!user) {
        console.log('User not logged in, storing token and showing login button')
        // Store token in localStorage for after-login processing
        localStorage.setItem('pendingInviteToken', token)
        // User not logged in - show login button instead of error
        setNeedsLogin(true)
        setLoading(false)
        return
      }

      // Look up the invitation in Firestore
      console.log('Looking up invitation in Firestore')
      const q = query(
        collection(firebaseDb, 'profileShareInvitations'),
        where('token', '==', token),
        where('accepted', '==', false)
      )
      const snap = await getDocs(q)

      console.log('Found invitations:', snap.docs.length)

      if (snap.empty) {
        console.log('No valid invitation found')
        setError('Invalid or expired invitation')
        setLoading(false)
        return
      }

      const invitation = { id: snap.docs[0].id, ...snap.docs[0].data() } as any
      console.log('Invitation data:', invitation)

      setInviteDetails({
        email: invitation.email,
        share_all_profiles: invitation.share_all_profiles,
        role: invitation.role
      })

      // Check if user's email matches the invitation
      const userEmail = user.email?.toLowerCase()
      const inviteEmail = invitation.email.toLowerCase()

      console.log('Email check:', { userEmail, inviteEmail, match: userEmail === inviteEmail })

      if (userEmail !== inviteEmail) {
        setError(`This invitation was sent to ${invitation.email}. You are signed in as ${userEmail}. Please sign in with the correct email.`)
        setLoading(false)
        return
      }

      // Mark invitation as accepted
      console.log('Marking invitation as accepted')
      await updateDoc(doc(firebaseDb, 'profileShareInvitations', invitation.id), {
        accepted: true,
        accepted_at: new Date().toISOString(),
        accepted_by: user.uid
      })

      console.log('Invitation details:', {
        invited_by: invitation.invited_by,
        current_user: user.uid,
        are_same: invitation.invited_by === user.uid
      })

      // Prevent user from accepting their own invitation
      if (invitation.invited_by === user.uid) {
        setError('You cannot accept your own invitation. Please share this link with the intended person.')
        setLoading(false)
        return
      }

      // If it's a share_all_profiles invitation, create shares for all profiles
      if (invitation.share_all_profiles) {
        console.log('Creating shares for all profiles')
        // Get inviter's profiles
        const profilesQuery = query(
          collection(firebaseDb, 'users', invitation.invited_by, 'profiles'),
          where('is_active', '==', true)
        )
        const profilesSnap = await getDocs(profilesQuery)

        console.log('Found profiles to share:', profilesSnap.docs.length)

        if (profilesSnap && profilesSnap.docs.length > 0) {
          const sharePromises = profilesSnap.docs.map(p => {
            const profileData = p.data()
            const shareData = {
              profile_id: p.id,
              shared_with: user.uid,
              shared_by: invitation.invited_by,
              role: invitation.role,
              share_all_profiles: true,
              shared_with_email: user.email,
              created_at: new Date().toISOString(),
              // Store profile data directly in share to avoid permission issues
              profile_name: profileData.name,
              profile_color: profileData.color,
              profile_icon: profileData.icon,
              profile_currency: profileData.currency,
              profile_is_active: profileData.is_active
            }
            console.log('Creating share:', shareData)
            return addDoc(collection(firebaseDb, 'profileShares'), shareData)
          })
          await Promise.all(sharePromises)
          console.log('All shares created successfully')
        }
      } else if (invitation.profile_id) {
        // Share single profile
        console.log('Creating single profile share for:', invitation.profile_id)

        // Use profile data from invitation (stored during invitation creation)
        const shareData = {
          profile_id: invitation.profile_id,
          shared_with: user.uid,
          shared_by: invitation.invited_by,
          role: invitation.role,
          share_all_profiles: false,
          shared_with_email: user.email,
          created_at: new Date().toISOString(),
          // Use profile data from invitation to avoid permission issues
          profile_name: invitation.profile_name || 'Shared Profile',
          profile_color: invitation.profile_color,
          profile_icon: invitation.profile_icon,
          profile_currency: invitation.profile_currency,
          profile_is_active: invitation.profile_is_active
        }
        console.log('Creating share:', shareData)
        await addDoc(collection(firebaseDb, 'profileShares'), shareData)
        console.log('Single share created successfully')
      }

      // Clear pending token
      localStorage.removeItem('pendingInviteToken')

      setSuccess(true)
      setLoading(false)

      // Redirect to dashboard after 3 seconds
      setTimeout(() => {
        navigate('/')
      }, 3000)

    } catch (err: any) {
      console.error('Error processing invitation:', err)
      setError(err.message || 'Failed to process invitation')
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <Loader2 size={48} className="mx-auto mb-4 animate-spin text-emerald-600" />
          <p className="text-gray-600">Processing your invitation...</p>
        </div>
      </div>
    )
  }

  if (needsLogin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white rounded-2xl p-6 border border-gray-200">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={32} className="text-amber-600" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">Accept Invitation</h1>
            <p className="text-gray-600 mt-2">
              Please sign in or create an account to accept this invitation.
            </p>
            <p className="text-sm text-amber-600 mt-2">
              Use the same email address that received the invitation.
            </p>
          </div>
          
          <div className="space-y-3">
            <button
              onClick={() => navigate('/login')}
              className="w-full bg-emerald-600 text-white py-3 rounded-xl font-semibold"
            >
              Sign In
            </button>
            <button
              onClick={() => navigate('/login')}
              className="w-full bg-white border border-emerald-600 text-emerald-600 py-3 rounded-xl font-semibold"
            >
              Create Account
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white rounded-2xl p-6 border border-gray-200">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={32} className="text-red-600" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">Invitation Error</h1>
            <p className="text-red-600 mt-2">{error}</p>
          </div>
          
          <button
            onClick={() => navigate('/login')}
            className="w-full bg-emerald-600 text-white py-3 rounded-xl font-semibold"
          >
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white rounded-2xl p-6 border border-gray-200">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={32} className="text-emerald-600" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">Invitation Accepted!</h1>
            <p className="text-gray-600 mt-2">
              You now have access to {inviteDetails?.share_all_profiles ? 'all profiles' : 'the shared profile'}.
            </p>
            <p className="text-sm text-gray-500 mt-4">
              Redirecting to dashboard in 3 seconds...
            </p>
          </div>
          
          <button
            onClick={() => navigate('/')}
            className="w-full bg-emerald-600 text-white py-3 rounded-xl font-semibold"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return null
}
