// Firebase configuration and initialization
// This file sets up Firebase alongside existing Supabase (for migration)

import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
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

export default app
