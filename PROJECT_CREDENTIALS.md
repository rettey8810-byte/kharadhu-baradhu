# Project Credentials & Configuration
## Kharadhu Baradhu - Expense Tracker

---

## Firebase Configuration
**Project ID:** kharadhu-baradhu
**Auth Domain:** kharadhu-baradhu.firebaseapp.com

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyCqB-PlsU90mbU3xYb_otuoOPfaa0aiGeA",
  authDomain: "kharadhu-baradhu.firebaseapp.com",
  projectId: "kharadhu-baradhu",
  storageBucket: "kharadhu-baradhu.firebasestorage.app",
  messagingSenderId: "1027497694368",
  appId: "1:1027497694368:web:5803578ad68ddf18bd65c5",
  measurementId: "G-MV93KE9RXY"
};
```

**Firestore Database URL:** https://kharadhu-baradhu.firebaseio.com

### Firestore Collections Structure
- `users/{userId}/transactions`
- `users/{userId}/groceryBills`
- `users/{userId}/groceryBillItems`
- `users/{userId}/taxiVehicles`
- `users/{userId}/taxiTrips`
- `users/{userId}/taxiVehicleExpenses`
- `users/{userId}/loans`
- `users/{userId}/loanPayments`
- `users/{userId}/notifications`
- `users/{userId}/categories`
- `users/{userId}/incomeSources`
- `users/{userId}/profiles`

---

## User Credentials

### Firebase User ID
**User ID:** `a05054eb-23a4-41ea-aaa7-6267f876cac5`

### Service Account
**File:** `firebase-service-account.json` (in scripts/ folder)

---

## GitHub Repository
**Repository:** https://github.com/rettey8810/kharadhu-baradhu
**Branch:** main

---

## Vercel Deployment
**Production URL:** https://kharadhu-baradhu.vercel.app

---

## Data Export Location
**Path:** `c:\Users\maushaz.MADIHAA\Desktop\Rettey\Kharadhu\supabase-export-data\exported_csv\`

### CSV Files
- `grocery_bills_rows.csv` - 24 bills
- `grocery_bill_items_rows.csv` - 87 items
- `grocery_item_history_rows.csv` - Item history
- `transactions_rows.csv` - All transactions
- `expense_profiles_rows.csv` - User profiles
- `bill_payments_rows.csv` - Bill payments
- `bill_reminders_rows.csv` - Bill reminders

---

## Migration Status

### Completed Migrations
✅ **Grocery Bills:** 24 bills loaded from CSV to Firestore  
✅ **Grocery Items:** 29 items migrated (CSV → Firestore)  
✅ **Transactions:** Existing in Firestore  

### Remaining Issues
⚠️ **11 bills have 0 items** - These bills exist in Firestore but have no matching items in CSV:
- Dharavandhoo shop (2026-03-05) - 3 bills
- VB Mart (2026-03-05, 2026-03-07) - 2 bills  
- Ufanveli Shop (2026-02-26) - 1 bill
- S.T.O Dharavandhoo (2026-03-07) - 1 bill
- Dharavandhoo Shop (2026-03-15) - 2 bills
- Nesto (2026-03-07) - 1 bill
- Dharavandhoo Shop (2026-03-07) - 1 bill

**Root Cause:** These bills were created after the CSV export or the CSV is incomplete.

---

## Scripts Created

### Migration Scripts
1. `scripts/migrate-grocery-items.js` - First migration attempt (Client SDK)
2. `scripts/migrate-with-admin.cjs` - Working migration script (Admin SDK)
3. `scripts/diagnose-missing-items.cjs` - Diagnostic tool

### Usage
```bash
# Diagnose missing items
node scripts/diagnose-missing-items.cjs a05054eb-23a4-41ea-aaa7-6267f876cac5

# Run migration (requires firebase-service-account.json)
node scripts/migrate-with-admin.cjs a05054eb-23a4-41ea-aaa7-6267f876cac5
```

---

## Recent Code Changes

### Fixed Issues
1. ✅ **Taxi Statistics:** Removed 30-item limit for accurate totals
2. ✅ **Grocery Bills:** Load all bills (removed profile filter)
3. ✅ **Dashboard:** Exclude deleted transactions from calculations
4. ✅ **Search:** Enhanced item search with shop/price filter
5. ✅ **Price Comparison:** Show cheaper alternatives when adding items

### Files Modified
- `src/pages/Taxi.tsx` - Fixed stats calculation
- `src/pages/GroceryBills.tsx` - Load all bills, added search
- `src/pages/AddTransaction.tsx` - Price comparison, OCR
- `src/pages/Dashboard.tsx` - Handle deleted transactions
- `src/pages/Loans.tsx` - Shared loan payments
- `firebase/firestore.rules` - Security rules for loan payments

---

## Next Steps (If Starting Fresh)

### To Keep:
1. ✅ This credentials file
2. ✅ `firebase-service-account.json` (keep secure!)
3. ✅ CSV export data (`supabase-export-data/`)
4. ✅ GitHub repository

### Can Delete:
- Node modules
- Build artifacts
- Migration scripts (already used)
- Temporary files

### To Rebuild:
```bash
# Fresh install
npm install

# Install additional packages for scripts
npm install firebase-admin csv-parse

# Build
npm run build

# Deploy
vercel --prod
```

---

## Important Notes

### Security
- Keep `firebase-service-account.json` private - never commit to Git!
- User ID is safe to share - it's just an identifier
- API keys in Firebase config are public by design

### Data Backup
- Always backup Firestore before running migrations
- CSV exports are your data backup
- Consider exporting from Firebase Console regularly

---

## Support

For issues:
1. Check Firebase Console: https://console.firebase.google.com/
2. Check Vercel Dashboard: https://vercel.com/dashboard
3. Check GitHub Repository for issues

---

*Last Updated: March 27, 2026*
