const https = require('https')
const fs = require('fs')
const path = require('path')

const API_KEY = 'AIzaSyDZPy7vV3F4L2HlFfD2yPHc_JlDqu-87f8'
const PROJECT_ID = 'kharadhu-baradhu'
const FIRESTORE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`

const loansData = JSON.parse(fs.readFileSync(path.join(__dirname, '../migration-export-data/loans.json'), 'utf8'))

async function makeRequest(url, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'firestore.googleapis.com',
      port: 443,
      path: url,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      }
    }

    const req = https.request(options, (res) => {
      let responseData = ''
      res.on('data', (chunk) => responseData += chunk)
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData)
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed)
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${parsed.error?.message || responseData}`))
          }
        } catch {
          resolve(responseData)
        }
      })
    })

    req.on('error', reject)
    if (data) req.write(JSON.stringify(data))
    req.end()
  })
}

async function listUsers() {
  // List users via Firebase Auth REST API
  const url = `https://identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}/accounts:batchGet?key=${API_KEY}`
  return new Promise((resolve, reject) => {
    const req = https.request(url, { method: 'GET' }, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data)
          resolve(parsed.users || [])
        } catch {
          resolve([])
        }
      })
    })
    req.on('error', reject)
    req.end()
  })
}

async function listUserProfiles(userId) {
  const url = `/v1/projects/${PROJECT_ID}/databases/(default)/documents/users/${userId}/profiles`
  try {
    const result = await makeRequest(url)
    return result.documents || []
  } catch {
    return []
  }
}

async function listUserLoans(userId) {
  const url = `/v1/projects/${PROJECT_ID}/databases/(default)/documents/users/${userId}/loans`
  try {
    const result = await makeRequest(url)
    return result.documents || []
  } catch {
    return []
  }
}

async function createLoan(userId, loanData) {
  const url = `/v1/projects/${PROJECT_ID}/databases/(default)/documents/users/${userId}/loans`
  const document = {
    fields: {
      profile_id: { stringValue: loanData.profile_id },
      loan_type: { stringValue: loanData.loan_type },
      category: { stringValue: loanData.category || 'individual' },
      lender_name: loanData.lender_name ? { stringValue: loanData.lender_name } : { nullValue: null },
      borrower_name: loanData.borrower_name ? { stringValue: loanData.borrower_name } : { nullValue: null },
      principal_amount: { doubleValue: loanData.principal_amount },
      interest_rate: { doubleValue: loanData.interest_rate || 0 },
      interest_type: { stringValue: loanData.interest_type || 'none' },
      loan_date: { stringValue: loanData.loan_date },
      due_date: loanData.due_date ? { stringValue: loanData.due_date } : { nullValue: null },
      total_amount: { doubleValue: loanData.total_amount },
      amount_paid: { doubleValue: loanData.amount_paid || 0 },
      emi_amount: loanData.emi_amount ? { doubleValue: loanData.emi_amount } : { nullValue: null },
      total_installments: loanData.total_installments ? { integerValue: loanData.total_installments } : { nullValue: null },
      installments_paid: { integerValue: loanData.installments_paid || 0 },
      status: { stringValue: loanData.status || 'active' },
      description: loanData.description ? { stringValue: loanData.description } : { nullValue: null },
      created_at: { timestampValue: new Date().toISOString() },
      updated_at: { timestampValue: new Date().toISOString() }
    }
  }
  
  return makeRequest(url, 'POST', document)
}

async function updateLoan(userId, loanId, updateData) {
  const url = `/v1/projects/${PROJECT_ID}/databases/(default)/documents/users/${userId}/loans/${loanId}?updateMask.fieldPaths=profile_id&updateMask.fieldPaths=updated_at`
  const document = {
    fields: {
      profile_id: { stringValue: updateData.profile_id },
      updated_at: { timestampValue: new Date().toISOString() }
    }
  }
  return makeRequest(url, 'PATCH', document)
}

async function migrateLoans() {
  console.log('=== Loan Migration via REST API ===\n')
  console.log(`Found ${loansData.length} loans in export:\n`)
  loansData.forEach(l => {
    console.log(`  - ${l.lender_name || l.borrower_name}: MVR ${l.principal_amount}`)
  })
  
  // Since we can't list users via REST without auth, we'll use a different approach
  // Check if there's a local Firebase auth cache or use Firebase CLI
  console.log('\nAttempting migration with Firebase CLI...\n')
  
  // Save loans to a JSON file for manual import via Firebase console
  const importData = {
    loans: loansData,
    instructions: 'Copy these loans to your Firebase. Profile IDs need to be mapped to your current profiles.'
  }
  
  fs.writeFileSync(
    path.join(__dirname, '../loans-to-import.json'),
    JSON.stringify(importData, null, 2)
  )
  
  console.log('Created loans-to-import.json file')
  console.log('\n=== Alternative: Use Firebase Console ===')
  console.log('1. Go to https://console.firebase.google.com/project/kharadhu-baradhu/firestore/data')
  console.log('2. Navigate to users/{userId}/loans')
  console.log('3. Add the 7 loans manually with correct profile IDs')
  console.log('\nLoans to add:')
  loansData.forEach(loan => {
    const target = loan.profile_id === '4c276124-ba30-4bfb-aed2-4db99e9563bd' ? 'Home Expense' : 'Personal'
    console.log(`  - ${loan.lender_name || loan.borrower_name}: MVR ${loan.principal_amount} → ${target}`)
  })
  
  console.log('\n=== Or run this in browser console when logged in: ===\n')
  console.log(`
const loans = ${JSON.stringify(loansData, null, 2)};

async function importLoans() {
  const { getFirestore, collection, addDoc } = require('firebase/firestore');
  const db = getFirestore();
  
  // Get your profile IDs first
  const profilesQuery = await getDocs(collection(db, 'users', auth.currentUser.uid, 'profiles'));
  const profiles = profilesQuery.docs.map(d => ({ id: d.id, ...d.data() }));
  
  const homeProfile = profiles.find(p => p.name?.toLowerCase().includes('home')) || profiles[0];
  const personalProfile = profiles.find(p => p.type === 'personal') || profiles[0];
  
  for (const loan of loans) {
    const targetProfile = (loan.profile_id === '4c276124-ba30-4bfb-aed2-4db99e9563bd') ? homeProfile : personalProfile;
    await addDoc(collection(db, 'users', auth.currentUser.uid, 'loans'), {
      ...loan,
      profile_id: targetProfile.id,
      created_at: new Date().toISOString()
    });
    console.log('Added:', loan.lender_name || loan.borrower_name);
  }
}
importLoans();
  `)
}

migrateLoans().catch(err => {
  console.error('Error:', err.message)
  process.exit(1)
})
