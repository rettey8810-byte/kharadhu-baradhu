import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { firebaseDb } from '../lib/firebase'
import { collection, query, where, getDocs, doc, addDoc, updateDoc } from 'firebase/firestore'
import { useAuth } from '../hooks/useAuth'
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

export default function AcceptInvite() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const token = searchParams.get('token')
  
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
    if (!token) {
      setError('No invitation token found')
      setLoading(false)
      return
    }

    // Store token in localStorage for after-login processing
    localStorage.setItem('pendingInviteToken', token)

    const processInvitation = async () => {
      try {
        if (!user) {
          // User not logged in - show login button instead of error
          setNeedsLogin(true)
          setLoading(false)
          return
        }

        // Look up the invitation in Firestore
        // Need to search all users' invitations since we don't know the inviter yet
        // This is a limitation - ideally we'd have a root-level collection for invitations
        const q = query(
          collection(firebaseDb, 'profileShareInvitations'),
          where('token', '==', token),
          where('accepted', '==', false)
        )
        const snap = await getDocs(q)
        
        if (snap.empty) {
          setError('Invalid or expired invitation')
          setLoading(false)
          return
        }

        const invitation = { id: snap.docs[0].id, ...snap.docs[0].data() } as any

        setInviteDetails({
          email: invitation.email,
          share_all_profiles: invitation.share_all_profiles,
          role: invitation.role
        })

        // Check if user's email matches the invitation
        const userEmail = user.email?.toLowerCase()
        const inviteEmail = invitation.email.toLowerCase()
        
        if (userEmail !== inviteEmail) {
          setError(`This invitation was sent to ${invitation.email}. You are signed in as ${userEmail}. Please sign in with the correct email.`)
          setLoading(false)
          return
        }

        // Mark invitation as accepted
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
              const shareData = {
                profile_id: p.id,
                shared_with: user.uid,
                shared_by: invitation.invited_by,
                role: invitation.role,
                share_all_profiles: true,
                shared_with_email: user.email,
                created_at: new Date().toISOString()
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
          const shareData = {
            profile_id: invitation.profile_id,
            shared_with: user.uid,
            shared_by: invitation.invited_by,
            role: invitation.role,
            share_all_profiles: false,
            shared_with_email: user.email,
            created_at: new Date().toISOString()
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
        setError(err.message || 'Failed to process invitation')
        setLoading(false)
      }
    }

    processInvitation()
  }, [token, navigate, user])

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
