// Rename existing profiles to match Supabase names
// Run in browser console at https://kharadhu-baradhu.vercel.app while logged in

(async function renameProfiles() {
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

  console.log('Current profiles:', profiles.map(p => ({ id: p.id, name: p.name, type: p.type })))

  // Mapping: current name -> new name
  const renameMap = {
    'Personal 1': 'Fanna Expense',
    'Personal 2': 'Haleema Expense', 
    'Personal 3': 'Ailish Expense',
    'Personal 4': 'Ayaan Expense',
    'Personal 5': 'Azan Expense',
    'Personal 8': 'Aizan Expense',
    'Personal': 'Home Expense',
    'My Personal': 'Personal',
    'Abdul Rahman Gasim': 'Abdul Rahman Personal'
  }

  let renamed = 0

  for (const profile of profiles) {
    const newName = renameMap[profile.name]
    if (newName && newName !== profile.name) {
      await setDoc(doc(db, 'users', userId, 'profiles', profile.id), {
        ...profile,
        name: newName,
        updated_at: new Date().toISOString()
      }, { merge: true })
      console.log(`Renamed: ${profile.name} → ${newName}`)
      renamed++
    }
  }

  // Delete the duplicate/empty profiles we just created
  const duplicatesToDelete = ['Fanna Expense', 'Haleema Expense', 'Ailish Expense', 
                              'Ayaan Expense', 'Azan Expense', 'Aizan Expense', 'Home Expense']
  
  let deleted = 0
  for (const profile of profiles) {
    // If this is a duplicate (created by import-profiles.js) with 0 transactions
    if (duplicatesToDelete.includes(profile.name)) {
      // Check if this is the NEW duplicate (not the renamed original)
      const hasOriginal = profiles.some(p => renameMap[p.name] === profile.name && p.id !== profile.id)
      if (hasOriginal) {
        await setDoc(doc(db, 'users', userId, 'profiles', profile.id), {
          ...profile,
          is_active: false,
          name: profile.name + ' (OLD - DELETE)',
          updated_at: new Date().toISOString()
        }, { merge: true })
        console.log(`Marked for deletion: ${profile.name}`)
        deleted++
      }
    }
  }

  console.log(`\nDone! Renamed ${renamed} profiles.`)
  console.log(`Marked ${deleted} duplicate profiles for deletion.`)
  alert(`Profiles renamed!\n\nRenamed: ${renamed}\nDuplicates marked: ${deleted}\n\nRefresh the page to see changes.`)
})()
