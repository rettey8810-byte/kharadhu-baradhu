// Copy and paste this into your browser console while logged into Kharadhu Baradhu
// Make sure you're on the app page (localhost or deployed URL)

(async function importLoans() {
  const loans = [
    {
      lender_name: "Bazaar Shop ( Ramdan Items)",
      borrower_name: null,
      principal_amount: 2557.23,
      total_amount: 3267.23,
      amount_paid: 2000,
      loan_type: "borrowed",
      category: "other",
      interest_rate: 0,
      interest_type: "simple",
      loan_date: "2026-02-16",
      due_date: null,
      emi_amount: 0,
      total_installments: 0,
      installments_paid: 1,
      status: "active",
      description: null,
      account_number: null,
      bank_name: null,
      old_profile_id: "home"
    },
    {
      lender_name: null,
      borrower_name: "Faiz be",
      principal_amount: 10128,
      total_amount: 10128,
      amount_paid: 0,
      loan_type: "lended",
      category: "individual",
      interest_rate: 0,
      interest_type: "none",
      loan_date: "2026-03-03",
      due_date: "2026-07-31",
      emi_amount: null,
      total_installments: null,
      installments_paid: 0,
      status: "active",
      old_profile_id: "personal"
    },
    {
      lender_name: "BML",
      borrower_name: null,
      principal_amount: 36151.05,
      total_amount: 36151.05,
      amount_paid: 0,
      loan_type: "borrowed",
      category: "bank",
      interest_rate: 15,
      interest_type: "none",
      loan_date: "2026-03-03",
      due_date: "2027-01-31",
      emi_amount: null,
      total_installments: null,
      installments_paid: 0,
      status: "active",
      bank_name: "Bank of Maldives",
      old_profile_id: "personal"
    },
    {
      lender_name: "Credit card balance",
      borrower_name: null,
      principal_amount: 5886.28,
      total_amount: 5886.28,
      amount_paid: 0,
      loan_type: "borrowed",
      category: "credit_card",
      interest_rate: 0,
      interest_type: "none",
      loan_date: "2026-03-03",
      due_date: "2026-10-31",
      old_profile_id: "personal"
    },
    {
      lender_name: "Ibba loan",
      borrower_name: null,
      principal_amount: 9000,
      total_amount: 9000,
      amount_paid: 0,
      loan_type: "borrowed",
      category: "individual",
      interest_rate: 0,
      interest_type: "none",
      loan_date: "2026-03-03",
      due_date: "2026-11-29",
      old_profile_id: "personal"
    },
    {
      lender_name: null,
      borrower_name: "Adee loan",
      principal_amount: 53970,
      total_amount: 53970,
      amount_paid: 0,
      loan_type: "lended",
      category: "individual",
      interest_rate: 0,
      interest_type: "none",
      loan_date: "2026-03-03",
      due_date: "2026-11-20",
      old_profile_id: "personal"
    },
    {
      lender_name: "Reehan",
      borrower_name: null,
      principal_amount: 6000,
      total_amount: 6000,
      amount_paid: 1000,
      loan_type: "borrowed",
      category: "individual",
      interest_rate: 0,
      interest_type: "none",
      loan_date: "2026-03-05",
      due_date: "2026-09-01",
      installments_paid: 1,
      old_profile_id: "personal"
    }
  ];

  // Get Firebase modules from the app
  const { collection, getDocs, addDoc, query, where } = window.firebaseFirestore || {};
  const db = window.firebaseDb;
  const auth = window.firebaseAuth;
  
  if (!db || !auth) {
    alert('Firebase not found. Make sure you are on the Kharadhu Baradhu app page.');
    return;
  }
  
  const userId = auth.currentUser?.uid;
  if (!userId) {
    alert('Not logged in. Please log in first.');
    return;
  }
  
  console.log('Fetching your profiles...');
  const profilesSnap = await getDocs(collection(db, 'users', userId, 'profiles'));
  const profiles = profilesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  
  console.log('Your profiles:', profiles.map(p => `${p.name} (${p.type}) - ID: ${p.id}`));
  
  // Map old profiles to new ones
  const homeProfile = profiles.find(p => 
    p.name?.toLowerCase().includes('home') || 
    p.name?.toLowerCase().includes('expense') ||
    p.type === 'family'
  ) || profiles[0];
  
  const personalProfile = profiles.find(p => 
    p.type === 'personal' || 
    p.name?.toLowerCase().includes('personal')
  ) || profiles[0];
  
  console.log(`\nHome/Expense profile: ${homeProfile.name} (${homeProfile.id})`);
  console.log(`Personal profile: ${personalProfile.name} (${personalProfile.id})\n`);
  
  // Check existing loans
  const existingSnap = await getDocs(collection(db, 'users', userId, 'loans'));
  const existing = existingSnap.docs.map(d => d.data());
  
  let added = 0;
  let skipped = 0;
  
  for (const loan of loans) {
    // Check if already exists
    const exists = existing.some(e => 
      (e.lender_name === loan.lender_name && loan.lender_name) ||
      (e.borrower_name === loan.borrower_name && loan.borrower_name)
    );
    
    if (exists) {
      console.log(`⏭️  Skipping (exists): ${loan.lender_name || loan.borrower_name}`);
      skipped++;
      continue;
    }
    
    const targetProfile = loan.old_profile_id === 'home' ? homeProfile : personalProfile;
    
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
    };
    
    await addDoc(collection(db, 'users', userId, 'loans'), newLoan);
    console.log(`✅ Added: ${loan.lender_name || loan.borrower_name} → ${targetProfile.name}`);
    added++;
  }
  
  console.log(`\n✨ Done! Added ${added} loans, skipped ${skipped} existing.`);
  console.log('Refresh the page to see your loans.');
})();
