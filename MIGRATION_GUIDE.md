-# Migration: Legacy Export → Firebase

Migration complete — this repository now uses Firebase (Auth, Firestore, Storage) and Cloudinary for image uploads.

What changed
- Legacy export client code and export scripts were removed.
- Legacy export artifacts and SQL/json exports were deleted from the repo.
- The app now uses `src/lib/firebase.ts` for authentication and Firestore access.

If you need the original legacy export files or migration details, restore from a backup or contact the maintainer.

Notes
- If you see any remaining references to legacy exports, please report them and they will be removed.
