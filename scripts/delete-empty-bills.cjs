// Delete grocery bills with 0 items (empty bills)
// Usage: node scripts/delete-empty-bills.cjs <userId>

const admin = require('firebase-admin');

const serviceAccount = require('./firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
});

const db = admin.firestore();

async function deleteEmptyBills() {
  const userId = process.argv[2];
  if (!userId) {
    console.error('Usage: node delete-empty-bills.cjs <userId>');
    process.exit(1);
  }

  console.log(`\n=== Delete Empty Grocery Bills ===\n`);
  console.log(`User: ${userId}\n`);

  // Load all bills
  const billsSnap = await db.collection('users').doc(userId).collection('groceryBills').get();
  const bills = billsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  console.log(`Total bills: ${bills.length}`);

  // Load all items
  const itemsSnap = await db.collection('users').doc(userId).collection('groceryBillItems').get();
  const items = itemsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  console.log(`Total items: ${items.length}\n`);

  // Count items per bill
  const itemsPerBill = new Map();
  for (const item of items) {
    const billId = item.grocery_bill_id;
    itemsPerBill.set(billId, (itemsPerBill.get(billId) || 0) + 1);
  }

  // Find bills with 0 items
  const emptyBills = bills.filter(b => (itemsPerBill.get(b.id) || 0) === 0);
  console.log(`Empty bills (0 items): ${emptyBills.length}\n`);

  if (emptyBills.length === 0) {
    console.log('No empty bills to delete.');
    process.exit(0);
  }

  // Show empty bills
  for (const emptyBill of emptyBills) {
    const merged = emptyBill.is_merged ? ' [MERGED]' : '';
    console.log(`  - ${emptyBill.shop_name} | ${emptyBill.bill_date} | MVR ${emptyBill.total}${merged} | ID: ${emptyBill.id}`);
  }

  console.log(`\nDeleting ${emptyBills.length} empty bills...\n`);

  let deleted = 0;
  let errors = 0;

  for (const bill of emptyBills) {
    try {
      await db.collection('users').doc(userId).collection('groceryBills').doc(bill.id).delete();
      console.log(`  ✅ Deleted: ${bill.shop_name} | ${b.bill_date}`);
      deleted++;
    } catch (e) {
      console.error(`  ❌ Error deleting ${bill.id}:`, e.message);
      errors++;
    }
  }

  console.log(`\n=== Complete ===`);
  console.log(`Deleted: ${deleted}`);
  console.log(`Errors: ${errors}`);

  console.log(`\nRefresh /grocery-bills to see the cleaned list.`);
  process.exit(0);
}

deleteEmptyBills().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
