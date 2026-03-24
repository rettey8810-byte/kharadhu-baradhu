const { initializeApp } = require('firebase/app')
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth')
const { getFirestore, collection, query, getDocs, doc, setDoc, addDoc } = require('firebase/firestore')

const firebaseConfig = {
  apiKey: "AIzaSyDZPy7vV3F4L2HlFfD2yPHc_JlDqu-87f8",
  authDomain: "kharadhu-baradhu.firebaseapp.com",
  projectId: "kharadhu-baradhu",
  storageBucket: "kharadhu-baradhu.firebasestorage.app",
  messagingSenderId: "1037122343942",
  appId: "1:1037122343942:web:acaa3b705c37615b2ecc45"
}

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)

const loansData = require('../supabase-export-data/loans.json')

const ADMIN_EMAIL = 'retey.ay@hotmail.com'

async function migrateLoans() {
  console.log('=== Loan Migration Tool ===\n')
  console.log(`Found ${loansData.length} loans in Supabase export:`)
  loansData.forEach(l => {
    const name = l.lender_name || l.borrower_name || 'Unknown'
    console.log(`  - ${name}: MVR ${l.principal_amount} (${l.loan_type})`)
  })
  
  console.log('\nPlease enter admin password to authenticate...')
  
  // Get password from command line argument
  const password = process.argv[2]
  if (!password) {
    console.log('Usage: node scripts/migrate-loans-simple.cjs <password>')
    process.exit(1)
  }
  
  try {
    // Sign in as admin
    await signInWithEmailAndPassword(auth, ADMIN_EMAIL, password)
    console.log(`Authenticated as ${ADMIN_EMAIL}\n`)
    
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
      
      // Find best profile match
      const homeExpenseProfile = profiles.find(p => 
        p.name?.toLowerCase().includes('home') || 
        p.name?.toLowerCase().includes('expense') ||
        p.type === 'family'
      ) || profiles[0]
      
      const personalProfile = profiles.find(p => 
        p.type === 'personal' || 
        p.name?.toLowerCase().includes('personal')
      ) || profiles[0]
      
      console.log(`\nMapping:`)
      console.log(`  Bazaar Shop loan → ${homeExpenseProfile.name}`)
      console.log(`  Other loans → ${personalProfile.name}`)
      
      // Get existing loans
      const loansSnap = await getDocs(collection(db, 'users', userId, 'loans'))
      const existingLoans = loansSnap.docs.map(d => ({ id: d.id, ...d.data() }))
      
      let created = 0
      let updated = 0
      
      for (const loan of loansData) {
        // Determine target profile
        const targetProfile = (loan.profile_id === '4c276124-ba30-4bfb-aed2-4db99e9563bd')
          ? homeExpenseProfile
          : personalProfile
        
        // Check if loan already exists
        const existing = existingLoans.find(l => 
          (l.lender_name === loan.lender_name && loan.lender_name) ||
          (l.borrower_name === loan.borrower_name && loan.borrower_name) &&
          l.principal_amount === loan.principal_amount
        )
        
        if (existing) {
          if (existing.profile_id !== targetProfile.id) {
            await setDoc(doc(db, 'users', userId, 'loans', existing.id), {
              profile_id: targetProfile.id,
              updated_at: new Date().toISOString()
            }, { merge: true })
            console.log(`  UPDATED: "${loan.lender_name || loan.borrower_name}" → ${targetProfile.name}`)
            updated++
          }
        } else {
          // Create new loan
          const newLoan = {
            profile_id: targetProfile.id,
            loan_type: loan.loan_type,
            category: loan.category,
            lender_name: loan.lender_name,
            borrower_name: loan.borrower_name,
            principal_amount: loan.principal_amount,
            interest_rate: loan.interest_rate || 0,
            interest_type: loan.interest_type || 'none',
            loan_date: loan.loan_date,
            due_date: loan.due_date,
            total_amount: loan.total_amount,
            amount_paid: loan.amount_paid || 0,
            emi_amount: loan.emi_amount,
            total_installments: loan.total_installments,
            installments_paid: loan.installments_paid || 0,
            status: loan.status || 'active',
            description: loan.description,
            account_number: loan.account_number,
            bank_name: loan.bank_name,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
          
          await addDoc(collection(db, 'users', userId, 'loans'), newLoan)
          console.log(`  CREATED: "${loan.lender_name || loan.borrower_name}" → ${targetProfile.name}`)
          created++
        }
      }
      
      console.log(`\nDone for this user: ${created} created, ${updated} updated`)
    }
    
    console.log('\n=== Migration Complete ===')
    process.exit(0)
    
  } catch (err) {
    console.error('Authentication failed:', err.message)
    process.exit(1)
  }
}

migrateLoans()
