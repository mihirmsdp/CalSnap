import { getApp, getApps, initializeApp } from "firebase/app";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FirebaseAuth from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const requireEnv = (value: string | undefined, key: string): string => {
  if (!value) {
    throw new Error(`Missing env: ${key}`);
  }
  return value;
};

const firebaseConfig = {
  apiKey: requireEnv(process.env.EXPO_PUBLIC_FIREBASE_API_KEY, "EXPO_PUBLIC_FIREBASE_API_KEY"),
  authDomain: requireEnv(
    process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    "EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN"
  ),
  projectId: requireEnv(
    process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    "EXPO_PUBLIC_FIREBASE_PROJECT_ID"
  ),
  storageBucket: requireEnv(
    process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    "EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET"
  ),
  messagingSenderId: requireEnv(
    process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    "EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"
  ),
  appId: requireEnv(process.env.EXPO_PUBLIC_FIREBASE_APP_ID, "EXPO_PUBLIC_FIREBASE_APP_ID")
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const firebaseAuth = (() => {
  const getReactNativePersistence = (
    FirebaseAuth as unknown as {
      getReactNativePersistence?: (storage: unknown) => FirebaseAuth.Persistence;
    }
  ).getReactNativePersistence;

  try {
    if (getReactNativePersistence) {
      return FirebaseAuth.initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage)
      });
    }
    return FirebaseAuth.initializeAuth(app);
  } catch {
    return FirebaseAuth.getAuth(app);
  }
})();
export const firestore = getFirestore(app);
