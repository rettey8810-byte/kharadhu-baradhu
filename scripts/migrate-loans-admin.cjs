const admin = require('firebase-admin')

// Initialize with service account if available, otherwise default credentials
let serviceAccount
try {
  serviceAccount = require('../serviceAccountKey.json')
} catch {
  // Will use default credentials
}

if (serviceAccount) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  })
} else {
  admin.initializeApp()
}

const db = admin.firestore()

const loansData = require('../migration-export-data/loans.json')

async function migrateLoans() {
  console.log('=== Loan Migration Tool (Admin) ===\n')
  
  // Get all users
  const usersSnap = await db.collection('users').get()
  
  for (const userDoc of usersSnap.docs) {
    const userId = userDoc.id
    console.log(`\n--- User: ${userId} ---`)
    
    // Get user's profiles
    const profilesSnap = await db.collection('users').doc(userId).collection('profiles').get()
    const profiles = profilesSnap.docs.map(d => ({ id: d.id, ...d.data() }))
    
    if (profiles.length === 0) {
      console.log('No profiles found, skipping')
      continue
    }
    
    console.log(`Found ${profiles.length} profiles:`)
    profiles.forEach(p => console.log(`  - ${p.id}: ${p.name} (${p.type})`))
    
    // Get existing loans
    const loansSnap = await db.collection('users').doc(userId).collection('loans').get()
    console.log(`\nExisting loans in Firebase: ${loansSnap.docs.length}`)
    
    // Find best profile match
    // Bazaar Shop (Home Expense) -> profile with 'expense' in name or family type
    // Others (Personal) -> profile with type='personal' or 'Personal' in name
    const homeExpenseProfile = profiles.find(p => 
      p.name?.toLowerCase().includes('home') || 
      p.name?.toLowerCase().includes('expense') ||
      p.type === 'family'
    ) || profiles[0]
    
    const personalProfile = profiles.find(p => 
      p.type === 'personal' || 
      p.name?.toLowerCase().includes('personal')
    ) || profiles[0]
    
    console.log(`\nHome/Expense profile: ${homeExpenseProfile.id} (${homeExpenseProfile.name})`)
    console.log(`Personal profile: ${personalProfile.id} (${personalProfile.name})`)
    
    // Import loans
    let imported = 0
    let updated = 0
    let skipped = 0
    
    for (const loan of loansData) {
      // Determine target profile based on original legacy profile_id
      let targetProfile
      if (loan.profile_id === '4c276124-ba30-4bfb-aed2-4db99e9563bd') {
        targetProfile = homeExpenseProfile
      } else {
        targetProfile = personalProfile
      }
      
      // Check if loan already exists by matching key fields
      const existingLoan = loansSnap.docs.find(d => {
        const data = d.data()
        return (data.lender_name === loan.lender_name && data.lender_name) || 
               (data.borrower_name === loan.borrower_name && data.borrower_name) &&
               data.principal_amount === loan.principal_amount &&
               data.loan_date === loan.loan_date
      })
      
      if (existingLoan) {
        const existingData = existingLoan.data()
        if (existingData.profile_id !== targetProfile.id) {
          console.log(`  UPDATING: "${loan.lender_name || loan.borrower_name}" → ${targetProfile.name}`)
          await existingLoan.ref.update({
            profile_id: targetProfile.id,
            updated_at: admin.firestore.FieldValue.serverTimestamp()
          })
          updated++
        } else {
          skipped++
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
          created_at: admin.firestore.FieldValue.serverTimestamp(),
          updated_at: admin.firestore.FieldValue.serverTimestamp()
        }
        
        await db.collection('users').doc(userId).collection('loans').add(newLoan)
        console.log(`  CREATED: "${loan.lender_name || loan.borrower_name}" → ${targetProfile.name} (MVR ${loan.principal_amount})`)
        imported++
      }
    }
    
    console.log(`\nSummary: ${imported} created, ${updated} updated, ${skipped} already correct`)
  }
  
  console.log('\n=== Migration Complete ===')
  process.exit(0)
}

migrateLoans().catch(err => {
  console.error('Migration failed:', err)
  process.exit(1)
})
