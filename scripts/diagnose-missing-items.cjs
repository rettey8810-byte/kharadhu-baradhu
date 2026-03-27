// Diagnostic script to check which bills are missing items
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

const serviceAccount = require('./firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
});

const db = admin.firestore();

async function diagnoseMissingItems() {
  const userId = process.argv[2];
  if (!userId) {
    console.error('Usage: node diagnose-missing-items.cjs <userId>');
    process.exit(1);
  }

  console.log(`\n=== Diagnosing Missing Grocery Items ===\n`);

  // Read CSV data
  const itemsCsvPath = path.join(__dirname, '..', 'supabase-export-data', 'exported_csv', 'grocery_bill_items_rows.csv');
  const billsCsvPath = path.join(__dirname, '..', 'supabase-export-data', 'exported_csv', 'grocery_bills_rows.csv');
  
  const itemsCsv = fs.readFileSync(itemsCsvPath, 'utf-8');
  const billsCsv = fs.readFileSync(billsCsvPath, 'utf-8');
  
  const itemsData = parse(itemsCsv, { columns: true, skip_empty_lines: true });
  const billsData = parse(billsCsv, { columns: true, skip_empty_lines: true });

  // Get Firestore bills
  const firestoreBillsSnap = await db.collection('users').doc(userId).collection('groceryBills').get();
  const firestoreBills = firestoreBillsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  // Get Firestore items
  const firestoreItemsSnap = await db.collection('users').doc(userId).collection('groceryBillItems').get();
  const firestoreItems = firestoreItemsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  console.log(`CSV Bills: ${billsData.length}`);
  console.log(`CSV Items: ${itemsData.length}`);
  console.log(`Firestore Bills: ${firestoreBills.length}`);
  console.log(`Firestore Items: ${firestoreItems.length}\n`);

  // Count items per bill
  const itemsPerBill = {};
  firestoreItems.forEach(item => {
    const billId = item.grocery_bill_id;
    itemsPerBill[billId] = (itemsPerBill[billId] || 0) + 1;
  });

  // Find bills with 0 items
  const billsWithZeroItems = firestoreBills.filter(bill => !itemsPerBill[bill.id] || itemsPerBill[bill.id] === 0);
  
  console.log(`=== Bills with 0 Items (${billsWithZeroItems.length}) ===\n`);
  
  for (const bill of billsWithZeroItems) {
    const key = `${bill.shop_name}_${bill.bill_date}`;
    console.log(`- ${bill.shop_name} (${bill.bill_date})`);
    console.log(`  Firestore ID: ${bill.id}`);
    console.log(`  Total: MVR ${bill.total}`);
    
    // Check if matching CSV items exist
    const csvBill = billsData.find(b => b.shop_name === bill.shop_name && b.bill_date === bill.bill_date);
    if (csvBill) {
      const csvItems = itemsData.filter(i => i.grocery_bill_id === csvBill.id);
      console.log(`  CSV Bill ID: ${csvBill.id}`);
      console.log(`  CSV Items found: ${csvItems.length}`);
      if (csvItems.length > 0) {
        console.log(`  ⚠️ NEEDS MIGRATION: ${csvItems.length} items in CSV but 0 in Firestore`);
      }
    } else {
      console.log(`  ⚠️ NO CSV MATCH: Bill not found in CSV export`);
    }
    console.log('');
  }

  // Summary
  const billsNeedingMigration = billsWithZeroItems.filter(bill => {
    const csvBill = billsData.find(b => b.shop_name === bill.shop_name && b.bill_date === bill.bill_date);
    if (!csvBill) return false;
    const csvItems = itemsData.filter(i => i.grocery_bill_id === csvBill.id);
    return csvItems.length > 0;
  });

  console.log(`\n=== Summary ===`);
  console.log(`Bills with 0 items: ${billsWithZeroItems.length}`);
  console.log(`Bills that need item migration: ${billsNeedingMigration.length}`);
  
  if (billsNeedingMigration.length > 0) {
    console.log(`\nTo fix, run: node fix-missing-items.cjs ${userId}`);
  }

  process.exit(0);
}

diagnoseMissingItems().catch(error => {
  console.error('Diagnosis failed:', error);
  process.exit(1);
});
