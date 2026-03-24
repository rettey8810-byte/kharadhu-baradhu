const { initializeApp } = require('firebase/app')
const { getFirestore, collection, query, getDocs, doc, setDoc, deleteDoc } = require('firebase/firestore')

const firebaseConfig = {
  apiKey: "AIzaSyDZPy7vV3F4L2HlFfD2yPHc_JlDqu-87f8",
  authDomain: "kharadhu-baradhu.firebaseapp.com",
  projectId: "kharadhu-baradhu",
  storageBucket: "kharadhu-baradhu.firebasestorage.app",
  messagingSenderId: "1037122343942",
  appId: "1:1037122343942:web:acaa3b705c37615b2ecc45"
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

const loansData = require('../supabase-export-data/loans.json')

async function migrateLoans() {
  console.log('=== Loan Migration Tool ===\n')
  
  // Get all users
  const usersSnap = await getDocs(collection(db, 'users'))
  
  for (const userDoc of usersSnap.docs) {
    const userId = userDoc.id
    console.log(`\n--- User: ${userId} ---`)
    
    // Get user's profiles
    const profilesSnap = await getDocs(collection(db, 'users', userId, 'profiles'))
    const profiles = profilesSnap.docs.map(d => ({ id: d.id, ...d.data() }))
    
    if (profiles.length === 0) {
      console.log('No profiles found, skipping')
      continue
    }
    
    console.log(`Found ${profiles.length} profiles:`)
    profiles.forEach(p => console.log(`  - ${p.id}: ${p.name} (${p.type})`))
    
    // Get existing loans in Firebase
    const loansSnap = await getDocs(collection(db, 'users', userId, 'loans'))
    console.log(`\nExisting loans in Firebase: ${loansSnap.docs.length}`)
    
    // Map old Supabase profile IDs to new Firebase profile IDs
    // Strategy: Use the first profile as default, or try to match by type/name
    const defaultProfile = profiles[0]
    console.log(`\nDefault target profile: ${defaultProfile.id} (${defaultProfile.name})`)
    
    // Import loans from Supabase export
    let imported = 0
    let skipped = 0
    
    for (const loan of loansData) {
      // Check if loan already exists
      const existingLoan = loansSnap.docs.find(d => {
        const data = d.data()
        return data.lender_name === loan.lender_name && 
               data.borrower_name === loan.borrower_name &&
               data.principal_amount === loan.principal_amount &&
               data.loan_date === loan.loan_date
      })
      
      if (existingLoan) {
        // Check if profile_id needs updating
        const existingData = existingLoan.data()
        const correctProfile = profiles.find(p => 
          (loan.profile_id === '4c276124-ba30-4bfb-aed2-4db99e9563bd' && p.name?.toLowerCase().includes('expense')) ||
          (loan.profile_id === '65ede15e-f450-4a42-b1d9-1496c3359b24' && (p.type === 'personal' || p.name?.toLowerCase().includes('personal')))
        ) || defaultProfile
        
        if (existingData.profile_id !== correctProfile.id) {
          console.log(`  Updating loan "${loan.lender_name || loan.borrower_name}" profile: ${existingData.profile_id} → ${correctProfile.id}`)
          await setDoc(doc(db, 'users', userId, 'loans', existingLoan.id), {
            ...existingData,
            profile_id: correctProfile.id,
            updated_at: new Date().toISOString()
          }, { merge: true })
          imported++
        } else {
          skipped++
        }
      } else {
        // Create new loan with correct profile
        const correctProfile = profiles.find(p => 
          (loan.profile_id === '4c276124-ba30-4bfb-aed2-4db99e9563bd' && p.name?.toLowerCase().includes('expense')) ||
          (loan.profile_id === '65ede15e-f450-4a42-b1d9-1496c3359b24' && (p.type === 'personal' || p.name?.toLowerCase().includes('personal')))
        ) || defaultProfile
        
        const newLoan = {
          ...loan,
          profile_id: correctProfile.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
        delete newLoan.id // Let Firebase generate new ID
        
        const loanRef = doc(collection(db, 'users', userId, 'loans'))
        await setDoc(loanRef, newLoan)
        
        console.log(`  Created loan "${loan.lender_name || loan.borrower_name}" → ${correctProfile.name}`)
        imported++
      }
    }
    
    console.log(`\nDone: ${imported} updated/created, ${skipped} already correct`)
  }
  
  console.log('\n=== Migration Complete ===')
  process.exit(0)
}

migrateLoans().catch(err => {
  console.error('Migration failed:', err)
  process.exit(1)
})
