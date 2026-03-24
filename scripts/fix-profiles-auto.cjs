/**
 * Auto-fix profiles for all users in Firebase Firestore
 * 
 * This script:
 * 1. Finds all profile_ids in each user's data (transactions, categories, loans, etc.)
 * 2. Creates missing profile documents with proper names
 * 3. Updates existing profile names to meaningful values (Personal 1, Family 1, etc.)
 * 
 * Usage: node fix-profiles-auto.cjs
 */

const admin = require('firebase-admin');
const fs = require('fs');

const SERVICE_ACCOUNT_PATH = './firebase-service-account.json';

if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
  console.error('❌ Firebase service account key not found!');
  process.exit(1);
}

const serviceAccount = require(SERVICE_ACCOUNT_PATH);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Profile naming scheme by type
const PROFILE_NAMES = {
  personal: ['Personal', 'My Personal', 'Private', 'My Own'],
  family: ['Family', 'Home', 'Household', 'Family Shared'],
  business: ['Business', 'Work', 'Taxi', 'Side Hustle'],
  other: ['Other', 'Misc', 'General']
};

async function getUsers() {
  const usersSnap = await db.collection('users').get();
  return usersSnap.docs.map(d => ({ uid: d.id, ...d.data() }));
}

async function findProfileIdsInData(uid) {
  const profileData = new Map(); // profile_id -> { sources: [], sampleData: {} }
  
  const addProfileId = (pid, source, sampleData = {}) => {
    if (!pid) return;
    if (!profileData.has(pid)) {
      profileData.set(pid, { sources: new Set(), sampleData });
    }
    profileData.get(pid).sources.add(source);
  };
  
  // Check all collections that might have profile_id
  const collections = [
    'transactions', 'categories', 'incomeSources', 
    'loans', 'recurringExpenses', 'recurringIncome',
    'billPayments', 'savingsGoals', 'taxiTrips'
  ];
  
  for (const coll of collections) {
    try {
      const snap = await db.collection('users').doc(uid).collection(coll).limit(500).get();
      snap.docs.forEach(d => {
        const data = d.data();
        if (data.profile_id) {
          addProfileId(data.profile_id, coll, { 
            type: data.type || data.expense_type || 'unknown',
            description: data.description || data.name || ''
          });
        }
      });
    } catch (e) {
      // Collection might not exist
    }
  }
  
  return profileData;
}

async function getExistingProfiles(uid) {
  const snap = await db.collection('users').doc(uid).collection('profiles').get();
  const profiles = new Map();
  snap.docs.forEach(d => {
    profiles.set(d.id, { id: d.id, ...d.data() });
  });
  return profiles;
}

function guessProfileType(profileId, profileData) {
  const data = profileData.get(profileId);
  if (!data) return 'personal';
  
  const sources = Array.from(data.sources);
  const desc = (data.sampleData.description || '').toLowerCase();
  
  // Check for taxi-related data
  if (sources.includes('taxiTrips') || desc.includes('taxi')) {
    return 'business';
  }
  
  // Check for business/work indicators
  if (desc.includes('business') || desc.includes('work') || desc.includes('office')) {
    return 'business';
  }
  
  // Check for family indicators
  if (desc.includes('family') || desc.includes('home') || desc.includes('house')) {
    return 'family';
  }
  
  return 'personal';
}

async function createMissingProfiles(uid, profileData, existingProfiles) {
  const missingIds = Array.from(profileData.keys()).filter(pid => !existingProfiles.has(pid));
  
  if (missingIds.length === 0) return { created: 0, profiles: existingProfiles };
  
  const batch = db.batch();
  const now = admin.firestore.FieldValue.serverTimestamp();
  
  // Count types for naming
  const typeCounts = { personal: 0, family: 0, business: 0, other: 0 };
  
  missingIds.forEach(pid => {
    const type = guessProfileType(pid, profileData);
    typeCounts[type]++;
    
    const names = PROFILE_NAMES[type] || PROFILE_NAMES.other;
    const nameIndex = (typeCounts[type] - 1) % names.length;
    const name = typeCounts[type] > names.length 
      ? `${names[0]} ${typeCounts[type]}`
      : names[nameIndex];
    
    const profileRef = db.collection('users').doc(uid).collection('profiles').doc(pid);
    batch.set(profileRef, {
      id: pid,
      name: name,
      type: type,
      currency: 'MVR',
      is_active: true,
      created_at: now,
      updated_at: now
    });
    
    existingProfiles.set(pid, { id: pid, name, type });
  });
  
  await batch.commit();
  return { created: missingIds.length, profiles: existingProfiles };
}

async function updateProfileNames(uid, profiles, profileData) {
  const batch = db.batch();
  let updated = 0;
  
  // Group by type for better naming
  const byType = { personal: [], family: [], business: [], other: [] };
  
  profiles.forEach((profile, pid) => {
    const type = profile.type || guessProfileType(pid, profileData);
    if (!byType[type]) byType[type] = [];
    byType[type].push(pid);
  });
  
  // Generate new names
  for (const [type, ids] of Object.entries(byType)) {
    if (ids.length === 0) continue;
    
    const names = PROFILE_NAMES[type] || PROFILE_NAMES.other;
    
    ids.forEach((pid, index) => {
      const profile = profiles.get(pid);
      let newName;
      
      if (ids.length === 1) {
        // Single profile of this type - use simple name
        newName = names[0];
      } else {
        // Multiple profiles - use numbered names
        newName = `${names[0]} ${index + 1}`;
      }
      
      // Only update if name needs changing
      if (profile.name !== newName && !profile.name?.includes(names[0])) {
        const ref = db.collection('users').doc(uid).collection('profiles').doc(pid);
        batch.update(ref, { 
          name: newName,
          type: type,
          updated_at: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`   ✏️  ${pid.slice(0, 12)}...: "${profile.name}" → "${newName}"`);
        updated++;
      }
    });
  }
  
  if (updated > 0) {
    await batch.commit();
  }
  return updated;
}

async function fixUserProfiles(user) {
  console.log(`\n👤 ${user.email}:`);
  
  // Get current state
  const profileData = await findProfileIdsInData(user.uid);
  const existingProfiles = await getExistingProfiles(user.uid);
  
  console.log(`   📊 Found ${profileData.size} profile IDs in data`);
  console.log(`   📁 Existing profiles: ${existingProfiles.size}`);
  
  // Create missing profiles
  const { created, profiles } = await createMissingProfiles(user.uid, profileData, existingProfiles);
  if (created > 0) {
    console.log(`   ✅ Created ${created} missing profile(s)`);
  }
  
  // Update names
  const updated = await updateProfileNames(user.uid, profiles, profileData);
  if (updated > 0) {
    console.log(`   ✅ Updated ${updated} profile name(s)`);
  }
  
  if (created === 0 && updated === 0) {
    console.log('   ℹ️  No changes needed');
  }
  
  // Show final state
  console.log('   📋 Final profiles:');
  profiles.forEach((p, pid) => {
    console.log(`      • ${p.name} (${p.type})`);
  });
}

async function main() {
  console.log('='.repeat(70));
  console.log('  AUTO-FIX PROFILES FOR ALL USERS');
  console.log('='.repeat(70));
  
  const users = await getUsers();
  console.log(`\nFound ${users.length} user(s)`);
  
  for (const user of users) {
    await fixUserProfiles(user);
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('  COMPLETE!');
  console.log('='.repeat(70));
  console.log('\nNext steps:');
  console.log('1. Refresh the app to see updated profile names');
  console.log('2. Both users should now see all their data');
  console.log('='.repeat(70));
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
