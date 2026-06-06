// Migration script to import grocery bill items from CSV to Firestore
// Run with: node scripts/migrate-grocery-items.js <userId>
// Requires: npm install firebase csv-parse

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, addDoc, query, where, getDocs, getDoc } = require('firebase/firestore');
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

// Firebase config - from your app
const firebaseConfig = {
  apiKey: "AIzaSyCqB-PlsU90mbU3xYb_otuoOPfaa0aiGeA",
  authDomain: "kharadhu-baradhu.firebaseapp.com",
  projectId: "kharadhu-baradhu",
  storageBucket: "kharadhu-baradhu.firebasestorage.app",
  messagingSenderId: "1027497694368",
  appId: "1:1027497694368:web:5803578ad68ddf18bd65c5",
  measurementId: "G-MV93KE9RXY"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function migrateGroceryItems() {
  const userId = process.argv[2];
  if (!userId) {
    console.error('Usage: node migrate-grocery-items.js <userId>');
    console.error('Example: node migrate-grocery-items.js abc123xyz');
    process.exit(1);
  }

  console.log(`\n=== Grocery Bill Items Migration ===`);
  console.log(`User ID: ${userId}\n`);

  // Read CSV files
  const itemsCsvPath = path.join(__dirname, '..', 'migration-export-data', 'exported_csv', 'grocery_bill_items_rows.csv');
  const billsCsvPath = path.join(__dirname, '..', 'migration-export-data', 'exported_csv', 'grocery_bills_rows.csv');

  console.log('Reading CSV files...');
  const itemsCsv = fs.readFileSync(itemsCsvPath, 'utf-8');
  const billsCsv = fs.readFileSync(billsCsvPath, 'utf-8');

  const itemsData = parse(itemsCsv, { columns: true, skip_empty_lines: true });
  const billsData = parse(billsCsv, { columns: true, skip_empty_lines: true });

  console.log(`Found ${itemsData.length} items in CSV`);
  console.log(`Found ${billsData.length} bills in CSV\n`);

  // Build map of old exported bill ID -> {shop_name, bill_date}
  const oldBillMap = new Map();
  billsData.forEach(bill => {
    oldBillMap.set(bill.id, {
      shop_name: bill.shop_name,
      bill_date: bill.bill_date,
      total: bill.total
    });
  });

  // Get existing Firestore bills for this user
  console.log('Fetching Firestore bills...');
  const billsQuery = query(collection(db, 'users', userId, 'groceryBills'));
  const billsSnap = await getDocs(billsQuery);

  // Build map of shop_name+bill_date -> Firestore bill ID
  const firestoreBillMap = new Map();
  billsSnap.docs.forEach(doc => {
    const data = doc.data();
    const key = `${data.shop_name}_${data.bill_date}`;
    firestoreBillMap.set(key, { id: doc.id, ...data });
  });

  console.log(`Found ${billsSnap.docs.length} bills in Firestore\n`);

  // Check for existing items to avoid duplicates
  console.log('Checking existing items...');
  const existingItemsQuery = query(collection(db, 'users', userId, 'groceryBillItems'));
  const existingItemsSnap = await getDocs(existingItemsQuery);
  console.log(`Found ${existingItemsSnap.docs.length} existing items in Firestore\n`);

  // Calculate date 5 days ago
  const fiveDaysAgo = new Date();
  fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
  const fiveDaysAgoStr = fiveDaysAgo.toISOString().slice(0, 10);

  console.log(`Safety: Skipping bills from last 5 days (after ${fiveDaysAgoStr})\n`);

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
      // Get the old bill info
      const oldBillInfo = oldBillMap.get(item.grocery_bill_id);
      if (!oldBillInfo) {
        console.warn(`⚠ No bill found for item: ${item.item_name} (bill_id: ${item.grocery_bill_id})`);
        notFound++;
        continue;
      }

      // Skip bills from last 5 days (safety check)
      if (oldBillInfo.bill_date >= fiveDaysAgoStr) {
        console.log(`⏭ Skipping recent bill: ${oldBillInfo.shop_name} (${oldBillInfo.bill_date})`);
        skipped++;
        continue;
      }

      // Find matching Firestore bill
      const billKey = `${oldBillInfo.shop_name}_${oldBillInfo.bill_date}`;
      const firestoreBill = firestoreBillMap.get(billKey);

      if (!firestoreBill) {
        console.warn(`⚠ No Firestore bill found for: ${billKey}`);
        notFound++;
        continue;
      }

      // Skip if bill already has items
      if (billsWithItems.has(firestoreBill.id)) {
        console.log(`⏭ Skipping ${item.item_name} - bill already has items`);
        skipped++;
        continue;
      }

      // Create the item in Firestore
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

      await addDoc(collection(db, 'users', userId, 'groceryBillItems'), newItem);

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
  console.log(`⏭ Skipped: ${skipped} items (already exist)`);
  console.log(`✗ Errors: ${errors} items`);
  console.log(`⚠ Not found: ${notFound} items (no matching bill)`);
  console.log(`\nDone!`);
}

migrateGroceryItems().catch(error => {
  console.error('Migration failed:', error);
  process.exit(1);
});
