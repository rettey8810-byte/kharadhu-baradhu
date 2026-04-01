import { useState, useEffect, useContext, createContext, ReactNode } from 'react'
import type { ExpenseProfile } from '../types'
import { onAuthStateChanged } from 'firebase/auth'
import { collection, doc, getDoc, getDocs, limit, orderBy, query, setDoc, where, updateDoc, addDoc } from 'firebase/firestore'
import { firebaseAuth, firebaseDb } from '../lib/firebase'

// Default categories for new profiles
const DEFAULT_CATEGORIES = [
  { name: 'Grocery', color: '#22C55E', icon: 'shopping-cart' },
  { name: 'Food & Dining', color: '#EF4444', icon: 'utensils' },
  { name: 'Transport', color: '#3B82F6', icon: 'car' },
  { name: 'Utilities', color: '#F59E0B', icon: 'bolt' },
  { name: 'Entertainment', color: '#8B5CF6', icon: 'film' },
  { name: 'Shopping', color: '#EC4899', icon: 'shopping-bag' },
  { name: 'Health', color: '#10B981', icon: 'heart' },
  { name: 'Education', color: '#6366F1', icon: 'graduation-cap' },
  { name: 'Home', color: '#14B8A6', icon: 'home' },
  { name: 'Other', color: '#6B7280', icon: 'circle' }
]

// Default income sources for new profiles
const DEFAULT_INCOME_SOURCES = [
  { name: 'Salary' },
  { name: 'Freelance' },
  { name: 'Business' },
  { name: 'Investment' },
  { name: 'Other' }
]

import { deleteDoc } from 'firebase/firestore'
interface ProfileContextType {
  profiles: ExpenseProfile[]
  currentProfile: ExpenseProfile | null
  loading: boolean
  setCurrentProfile: (profile: ExpenseProfile) => void
  refreshProfiles: () => Promise<void>
  createProfile: (name: string, type: 'personal' | 'family' | 'business') => Promise<void>
  updateProfile: (id: string, name: string, type: 'personal' | 'family' | 'business') => Promise<void>
  deleteProfile: (id: string) => Promise<void>
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined)

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profiles, setProfiles] = useState<ExpenseProfile[]>([])
  const [currentProfile, setCurrentProfileState] = useState<ExpenseProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const createDefaultCategoriesAndSources = async (uid: string, profileId: string) => {
    const now = new Date().toISOString()
    
    // Check if categories already exist for this profile
    const catQuery = query(
      collection(firebaseDb, 'users', uid, 'categories'),
      where('profile_id', '==', profileId),
      limit(1)
    )
    const catSnap = await getDocs(catQuery)
    
    // Only create defaults if no categories exist
    if (catSnap.empty) {
      const categoryPromises = DEFAULT_CATEGORIES.map((cat, index) => 
        addDoc(collection(firebaseDb, 'users', uid, 'categories'), {
          profile_id: profileId,
          name: cat.name,
          color: cat.color,
          icon: cat.icon,
          is_default: true,
          is_archived: false,
          sort_order: index + 1,
          created_at: now,
          updated_at: now
        })
      )
      await Promise.all(categoryPromises)
    }
    
    // Check if income sources already exist for this profile
    const srcQuery = query(
      collection(firebaseDb, 'users', uid, 'incomeSources'),
      where('profile_id', '==', profileId),
      limit(1)
    )
    const srcSnap = await getDocs(srcQuery)
    
    // Only create defaults if no income sources exist
    if (srcSnap.empty) {
      const sourcePromises = DEFAULT_INCOME_SOURCES.map((src) => 
        addDoc(collection(firebaseDb, 'users', uid, 'incomeSources'), {
          profile_id: profileId,
          name: src.name,
          is_archived: false,
          created_at: now,
          updated_at: now
        })
      )
      await Promise.all(sourcePromises)
    }
  }

  const ensureBootstrapProfiles = async (uid: string) => {
    const profilesCol = collection(firebaseDb, 'users', uid, 'profiles')
    const profilesSnap = await getDocs(query(profilesCol, limit(1)))
    if (!profilesSnap.empty) return

    const profileIds = new Set<string>()
    const takeProfileIds = (docs: Array<{ profile_id?: string }>) => {
      docs.forEach((d) => {
        if (d.profile_id) profileIds.add(d.profile_id)
      })
    }

    const txCol = collection(firebaseDb, 'users', uid, 'transactions')
    const catCol = collection(firebaseDb, 'users', uid, 'categories')
    const srcCol = collection(firebaseDb, 'users', uid, 'incomeSources')

    const [txSnap, catSnap, srcSnap] = await Promise.all([
      getDocs(query(txCol, limit(500))),
      getDocs(query(catCol, limit(500))),
      getDocs(query(srcCol, limit(500)))
    ])

    takeProfileIds(txSnap.docs.map((d) => d.data() as any))
    takeProfileIds(catSnap.docs.map((d) => d.data() as any))
    takeProfileIds(srcSnap.docs.map((d) => d.data() as any))

    if (profileIds.size === 0) {
      const fallbackId = 'default'
      profileIds.add(fallbackId)
    }

    const now = new Date().toISOString()
    let index = 0
    for (const pid of profileIds) {
      const pRef = doc(firebaseDb, 'users', uid, 'profiles', pid)
      const payload: ExpenseProfile = {
        id: pid,
        user_id: uid,
        name: `Profile ${pid.slice(0, 6)}`,
        type: 'personal',
        currency: 'MVR',
        is_active: true,
        created_at: now,
        updated_at: now
      }

      if (pid === 'default') {
        payload.name = 'Default'
      }

      await setDoc(pRef, payload, { merge: true })
      
      // Create default categories and income sources for this profile
      await createDefaultCategoriesAndSources(uid, pid)
      
      index++
    }
  }

  const fetchProfiles = async () => {
    const user = firebaseAuth.currentUser
    if (!user) return

    await ensureBootstrapProfiles(user.uid)

    const profilesCol = collection(firebaseDb, 'users', user.uid, 'profiles')
    const qProfiles = query(profilesCol, where('is_active', '==', true), orderBy('created_at'))
    const profilesSnap = await getDocs(qProfiles)
    const profilesData = profilesSnap.docs.map((d) => d.data() as ExpenseProfile)

    setProfiles(profilesData)

    const settingsRef = doc(firebaseDb, 'users', user.uid, 'settings', 'userSettings')
    const settingsSnap = await getDoc(settingsRef)
    const defaultProfileId = (settingsSnap.exists() ? (settingsSnap.data() as any).default_profile_id : null) as string | null

    if (defaultProfileId) {
      const defaultProfile = profilesData.find((p) => p.id === defaultProfileId)
      if (defaultProfile) {
        setCurrentProfileState(defaultProfile)
      } else if (profilesData.length > 0) {
        setCurrentProfileState(profilesData[0])
      }
    } else if (profilesData.length > 0) {
      setCurrentProfileState(profilesData[0])
    }

    setLoading(false)
  }

  const setCurrentProfile = async (profile: ExpenseProfile) => {
    setCurrentProfileState(profile)
    const user = firebaseAuth.currentUser
    if (!user) return

    const settingsRef = doc(firebaseDb, 'users', user.uid, 'settings', 'userSettings')
    await setDoc(
      settingsRef,
      {
        user_id: user.uid,
        default_profile_id: profile.id,
        updated_at: new Date().toISOString()
      },
      { merge: true }
    )
  }

  const createProfile = async (name: string, type: 'personal' | 'family' | 'business') => {
    const user = firebaseAuth.currentUser
    if (!user) throw new Error('Not authenticated')

    const now = new Date().toISOString()
    const newRef = doc(collection(firebaseDb, 'users', user.uid, 'profiles'))
    const payload: ExpenseProfile = {
      id: newRef.id,
      user_id: user.uid,
      name,
      type,
      currency: 'MVR',
      is_active: true,
      created_at: now,
      updated_at: now
    }

    await setDoc(newRef, payload)
    
    // Create default categories and income sources for the new profile
    await createDefaultCategoriesAndSources(user.uid, newRef.id)
    
    await fetchProfiles()
  }

  const updateProfile = async (id: string, name: string, type: 'personal' | 'family' | 'business') => {
    const user = firebaseAuth.currentUser
    if (!user) throw new Error('Not authenticated')

    const profileRef = doc(firebaseDb, 'users', user.uid, 'profiles', id)
    await updateDoc(profileRef, {
      name,
      type,
      updated_at: new Date().toISOString()
    })
    await fetchProfiles()
  }

  const deleteProfile = async (id: string) => {
    const user = firebaseAuth.currentUser
    if (!user) throw new Error('Not authenticated')

    // Don't allow deleting the only profile
    if (profiles.length <= 1) {
      throw new Error('Cannot delete the only profile. Create another profile first.')
    }

    const profileRef = doc(firebaseDb, 'users', user.uid, 'profiles', id)
    await deleteDoc(profileRef)
    await fetchProfiles()
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
      if (!user) {
        setProfiles([])
        setCurrentProfileState(null)
        setLoading(false)
        return
      }

      setLoading(true)
      fetchProfiles()
    })

    return () => unsubscribe()
  }, [])

  return (
    <ProfileContext.Provider value={{
      profiles,
      currentProfile,
      loading,
      setCurrentProfile,
      refreshProfiles: fetchProfiles,
      createProfile,
      updateProfile,
      deleteProfile
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
