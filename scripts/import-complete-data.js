// Complete Data Import Script - legacy CSV export to Firebase
// Run this in browser console at https://kharadhu-baradhu.vercel.app

(async function importAllData() {
  const { collection, getDocs, addDoc, query, where, doc, setDoc } = window.firebaseFirestore || {};
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
  
  console.log('=== Starting Full Data Import ===\n');
  
  // Get current profiles
  const profilesSnap = await getDocs(collection(db, 'users', userId, 'profiles'));
  const profiles = profilesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  
  if (profiles.length === 0) {
    alert('No profiles found. Please create at least one profile first.');
    return;
  }
  
  console.log('Current Firebase profiles:');
  profiles.forEach(p => console.log(`  - ${p.name} (${p.type}): ${p.id}`));
  
  // Profile mapping from legacy export to Firebase
  const profileMapping = {};
  const legacyProfiles = [
    { id: '65ede15e-f450-4a42-b1d9-1496c3359b24', name: 'Home Expense', type: 'family' },
    { id: '4c276124-ba30-4bfb-aed2-4db99e9563bd', name: 'Personal', type: 'personal' },
    { id: 'db645f92-01b3-4f6f-a157-8ecaab9669a2', name: 'Aizan Expense', type: 'family' },
    { id: '110675a7-0859-4951-9a93-a418f767c8d4', name: 'Fanna Expense', type: 'family' },
    { id: '411e54a6-c2db-42b6-a5bd-fe0bb6038dab', name: 'Haleema Expense', type: 'family' },
    { id: '69d73118-3820-4de5-b681-bf673bff18f8', name: 'Ailish Expense', type: 'family' },
    { id: '70914bac-b669-4a4e-91f6-d5b928b054ee', name: 'Ayaan Expense', type: 'family' },
    { id: '7bd8c236-a517-4e11-b02e-ff655d6aac58', name: 'Azan Expense', type: 'family' }
  ];
  
  // Try to match by name/type
  legacyProfiles.forEach(sp => {
    const match = profiles.find(fp => 
      fp.name?.toLowerCase().includes(sp.name.toLowerCase().split(' ')[0]) ||
      (sp.type === 'family' && fp.type === 'family') ||
      (sp.type === 'personal' && fp.type === 'personal')
    );
    profileMapping[sp.id] = match ? match.id : profiles[0].id;
    console.log(`Mapping ${sp.name} → ${match?.name || profiles[0].name}`);
  });
  
  const homeProfileId = profileMapping['65ede15e-f450-4a42-b1d9-1496c3359b24'];
  
  // ===== GROCERY BILLS & ITEMS =====
  console.log(`\n=== Importing Grocery Bills & Items ===`);
  
  const groceryBills = [
    { id: "0f2a552e-5cbe-4ba5-bd21-e2e409b29009", shop_name: "Ufanveli Shop", bill_date: "2026-02-28", subtotal: 179.26, gst_amount: 7.84, total: 187.10, profile_id: "65ede15e-f450-4a42-b1d9-1496c3359b24" },
    { id: "142fc339-8261-4feb-bbf8-e5dd719690f5", shop_name: "VB mart", bill_date: "2026-03-07", subtotal: 193.00, gst_amount: 0, total: 193.00, profile_id: "65ede15e-f450-4a42-b1d9-1496c3359b24" },
    { id: "17bbc62b-a3b7-4582-8b79-c521883a6126", shop_name: "Heyo Fihaara", bill_date: "2026-03-07", subtotal: 66.00, gst_amount: 0, total: 66.00, profile_id: "65ede15e-f450-4a42-b1d9-1496c3359b24" },
    { id: "19ff272f-a981-4046-a81b-e4f11848e83d", shop_name: "Ufanveli", bill_date: "2026-03-15", subtotal: 211.80, gst_amount: 0, total: 211.80, profile_id: "65ede15e-f450-4a42-b1d9-1496c3359b24" },
    { id: "3480ebd1-6f63-46e0-9c66-9768b7cabb02", shop_name: "MWSE", bill_date: "2026-03-08", subtotal: 300.00, gst_amount: 0, total: 300.00, profile_id: "65ede15e-f450-4a42-b1d9-1496c3359b24" },
    { id: "3e9c450b-9890-4e6e-a0ad-82b2cf0a422a", shop_name: "Naid Mart", bill_date: "2026-03-07", subtotal: 79.98, gst_amount: 0, total: 79.98, profile_id: "65ede15e-f450-4a42-b1d9-1496c3359b24" },
    { id: "504829b5-a62b-4aa5-a753-022757c92962", shop_name: "A.L.D Mart", bill_date: "2026-03-07", subtotal: 58.00, gst_amount: 0, total: 58.00, profile_id: "65ede15e-f450-4a42-b1d9-1496c3359b24" },
    { id: "54a70f2d-cc95-4793-98a3-0e3fb9b63d22", shop_name: "Nesto", bill_date: "2026-03-07", subtotal: 145.47, gst_amount: 0, total: 145.47, profile_id: "65ede15e-f450-4a42-b1d9-1496c3359b24" },
    { id: "5c70d62a-7f34-4fed-81c9-b5931664a73d", shop_name: "Dharavandhoo Shop", bill_date: "2026-03-07", subtotal: 87.00, gst_amount: 0, total: 87.00, profile_id: "65ede15e-f450-4a42-b1d9-1496c3359b24" },
    { id: "5dbd1e96-a7f5-40a7-ab59-54082c043f75", shop_name: "S.T.O Dharavandhoo", bill_date: "2026-03-07", subtotal: 279.00, gst_amount: 0, total: 279.00, profile_id: "65ede15e-f450-4a42-b1d9-1496c3359b24" },
    { id: "616b7cc8-bdee-4fda-9065-24aab9a12cde", shop_name: "VB Mart", bill_date: "2026-03-07", subtotal: 194.00, gst_amount: 0, total: 194.00, profile_id: "65ede15e-f450-4a42-b1d9-1496c3359b24" },
    { id: "891458c2-b2b6-489e-9b5e-ac19b8c3dcf7", shop_name: "Dharavandhoo shop", bill_date: "2026-03-05", subtotal: 250.00, gst_amount: 0, total: 250.00, profile_id: "65ede15e-f450-4a42-b1d9-1496c3359b24" },
    { id: "b1d83242-8f0f-4073-8117-cbc516076988", shop_name: "Dharavandhoo shop", bill_date: "2026-03-05", subtotal: 43.83, gst_amount: 0, total: 43.83, profile_id: "65ede15e-f450-4a42-b1d9-1496c3359b24" },
    { id: "b3f26559-3e91-4739-b1fc-bef0b8a25094", shop_name: "Ufanveli Shop", bill_date: "2026-02-26", subtotal: 179.26, gst_amount: 7.84, total: 187.10, profile_id: "65ede15e-f450-4a42-b1d9-1496c3359b24" },
    { id: "d2634ad8-d943-4067-8251-2ce6a88a7ed8", shop_name: "VB Mart", bill_date: "2026-03-05", subtotal: 93.28, gst_amount: 0, total: 93.28, profile_id: "65ede15e-f450-4a42-b1d9-1496c3359b24" },
    { id: "f671d931-c5a0-4848-bbc7-b9513ab68345", shop_name: "Dharavandhoo shop", bill_date: "2026-03-05", subtotal: 250.00, gst_amount: 0, total: 250.00, profile_id: "65ede15e-f450-4a42-b1d9-1496c3359b24" },
    { id: "9ebc4cdc-269c-4d4f-987b-1c31faa8dd16", shop_name: "Dharavandhoo Shop", bill_date: "2026-03-15", subtotal: 280.00, gst_amount: 0, total: 280.00, profile_id: "65ede15e-f450-4a42-b1d9-1496c3359b24" },
    { id: "1f51a2f9-7b3a-4f1b-8b6b-7f0b4a5c3d2e", shop_name: "Dharavandhoo Shop", bill_date: "2026-03-15", subtotal: 280.00, gst_amount: 0, total: 280.00, profile_id: "65ede15e-f450-4a42-b1d9-1496c3359b24" }
  ];
  
  const groceryBillItems = [
    { grocery_bill_id: "0f2a552e-5cbe-4ba5-bd21-e2e409b29009", item_name: "CHICKEN 500GMS", qty: 1, unit_price: 49.00, line_total: 49.00 },
    { grocery_bill_id: "0f2a552e-5cbe-4ba5-bd21-e2e409b29009", item_name: "BANANA BUNCH", qty: 0.6, unit_price: 25.00, line_total: 15.00 },
    { grocery_bill_id: "0f2a552e-5cbe-4ba5-bd21-e2e409b29009", item_name: "BREAD FRUIT LANKOS", qty: 0.5, unit_price: 20.00, line_total: 10.00 },
    { grocery_bill_id: "0f2a552e-5cbe-4ba5-bd21-e2e409b29009", item_name: "BROCCOLI EGYPT", qty: 0.63, unit_price: 30.00, line_total: 18.90 },
    { grocery_bill_id: "0f2a552e-5cbe-4ba5-bd21-e2e409b29009", item_name: "SWEET POTATO", qty: 0.42, unit_price: 20.00, line_total: 8.40 },
    { grocery_bill_id: "0f2a552e-5cbe-4ba5-bd21-e2e409b29009", item_name: "ONION INDIA", qty: 1.16, unit_price: 10.00, line_total: 11.60 },
    { grocery_bill_id: "0f2a552e-5cbe-4ba5-bd21-e2e409b29009", item_name: "RED BELL PEPPER", qty: 0.22, unit_price: 90.00, line_total: 19.80 },
    { grocery_bill_id: "0f2a552e-5cbe-4ba5-bd21-e2e409b29009", item_name: "CHINESE CUCUMBER", qty: 0.13, unit_price: 65.00, line_total: 8.45 },
    { grocery_bill_id: "0f2a552e-5cbe-4ba5-bd21-e2e409b29009", item_name: "CARROT CHINA", qty: 0.13, unit_price: 25.00, line_total: 3.25 },
    { grocery_bill_id: "0f2a552e-5cbe-4ba5-bd21-e2e409b29009", item_name: "GINGER CHINA", qty: 0.1, unit_price: 50.00, line_total: 5.00 },
    { grocery_bill_id: "0f2a552e-5cbe-4ba5-bd21-e2e409b29009", item_name: "GARLIC CHINA", qty: 0.1, unit_price: 40.00, line_total: 4.00 },
    { grocery_bill_id: "0f2a552e-5cbe-4ba5-bd21-e2e409b29009", item_name: "ORANGE EGYPT", qty: 6, unit_price: 4.00, line_total: 24.00 },
    { grocery_bill_id: "0f2a552e-5cbe-4ba5-bd21-e2e409b29009", item_name: "CARRY BAG", qty: 1, unit_price: 1.86, line_total: 1.86 },
    { grocery_bill_id: "b3f26559-3e91-4739-b1fc-bef0b8a25094", item_name: "CHICKEN 500GMS", qty: 1, unit_price: 49.00, line_total: 49.00 },
    { grocery_bill_id: "b3f26559-3e91-4739-b1fc-bef0b8a25094", item_name: "BANANA BUNCH", qty: 6, unit_price: 25.00, line_total: 3.00 },
    { grocery_bill_id: "b3f26559-3e91-4739-b1fc-bef0b8a25094", item_name: "BREAD FRUIT LANKOS", qty: 1, unit_price: 20.00, line_total: 10.00 },
    { grocery_bill_id: "616b7cc8-bdee-4fda-9065-24aab9a12cde", item_name: "Egg India", qty: 30, unit_price: 2.00, line_total: 60.00 },
    { grocery_bill_id: "616b7cc8-bdee-4fda-9065-24aab9a12cde", item_name: "Onion India", qty: 2.9, unit_price: 10.00, line_total: 29.00 },
    { grocery_bill_id: "616b7cc8-bdee-4fda-9065-24aab9a12cde", item_name: "Chili Long Local", qty: 0.2, unit_price: 95.00, line_total: 19.00 },
    { grocery_bill_id: "616b7cc8-bdee-4fda-9065-24aab9a12cde", item_name: "Cucumber China", qty: 0.36, unit_price: 80.00, line_total: 28.80 },
    { grocery_bill_id: "616b7cc8-bdee-4fda-9065-24aab9a12cde", item_name: "Bread Fruit Sri", qty: 0.46, unit_price: 25.00, line_total: 11.50 },
    { grocery_bill_id: "54a70f2d-cc95-4793-98a3-0e3fb9b63d22", item_name: "Cucumber Fresh Chinese", qty: 0.3, unit_price: 95.00, line_total: 33.25 },
    { grocery_bill_id: "54a70f2d-cc95-4793-98a3-0e3fb9b63d22", item_name: "Fanta Strawberry", qty: 1, unit_price: 13.21, line_total: 13.21 },
    { grocery_bill_id: "54a70f2d-cc95-4793-98a3-0e3fb9b63d22", item_name: "Bega Super Slice", qty: 1, unit_price: 59.26, line_total: 59.26 },
    { grocery_bill_id: "54a70f2d-cc95-4793-98a3-0e3fb9b63d22", item_name: "Nestle Cream Original", qty: 1, unit_price: 39.75, line_total: 39.75 },
    { grocery_bill_id: "d2634ad8-d943-4067-8251-2ce6a88a7ed8", item_name: "plastic bag fees", qty: 1, unit_price: 2.00, line_total: 2.00 },
    { grocery_bill_id: "d2634ad8-d943-4067-8251-2ce6a88a7ed8", item_name: "bread town hot dog", qty: 3, unit_price: 15.00, line_total: 45.00 },
    { grocery_bill_id: "d2634ad8-d943-4067-8251-2ce6a88a7ed8", item_name: "sausage", qty: 2, unit_price: 23.14, line_total: 46.28 }
  ];
  
  // Check existing
  const existingBillsSnap = await getDocs(collection(db, 'users', userId, 'groceryBills'));
  const existingBills = existingBillsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  
  let billsAdded = 0, billsSkipped = 0, itemsAdded = 0;
  const billIdMapping = {}; // old_id -> new_id
  
  for (const bill of groceryBills) {
    const exists = existingBills.some(eb => eb.shop_name === bill.shop_name && eb.bill_date === bill.bill_date);
    if (exists) {
      console.log(`⏭️  Skipping (exists): ${bill.shop_name} - MVR ${bill.total}`);
      billsSkipped++;
      continue;
    }
    
    const billData = {
      profile_id: homeProfileId,
      shop_name: bill.shop_name,
      bill_date: bill.bill_date,
      total: bill.total,
      subtotal: bill.subtotal,
      gst_amount: bill.gst_amount || 0,
      raw_text: null,
      created_at: new Date().toISOString()
    };
    
    const billRef = await addDoc(collection(db, 'users', userId, 'groceryBills'), billData);
    billIdMapping[bill.id] = billRef.id;
    console.log(`✅ Added bill: ${bill.shop_name} - MVR ${bill.total}`);
    billsAdded++;
    
    // Add items
    const billItems = groceryBillItems.filter(item => item.grocery_bill_id === bill.id);
    for (const item of billItems) {
      const itemData = {
        grocery_bill_id: billRef.id,
        item_name: item.item_name,
        qty: item.qty,
        unit_price: item.unit_price,
        line_total: item.line_total,
        created_at: new Date().toISOString()
      };
      await addDoc(collection(db, 'users', userId, 'groceryBillItems'), itemData);
      itemsAdded++;
    }
    if (billItems.length > 0) {
      console.log(`   └─ Added ${billItems.length} items`);
    }
  }
  
  console.log(`\n✅ Grocery: ${billsAdded} bills, ${itemsAdded} items (${billsSkipped} skipped)`);
  
  // ===== LOANS =====
  console.log(`\n=== Importing Loans ===`);
  
  const loans = [
    { lender_name: "Bazaar Shop (Ramdan Items)", borrower_name: null, principal_amount: 2557.23, total_amount: 3267.23, amount_paid: 2000, loan_type: "borrowed", interest_rate: 0, loan_date: "2026-02-16", installments_paid: 1 },
    { lender_name: null, borrower_name: "Faiz be", principal_amount: 10128, total_amount: 10128, amount_paid: 0, loan_type: "lended", interest_rate: 0, loan_date: "2026-03-03" },
    { lender_name: "BML", borrower_name: null, principal_amount: 36151.05, total_amount: 36151.05, amount_paid: 0, loan_type: "borrowed", category: "bank", interest_rate: 15, loan_date: "2026-03-03", bank_name: "Bank of Maldives" },
    { lender_name: "Credit card balance", borrower_name: null, principal_amount: 5886.28, total_amount: 5886.28, amount_paid: 0, loan_type: "borrowed", category: "credit_card", interest_rate: 0, loan_date: "2026-03-03" },
    { lender_name: "Ibba loan", borrower_name: null, principal_amount: 9000, total_amount: 9000, amount_paid: 0, loan_type: "borrowed", interest_rate: 0, loan_date: "2026-03-03" },
    { lender_name: null, borrower_name: "Adee loan", principal_amount: 53970, total_amount: 53970, amount_paid: 0, loan_type: "lended", interest_rate: 0, loan_date: "2026-03-03" },
    { lender_name: "Reehan", borrower_name: null, principal_amount: 6000, total_amount: 6000, amount_paid: 1000, loan_type: "borrowed", interest_rate: 0, loan_date: "2026-03-05", installments_paid: 1 }
  ];
  
  const existingLoansSnap = await getDocs(collection(db, 'users', userId, 'loans'));
  const existingLoans = existingLoansSnap.docs.map(d => d.data());
  
  let loansAdded = 0, loansSkipped = 0;
  
  for (const loan of loans) {
    const exists = existingLoans.some(el => (el.lender_name === loan.lender_name && loan.lender_name) || (el.borrower_name === loan.borrower_name && loan.borrower_name));
    if (exists) {
      console.log(`⏭️  Skipping (exists): ${loan.lender_name || loan.borrower_name}`);
      loansSkipped++;
      continue;
    }
    
    const loanData = {
      profile_id: homeProfileId,
      loan_type: loan.loan_type,
      category: loan.category || 'individual',
      lender_name: loan.lender_name,
      borrower_name: loan.borrower_name,
      principal_amount: loan.principal_amount,
      interest_rate: loan.interest_rate || 0,
      interest_type: 'none',
      loan_date: loan.loan_date,
      total_amount: loan.total_amount,
      amount_paid: loan.amount_paid || 0,
      installments_paid: loan.installments_paid || 0,
      status: 'active',
      bank_name: loan.bank_name || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    await addDoc(collection(db, 'users', userId, 'loans'), loanData);
    console.log(`✅ Added loan: ${loan.lender_name || loan.borrower_name} - MVR ${loan.principal_amount}`);
    loansAdded++;
  }
  
  console.log(`\n✅ Loans: ${loansAdded} added (${loansSkipped} skipped)`);
  
  // ===== SUMMARY =====
  console.log(`\n=== IMPORT COMPLETE ===`);
  console.log(`✅ Grocery Bills: ${billsAdded} added (${billsSkipped} skipped)`);
  console.log(`✅ Grocery Items: ${itemsAdded} added`);
  console.log(`✅ Loans: ${loansAdded} added (${loansSkipped} skipped)`);
  console.log(`\n🎉 Done! Refresh the page to see all your data.`);
  
  alert(`Import Complete!\n\n✅ Grocery Bills: ${billsAdded} added\n✅ Items: ${itemsAdded} added\n✅ Loans: ${loansAdded} added\n\nRefresh the page to see your data.`);
})();
