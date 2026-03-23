import { useState, useEffect, useContext, createContext, ReactNode } from 'react'
import type { ExpenseProfile } from '../types'
import { onAuthStateChanged } from 'firebase/auth'
import { collection, doc, getDoc, getDocs, limit, orderBy, query, setDoc, where } from 'firebase/firestore'
import { firebaseAuth, firebaseDb } from '../lib/firebase'

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
