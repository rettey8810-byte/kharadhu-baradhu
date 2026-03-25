// Import missing profiles (Fanna, Ailish, etc.)
// Run in browser console at https://kharadhu-baradhu.vercel.app while logged in

(async function importProfiles() {
  const { collection, getDocs, addDoc } = window.firebaseFirestore || {}
  const db = window.firebaseDb
  const auth = window.firebaseAuth

  if (!db || !auth) {
    alert('Firebase not found. Refresh the page and try again.')
    return
  }

  const userId = auth.currentUser?.uid
  if (!userId) {
    alert('Please log in first')
    return
  }

  const profilesToEnsure = [
    { name: 'Home Expense', type: 'family', currency: 'MVR', is_active: true },
    { name: 'Personal', type: 'personal', currency: 'MVR', is_active: true },
    { name: 'Fanna Expense', type: 'family', currency: 'MVR', is_active: true },
    { name: 'Haleema Expense', type: 'family', currency: 'MVR', is_active: true },
    { name: 'Ailish Expense', type: 'family', currency: 'MVR', is_active: true },
    { name: 'Ayaan Expense', type: 'family', currency: 'MVR', is_active: true },
    { name: 'Azan Expense', type: 'family', currency: 'MVR', is_active: true },
    { name: 'Aizan Expense', type: 'family', currency: 'MVR', is_active: true },
  ]

  console.log('Loading existing profiles...')
  const snap = await getDocs(collection(db, 'users', userId, 'profiles'))
  const existing = snap.docs.map(d => ({ id: d.id, ...(d.data() || {}) }))

  const normalize = (s) => String(s || '').trim().toLowerCase()

  let added = 0
  let skipped = 0

  for (const p of profilesToEnsure) {
    const exists = existing.some(e => normalize(e.name) === normalize(p.name))
    if (exists) {
      skipped++
      continue
    }

    await addDoc(collection(db, 'users', userId, 'profiles'), {
      name: p.name,
      type: p.type,
      currency: p.currency,
      is_active: p.is_active,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    console.log('Added profile:', p.name)
    added++
  }

  console.log(`Done. Added ${added}, skipped ${skipped}. Refresh page to see them.`)
  alert(`Profiles import complete!\nAdded: ${added}\nSkipped (already exists): ${skipped}\n\nRefresh the page.`)
})()
