// Fix missing grocery items by mapping CSV bill IDs to Firestore bills
// Option A: items mapping only (NO bill deletion)
// Requires: npm install firebase-admin csv-parse
// Needs: scripts/firebase-service-account.json
// Run: node scripts/fix-missing-items-by-sourceid.cjs <userId>

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

async function fixMissingItems() {
  const userId = process.argv[2];
  if (!userId) {
    console.error('Usage: node fix-missing-items-by-sourceid.cjs <userId>');
    process.exit(1);
  }

  console.log(`\n=== Fix Missing Grocery Items (Option A) ===`);
  console.log(`User ID: ${userId}\n`);

  // Read CSV
  const itemsCsvPath = path.join(__dirname, '..', 'migration-export-data', 'exported_csv', 'grocery_bill_items_rows.csv');
  const billsCsvPath = path.join(__dirname, '..', 'migration-export-data', 'exported_csv', 'grocery_bills_rows.csv');

  const itemsCsv = fs.readFileSync(itemsCsvPath, 'utf-8');
  const billsCsv = fs.readFileSync(billsCsvPath, 'utf-8');

  const itemsData = parse(itemsCsv, { columns: true, skip_empty_lines: true });
  const billsData = parse(billsCsv, { columns: true, skip_empty_lines: true });

  console.log(`CSV bills: ${billsData.length}`);
  console.log(`CSV items: ${itemsData.length}\n`);

  // Build bill map from CSV: legacyBillId -> {shop_name, bill_date, total}
  const csvBillById = new Map();
  for (const b of billsData) {
    csvBillById.set(b.id, b);
  }

  // Load Firestore bills
  const fsBillsSnap = await db.collection('users').doc(userId).collection('groceryBills').get();
  const fsBills = fsBillsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  console.log(`Firestore bills: ${fsBills.length}`);

  // Load Firestore items
  const fsItemsSnap = await db.collection('users').doc(userId).collection('groceryBillItems').get();
  const fsItems = fsItemsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  console.log(`Firestore items: ${fsItems.length}\n`);

  // Index existing items to avoid duplicates: billId|name|qty|unit_price|line_total
  const existingItemKeys = new Set();
  for (const it of fsItems) {
    const key = `${it.grocery_bill_id}|${String(it.item_name ?? '').trim()}|${Number(it.qty) || 0}|${Number(it.unit_price) || 0}|${Number(it.line_total) || 0}`;
    existingItemKeys.add(key);
  }

  // Count items per Firestore bill
  const itemsPerBill = new Map();
  for (const it of fsItems) {
    const billId = it.grocery_bill_id;
    itemsPerBill.set(billId, (itemsPerBill.get(billId) || 0) + 1);
  }

  const billsWithZeroItems = fsBills.filter(b => (itemsPerBill.get(b.id) || 0) === 0);
  console.log(`Bills with 0 items: ${billsWithZeroItems.length}\n`);

  // Helper: best-effort match Firestore bill to CSV bill
  const norm = (s) => String(s ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
  const round2 = (n) => Math.round(Number(n) * 100) / 100;

  // Pre-index CSV bills by (shop_name, bill_date) to find candidates
  const csvBillsByShopDate = new Map();
  for (const b of billsData) {
    const key = `${norm(b.shop_name)}|${String(b.bill_date ?? '').trim()}`;
    const arr = csvBillsByShopDate.get(key) || [];
    arr.push(b);
    csvBillsByShopDate.set(key, arr);
  }

  // Build mapping: firestoreBillId -> legacyBillId
  const mapping = new Map();

  for (const fb of billsWithZeroItems) {
    const key = `${norm(fb.shop_name)}|${String(fb.bill_date ?? '').trim()}`;
    const candidates = csvBillsByShopDate.get(key) || [];

    if (candidates.length === 0) continue;

    // Prefer total match if possible
    const fbTotal = fb.total != null ? round2(fb.total) : null;
    let chosen = null;

    if (fbTotal != null) {
      chosen = candidates.find(c => round2(c.total) === fbTotal) || null;
    }

    // If still ambiguous, pick the first (but log it)
    if (!chosen) {
      chosen = candidates[0];
      if (candidates.length > 1) {
        console.log(`Ambiguous match for Firestore bill ${fb.id} (${fb.shop_name} ${fb.bill_date}). Candidates: ${candidates.map(c => c.id).join(', ')}`);
      }
    }

    mapping.set(fb.id, chosen.id);
  }

  console.log(`Mapped ${mapping.size} / ${billsWithZeroItems.length} zero-item bills to CSV bills\n`);

  // For each mapped bill, migrate its items
  let migrated = 0;
  let skipped = 0;
  let notFound = 0;
  let errors = 0;

  for (const [fsBillId, legacyBillId] of mapping.entries()) {
    const csvItems = itemsData.filter(i => i.grocery_bill_id === legacyBillId);
    if (csvItems.length === 0) {
      notFound++;
      continue;
    }

    for (const item of csvItems) {
      try {
        const qty = Number(item.qty) || 1;
        const unit = Number(item.unit_price) || 0;
        const total = Number(item.line_total) || qty * unit;

        const itemKey = `${fsBillId}|${String(item.item_name ?? '').trim()}|${qty}|${unit}|${total}`;
        if (existingItemKeys.has(itemKey)) {
          skipped++;
          continue;
        }

        await db.collection('users').doc(userId).collection('groceryBillItems').add({
          grocery_bill_id: fsBillId,
          item_name: String(item.item_name ?? '').trim(),
          qty,
          unit_price: unit,
          line_total: total,
          created_at: new Date().toISOString(),
          user_id: userId,
          source_item_id: item.id,
          source_bill_id: legacyBillId,
        });

        existingItemKeys.add(itemKey);
        migrated++;
      } catch (e) {
        errors++;
      }
    }
  }

  console.log(`\n=== Done ===`);
  console.log(`Migrated: ${migrated}`);
  console.log(`Skipped (duplicates): ${skipped}`);
  console.log(`Mapped bill with 0 CSV items: ${notFound}`);
  console.log(`Errors: ${errors}`);

  console.log(`\nNow refresh /grocery-bills. Bills should show items where CSV had them.`);
  process.exit(0);
}

fixMissingItems().catch(err => {
  console.error(err);
  process.exit(1);
});
