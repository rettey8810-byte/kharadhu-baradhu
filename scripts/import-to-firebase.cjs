/**
 * Import exported data to Firebase Firestore
 * 
 * This script imports all exported JSON data into Firebase Firestore.
 * Run this after setting up Firebase and Firestore security rules.
 * 
 * Prerequisites:
 * 1. Firebase project created
 * 2. Firestore database created
 * 3. Service account key downloaded from Firebase Console
 * 4. Run: npm install firebase-admin
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// ============================================
// CONFIGURATION
// ============================================
// Path to your Firebase service account key JSON file
const SERVICE_ACCOUNT_PATH = './firebase-service-account.json';

// Path to exported data directory
const EXPORT_DIR = '../migration-export-data';

// ============================================

// Initialize Firebase Admin
const serviceAccount = require(SERVICE_ACCOUNT_PATH);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Helper to convert exported timestamps to Firestore timestamps
function convertTimestamp(dateString) {
  if (!dateString) return null;
  return admin.firestore.Timestamp.fromDate(new Date(dateString));
}

// Helper to batch write documents
async function batchWrite(collection, documents, userId = null) {
  const batch = db.batch();
  const collectionRef = db.collection(collection);
  
  documents.forEach((doc, index) => {
    const docId = doc.id || `${collection}_${index}_${Date.now()}`;
    const docRef = collectionRef.doc(docId);
    
    // Convert timestamps and clean data
    const cleanDoc = { ...doc };
    
    // Convert date fields to Firestore timestamps
    ['created_at', 'updated_at', 'transaction_date', 'last_sign_in_at', 
     'next_due_date', 'paid_date', 'occurred_at', 'trip_date', 'last_used_at'].forEach(field => {
      if (cleanDoc[field]) {
        cleanDoc[field] = convertTimestamp(cleanDoc[field]);
      }
    });
    
    // Add userId if provided (for subcollections)
    if (userId) {
      cleanDoc.userId = userId;
    }
    
    // Remove null values
    Object.keys(cleanDoc).forEach(key => {
      if (cleanDoc[key] === null || cleanDoc[key] === undefined) {
        delete cleanDoc[key];
      }
    });
    
    batch.set(docRef, cleanDoc);
  });
  
  await batch.commit();
  console.log(`✅ Imported ${documents.length} documents to ${collection}`);
}

// Import auth users as Firebase Auth users
async function importAuthUsers() {
  console.log('\n📦 Importing Auth Users...');
  
  try {
    const usersData = JSON.parse(fs.readFileSync(path.join(EXPORT_DIR, 'auth_users.json'), 'utf8'));
    
    for (const user of usersData) {
      try {
        // Create user in Firebase Auth
        const userRecord = await admin.auth().createUser({
          uid: user.id,
          email: user.email,
          emailVerified: user.raw_user_meta_data?.email_verified || false,
          password: 'TempPassword123!', // Users will need to reset password
          displayName: user.email.split('@')[0]
        });
        
        // Create user document in Firestore
        await db.collection('users').doc(user.id).set({
          email: user.email,
          createdAt: convertTimestamp(user.created_at),
          lastLoginAt: convertTimestamp(user.last_sign_in_at),
          emailVerified: user.raw_user_meta_data?.email_verified || false,
          migratedFromExport: true,
          migratedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`✅ Created user: ${user.email}`);
      } catch (err) {
        if (err.code === 'auth/email-already-exists') {
          console.log(`⚠️ User already exists: ${user.email}`);
        } else {
          console.error(`❌ Error creating user ${user.email}:`, err.message);
        }
      }
    }
    
    return usersData.length;
  } catch (err) {
    console.error('❌ Error importing auth users:', err.message);
    return 0;
  }
}

// Build profile to user mapping from profile_shares and orphaned profiles
function buildProfileUserMap(authUsers) {
  const map = {};
  
  // First, get mappings from profile_shares
  try {
    const shares = JSON.parse(fs.readFileSync(path.join(EXPORT_DIR, 'profile_shares.json'), 'utf8'));
    shares.forEach(share => {
      if (share.shared_by === share.shared_with) {
        map[share.profile_id] = share.shared_by;
      }
    });
  } catch (err) {
    console.log('⚠️ Could not read profile_shares.json');
  }
  
  // Find faixgasim's user ID
  const faixgasimUser = authUsers.find(u => u.email === 'faixgasim@gmail.com');
  const reteyUser = authUsers.find(u => u.email === 'retey.ay@hotmail.com');
  
  if (faixgasimUser && reteyUser) {
    // Find all unique profile_ids in transactions
    try {
      const transactions = JSON.parse(fs.readFileSync(path.join(EXPORT_DIR, 'transactions.json'), 'utf8'));
      const categories = JSON.parse(fs.readFileSync(path.join(EXPORT_DIR, 'expense_categories.json'), 'utf8'));
      const incomeSources = JSON.parse(fs.readFileSync(path.join(EXPORT_DIR, 'income_sources.json'), 'utf8'));
      
      const allProfileIds = new Set([
        ...transactions.map(t => t.profile_id).filter(Boolean),
        ...categories.map(c => c.profile_id).filter(Boolean),
        ...incomeSources.map(s => s.profile_id).filter(Boolean)
      ]);
      
      // Assign unmapped profiles to faixgasim
      let orphanedCount = 0;
      allProfileIds.forEach(profileId => {
        if (!map[profileId]) {
          // Check if this profile belongs to retey by looking at taxi data
          const hasTaxiData = transactions.some(t => 
            t.profile_id === profileId && 
            (t.description?.includes('Taxi') || t.income_source_id?.includes('c80bbdf7'))
          );
          
          if (hasTaxiData) {
            // This is likely retey's taxi profile
            map[profileId] = reteyUser.id;
          } else {
            // Assign to faixgasim
            map[profileId] = faixgasimUser.id;
            orphanedCount++;
          }
        }
      });
      
      console.log(`📊 Mapped ${orphanedCount} orphaned profiles to faixgasim@gmail.com`);
    } catch (err) {
      console.log('⚠️ Could not process orphaned profiles:', err.message);
    }
  }
  
  return map;
}

// Import user-related data
async function importUserData(userId, profileMap) {
  console.log(`\n📦 Importing data for user: ${userId}`);
  
  const results = {
    transactions: 0,
    categories: 0,
    incomeSources: 0,
    recurringExpenses: 0,
    recurringIncome: 0,
    billPayments: 0,
    savingsGoals: 0,
    loans: 0,
    taxiVehicles: 0,
    taxiTrips: 0,
    taxiExpenses: 0,
    billReminders: 0,
    groceryHistory: 0
  };
  
  // Get all profile IDs belonging to this user
  const userProfileIds = Object.keys(profileMap).filter(pid => profileMap[pid] === userId);
  console.log(`   Profiles for this user: ${userProfileIds.length}`);
  
  // Helper to load and filter data
  const loadUserData = (filename, idField = 'user_id') => {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(EXPORT_DIR, filename), 'utf8'));
      return data.filter(item => {
        // Direct user_id match
        if (item[idField] === userId) return true;
        // Profile_id match
        if (idField === 'profile_id' && userProfileIds.includes(item.profile_id)) return true;
        // For transactions and other profile-linked data
        if (item.profile_id && userProfileIds.includes(item.profile_id)) return true;
        return false;
      });
    } catch (err) {
      return [];
    }
  };
  
  // Import transactions
  const transactions = loadUserData('transactions.json', 'profile_id');
  if (transactions.length > 0) {
    await batchWrite(`users/${userId}/transactions`, transactions, userId);
    results.transactions = transactions.length;
  }
  
  // Import categories
  const categories = loadUserData('expense_categories.json', 'profile_id');
  if (categories.length > 0) {
    await batchWrite(`users/${userId}/categories`, categories, userId);
    results.categories = categories.length;
  }
  
  // Import income sources
  const incomeSources = loadUserData('income_sources.json', 'profile_id');
  if (incomeSources.length > 0) {
    await batchWrite(`users/${userId}/incomeSources`, incomeSources, userId);
    results.incomeSources = incomeSources.length;
  }
  
  // Import recurring expenses
  const recurringExpenses = loadUserData('recurring_expenses.json', 'profile_id');
  if (recurringExpenses.length > 0) {
    await batchWrite(`users/${userId}/recurringExpenses`, recurringExpenses, userId);
    results.recurringExpenses = recurringExpenses.length;
  }
  
  // Import recurring income
  const recurringIncome = loadUserData('recurring_income.json', 'profile_id');
  if (recurringIncome.length > 0) {
    await batchWrite(`users/${userId}/recurringIncome`, recurringIncome, userId);
    results.recurringIncome = recurringIncome.length;
  }
  
  // Import bill payments
  const billPayments = loadUserData('bill_payments.json', 'profile_id');
  if (billPayments.length > 0) {
    await batchWrite(`users/${userId}/billPayments`, billPayments, userId);
    results.billPayments = billPayments.length;
  }
  
  // Import savings goals
  const savingsGoals = loadUserData('savings_goals.json', 'profile_id');
  if (savingsGoals.length > 0) {
    await batchWrite(`users/${userId}/savingsGoals`, savingsGoals, userId);
    results.savingsGoals = savingsGoals.length;
  }
  
  // Import loans
  const loans = loadUserData('loans.json', 'profile_id');
  if (loans.length > 0) {
    await batchWrite(`users/${userId}/loans`, loans, userId);
    results.loans = loans.length;
  }
  
  // Import bill reminders
  const billReminders = loadUserData('bill_reminders.json', 'profile_id');
  if (billReminders.length > 0) {
    await batchWrite(`users/${userId}/billReminders`, billReminders, userId);
    results.billReminders = billReminders.length;
  }
  
  // Import grocery history
  const groceryHistory = loadUserData('grocery_item_history.json', 'user_id');
  if (groceryHistory.length > 0) {
    await batchWrite(`users/${userId}/groceryHistory`, groceryHistory, userId);
    results.groceryHistory = groceryHistory.length;
  }
  
  // Import taxi data
  const taxiVehicles = loadUserData('taxi_vehicles.json', 'user_id');
  if (taxiVehicles.length > 0) {
    await batchWrite(`users/${userId}/taxiVehicles`, taxiVehicles, userId);
    results.taxiVehicles = taxiVehicles.length;
  }
  
  const taxiTrips = loadUserData('taxi_trips.json', 'user_id');
  if (taxiTrips.length > 0) {
    await batchWrite(`users/${userId}/taxiTrips`, taxiTrips, userId);
    results.taxiTrips = taxiTrips.length;
  }
  
  const taxiExpenses = loadUserData('taxi_vehicle_expenses.json', 'user_id');
  if (taxiExpenses.length > 0) {
    await batchWrite(`users/${userId}/taxiExpenses`, taxiExpenses, userId);
    results.taxiExpenses = taxiExpenses.length;
  }
  
  return results;
}

// Import profile shares
async function importProfileShares() {
  console.log('\n📦 Importing Profile Shares...');
  
  try {
    const shares = JSON.parse(fs.readFileSync(path.join(EXPORT_DIR, 'profile_shares.json'), 'utf8'));
    
    for (const share of shares) {
      await db.collection('profileShares').doc(share.id).set({
        ...share,
        createdAt: convertTimestamp(share.created_at)
      });
    }
    
    console.log(`✅ Imported ${shares.length} profile shares`);
    return shares.length;
  } catch (err) {
    console.error('❌ Error importing profile shares:', err.message);
    return 0;
  }
}

// Main migration function
async function migrate() {
  console.log('='.repeat(70));
  console.log('  FIREBASE IMPORT FROM LEGACY EXPORT');
  console.log('='.repeat(70));
  
  // Load auth users to get list of users to migrate
  const authUsers = JSON.parse(fs.readFileSync(path.join(EXPORT_DIR, 'auth_users.json'), 'utf8'));
  console.log(`\nFound ${authUsers.length} users to migrate\n`);
  
  // Build profile to user mapping
  const profileMap = buildProfileUserMap(authUsers);
  console.log(`📊 Found ${Object.keys(profileMap).length} profile mappings\n`);
  
  // Step 1: Create Firebase Auth users
  const usersCreated = await importAuthUsers();
  
  // Step 2: Import data for each user
  const allResults = [];
  for (const user of authUsers) {
    const userResults = await importUserData(user.id, profileMap);
    allResults.push({
      userId: user.id,
      email: user.email,
      ...userResults
    });
  }
  
  // Step 3: Import profile shares
  const sharesImported = await importProfileShares();
  
  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('  IMPORT SUMMARY');
  console.log('='.repeat(70));
  
  console.log(`\n✅ Users created: ${usersCreated}`);
  console.log(`✅ Profile shares: ${sharesImported}`);
  
  allResults.forEach(result => {
    console.log(`\n📧 ${result.email} (${result.userId}):`);
    console.log(`   Transactions: ${result.transactions}`);
    console.log(`   Categories: ${result.categories}`);
    console.log(`   Income Sources: ${result.incomeSources}`);
    console.log(`   Recurring Expenses: ${result.recurringExpenses}`);
    console.log(`   Savings Goals: ${result.savingsGoals}`);
    console.log(`   Loans: ${result.loans}`);
    console.log(`   Taxi Trips: ${result.taxiTrips}`);
  });
  
  console.log('\n' + '='.repeat(70));
  console.log('  MIGRATION COMPLETE');
  console.log('='.repeat(70));
  console.log('\n⚠️  IMPORTANT:');
  console.log('   1. All users have temporary password: TempPassword123!');
  console.log('   2. Users must use "Forgot Password" to reset their password');
  console.log('   3. Test login before switching the app to Firebase');
  console.log('='.repeat(70));
  
  process.exit(0);
}

// Check prerequisites
try {
  require('firebase-admin');
} catch (e) {
  console.error('❌ Missing dependency: firebase-admin');
  console.log('Run: npm install firebase-admin');
  process.exit(1);
}

if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
  console.error('❌ Firebase service account key not found!');
  console.log(`Expected at: ${SERVICE_ACCOUNT_PATH}`);
  console.log('\nGet it from Firebase Console:');
  console.log('1. Project Settings → Service Accounts');
  console.log('2. Click "Generate new private key"');
  console.log('3. Save the JSON file as firebase-service-account.json');
  process.exit(1);
}

if (!fs.existsSync(EXPORT_DIR)) {
  console.error('❌ Export data directory not found!');
  console.log(`Expected at: ${EXPORT_DIR}`);
  console.log('Place the exported JSON/CSV files into the migration-export-data folder and re-run this script.');
  process.exit(1);
}

// Run migration
migrate().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
