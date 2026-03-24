// Firebase configuration and initialization
// This file sets up Firebase alongside existing Supabase (for migration)

import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import {
  addDoc,
  collection,
  doc,
  getDocs,
  getFirestore,
  orderBy,
  query,
  setDoc,
  where,
} from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: "AIzaSyCqB-PlsU90mbU3xYb_otuoOPfaa0aiGeA",
  authDomain: "kharadhu-baradhu.firebaseapp.com",
  projectId: "kharadhu-baradhu",
  storageBucket: "kharadhu-baradhu.firebasestorage.app",
  messagingSenderId: "1027497694368",
  appId: "1:1027497694368:web:5803578ad68ddf18bd65c5",
  measurementId: "G-MV93KE9RXY"
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Export Firebase services
export const firebaseAuth = getAuth(app)
export const firebaseDb = getFirestore(app)
export const firebaseStorage = getStorage(app)

declare global {
  interface Window {
    firebaseAuth?: typeof firebaseAuth
    firebaseDb?: typeof firebaseDb
    firebaseStorage?: typeof firebaseStorage
    firebaseFirestore?: {
      addDoc: typeof addDoc
      collection: typeof collection
      doc: typeof doc
      getDocs: typeof getDocs
      orderBy: typeof orderBy
      query: typeof query
      setDoc: typeof setDoc
      where: typeof where
    }
  }
}

if (typeof window !== 'undefined') {
  window.firebaseAuth = firebaseAuth
  window.firebaseDb = firebaseDb
  window.firebaseStorage = firebaseStorage
  window.firebaseFirestore = {
    addDoc,
    collection,
    doc,
    getDocs,
    orderBy,
    query,
    setDoc,
    where,
  }
}

export default app
