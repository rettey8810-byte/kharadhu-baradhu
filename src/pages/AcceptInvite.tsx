import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

export default function AcceptInvite() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token')
  
  const [loading, setLoading] = useState(true)
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

    const processInvitation = async () => {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          // User not logged in - redirect to login with return URL
          setError('Please sign in or create an account to accept this invitation')
          setLoading(false)
          return
        }

        // Look up the invitation
        const { data: invitation, error: inviteError } = await supabase
          .from('profile_share_invitations')
          .select('*')
          .eq('token', token)
          .eq('accepted', false)
          .single()

        if (inviteError || !invitation) {
          setError('Invalid or expired invitation')
          setLoading(false)
          return
        }

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

        // Accept the invitation
        const { error: acceptError } = await supabase
          .rpc('accept_share_invitation', { p_invitation_id: invitation.id })

        if (acceptError) throw acceptError

        // If it's a share_all_profiles invitation, create shares for all profiles
        if (invitation.share_all_profiles) {
          // Get inviter's profiles
          const { data: inviterProfiles } = await supabase
            .from('expense_profiles')
            .select('*')
            .eq('user_id', invitation.invited_by)
            .eq('is_active', true)

          if (inviterProfiles && inviterProfiles.length > 0) {
            const shares = inviterProfiles.map(p => ({
              profile_id: p.id,
              shared_with: user.id,
              shared_by: invitation.invited_by,
              role: invitation.role,
              share_all_profiles: true,
              shared_with_email: user.email
            }))

            await supabase.from('profile_shares').insert(shares)
          }
        } else if (invitation.profile_id) {
          // Share single profile
          await supabase.rpc('share_profile', {
            p_profile_id: invitation.profile_id,
            p_shared_with: user.id,
            p_role: invitation.role
          })
        }

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
  }, [token, navigate])

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
