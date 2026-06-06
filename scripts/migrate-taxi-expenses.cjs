// Migrate taxi vehicle expenses from JSON export to Firestore
// Usage: node scripts/migrate-taxi-expenses.cjs <userId>

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const serviceAccount = require('./firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
});

const db = admin.firestore();

async function migrateTaxiExpenses() {
  const userId = process.argv[2];
  if (!userId) {
    console.error('Usage: node migrate-taxi-expenses.cjs <userId>');
    process.exit(1);
  }

  console.log(`\n=== Migrating Taxi Expenses ===\n`);

  // Read JSON data
  const jsonPath = path.join(__dirname, '..', 'migration-export-data', 'taxi_vehicle_expenses.json');
  const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

  console.log(`Expenses in JSON: ${jsonData.length}\n`);

  // Get existing Firestore expenses to avoid duplicates
  const existingSnap = await db.collection('users').doc(userId).collection('taxiVehicleExpenses').get();
  const existing = existingSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  console.log(`Existing in Firestore: ${existing.length}`);

  // Create a key to check duplicates: source_id + amount + date
  const existingKeys = new Set();
  for (const e of existing) {
    const key = `${e.source_expense_id || ''}|${e.amount}|${e.expense_date}`;
    existingKeys.add(key);
  }

  // Get vehicle mapping (assuming vehicle_id from JSON exists in Firestore)
  // If not, we'll need to create it or map it
  const vehiclesSnap = await db.collection('users').doc(userId).collection('taxiVehicles').get();
  const vehicles = vehiclesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  console.log(`Vehicles in Firestore: ${vehicles.length}\n`);

  // Map JSON vehicle_id to Firestore vehicle_id
  // For now, assume the vehicle exists with same ID or use first active vehicle
  let targetVehicleId = vehicles.find(v => v.is_active)?.id;
  if (!targetVehicleId && vehicles.length > 0) {
    targetVehicleId = vehicles[0].id;
  }

  if (!targetVehicleId) {
    console.log('No active vehicle found. Creating a default vehicle...');
    const vehicleRef = await db.collection('users').doc(userId).collection('taxiVehicles').add({
      user_id: userId,
      vehicle_type: 'car',
      name: 'My Taxi',
      plate_number: null,
      is_active: true,
      created_at: new Date().toISOString()
    });
    targetVehicleId = vehicleRef.id;
    console.log(`Created vehicle: ${targetVehicleId}\n`);
  }

  let migrated = 0;
  let skipped = 0;
  let errors = 0;

  for (const exp of jsonData) {
    // Skip if this expense belongs to a different user
    if (exp.user_id !== userId) {
      console.log(`Skipping (wrong user): ${exp.expense_date} - ${exp.expense_type}`);
      continue;
    }

    // Check if already exists
    const key = `${exp.id}|${exp.amount}|${exp.expense_date}`;
    if (existingKeys.has(key)) {
      console.log(`Skipping (duplicate): ${exp.expense_date} - ${exp.expense_type} - MVR ${exp.amount}`);
      skipped++;
      continue;
    }

    try {
      // Create transaction record first (linked to taxi category)
      // Get or create taxi category
      const catsSnap = await db.collection('users').doc(userId).collection('categories')
        .where('name', '==', 'Taxi').limit(1).get();
      
      let taxiCategoryId = null;
      if (!catsSnap.empty) {
        taxiCategoryId = catsSnap.docs[0].id;
      }

      const txRef = await db.collection('users').doc(userId).collection('transactions').add({
        user_id: userId,
        type: 'expense',
        amount: exp.amount,
        description: `Taxi expense - ${exp.expense_type}`,
        notes: exp.notes || `Vehicle expense: ${exp.expense_type}`,
        transaction_date: exp.expense_date,
        category_id: taxiCategoryId,
        income_source_id: null,
        created_at: exp.created_at || new Date().toISOString()
      });

      // Create expense record
      await db.collection('users').doc(userId).collection('taxiVehicleExpenses').add({
        user_id: userId,
        vehicle_id: targetVehicleId,
        expense_date: exp.expense_date,
        expense_type: exp.expense_type,
        amount: exp.amount,
        transaction_id: txRef.id,
        notes: exp.notes,
        created_at: exp.created_at || new Date().toISOString(),
        source_expense_id: exp.id // Keep reference to original
      });

      existingKeys.add(key);
      migrated++;
      console.log(`✅ Migrated: ${exp.expense_date} - ${exp.expense_type} - MVR ${exp.amount}`);
    } catch (e) {
      console.error(`❌ Error migrating ${exp.expense_date}:`, e.message);
      errors++;
    }
  }

  console.log(`\n=== Migration Complete ===`);
  console.log(`Migrated: ${migrated}`);
  console.log(`Skipped (duplicates): ${skipped}`);
  console.log(`Errors: ${errors}`);
  console.log(`\nTotal expenses should now be: ${existing.length + migrated}`);

  // Calculate expected total
  const expectedTotal = jsonData
    .filter(e => e.user_id === userId)
    .reduce((sum, e) => sum + Number(e.amount), 0);
  console.log(`\nExpected total expense amount: MVR ${expectedTotal.toFixed(2)}`);

  process.exit(0);
}

migrateTaxiExpenses().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
