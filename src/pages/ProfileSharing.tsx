import { useEffect, useState } from 'react'
import { firebaseDb } from '../lib/firebase'
import { collection, query, where, getDocs, getDoc, addDoc, deleteDoc, doc } from 'firebase/firestore'
import { useProfile } from '../hooks/useProfile'
import { useAuth } from '../hooks/useAuth'
import { Users, UserPlus, Mail, Trash2, Shield, User, CheckCircle, Home, UsersRound, Copy, Check } from 'lucide-react'

interface SharedProfile {
  id: string
  profile_id: string
  profile_name: string
  shared_with_email: string
  shared_with_user_id: string | null
  role: 'admin' | 'member' | 'viewer'
  share_all_profiles: boolean
  created_at: string
}

interface PendingInvitation {
  id: string
  email: string
  share_all_profiles: boolean
  role: string
  invited_at: string
  token: string
}

export default function ProfileSharing() {
  const { profiles, currentProfile } = useProfile()
  const { user } = useAuth()
  const [sharedProfiles, setSharedProfiles] = useState<SharedProfile[]>([])
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'all' | 'individual'>('all')
  
  // Form state
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'admin' | 'member' | 'viewer'>('member')
  const [selectedProfileId, setSelectedProfileId] = useState<string>('')
  const [shareAllProfiles, setShareAllProfiles] = useState(true)
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)

  useEffect(() => {
    // Update shareAllProfiles based on active tab
    setShareAllProfiles(activeTab === 'all')
  }, [activeTab])

  useEffect(() => {
    if (user) {
      loadSharedProfiles()
      loadPendingInvitations()
    }
    if (currentProfile) {
      setSelectedProfileId(currentProfile.id)
    }
  }, [currentProfile, user])

  const loadSharedProfiles = async () => {
    setLoading(true)
    if (!user) {
      setLoading(false)
      return
    }

    // Load all profiles shared by this user
    const q = query(
      collection(firebaseDb, 'profileShares'),
      where('shared_by', '==', user.uid)
    )
    const snap = await getDocs(q)
    const profiles = snap.docs.map(d => ({ id: d.id, ...d.data() }) as SharedProfile)
    // Sort by created_at descending client-side
    profiles.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    setSharedProfiles(profiles)
    setLoading(false)
  }

  const loadPendingInvitations = async () => {
    if (!user) return

    const q = query(
      collection(firebaseDb, 'profileShareInvitations'),
      where('invited_by', '==', user.uid),
      where('accepted', '==', false)
    )
    const snap = await getDocs(q)
    const invitations = snap.docs.map(d => ({ id: d.id, ...d.data() }) as PendingInvitation)
    // Sort by invited_at descending client-side
    invitations.sort((a, b) => new Date(b.invited_at).getTime() - new Date(a.invited_at).getTime())
    setPendingInvitations(invitations)
  }

  const copyInviteLink = async (token: string) => {
    const baseUrl = window.location.origin
    const inviteLink = `${baseUrl}/accept-invite?token=${token}`
    await navigator.clipboard.writeText(inviteLink)
    setCopiedToken(token)
    setTimeout(() => setCopiedToken(null), 2000)
  }

  const sendInvitation = async () => {
    if (!inviteEmail || !user) return

    setSending(true)
    setMessage(null)

    try {
      const email = inviteEmail.trim()
      const token = crypto.randomUUID()

      // If sharing a single profile, fetch the profile data to store in invitation
      let profileData = null
      if (!shareAllProfiles && selectedProfileId) {
        const profileRef = doc(firebaseDb, 'users', user.uid, 'profiles', selectedProfileId)
        const profileSnap = await getDoc(profileRef)
        if (profileSnap.exists()) {
          profileData = profileSnap.data()
        }
      }

      // Create pending invitation with token at root level
      const invitationData: any = {
        email,
        profile_id: shareAllProfiles ? null : selectedProfileId,
        share_all_profiles: shareAllProfiles,
        role: inviteRole,
        invited_by: user.uid,
        token,
        accepted: false,
        invited_at: new Date().toISOString()
      }

      // Only store profile data fields that exist in the profile document
      if (profileData) {
        if (profileData.name !== undefined) invitationData.profile_name = profileData.name
        if (profileData.currency !== undefined) invitationData.profile_currency = profileData.currency
        if (profileData.is_active !== undefined) invitationData.profile_is_active = profileData.is_active
      }

      await addDoc(collection(firebaseDb, 'profileShareInvitations'), invitationData)

      // Generate and copy invite link
      const baseUrl = window.location.origin
      const inviteLink = `${baseUrl}/accept-invite?token=${token}`

      await navigator.clipboard.writeText(inviteLink)
      setCopiedToken(token)

      setMessage(`Invite link copied! Send it via WhatsApp/any app`)

      // Reload pending invitations
      loadPendingInvitations()
      setInviteEmail('')
    } catch (error: any) {
      setMessage(error.message || 'Failed to send invitation')
    } finally {
      setSending(false)
    }
  }

  const revokeShare = async (shareId: string) => {
    console.log('Revoke share called with ID:', shareId)
    if (!user) return
    try {
      await deleteDoc(doc(firebaseDb, 'profileShares', shareId))
      console.log('Share deleted successfully')
      loadSharedProfiles()
    } catch (error) {
      console.error('Failed to delete share:', error)
    }
  }

  const revokeAllSharesForUser = async (email: string) => {
    console.log('Revoke all shares for user:', email)
    if (!user) return
    try {
      let q
      if (email === 'Unknown') {
        // For Unknown (null email), delete all shares where shared_with equals current user (self-shares)
        q = query(
          collection(firebaseDb, 'profileShares'),
          where('shared_by', '==', user.uid),
          where('shared_with', '==', user.uid)
        )
      } else {
        // For normal email, delete by email
        q = query(
          collection(firebaseDb, 'profileShares'),
          where('shared_by', '==', user.uid),
          where('shared_with_email', '==', email)
        )
      }
      const snap = await getDocs(q)
      console.log('Found shares to delete:', snap.docs.length)
      for (const d of snap.docs) {
        console.log('Deleting share:', d.id)
        await deleteDoc(doc(firebaseDb, 'profileShares', d.id))
      }
      console.log('All shares deleted')
      loadSharedProfiles()
    } catch (error) {
      console.error('Failed to delete shares:', error)
    }
  }

  const deleteInvitation = async (invitationId: string) => {
    console.log('Delete invitation called with ID:', invitationId)
    if (!user) return
    try {
      await deleteDoc(doc(firebaseDb, 'profileShareInvitations', invitationId))
      console.log('Invitation deleted successfully')
      loadPendingInvitations()
    } catch (error) {
      console.error('Failed to delete invitation:', error)
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Shield size={16} className="text-emerald-600" />
      case 'member': return <UserPlus size={16} className="text-blue-600" />
      default: return <User size={16} className="text-gray-600" />
    }
  }

  // Group shares by person for "Share All" view
  const sharesByPerson = sharedProfiles.reduce((acc, share) => {
    const key = share.shared_with_email || 'Unknown'
    if (!acc[key]) {
      acc[key] = []
    }
    acc[key].push(share)
    return acc
  }, {} as Record<string, SharedProfile[]>)

  console.log('Shares by person:', sharesByPerson)
  console.log('Shared profiles:', sharedProfiles)
  console.log('Active tab:', activeTab)
  console.log('Loading state:', loading)
  console.log('Should render shares:', Object.keys(sharesByPerson).length > 0 && activeTab === 'all')

  return (
    <div className="p-4 pb-24">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-xl font-bold text-gray-900">Profile Sharing</h1>
        <p className="text-sm text-gray-500">Share your profiles with family members</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveTab('all')}
          className={`flex-1 py-2 text-sm rounded-lg flex items-center justify-center gap-2 ${
            activeTab === 'all' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700'
          }`}
        >
          <UsersRound size={16} />
          Family Group
        </button>
        <button
          onClick={() => setActiveTab('individual')}
          className={`flex-1 py-2 text-sm rounded-lg flex items-center justify-center gap-2 ${
            activeTab === 'individual' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700'
          }`}
        >
          <Home size={16} />
          Individual
        </button>
      </div>

      {/* Info Card */}
      <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-700 mb-4">
        <p className="font-medium mb-2">
          {activeTab === 'all' ? 'Family Group Sharing:' : 'Individual Profile Sharing:'}
        </p>
        <ul className="list-disc list-inside space-y-1 text-blue-600">
          {activeTab === 'all' ? (
            <>
              <li>Share ALL your profiles with one invitation</li>
              <li>Perfect for spouses/partners who manage finances together</li>
              <li>They can see everything and switch between all profiles</li>
            </>
          ) : (
            <>
              <li>Share only ONE specific profile</li>
              <li>Perfect for kids to see only their own expenses</li>
              <li>They only see what's shared with them</li>
            </>
          )}
        </ul>
      </div>

      {/* Message */}
      {message && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${
          message.includes('sent') || message.includes('shared') 
            ? 'bg-emerald-50 text-emerald-600' 
            : 'bg-red-50 text-red-600'
        }`}>
          {message}
        </div>
      )}

      {/* Invite Form */}
      <div className="bg-white rounded-xl p-4 border border-gray-200 mb-4">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
          <UserPlus size={20} className="text-emerald-600" />
          {activeTab === 'all' ? 'Invite Family Member' : 'Share Profile'}
        </h3>
        
        <div className="space-y-3">
          {/* Email */}
          <div>
            <label className="text-sm font-medium text-gray-700">Email Address</label>
            <div className="relative mt-1">
              <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder={activeTab === 'all' ? "spouse@example.com" : "child@example.com"}
                className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg"
              />
            </div>
          </div>

          {/* Profile Selection (only for individual tab) */}
          {activeTab === 'individual' && (
            <div>
              <label className="text-sm font-medium text-gray-700">Select Profile to Share</label>
              <select
                value={selectedProfileId}
                onChange={(e) => setSelectedProfileId(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg"
              >
                {profiles.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Role */}
          <div>
            <label className="text-sm font-medium text-gray-700">Access Level</label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as 'admin' | 'member' | 'viewer')}
              className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg"
            >
              <option value="admin">Admin - Full access to add, edit, and manage</option>
              <option value="member">Member - Can add and edit transactions</option>
              <option value="viewer">Viewer - Can only view, cannot add/edit</option>
            </select>
          </div>
          
          <button
            onClick={sendInvitation}
            disabled={!inviteEmail || sending}
            className="w-full bg-emerald-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {sending ? 'Sending...' : (
              <>
                <UserPlus size={18} />
                {activeTab === 'all' ? 'Share All Profiles' : 'Share This Profile'}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Pending Invitations */}
      {pendingInvitations.length > 0 && (
        <div className="bg-amber-50 rounded-xl border border-amber-200 overflow-hidden mb-4">
          <div className="p-4 border-b border-amber-100">
            <h3 className="font-semibold text-amber-900 flex items-center gap-2">
              <Mail size={18} />
              Pending Invitations (Not yet joined)
            </h3>
          </div>
          <div className="divide-y divide-amber-100">
            {pendingInvitations.map(invite => (
              <div key={invite.id} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-medium text-amber-900">{invite.email}</p>
                    <p className="text-xs text-amber-700">
                      {invite.share_all_profiles ? 'All profiles' : 'One profile'} • {invite.role}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => copyInviteLink(invite.token)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-sm text-amber-800 hover:bg-amber-100"
                    >
                      {copiedToken === invite.token ? (
                        <>
                          <Check size={16} className="text-emerald-600" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy size={16} />
                          Copy Link
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => deleteInvitation(invite.id)}
                      className="p-1.5 text-red-500 hover:bg-red-100 rounded-lg"
                      title="Delete invitation"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-amber-600">
                  Share this link via WhatsApp/Messenger:
                  <span className="font-mono bg-white px-1 py-0.5 rounded ml-1">
                    {window.location.origin}/accept-invite?token={invite.token?.slice(0, 8) ?? '...'}...
                  </span>
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Currently Shared */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Users size={18} className="text-emerald-600" />
            {activeTab === 'all' ? 'Family Members' : 'Individual Shares'}
          </h3>
        </div>
        
        {loading ? (
          <div className="p-8 text-center text-gray-500">
            <div className="animate-pulse">Loading...</div>
          </div>
        ) : activeTab === 'all' ? (
          // Family Group View - grouped by person
          Object.keys(sharesByPerson).length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <UsersRound size={48} className="mx-auto mb-3 opacity-50" />
              <p>No family members yet</p>
              <p className="text-sm mt-1">Invite your spouse to share all profiles</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {Object.entries(sharesByPerson).map(([email, shares]) => (
                <div key={email} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                        <User size={16} className="text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{email}</p>
                        <p className="text-xs text-gray-500">
                          {shares.length} profile{shares.length > 1 ? 's' : ''} shared
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => revokeAllSharesForUser(email)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="ml-10 space-y-1">
                    {shares.map(share => (
                      <div key={share.id} className="flex items-center gap-2 text-sm text-gray-600">
                        <CheckCircle size={12} className="text-emerald-500" />
                        {share.profile_name}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          // Individual View - list all individual shares
          sharedProfiles.filter(s => !s.share_all_profiles).length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Home size={48} className="mx-auto mb-3 opacity-50" />
              <p>No individual shares yet</p>
              <p className="text-sm mt-1">Share specific profiles with individual family members</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {sharedProfiles
                .filter(s => !s.share_all_profiles)
                .map(share => (
                  <div key={share.id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getRoleIcon(share.role)}
                      <div>
                        <p className="font-medium text-gray-900">{share.profile_name}</p>
                        <p className="text-sm text-gray-500">Shared with {share.shared_with_email}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => revokeShare(share.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
            </div>
          )
        )}
      </div>
    </div>
  )
}
