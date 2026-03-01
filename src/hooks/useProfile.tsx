import { useState, useEffect, useContext, createContext, ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import type { ExpenseProfile } from '../types'

interface ProfileContextType {
  profiles: ExpenseProfile[]
  currentProfile: ExpenseProfile | null
  loading: boolean
  setCurrentProfile: (profile: ExpenseProfile) => void
  refreshProfiles: () => Promise<void>
  createProfile: (name: string, type: 'personal' | 'family' | 'business') => Promise<void>
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined)

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profiles, setProfiles] = useState<ExpenseProfile[]>([])
  const [currentProfile, setCurrentProfileState] = useState<ExpenseProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfiles = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Use the RPC function to get all accessible profiles (owned + family group shared)
    const { data: accessibleProfiles, error: rpcError } = await supabase
      .rpc('get_accessible_profiles')

    if (rpcError) {
      // Fallback to just own profiles if the function doesn't exist yet
      const { data: profilesData } = await supabase
        .from('expense_profiles')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at')

      if (profilesData) {
        setProfiles(profilesData)
        const { data: settings } = await supabase
          .from('user_settings')
          .select('*')
          .eq('user_id', user.id)
          .single()

        if (settings?.default_profile_id) {
          const defaultProfile = profilesData.find((p: ExpenseProfile) => p.id === settings.default_profile_id)
          if (defaultProfile) {
            setCurrentProfileState(defaultProfile)
          } else if (profilesData.length > 0) {
            setCurrentProfileState(profilesData[0])
          }
        } else if (profilesData.length > 0) {
          setCurrentProfileState(profilesData[0])
        }
      }
    } else if (accessibleProfiles) {
      setProfiles(accessibleProfiles)
      
      // Get default profile from settings
      const { data: settings } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (settings?.default_profile_id) {
        const defaultProfile = accessibleProfiles.find((p: ExpenseProfile) => p.id === settings.default_profile_id)
        if (defaultProfile) {
          setCurrentProfileState(defaultProfile)
        } else if (accessibleProfiles.length > 0) {
          setCurrentProfileState(accessibleProfiles[0])
        }
      } else if (accessibleProfiles.length > 0) {
        setCurrentProfileState(accessibleProfiles[0])
      }
    }
    setLoading(false)
  }

  const setCurrentProfile = async (profile: ExpenseProfile) => {
    setCurrentProfileState(profile)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase
        .from('user_settings')
        .upsert({ user_id: user.id, default_profile_id: profile.id })
    }
  }

  const createProfile = async (name: string, type: 'personal' | 'family' | 'business') => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { error } = await supabase
      .from('expense_profiles')
      .insert({ user_id: user.id, name, type })
      .select()
      .single()

    if (error) throw error
    await fetchProfiles()
  }

  useEffect(() => {
    fetchProfiles()
  }, [])

  return (
    <ProfileContext.Provider value={{
      profiles,
      currentProfile,
      loading,
      setCurrentProfile,
      refreshProfiles: fetchProfiles,
      createProfile
    }}>
      {children}
    </ProfileContext.Provider>
  )
}

export function useProfile() {
  const context = useContext(ProfileContext)
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider')
  }
  return context
}
