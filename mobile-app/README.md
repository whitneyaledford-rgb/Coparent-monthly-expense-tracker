# CoParent Monthly Expense Tracker (Mobile)

This folder contains a React Native (Expo) mobile app that implements:

- Native Android-ready app (Expo) with an installable bundle
- Multi-month history
- CSV export of expenses
- Firebase Auth (Email + Google placeholders) and Firestore sync (household sharing)
- Theme: cream background and sage green
- Placeholder for app icon (replace assets/app-icon.png with the attached image)

IMPORTANT: I added Firebase client code with a placeholder config. You must create a Firebase project, enable Authentication (Email + Google), create a Firestore database, then paste your Firebase config into mobile-app/firebaseConfig.js (see the file created).

To run locally:

1. Install dependencies: cd mobile-app && npm install
2. Start Expo: npm run start
3. Open on Android device via Expo Go or build a standalone app.

To prepare production builds: follow Expo docs for building an Android APK/AAB.

Security: Firebase client config is safe to be public but keep server keys and rules secure. Set Firestore rules to restrict household access.
