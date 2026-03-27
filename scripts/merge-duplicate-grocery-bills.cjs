// Merge duplicate grocery bills using shop+date+total key
// No deletion - marks duplicates as merged and moves their items to primary bill
// Usage: node scripts/merge-duplicate-grocery-bills.cjs <userId>

const admin = require('firebase-admin');

const serviceAccount = require('./firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
});

const db = admin.firestore();

async function mergeDuplicateBills() {
  const userId = process.argv[2];
  if (!userId) {
    console.error('Usage: node merge-duplicate-grocery-bills.cjs <userId>');
    process.exit(1);
  }

  console.log(`\n=== Merge Duplicate Grocery Bills ===\n`);
  console.log(`User ID: ${userId}`);
  console.log(`Merge key: shop_name + bill_date + total\n`);

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

  // Group bills by key: shop_name|bill_date|total
  const round2 = (n) => Math.round(Number(n) * 100) / 100;
  const groups = new Map();

  for (const bill of bills) {
    const key = `${bill.shop_name}|${bill.bill_date}|${round2(bill.total)}`;
    const group = groups.get(key) || [];
    group.push(bill);
    groups.set(key, group);
  }

  // Find duplicate groups (2+ bills with same key)
  const duplicateGroups = [];
  for (const [key, group] of groups.entries()) {
    if (group.length > 1) {
      duplicateGroups.push({ key, bills: group });
    }
  }

  console.log(`Duplicate groups found: ${duplicateGroups.length}\n`);

  if (duplicateGroups.length === 0) {
    console.log('No duplicates to merge.');
    process.exit(0);
  }

  // Show duplicates
  for (const { key, bills: group } of duplicateGroups) {
    console.log(`\n${key}:`);
    for (const bill of group) {
      const itemCount = itemsPerBill.get(bill.id) || 0;
      console.log(`  - ${bill.id}: ${itemCount} items`);
    }
  }

  console.log(`\nProceeding with merge...\n`);

  let mergedCount = 0;
  let itemsMoved = 0;
  let errors = 0;

  for (const { key, bills: group } of duplicateGroups) {
    // Pick primary: prefer bill with most items, otherwise oldest created
    const sorted = group.sort((a, b) => {
      const itemsA = itemsPerBill.get(a.id) || 0;
      const itemsB = itemsPerBill.get(b.id) || 0;
      if (itemsB !== itemsA) return itemsB - itemsA; // More items first
      return (a.created_at || '').localeCompare(b.created_at || ''); // Oldest first
    });

    const primary = sorted[0];
    const duplicates = sorted.slice(1);

    console.log(`\nPrimary: ${primary.id} (${itemsPerBill.get(primary.id) || 0} items)`);

    for (const dup of duplicates) {
      try {
        // Move all items from duplicate to primary
        const dupItems = items.filter(i => i.grocery_bill_id === dup.id);
        console.log(`  Merging ${dup.id}: ${dupItems.length} items → ${primary.id}`);

        for (const item of dupItems) {
          await db.collection('users').doc(userId).collection('groceryBillItems').doc(item.id).update({
            grocery_bill_id: primary.id,
            merged_from_bill_id: dup.id,
            merged_at: new Date().toISOString()
          });
          itemsMoved++;
        }

        // Mark duplicate as merged (no deletion)
        await db.collection('users').doc(userId).collection('groceryBills').doc(dup.id).update({
          is_merged: true,
          merged_into_bill_id: primary.id,
          merged_at: new Date().toISOString(),
          merged_reason: 'duplicate: shop+date+total match'
        });

        mergedCount++;
      } catch (e) {
        console.error(`  ❌ Error merging ${dup.id}:`, e.message);
        errors++;
      }
    }
  }

  console.log(`\n=== Merge Complete ===`);
  console.log(`Duplicate bills merged: ${mergedCount}`);
  console.log(`Items moved to primary bills: ${itemsMoved}`);
  console.log(`Errors: ${errors}`);

  console.log(`\nRefresh /grocery-bills to see:`);
  console.log(`- Merged bills now have 0 items (items moved to primary)`);
  console.log(`- Merged bills are labeled with is_merged flag`);
  console.log(`- Primary bills now have all the combined items`);

  process.exit(0);
}

mergeDuplicateBills().catch(err => {
  console.error('Merge failed:', err);
  process.exit(1);
});
