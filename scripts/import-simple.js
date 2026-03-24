// Simple import script - copy everything from ( to )
// Paste into console at https://kharadhu-baradhu.vercel.app

(async function(){
const { collection, getDocs, addDoc } = window.firebaseFirestore || {};
const db = window.firebaseDb;
const auth = window.firebaseAuth;

if (!db || !auth) {
  alert('Firebase not found. Are you on the app page?');
  return;
}

const userId = auth.currentUser?.uid;
if (!userId) {
  alert('Please log in first');
  return;
}

console.log('Importing data...');

const profilesSnap = await getDocs(collection(db, 'users', userId, 'profiles'));
const profiles = profilesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

if (profiles.length === 0) {
  alert('Create a profile first');
  return;
}

console.log('Profiles:', profiles.map(p => p.name));

const homeProfile = profiles.find(p => p.name?.toLowerCase().includes('home')) || profiles[0];
const personalProfile = profiles.find(p => p.type === 'personal') || profiles[0];

console.log('Home profile:', homeProfile.name);
console.log('Personal profile:', personalProfile.name);

const bills = [
  { shop: "Ufanveli Shop", date: "2026-02-28", total: 187.10 },
  { shop: "VB mart", date: "2026-03-07", total: 193.00 },
  { shop: "Heyo Fihaara", date: "2026-03-07", total: 66.00 },
  { shop: "Ufanveli", date: "2026-03-15", total: 211.80 },
  { shop: "MWSE", date: "2026-03-08", total: 300.00 },
  { shop: "Naid Mart", date: "2026-03-07", total: 79.98 },
  { shop: "A.L.D Mart", date: "2026-03-07", total: 58.00 },
  { shop: "Nesto", date: "2026-03-07", total: 145.47 },
  { shop: "Dharavandhoo Shop", date: "2026-03-07", total: 87.00 },
  { shop: "S.T.O Dharavandhoo", date: "2026-03-07", total: 279.00 },
  { shop: "VB Mart", date: "2026-03-07", total: 194.00 },
  { shop: "Dharavandhoo shop", date: "2026-03-05", total: 250.00 },
  { shop: "Dharavandhoo shop", date: "2026-03-05", total: 43.83 },
  { shop: "Ufanveli Shop", date: "2026-02-26", total: 187.10 },
  { shop: "VB Mart", date: "2026-03-05", total: 93.28 },
  { shop: "Dharavandhoo shop", date: "2026-03-05", total: 250.00 },
  { shop: "Dharavandhoo Shop", date: "2026-03-15", total: 280.00 },
  { shop: "Dharavandhoo Shop", date: "2026-03-15", total: 280.00 },
  { shop: "Heyo Fihaara", date: "2026-03-07", total: 66.00 }
];

const existingBillsSnap = await getDocs(collection(db, 'users', userId, 'groceryBills'));
const existing = existingBillsSnap.docs.map(d => d.data());

let added = 0;
let skipped = 0;

for (const bill of bills) {
  const exists = existing.some(e => e.shop_name === bill.shop && e.bill_date === bill.date);
  if (exists) {
    skipped++;
    continue;
  }
  
  await addDoc(collection(db, 'users', userId, 'groceryBills'), {
    profile_id: homeProfile.id,
    shop_name: bill.shop,
    bill_date: bill.date,
    total: bill.total,
    subtotal: bill.total * 0.96,
    gst_amount: bill.total * 0.04,
    created_at: new Date().toISOString()
  });
  added++;
}

console.log('Grocery bills: ' + added + ' added, ' + skipped + ' skipped');

const loans = [
  { name: "Bazaar Shop (Ramdan)", amount: 2557.23, paid: 2000, type: "borrowed" },
  { name: "Faiz be", amount: 10128, paid: 0, type: "lended" },
  { name: "BML", amount: 36151.05, paid: 0, type: "borrowed", bank: "Bank of Maldives" },
  { name: "Credit card", amount: 5886.28, paid: 0, type: "borrowed" },
  { name: "Ibba loan", amount: 9000, paid: 0, type: "borrowed" },
  { name: "Adee loan", amount: 53970, paid: 0, type: "lended" },
  { name: "Reehan", amount: 6000, paid: 1000, type: "borrowed" }
];

const existingLoansSnap = await getDocs(collection(db, 'users', userId, 'loans'));
const existingLoans = existingLoansSnap.docs.map(d => d.data());

let loansAdded = 0;
let loansSkipped = 0;

for (const loan of loans) {
  const exists = existingLoans.some(e => 
    (e.lender_name === loan.name && loan.type === "borrowed") ||
    (e.borrower_name === loan.name && loan.type === "lended")
  );
  if (exists) {
    loansSkipped++;
    continue;
  }
  
  const isLended = loan.type === "lended";
  
  await addDoc(collection(db, 'users', userId, 'loans'), {
    profile_id: homeProfile.id,
    loan_type: loan.type,
    category: loan.bank ? 'bank' : 'individual',
    lender_name: isLended ? null : loan.name,
    borrower_name: isLended ? loan.name : null,
    principal_amount: loan.amount,
    total_amount: loan.amount,
    amount_paid: loan.paid,
    interest_rate: 0,
    interest_type: 'none',
    loan_date: '2026-03-01',
    status: 'active',
    bank_name: loan.bank || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });
  loansAdded++;
}

console.log('Loans: ' + loansAdded + ' added, ' + loansSkipped + ' skipped');
console.log('Done! Refresh to see data.');
alert('Import complete!\nBills: ' + added + ' added\nLoans: ' + loansAdded + ' added\nRefresh to see data.');
})()
