// Migration script using Firebase Admin SDK
// Requires: npm install firebase-admin csv-parse
// Setup: Download serviceAccountKey.json from Firebase Console → Project Settings → Service Accounts

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

// Initialize with service account
const serviceAccount = require('./firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
});

const db = admin.firestore();

async function migrateGroceryItems() {
  const userId = process.argv[2];
  if (!userId) {
    console.error('Usage: node migrate-with-admin.cjs <userId>');
    console.error('Example: node migrate-with-admin.cjs abc123xyz');
    process.exit(1);
  }

  console.log(`\n=== Grocery Bill Items Migration (Admin SDK) ===`);
  console.log(`User ID: ${userId}\n`);

  // Read CSV files
  const itemsCsvPath = path.join(__dirname, '..', 'supabase-export-data', 'exported_csv', 'grocery_bill_items_rows.csv');
  const billsCsvPath = path.join(__dirname, '..', 'supabase-export-data', 'exported_csv', 'grocery_bills_rows.csv');

  console.log('Reading CSV files...');
  const itemsCsv = fs.readFileSync(itemsCsvPath, 'utf-8');
  const billsCsv = fs.readFileSync(billsCsvPath, 'utf-8');

  const itemsData = parse(itemsCsv, { columns: true, skip_empty_lines: true });
  const billsData = parse(billsCsv, { columns: true, skip_empty_lines: true });

  console.log(`Found ${itemsData.length} items in CSV`);
  console.log(`Found ${billsData.length} bills in CSV\n`);

  // Build map of old Supabase bill ID -> {shop_name, bill_date}
  const oldBillMap = new Map();
  billsData.forEach(bill => {
    oldBillMap.set(bill.id, {
      shop_name: bill.shop_name,
      bill_date: bill.bill_date,
      total: bill.total
    });
  });

  // Calculate date 5 days ago
  const fiveDaysAgo = new Date();
  fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
  const fiveDaysAgoStr = fiveDaysAgo.toISOString().slice(0, 10);
  console.log(`Safety: Skipping bills from last 5 days (after ${fiveDaysAgoStr})\n`);

  // Get existing Firestore bills for this user
  console.log('Fetching Firestore bills...');
  const billsSnap = await db.collection('users').doc(userId).collection('groceryBills').get();

  // Build map of shop_name+bill_date -> Firestore bill ID
  const firestoreBillMap = new Map();
  billsSnap.docs.forEach(doc => {
    const data = doc.data();
    const key = `${data.shop_name}_${data.bill_date}`;
    firestoreBillMap.set(key, { id: doc.id, ...data });
  });

  console.log(`Found ${billsSnap.docs.length} bills in Firestore\n`);

  // Check for existing items
  console.log('Checking existing items...');
  const existingItemsSnap = await db.collection('users').doc(userId).collection('groceryBillItems').get();
  console.log(`Found ${existingItemsSnap.docs.length} existing items in Firestore\n`);

  // Track which bills already have items
  const billsWithItems = new Set();
  existingItemsSnap.docs.forEach(doc => {
    const data = doc.data();
    if (data.grocery_bill_id) {
      billsWithItems.add(data.grocery_bill_id);
    }
  });

  let migrated = 0;
  let skipped = 0;
  let errors = 0;
  let notFound = 0;

  console.log('Starting migration...\n');

  for (const item of itemsData) {
    try {
      const oldBillInfo = oldBillMap.get(item.grocery_bill_id);
      if (!oldBillInfo) {
        console.warn(`⚠ No bill found for item: ${item.item_name}`);
        notFound++;
        continue;
      }

      // Skip bills from last 5 days (safety check)
      if (oldBillInfo.bill_date >= fiveDaysAgoStr) {
        console.log(`⏭ Skipping recent bill: ${oldBillInfo.shop_name} (${oldBillInfo.bill_date})`);
        skipped++;
        continue;
      }

      const billKey = `${oldBillInfo.shop_name}_${oldBillInfo.bill_date}`;
      const firestoreBill = firestoreBillMap.get(billKey);

      if (!firestoreBill) {
        console.warn(`⚠ No Firestore bill found for: ${billKey}`);
        notFound++;
        continue;
      }

      if (billsWithItems.has(firestoreBill.id)) {
        console.log(`⏭ Skipping ${item.item_name} - bill already has items`);
        skipped++;
        continue;
      }

      const newItem = {
        grocery_bill_id: firestoreBill.id,
        item_name: item.item_name,
        qty: Number(item.qty) || 1,
        unit_price: Number(item.unit_price) || 0,
        line_total: Number(item.line_total) || (Number(item.qty) * Number(item.unit_price)),
        category: item.category || null,
        notes: item.notes || null,
        created_at: item.created_at || new Date().toISOString(),
        user_id: userId
      };

      await db.collection('users').doc(userId).collection('groceryBillItems').add(newItem);

      migrated++;
      if (migrated % 10 === 0) {
        console.log(`✓ Migrated ${migrated} items...`);
      }
    } catch (error) {
      errors++;
      console.error(`✗ Error migrating item ${item.item_name}:`, error.message);
    }
  }

  console.log(`\n=== Migration Complete ===`);
  console.log(`✓ Migrated: ${migrated} items`);
  console.log(`⏭ Skipped: ${skipped} items (recent or already exist)`);
  console.log(`✗ Errors: ${errors} items`);
  console.log(`⚠ Not found: ${notFound} items (no matching bill)`);
  console.log(`\nDone! Refresh your app to see the imported items.`);
  
  process.exit(0);
}

migrateGroceryItems().catch(error => {
  console.error('Migration failed:', error);
  process.exit(1);
});
