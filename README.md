# Food Logging & Nutrition Tracking App

Cross-platform React Native (Expo + TypeScript) app for:
- Authentication flow (email/password + password recovery UI)
- Photo-based food logging with Gemini analysis
- Editable AI review before saving logs
- Daily nutrition dashboard + macro chart
- History search/delete
- Profile + sign out

## Tech Stack
- React Native + TypeScript (Expo)
- React Navigation (stack + tabs)
- React Hook Form
- Expo Image Picker
- Firebase Auth + Firestore
- Node/Express proxy server for Gemini API

## Project Structure
```
src/
  components/
  constants/
  hooks/
  navigation/
  screens/
  services/
  state/
  types/
  utils/
server/
```

## Setup
1. Install app dependencies:
```bash
npm install
```

2. Install API server dependencies:
```bash
cd server
npm install
cd ..
```

3. Copy env file:
```bash
cp .env.example .env
```

4. Configure Firebase project and set these in `.env`:
```bash
EXPO_PUBLIC_API_BASE_URL=http://YOUR_LOCAL_IP:4000
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=
```

5. Set `GEMINI_API_KEY` in `.env`.

6. Start API server:
```bash
cd server
npm run dev
```

7. Start mobile app:
```bash
npm run start
```

## Security Notes
- Gemini API key stays on server (`server/index.js`), never in client code.
- Client sends image data to your backend endpoint only.
- Use Firebase security rules so users only access their own profile/log docs.
- For mobile testing, do not use `localhost` for API base URL. Use your computer LAN IP.

## Firestore Rules (Minimum)
```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /foodLogs/{logId} {
      allow read, delete: if request.auth != null
        && request.auth.uid == resource.data.userId;
      allow create, update: if request.auth != null
        && request.auth.uid == request.resource.data.userId;
    }
  }
}
```
