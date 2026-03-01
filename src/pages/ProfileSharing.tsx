import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useProfile } from '../hooks/useProfile'
import { Users, UserPlus, Mail, Trash2, Shield, User, CheckCircle, Home, UsersRound } from 'lucide-react'

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

export default function ProfileSharing() {
  const { profiles, currentProfile } = useProfile()
  const [sharedProfiles, setSharedProfiles] = useState<SharedProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'all' | 'individual'>('all')
  
  // Form state
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'admin' | 'member' | 'viewer'>('member')
  const [selectedProfileId, setSelectedProfileId] = useState<string>('')
  const [shareAllProfiles, setShareAllProfiles] = useState(true)
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    // Update shareAllProfiles based on active tab
    setShareAllProfiles(activeTab === 'all')
  }, [activeTab])

  useEffect(() => {
    loadSharedProfiles()
    if (currentProfile) {
      setSelectedProfileId(currentProfile.id)
    }
  }, [currentProfile])

  const loadSharedProfiles = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }

    // Load all profiles shared by this user
    const { data } = await supabase
      .from('profile_shares')
      .select('*')
      .eq('shared_by', user.id)
      .order('created_at', { ascending: false })

    setSharedProfiles(data || [])
    setLoading(false)
  }

  const sendInvitation = async () => {
    if (!inviteEmail) return
    
    setSending(true)
    setMessage(null)
    
    try {
      const email = inviteEmail.trim()

      // auth.users is not queryable from the client. Use RPC instead.
      const { data: existingUserId, error: lookupError } = await supabase
        .rpc('get_user_id_by_email', { p_email: email })

      if (lookupError) throw lookupError

      if (!existingUserId) {
        // User doesn't exist - create a pending invitation
        const { error } = await supabase
          .from('profile_share_invitations')
          .insert({
            email,
            profile_id: shareAllProfiles ? null : selectedProfileId,
            share_all_profiles: shareAllProfiles,
            role: inviteRole,
            invited_by: (await supabase.auth.getUser()).data.user?.id
          })
        
        if (error) throw error

        const { error: emailError } = await supabase.functions.invoke('send-profile-invite', {
          body: {
            email,
            shareAllProfiles,
            profileId: shareAllProfiles ? null : selectedProfileId,
            role: inviteRole
          }
        })

        if (emailError) throw emailError

        setMessage(`Invitation email sent to ${email}. They can sign up and then you can share again if needed.`)
      } else {
        // User exists - create direct share
        if (shareAllProfiles) {
          // Share all profiles
          const { data: { user } } = await supabase.auth.getUser()
          const shares = profiles.map(p => ({
            profile_id: p.id,
            shared_with: existingUserId,
            shared_by: user?.id,
            role: inviteRole,
            share_all_profiles: true
          }))
          
          const { error } = await supabase.from('profile_shares').insert(shares)
          if (error) throw error
        } else {
          // Share single profile
          const { error } = await supabase.rpc('share_profile', {
            p_profile_id: selectedProfileId,
            p_shared_with: existingUserId,
            p_role: inviteRole
          })
          if (error) throw error
        }
        
        setMessage(`${shareAllProfiles ? 'All profiles' : 'Profile'} shared with ${email}`)
      }
      
      setInviteEmail('')
      loadSharedProfiles()
    } catch (error: any) {
      setMessage(error.message || 'Failed to send invitation')
    } finally {
      setSending(false)
    }
  }

  const revokeShare = async (shareId: string) => {
    await supabase.from('profile_shares').delete().eq('id', shareId)
    loadSharedProfiles()
  }

  const revokeAllSharesForUser = async (email: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    await supabase
      .from('profile_shares')
      .delete()
      .eq('shared_by', user?.id)
      .eq('shared_with_email', email)
    loadSharedProfiles()
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
    const key = share.shared_with_email
    if (!acc[key]) {
      acc[key] = []
    }
    acc[key].push(share)
    return acc
  }, {} as Record<string, SharedProfile[]>)

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
