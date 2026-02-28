import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useProfile } from '../hooks/useProfile'
import { useLanguage } from '../hooks/useLanguage'
import { Users, UserPlus, Mail, Trash2, Shield, User, CheckCircle } from 'lucide-react'

interface ProfileMember {
  id: string
  profile_id: string
  user_id: string | null
  role: 'owner' | 'admin' | 'member'
  invitation_accepted: boolean
  invitation_email: string | null
  created_at: string
  user?: {
    email: string
  }
}

export default function ProfileSharing() {
  const { currentProfile } = useProfile()
  const { t } = useLanguage()
  const [members, setMembers] = useState<ProfileMember[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member')
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (currentProfile) {
      loadMembers()
    }
  }, [currentProfile])

  const loadMembers = async () => {
    setLoading(true)
    
    // For now, show current user as owner
    // In full implementation, this would fetch from profile_members table
    const mockMembers: ProfileMember[] = [
      {
        id: '1',
        profile_id: currentProfile?.id || '',
        user_id: null,
        role: 'owner',
        invitation_accepted: true,
        invitation_email: null,
        created_at: new Date().toISOString(),
        user: { email: 'You (Owner)' }
      }
    ]
    
    setMembers(mockMembers)
    setLoading(false)
  }

  const sendInvitation = async () => {
    if (!inviteEmail || !currentProfile) return
    
    setSending(true)
    setMessage(null)
    
    try {
      // Call the Supabase function to invite member
      const { error } = await supabase.rpc('invite_profile_member', {
        p_profile_id: currentProfile.id,
        p_email: inviteEmail,
        p_role: inviteRole
      })
      
      if (error) throw error
      
      setMessage(`Invitation sent to ${inviteEmail}`)
      setInviteEmail('')
      loadMembers()
    } catch (error: any) {
      setMessage(error.message || 'Failed to send invitation')
    } finally {
      setSending(false)
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner': return <Shield size={16} className="text-emerald-600" />
      case 'admin': return <UserPlus size={16} className="text-blue-600" />
      default: return <User size={16} className="text-gray-600" />
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'owner': return 'Owner'
      case 'admin': return 'Admin'
      default: return 'Member'
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">{t('page_profile_sharing')}</h2>
      </div>

      <p className="text-gray-600 text-sm">
        Share access to your <strong>{currentProfile?.name}</strong> profile with family members. They can add expenses and income in real-time.
      </p>

      {/* Info Card */}
      <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-700">
        <p className="font-medium mb-2">How it works:</p>
        <ul className="list-disc list-inside space-y-1 text-blue-600">
          <li><strong>Owner:</strong> Full control, can manage members</li>
          <li><strong>Admin:</strong> Can add/edit transactions and invite members</li>
          <li><strong>Member:</strong> Can add transactions and view reports</li>
        </ul>
      </div>

      {/* Invite Form */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <UserPlus size={20} className="text-emerald-600" />
          Invite Family Member
        </h3>
        
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-700">Email Address</label>
            <div className="flex gap-2 mt-1">
              <div className="relative flex-1">
                <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="spouse@example.com"
                  className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg"
                />
              </div>
            </div>
          </div>
          
          <div>
            <label className="text-sm font-medium text-gray-700">Role</label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as 'admin' | 'member')}
              className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg"
            >
              <option value="member">Member (can add transactions)</option>
              <option value="admin">Admin (can manage everything)</option>
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
                Send Invitation
              </>
            )}
          </button>
          
          {message && (
            <p className={`text-sm text-center ${message.includes('sent') ? 'text-emerald-600' : 'text-red-600'}`}>
              {message}
            </p>
          )}
        </div>
      </div>

      {/* Current Members */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Users size={18} className="text-emerald-600" />
            Current Members
          </h3>
        </div>
        
        {loading ? (
          <div className="p-8 text-center text-gray-500">
            <div className="animate-pulse">Loading...</div>
          </div>
        ) : members.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Users size={40} className="mx-auto mb-3 opacity-50" />
            <p>No members yet</p>
            <p className="text-sm mt-1">Invite family members to share this profile</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {members.map((member) => (
              <div key={member.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                    <User size={20} className="text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {member.user?.email || member.invitation_email || 'Unknown'}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {getRoleIcon(member.role)}
                      <span className="text-xs text-gray-500">{getRoleLabel(member.role)}</span>
                      {!member.invitation_accepted && (
                        <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">
                          Pending
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                {member.role !== 'owner' && (
                  <button
                    onClick={() => {/* Remove member */}}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    title="Remove member"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pending Invitations Note */}
      <div className="bg-yellow-50 rounded-xl p-4 text-sm text-yellow-700">
        <p className="flex items-center gap-2">
          <CheckCircle size={16} />
          <strong>Note:</strong> Invited members will receive an email. They need to accept to access the profile.
        </p>
      </div>
    </div>
  )
}
