import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  updatePassword,
  signOut as firebaseSignOut
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { firebaseAuth, firestore } from "@/services/firebase";
import { OnboardingData, UserProfile } from "@/types/models";

export interface AuthSession {
  token: string;
  user: UserProfile;
}

const defaultGoals = {
  calories: 2200,
  protein: 140,
  carbs: 250,
  fat: 70
};

interface ProfileDoc {
  email: string;
  name: string;
  avatarUrl?: string;
  age?: number;
  weight?: number;
  height?: number;
  gender?: string;
  dailyGoals: UserProfile["dailyGoals"];
  onboardingCompleted?: boolean;
  onboardingData?: OnboardingData;
  createdAt: string;
}

const usersCollection = "users";

const mapProfile = (uid: string, profile: ProfileDoc): UserProfile => ({
  id: uid,
  email: profile.email,
  name: profile.name,
  avatarUrl: profile.avatarUrl,
  age: profile.age,
  weight: profile.weight,
  height: profile.height,
  gender: profile.gender,
  dailyGoals: profile.dailyGoals || defaultGoals,
  onboardingCompleted: profile.onboardingCompleted || false,
  onboardingData: profile.onboardingData,
  createdAt: profile.createdAt
});

const profileRef = (uid: string) => doc(firestore, usersCollection, uid);

const getOrCreateProfile = async (
  uid: string,
  email: string,
  fallbackName?: string
): Promise<UserProfile> => {
  const ref = profileRef(uid);
  const snapshot = await getDoc(ref);
  if (snapshot.exists()) {
    return mapProfile(uid, snapshot.data() as ProfileDoc);
  }

  const createdProfile: ProfileDoc = {
    email,
    name: fallbackName || email.split("@")[0],
    dailyGoals: defaultGoals,
    onboardingCompleted: false,
    createdAt: new Date().toISOString()
  };
  await setDoc(ref, createdProfile);
  return mapProfile(uid, createdProfile);
};

export const authService = {
  async signUp(email: string, password: string, name: string): Promise<AuthSession> {
    const credential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
    const user = await getOrCreateProfile(credential.user.uid, credential.user.email || email, name);
    const token = await credential.user.getIdToken();
    return { token, user };
  },

  async signIn(email: string, password: string): Promise<AuthSession> {
    const credential = await signInWithEmailAndPassword(firebaseAuth, email, password);
    const user = await getOrCreateProfile(credential.user.uid, credential.user.email || email);
    const token = await credential.user.getIdToken();
    return { token, user };
  },

  async signOut(): Promise<void> {
    await firebaseSignOut(firebaseAuth);
  },

  async recoverPassword(email: string): Promise<void> {
    await sendPasswordResetEmail(firebaseAuth, email);
  },

  async getSession(): Promise<AuthSession | null> {
    const currentUser = firebaseAuth.currentUser;
    if (!currentUser || !currentUser.email) {
      return null;
    }
    const user = await getOrCreateProfile(currentUser.uid, currentUser.email);
    const token = await currentUser.getIdToken();
    return { token, user };
  },

  subscribe(
    callback: (session: AuthSession | null) => void,
    onError?: (error: Error) => void
  ): () => void {
    return onAuthStateChanged(
      firebaseAuth,
      async (firebaseUser) => {
        try {
          if (!firebaseUser || !firebaseUser.email) {
            callback(null);
            return;
          }
          const user = await getOrCreateProfile(firebaseUser.uid, firebaseUser.email);
          const token = await firebaseUser.getIdToken();
          callback({ token, user });
        } catch (error) {
          onError?.(error as Error);
        }
      },
      (error) => onError?.(error as Error)
    );
  },

  async completeOnboarding(userId: string, data: OnboardingData): Promise<UserProfile> {
    const ref = profileRef(userId);
    await setDoc(
      ref,
      {
        age: data.age,
        weight: data.weightKg,
        height: data.heightCm,
        gender: data.gender,
        dailyGoals: {
          calories: data.macroTargets.calories,
          protein: data.macroTargets.protein,
          carbs: data.macroTargets.carbs,
          fat: data.macroTargets.fat
        },
        onboardingCompleted: true,
        onboardingData: data
      } satisfies Partial<ProfileDoc>,
      { merge: true }
    );


    const snapshot = await getDoc(ref);
    if (!snapshot.exists()) {
      throw new Error("Failed to update onboarding profile.");
    }
    return mapProfile(userId, snapshot.data() as ProfileDoc);
  },

  async updateProfile(userId: string, updates: Partial<ProfileDoc>): Promise<UserProfile> {
    const ref = profileRef(userId);
    await setDoc(ref, updates, { merge: true });
    const snapshot = await getDoc(ref);
    if (!snapshot.exists()) {
      throw new Error("Failed to update profile.");
    }
    return mapProfile(userId, snapshot.data() as ProfileDoc);
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    const currentUser = firebaseAuth.currentUser;
    if (!currentUser || !currentUser.email) {
      throw new Error("No active user.");
    }
    const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
    await reauthenticateWithCredential(currentUser, credential);
    await updatePassword(currentUser, newPassword);
  }
};

