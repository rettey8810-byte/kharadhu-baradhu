# Supabase → Firebase Migration Guide

## Overview
This guide helps migrate your Kharadhu Baradhu app from Supabase (90-day expiry) to Firebase (free tier available) with Cloudinary for images.

---

## Phase 1: Data Export (NOW)

### Step 1: Get Your Supabase Service Role Key
1. Go to https://app.supabase.com
2. Select your project
3. Go to **Project Settings** → **API**
4. Copy the **service_role** key (NOT the anon key!)
5. **⚠️ Keep this secret - it has full admin access**

### Step 2: Install Dependencies & Run Export
```bash
cd scripts
npm install @supabase/supabase-js
```

Edit `export-supabase-data.js` and update:
```javascript
const SUPABASE_SERVICE_KEY = 'your-service-role-key-here'
```

Run export:
```bash
node export-supabase-data.js
```

**Output:** All data saved to `supabase-export-data/` folder as JSON files.

---

## Phase 2: Firebase Setup

### Step 1: Create Firebase Project (FREE)
1. Go to https://console.firebase.google.com
2. Click **Add Project**
3. Name: `kharadhu-baradhu`
4. **Disable** Google Analytics (or enable if you want)
5. Create project
6. Upgrade to **Blaze Plan** (pay-as-you-go) - required for Cloud Functions
   - You get $300 free credit initially
   - Small apps run mostly free

### Step 2: Enable Services
In Firebase Console, enable:
1. **Authentication** → Sign-in method → **Email/Password**
2. **Firestore Database** → Create database → Start in test mode
3. **Storage** → Get bucket name for Cloudinary

### Step 3: Get Firebase Config
1. Project Settings → General → Your apps → Web
2. Register app → Copy config object
3. Save for later (will need in React app)

---

## Phase 3: Cloudinary Setup (Images)

### Step 1: Create Account
1. https://cloudinary.com (Free tier: 25GB storage, 25GB bandwidth)
2. Sign up → Get your **Cloud Name**, **API Key**, **API Secret**

### Step 2: Configure Upload Settings
1. Go to Settings → Upload
2. Enable **Unsigned Uploading** (for direct browser uploads)
3. Note the **Upload preset** name

---

## Phase 4: Database Schema (Firestore)

Firestores is NoSQL (document-based). Here's the mapping:

### Collection Structure
```
users/{userId}                    - User profiles (from auth.users + profiles)
users/{userId}/transactions/{id}  - User's transactions (subcollection)
users/{userId}/categories/{id}    - Categories
users/{userId}/incomeSources/{id} - Income sources
users/{userId}/recurringExpenses/{id}
users/{userId}/recurringIncome/{id}
users/{userId}/savingsGoals/{id}
users/{userId}/loans/{id}
users/{userId}/taxiVehicles/{id}
users/{userId}/taxiTrips/{id}
users/{userId}/taxiExpenses/{id}
sharedProfiles/{shareId}          - Profile sharing data
invites/{inviteId}                - Invitation data
groceryHistory/{itemId}          - Grocery autocomplete data
```

### Key Differences from Supabase
| Supabase | Firebase |
|----------|----------|
| SQL tables | Collections/Documents |
| Foreign keys | Document references |
| `auth.users` | Firebase Auth + Firestore `users` doc |
| `uuid` | Auto-generated Firestore IDs |
| `timestamptz` | Firestore Timestamp |
| Row-level security | Firestore security rules |

---

## Phase 5: Data Import Script

Create `scripts/import-to-firebase.js`:

```javascript
const admin = require('firebase-admin')
const fs = require('fs')
const path = require('path')

// Initialize with service account
const serviceAccount = require('./firebase-service-account.json')
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
})

const db = admin.firestore()

async function importCollection(collectionName, jsonFile) {
  const data = JSON.parse(fs.readFileSync(jsonFile, 'utf8'))
  const batch = db.batch()
  
  data.forEach((item, index) => {
    const docRef = db.collection(collectionName).doc(item.id || `${collectionName}_${index}`)
    batch.set(docRef, {
      ...item,
      migratedAt: admin.firestore.FieldValue.serverTimestamp()
    })
  })
  
  await batch.commit()
  console.log(`Imported ${data.length} docs to ${collectionName}`)
}

async function migrate() {
  const exportDir = '../supabase-export-data'
  
  // Import all collections
  await importCollection('users', path.join(exportDir, 'profiles.json'))
  await importCollection('categories', path.join(exportDir, 'categories.json'))
  await importCollection('transactions', path.join(exportDir, 'transactions.json'))
  // ... more imports
  
  console.log('Migration complete!')
}

migrate().catch(console.error)
```

**Prerequisites:**
```bash
npm install firebase-admin
```

Get service account key from Firebase Console → Project Settings → Service Accounts → Generate new private key.

---

## Phase 6: Update React App

### 1. Install Firebase SDK
```bash
npm install firebase
npm install react-firebase-hooks  # Optional helpers
```

### 2. Replace Supabase Client (`src/lib/supabase.ts` → `src/lib/firebase.ts`)

```typescript
import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
```

### 3. Update Auth Hooks (`src/hooks/useAuth.ts`)

Replace Supabase auth with Firebase Auth:
```typescript
import { auth } from '../lib/firebase'
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth'

// Use these instead of supabase.auth.signInWithPassword()
```

### 4. Update All Data Fetching

Replace Supabase queries with Firestore:
```typescript
// OLD (Supabase)
const { data } = await supabase
  .from('transactions')
  .select('*')
  .eq('profile_id', userId)

// NEW (Firestore)
import { collection, query, where, getDocs } from 'firebase/firestore'
const q = query(collection(db, 'transactions'), where('profile_id', '==', userId))
const snapshot = await getDocs(q)
const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
```

---

## Phase 7: Security Rules

Set Firestore security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      match /transactions/{transactionId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
      
      match /categories/{categoryId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
      
      // ... other subcollections
    }
    
    // Shared profiles - check if user is shared with
    match /sharedProfiles/{shareId} {
      allow read: if request.auth != null && 
        (resource.data.owner_id == request.auth.uid || 
         resource.data.shared_with_id == request.auth.uid);
    }
  }
}
```

---

## Phase 8: Testing

### Checklist:
- [ ] User signup/login works
- [ ] Transactions load and save
- [ ] Categories work
- [ ] Profile sharing works
- [ ] Recurring expenses/income work
- [ ] Savings goals work
- [ ] Taxi module works
- [ ] Admin dashboard works
- [ ] Images upload to Cloudinary

---

## Cost Comparison

| Feature | Supabase (Free Tier Limits) | Firebase (Free/Spark) |
|---------|---------------------------|----------------------|
| Database | 500MB, 90 days | 1GB total |
| Auth | 50,000 users/month | 10,000 users/month |
| Storage | 1GB | 5GB |
| Bandwidth | 2GB | 1GB/day |
| Functions | 500K invocations | 125K invocations |
| **Expiry** | **90 days** | **Never** |

---

## Timeline Estimate

| Phase | Time |
|-------|------|
| Data Export | 30 min |
| Firebase Setup | 1 hour |
| Cloudinary Setup | 30 min |
| Import Script | 2 hours |
| Update React App | 8-12 hours |
| Testing | 4 hours |
| **Total** | **2-3 days** |

---

## Need Help?

- Firebase docs: https://firebase.google.com/docs/firestore
- Firestore queries: https://firebase.google.com/docs/firestore/query-data/queries
- Cloudinary upload: https://cloudinary.com/documentation/upload_images
