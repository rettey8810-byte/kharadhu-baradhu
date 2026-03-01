import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useProfile } from '../hooks/useProfile'
import { useLanguage } from '../hooks/useLanguage'
import { Users, Plus, Trash2, UserPlus, Share2, X, Crown, Shield } from 'lucide-react'

interface FamilyGroup {
  id: string
  name: string
  created_by: string
  created_at: string
}

interface GroupMember {
  id: string
  group_id: string
  user_id: string
  role: 'owner' | 'admin' | 'member'
  joined_at: string
  user_email?: string
}

interface GroupProfile {
  id: string
  group_id: string
  profile_id: string
  profile_name?: string
  shared_by: string
  shared_at: string
}

export default function FamilyGroups() {
  const { profiles } = useProfile()
  const {} = useLanguage()
  const [groups, setGroups] = useState<FamilyGroup[]>([])
  const [selectedGroup, setSelectedGroup] = useState<FamilyGroup | null>(null)
  const [members, setMembers] = useState<GroupMember[]>([])
  const [sharedProfiles, setSharedProfiles] = useState<GroupProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'member' | 'admin'>('member')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    loadGroups()
  }, [])

  useEffect(() => {
    if (selectedGroup) {
      loadGroupDetails(selectedGroup.id)
    }
  }, [selectedGroup])

  const loadGroups = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('family_groups')
      .select('*')
      .order('created_at', { ascending: false })
    setGroups(data || [])
    setLoading(false)
  }

  const loadGroupDetails = async (groupId: string) => {
    // Load members with user emails
    const { data: membersData } = await supabase
      .from('family_group_members')
      .select('*')
      .eq('group_id', groupId)
      .order('role', { ascending: false })

    if (membersData) {
      const membersWithEmail = await Promise.all(
        membersData.map(async (m) => {
          const { data: userData } = await supabase
            .from('user_settings')
            .select('email')
            .eq('user_id', m.user_id)
            .single()
          return { ...m, user_email: userData?.email || 'Unknown' }
        })
      )
      setMembers(membersWithEmail)
    }

    // Load shared profiles
    const { data: profilesData } = await supabase
      .from('family_group_profiles')
      .select('*')
      .eq('group_id', groupId)

    if (profilesData) {
      const profilesWithNames = profilesData.map((gp) => {
        const profile = profiles.find((p) => p.id === gp.profile_id)
        return { ...gp, profile_name: profile?.name || 'Unknown Profile' }
      })
      setSharedProfiles(profilesWithNames)
    }
  }

  const createGroup = async () => {
    if (!newGroupName.trim()) return
    setError(null)

    const { data, error } = await supabase
      .from('family_groups')
      .insert({ name: newGroupName.trim() })
      .select()
      .single()

    if (error) {
      setError(error.message)
      return
    }

    setSuccess('Family group created successfully')
    setShowCreateModal(false)
    setNewGroupName('')
    loadGroups()
    setSelectedGroup(data)
  }

  const inviteMember = async () => {
    if (!inviteEmail.trim() || !selectedGroup) return
    setError(null)

    // Find user by email
    const { data: userData } = await supabase
      .from('user_settings')
      .select('user_id')
      .eq('email', inviteEmail.trim())
      .single()

    if (!userData) {
      setError('User not found. They need to sign up first.')
      return
    }

    const { error } = await supabase
      .from('family_group_members')
      .insert({
        group_id: selectedGroup.id,
        user_id: userData.user_id,
        role: inviteRole,
      })

    if (error) {
      setError(error.message)
      return
    }

    setSuccess('Member invited successfully')
    setShowInviteModal(false)
    setInviteEmail('')
    loadGroupDetails(selectedGroup.id)
  }

  const removeMember = async (memberId: string) => {
    if (!selectedGroup) return
    await supabase.from('family_group_members').delete().eq('id', memberId)
    loadGroupDetails(selectedGroup.id)
  }

  const shareProfile = async (profileId: string) => {
    if (!selectedGroup) return
    const { error } = await supabase.from('family_group_profiles').insert({
      group_id: selectedGroup.id,
      profile_id: profileId,
    })

    if (error) {
      setError(error.message)
      return
    }

    loadGroupDetails(selectedGroup.id)
  }

  const unshareProfile = async (profileShareId: string) => {
    if (!selectedGroup) return
    await supabase.from('family_group_profiles').delete().eq('id', profileShareId)
    loadGroupDetails(selectedGroup.id)
  }

  const deleteGroup = async (groupId: string) => {
    if (!confirm('Are you sure you want to delete this family group?')) return
    await supabase.from('family_groups').delete().eq('id', groupId)
    setSelectedGroup(null)
    loadGroups()
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown size={16} className="text-yellow-500" />
      case 'admin':
        return <Shield size={16} className="text-blue-500" />
      default:
        return <Users size={16} className="text-gray-400" />
    }
  }

  const [myRole, setMyRole] = useState<string | null>(null)

  useEffect(() => {
    const getMyRole = async () => {
      if (!selectedGroup) return
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const member = members.find((m) => m.user_id === user.id)
      setMyRole(member?.role || null)
    }
    getMyRole()
  }, [selectedGroup, members])

  const canManage = myRole === 'owner' || myRole === 'admin'

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-gray-200 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 pb-24">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-xl font-bold text-gray-900">Family Groups</h1>
        <p className="text-sm text-gray-500">Share profiles with family members</p>
      </div>

      {/* Create Button */}
      <button
        onClick={() => setShowCreateModal(true)}
        className="w-full mb-4 py-3 bg-emerald-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2"
      >
        <Plus size={20} />
        Create Family Group
      </button>

      {/* Error/Success Messages */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-emerald-50 text-emerald-600 rounded-lg text-sm">{success}</div>
      )}

      {/* Groups List */}
      {groups.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <Users size={48} className="mx-auto mb-3 opacity-50" />
          <p>No family groups yet</p>
          <p className="text-sm mt-1">Create a group to share profiles with family</p>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => (
            <div
              key={group.id}
              onClick={() => setSelectedGroup(group)}
              className={`p-4 rounded-xl cursor-pointer transition-colors ${
                selectedGroup?.id === group.id
                  ? 'bg-emerald-50 border-2 border-emerald-200'
                  : 'bg-white border border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{group.name}</h3>
                  <p className="text-xs text-gray-500">
                    Created {new Date(group.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Users size={20} className="text-gray-400" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Selected Group Details */}
      {selectedGroup && (
        <div className="mt-6 space-y-4">
          {/* Group Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">{selectedGroup.name}</h2>
            {canManage && (
              <button
                onClick={() => deleteGroup(selectedGroup.id)}
                className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
              >
                <Trash2 size={18} />
              </button>
            )}
          </div>

          {/* Members Section */}
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Users size={18} />
                Members
              </h3>
              {canManage && (
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg"
                >
                  <UserPlus size={18} />
                </button>
              )}
            </div>

            <div className="space-y-2">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    {getRoleIcon(member.role)}
                    <span className="text-sm text-gray-700">{member.user_email}</span>
                    <span className="text-xs px-2 py-0.5 bg-gray-200 rounded-full capitalize">
                      {member.role}
                    </span>
                  </div>
                  {canManage && member.role !== 'owner' && (
                    <button
                      onClick={() => removeMember(member.id)}
                      className="p-1 text-red-500 hover:bg-red-50 rounded"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Shared Profiles Section */}
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Share2 size={18} />
                Shared Profiles
              </h3>
            </div>

            {/* Currently Shared */}
            <div className="space-y-2 mb-4">
              {sharedProfiles.length === 0 ? (
                <p className="text-sm text-gray-500">No profiles shared yet</p>
              ) : (
                sharedProfiles.map((gp) => (
                  <div
                    key={gp.id}
                    className="flex items-center justify-between p-2 bg-emerald-50 rounded-lg"
                  >
                    <span className="text-sm text-emerald-700">{gp.profile_name}</span>
                    {canManage && (
                      <button
                        onClick={() => unshareProfile(gp.id)}
                        className="p-1 text-red-500 hover:bg-red-50 rounded"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Share More Profiles */}
            {canManage && (
              <div className="border-t pt-3">
                <p className="text-xs text-gray-500 mb-2">Share additional profiles:</p>
                <div className="flex flex-wrap gap-2">
                  {profiles
                    .filter((p) => !sharedProfiles.some((sp) => sp.profile_id === p.id))
                    .map((profile) => (
                      <button
                        key={profile.id}
                        onClick={() => shareProfile(profile.id)}
                        className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-emerald-100 text-gray-700 hover:text-emerald-700 rounded-lg flex items-center gap-1"
                      >
                        <Plus size={14} />
                        {profile.name}
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Group Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Create Family Group</h3>
            <input
              type="text"
              placeholder="Family Name (e.g., 'Smith Family')"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 mb-4"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={createGroup}
                className="flex-1 py-2 bg-emerald-600 text-white rounded-lg font-semibold"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Member Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Invite Member</h3>
            <input
              type="email"
              placeholder="Email address"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 mb-3"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
            />
            <select
              className="w-full border border-gray-200 rounded-lg px-3 py-2 mb-4"
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as 'member' | 'admin')}
            >
              <option value="member">Member (can view shared profiles)</option>
              <option value="admin">Admin (can invite others and manage)</option>
            </select>
            <div className="flex gap-2">
              <button
                onClick={() => setShowInviteModal(false)}
                className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={inviteMember}
                className="flex-1 py-2 bg-emerald-600 text-white rounded-lg font-semibold"
              >
                Invite
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
