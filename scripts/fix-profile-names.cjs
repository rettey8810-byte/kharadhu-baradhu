/**
 * Fix profile names in Firebase Firestore
 * 
 * This script updates auto-generated profile names to proper names.
 * Run this after the migration to fix profile names like "Profile a1b2c3".
 * 
 * Usage:
 * 1. Ensure firebase-service-account.json exists
 * 2. Run: node fix-profile-names.cjs
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const SERVICE_ACCOUNT_PATH = './firebase-service-account.json';

if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
  console.error('❌ Firebase service account key not found!');
  console.log('Get it from Firebase Console → Project Settings → Service Accounts');
  process.exit(1);
}

const serviceAccount = require(SERVICE_ACCOUNT_PATH);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Map of user emails to their profile name mappings
// Format: { 'profile_id': 'Desired Profile Name' }
const PROFILE_NAME_OVERRIDES = {
  // faixgasim@gmail.com profiles
  'faixgasim@gmail.com': {
    // Add profile IDs and their correct names here
    // Example: 'abc123': 'Personal',
    //          'def456': 'Business',
  },
  // retey.ay@hotmail.com profiles  
  'retey.ay@hotmail.com': {
    // Add profile IDs and their correct names here
  }
};

async function listCurrentProfiles() {
  console.log('\n📋 Current Profiles in Firebase:\n');
  
  const usersSnap = await db.collection('users').get();
  
  for (const userDoc of usersSnap.docs) {
    const uid = userDoc.id;
    const userData = userDoc.data();
    const email = userData.email || 'unknown';
    
    console.log(`\n👤 ${email} (${uid}):`);
    
    const profilesSnap = await db.collection('users').doc(uid).collection('profiles').get();
    
    if (profilesSnap.empty) {
      console.log('   No profiles found');
      continue;
    }
    
    profilesSnap.docs.forEach(profileDoc => {
      const profile = profileDoc.data();
      console.log(`   - ID: ${profileDoc.id}`);
      console.log(`     Name: ${profile.name}`);
      console.log(`     Type: ${profile.type || 'personal'}`);
      console.log(`     Active: ${profile.is_active}`);
    });
  }
}

async function updateProfileNames() {
  console.log('\n📝 Updating Profile Names...\n');
  
  const usersSnap = await db.collection('users').get();
  
  for (const userDoc of usersSnap.docs) {
    const uid = userDoc.id;
    const userData = userDoc.data();
    const email = userData.email || 'unknown';
    
    const overrides = PROFILE_NAME_OVERRIDES[email];
    if (!overrides || Object.keys(overrides).length === 0) {
      console.log(`⚠️  No overrides defined for ${email}, skipping...`);
      continue;
    }
    
    console.log(`\n👤 Updating profiles for ${email}:`);
    
    const profilesSnap = await db.collection('users').doc(uid).collection('profiles').get();
    
    const batch = db.batch();
    let updateCount = 0;
    
    profilesSnap.docs.forEach(profileDoc => {
      const profileId = profileDoc.id;
      const newName = overrides[profileId];
      
      if (newName) {
        const profileRef = db.collection('users').doc(uid).collection('profiles').doc(profileId);
        batch.update(profileRef, { 
          name: newName,
          updated_at: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`   ✏️  ${profileId}: "${profileDoc.data().name}" → "${newName}"`);
        updateCount++;
      } else {
        console.log(`   ⚠️  ${profileId}: "${profileDoc.data().name}" (no override defined)`);
      }
    });
    
    if (updateCount > 0) {
      await batch.commit();
      console.log(`   ✅ Updated ${updateCount} profile(s)`);
    } else {
      console.log(`   ℹ️  No profiles to update`);
    }
  }
}

async function interactiveMode() {
  console.log('='.repeat(70));
  console.log('  FIX PROFILE NAMES');
  console.log('='.repeat(70));
  
  // First, list all current profiles
  await listCurrentProfiles();
  
  console.log('\n' + '='.repeat(70));
  console.log('  INSTRUCTIONS');
  console.log('='.repeat(70));
  console.log('\nTo fix profile names:');
  console.log('1. Edit this script (fix-profile-names.cjs)');
  console.log('2. Update PROFILE_NAME_OVERRIDES with the correct names:');
  console.log(`
   const PROFILE_NAME_OVERRIDES = {
     'faixgasim@gmail.com': {
       'profile-id-1': 'Personal',
       'profile-id-2': 'Business',
     },
     'retey.ay@hotmail.com': {
       'profile-id-3': 'Taxi',
     }
   };
  `);
  console.log('3. Run this script again');
  console.log('\nOr you can manually update profile names in Firebase Console:');
  console.log('https://console.firebase.google.com/project/kharadhu-baradhu/firestore/data');
  console.log('='.repeat(70));
}

// Run
interactiveMode().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
