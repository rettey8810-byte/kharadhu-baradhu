# Migration Status

## Firebase Migration (v2.0.0) - Completed

-### Completed
- Data exported and imported into Firebase
- Firebase project setup
- Firestore security rules created
- Data import script working
- All pages migrated to Firestore
- TypeScript/lint errors fixed
- Firestore rules updated (budgets, taxiVehicleExpenses)
- Taxi page date normalization fixed
- Code pushed to GitHub

### In Progress
- Firestore composite indexes building (required for queries)
- Debugging "Missing or insufficient permissions" errors
- Testing data loading end-to-end

### Pending
- Final verification and QA

## Key Files Changed
- `firebase/firestore.rules` - Security rules
- `src/lib/firebase.ts` - Firebase config
- `src/hooks/useAuth.ts` - Auth hook migrated
- `src/hooks/useProfile.tsx` - Profile hook migrated
- `src/pages/Dashboard.tsx` - Added debug logging
- `src/pages/Taxi.tsx` - Date normalization added

## Firebase Collections Structure
```
users/{uid}/
  - profiles
  - transactions
  - categories
  - incomeSources
  - budgets
  - recurringExpenses
  - recurringIncome
  - billPayments
  - savingsGoals
  - loans
  - taxiVehicles
  - taxiTrips
  - taxiVehicleExpenses
  - groceryHistory
  - settings
  - profileShares
  - profileShareInvitations
```
