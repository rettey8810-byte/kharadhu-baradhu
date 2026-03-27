// Rename shop names in grocery bills (e.g., Dharavandhoo → Ufanveli)
// Usage: node scripts/rename-shop.cjs <userId> "Old Name" "New Name"

const admin = require('firebase-admin');

const serviceAccount = require('./firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
});

const db = admin.firestore();

async function renameShop() {
  const userId = process.argv[2];
  const oldName = process.argv[3];
  const newName = process.argv[4];

  if (!userId || !oldName || !newName) {
    console.error('Usage: node rename-shop.cjs <userId> "Old Shop Name" "New Shop Name"');
    process.exit(1);
  }

  console.log(`\n=== Renaming Shop ===`);
  console.log(`User: ${userId}`);
  console.log(`"${oldName}" → "${newName}"\n`);

  // Find all bills with old name
  const billsSnap = await db.collection('users').doc(userId).collection('groceryBills').get();
  const billsToRename = [];

  for (const doc of billsSnap.docs) {
    const data = doc.data();
    if (data.shop_name === oldName) {
      billsToRename.push({ id: doc.id, ...data });
    }
  }

  if (billsToRename.length === 0) {
    console.log(`No bills found with shop name "${oldName}"`);
    process.exit(0);
  }

  console.log(`Found ${billsToRename.length} bills to rename:\n`);
  for (const b of billsToRename) {
    console.log(`  - ${b.bill_date} - MVR ${b.total} - ID: ${b.id}`);
  }

  console.log(`\nRenaming...\n`);

  let renamed = 0;
  let errors = 0;

  for (const bill of billsToRename) {
    try {
      await db.collection('users').doc(userId).collection('groceryBills').doc(bill.id).update({
        shop_name: newName,
        shop_name_changed_at: new Date().toISOString(),
        original_shop_name: oldName
      });
      console.log(`  ✅ Renamed: ${bill.bill_date} - ${newName}`);
      renamed++;
    } catch (e) {
      console.error(`  ❌ Error renaming ${bill.id}:`, e.message);
      errors++;
    }
  }

  console.log(`\n=== Complete ===`);
  console.log(`Renamed: ${renamed}`);
  console.log(`Errors: ${errors}`);

  if (renamed > 0) {
    console.log(`\nNow run the merge script again to consolidate:`);
    console.log(`node scripts/merge-duplicate-grocery-bills.cjs ${userId}`);
  }

  process.exit(0);
}

renameShop().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
