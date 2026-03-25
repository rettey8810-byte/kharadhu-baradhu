// Fix profile names - swap to correct amounts
// Run in browser console at https://kharadhu-baradhu.vercel.app while logged in

(async function fixProfileNames() {
  const { collection, getDocs, doc, setDoc } = window.firebaseFirestore || {}
  const db = window.firebaseDb
  const auth = window.firebaseAuth

  if (!db || !auth) {
    alert('Firebase not found.')
    return
  }

  const userId = auth.currentUser?.uid
  if (!userId) {
    alert('Please log in first')
    return
  }

  // Get all current profiles
  const snap = await getDocs(collection(db, 'users', userId, 'profiles'))
  const profiles = snap.docs.map(d => ({ id: d.id, ...(d.data() || {}) }))

  console.log('Current profiles:', profiles.map(p => ({ id: p.id, name: p.name, amount: p.totalSpent || 0 })))

  // Current name -> Correct name mapping
  const nameSwaps = {
    'Ailish Expense': 'Home Expense',      // MVR 27,758 → Home
    'Home Expense': 'Ayaan Expense',       // MVR 3,100 → Ayaan
    'Haleema Expense': 'Personal',           // MVR 1,756 → Personal
    'Ayaan Expense': 'Ailish Expense',     // MVR 570 → Ailish
    'Abdul Rahman Personal': 'Haleema Expense'  // MVR 0 → Haleema
    // These stay the same:
    // 'Azan Expense' → 'Azan Expense' (MVR 7,750)
    // 'Fanna Expense' → 'Fanna Expense' (MVR 1,573)
    // 'Aizan Expense' → 'Aizan Expense' (MVR 570)
  }

  let renamed = 0

  for (const profile of profiles) {
    const newName = nameSwaps[profile.name]
    if (newName && newName !== profile.name) {
      await setDoc(doc(db, 'users', userId, 'profiles', profile.id), {
        ...profile,
        name: newName,
        updated_at: new Date().toISOString()
      }, { merge: true })
      console.log(`Swapped: ${profile.name} → ${newName}`)
      renamed++
    } else if (newName === profile.name) {
      console.log(`Already correct: ${profile.name}`)
    }
  }

  console.log(`\nDone! Renamed ${renamed} profiles.`)
  console.log('\nExpected after refresh:')
  console.log('- Home Expense: MVR 27,758.23')
  console.log('- Azan Expense: MVR 7,750.00')
  console.log('- Ayaan Expense: MVR 3,100.00')
  console.log('- Personal: MVR 1,756.79')
  console.log('- Fanna Expense: MVR 1,573.17')
  console.log('- Ailish Expense: MVR 570.00')
  console.log('- Aizan Expense: MVR 570.00')
  console.log('- Haleema Expense: MVR 0.00')
  
  alert(`Profile names fixed!\nRenamed: ${renamed} profiles.\n\nRefresh the page to see correct names.`)
})()
