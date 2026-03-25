// Move all Personal expenses to Aizan Expense and remove Personal profile
// Run in browser console at https://kharadhu-baradhu.vercel.app while logged in

(async function movePersonalToAizan() {
  const { collection, getDocs, query, where, doc, updateDoc, setDoc } = window.firebaseFirestore || {}
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

  console.log('Loading profiles...')
  const profilesSnap = await getDocs(collection(db, 'users', userId, 'profiles'))
  const profiles = profilesSnap.docs.map(d => ({ id: d.id, ...d.data() }))

  const personalProfile = profiles.find(p => p.name === 'Personal')
  const aizanProfile = profiles.find(p => p.name === 'Aizan Expense')

  if (!personalProfile) {
    alert('Personal profile not found')
    return
  }

  if (!aizanProfile) {
    alert('Aizan Expense profile not found')
    return
  }

  console.log('Personal profile ID:', personalProfile.id)
  console.log('Aizan profile ID:', aizanProfile.id)

  // Move transactions
  console.log('\nMoving transactions from Personal to Aizan...')
  const txQuery = query(
    collection(db, 'users', userId, 'transactions'),
    where('profile_id', '==', personalProfile.id)
  )
  const txSnap = await getDocs(txQuery)
  const transactions = txSnap.docs.map(d => ({ id: d.id, ...d.data() }))

  console.log(`Found ${transactions.length} transactions to move`)

  let moved = 0
  for (const tx of transactions) {
    await updateDoc(doc(db, 'users', userId, 'transactions', tx.id), {
      profile_id: aizanProfile.id
    })
    moved++
    console.log(`Moved transaction ${tx.id}`)
  }

  // Move loans
  console.log('\nMoving loans from Personal to Aizan...')
  const loanQuery = query(
    collection(db, 'users', userId, 'loans'),
    where('profile_id', '==', personalProfile.id)
  )
  const loanSnap = await getDocs(loanQuery)
  const loans = loanSnap.docs.map(d => ({ id: d.id, ...d.data() }))

  console.log(`Found ${loans.length} loans to move`)

  for (const loan of loans) {
    await updateDoc(doc(db, 'users', userId, 'loans', loan.id), {
      profile_id: aizanProfile.id
    })
    moved++
    console.log(`Moved loan ${loan.id}`)
  }

  // Move grocery bills
  console.log('\nMoving grocery bills from Personal to Aizan...')
  const billQuery = query(
    collection(db, 'users', userId, 'groceryBills'),
    where('profile_id', '==', personalProfile.id)
  )
  const billSnap = await getDocs(billQuery)
  const bills = billSnap.docs.map(d => ({ id: d.id, ...d.data() }))

  console.log(`Found ${bills.length} grocery bills to move`)

  for (const bill of bills) {
    await updateDoc(doc(db, 'users', userId, 'groceryBills', bill.id), {
      profile_id: aizanProfile.id
    })
    moved++
    console.log(`Moved bill ${bill.id}`)
  }

  // Mark Personal profile as inactive
  console.log('\nMarking Personal profile as inactive...')
  await setDoc(doc(db, 'users', userId, 'profiles', personalProfile.id), {
    ...personalProfile,
    is_active: false,
    name: 'Personal (OLD - DELETED)',
    updated_at: new Date().toISOString()
  }, { merge: true })

  console.log(`\nDone! Moved ${moved} items.`)
  console.log('Personal profile marked as inactive.')
  alert(`Success!\n\nMoved ${moved} items from Personal to Aizan Expense.\n\nRefresh to see changes.`)
})()
