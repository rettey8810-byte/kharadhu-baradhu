// Move Personal transactions to Aizan - Direct Firebase version
// Run in browser console at https://kharadhu-baradhu.vercel.app while logged in

(async function movePersonalToAizanDirect() {
  // Access Firebase directly from window
  const db = window.firebaseDb
  const auth = window.firebaseAuth
  
  if (!db || !auth) {
    alert('Firebase not found. Please wait for the page to fully load.')
    return
  }

  const userId = auth.currentUser?.uid
  if (!userId) {
    alert('Please log in first')
    return
  }

  // Import Firestore functions dynamically
  const { collection, getDocs, query, where, doc, updateDoc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js')
  
  console.log('Loading profiles...')
  const profilesSnap = await getDocs(collection(db, 'users', userId, 'profiles'))
  const profiles = profilesSnap.docs.map(d => ({ id: d.id, ...d.data() }))

  const personalProfile = profiles.find(p => p.name === 'Personal' || p.name?.includes('Personal'))
  const aizanProfile = profiles.find(p => p.name === 'Aizan Expense' || p.name?.includes('Aizan'))

  if (!personalProfile) {
    alert('Personal profile not found. Already moved?')
    return
  }

  if (!aizanProfile) {
    alert('Aizan Expense profile not found')
    return
  }

  console.log('Personal profile ID:', personalProfile.id)
  console.log('Aizan profile ID:', aizanProfile.id)

  // Move only transactions (expenses)
  console.log('Moving transactions from Personal to Aizan...')
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

  // Mark Personal profile as inactive
  console.log('Marking Personal profile as inactive...')
  await setDoc(doc(db, 'users', userId, 'profiles', personalProfile.id), {
    is_active: false,
    name: 'Personal (MOVED)',
    updated_at: new Date().toISOString()
  }, { merge: true })

  console.log(`Done! Moved ${moved} transactions.`)
  alert(`Success! Moved ${moved} transactions from Personal to Aizan Expense.\n\nRefresh the page (Ctrl+Shift+R) to see changes.`)
})()
