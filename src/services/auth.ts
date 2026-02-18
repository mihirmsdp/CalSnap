import {
  EmailAuthProvider,
  GoogleAuthProvider,
  reauthenticateWithCredential,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInAnonymously,
  signInWithCredential,
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
let optimisticGuestUid: string | null = null;
let optimisticGuestExpiresAt = 0;

const resolveProfileIdentity = (input: {
  uid: string;
  email: string | null;
  displayName: string | null;
  isAnonymous?: boolean;
}): { email: string; name?: string } => {
  if (input.email) {
    return { email: input.email, name: input.displayName || undefined };
  }
  if (input.isAnonymous) {
    const suffix = input.uid.slice(0, 6);
    return {
      email: `guest_${suffix}@guest.local`,
      name: `Guest ${suffix}`
    };
  }
  return {
    email: `${input.uid}@user.local`,
    name: input.displayName || undefined
  };
};

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

const buildGuestProfile = (identity: { email: string; name?: string }): ProfileDoc => ({
  email: identity.email,
  name: identity.name || "Guest",
  dailyGoals: defaultGoals,
  onboardingCompleted: false,
  createdAt: new Date().toISOString()
});

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

  async signInWithGoogle(idToken: string): Promise<AuthSession> {
    const credential = GoogleAuthProvider.credential(idToken);
    const signedIn = await signInWithCredential(firebaseAuth, credential);
    const email = signedIn.user.email;
    if (!email) {
      throw new Error("Google account email is unavailable.");
    }
    const user = await getOrCreateProfile(signedIn.user.uid, email, signedIn.user.displayName || undefined);
    const token = await signedIn.user.getIdToken();
    return { token, user };
  },

  async signInAsGuest(): Promise<AuthSession> {
    const credential = await signInAnonymously(firebaseAuth);
    const identity = resolveProfileIdentity({
      uid: credential.user.uid,
      email: credential.user.email,
      displayName: credential.user.displayName,
      isAnonymous: credential.user.isAnonymous
    });
    const guestProfile = buildGuestProfile(identity);
    // Persist in background to avoid blocking guest entry on Firestore latency.
    void setDoc(profileRef(credential.user.uid), guestProfile, { merge: true }).catch(() => undefined);
    // Allow one short optimistic window immediately after explicit guest sign-in.
    optimisticGuestUid = credential.user.uid;
    optimisticGuestExpiresAt = Date.now() + 15000;
    const user = mapProfile(credential.user.uid, guestProfile);
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
    if (!currentUser) {
      return null;
    }
    const identity = resolveProfileIdentity({
      uid: currentUser.uid,
      email: currentUser.email,
      displayName: currentUser.displayName,
      isAnonymous: currentUser.isAnonymous
    });
    const user = await getOrCreateProfile(currentUser.uid, identity.email, identity.name);
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
          if (!firebaseUser) {
            callback(null);
            return;
          }
          const identity = resolveProfileIdentity({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            isAnonymous: firebaseUser.isAnonymous
          });
          if (firebaseUser.isAnonymous) {
            const token = await firebaseUser.getIdToken();
            const canUseOptimisticGuest =
              optimisticGuestUid === firebaseUser.uid && Date.now() < optimisticGuestExpiresAt;

            if (canUseOptimisticGuest) {
              // Fresh guest sign-in should feel instant.
              const optimistic = mapProfile(firebaseUser.uid, buildGuestProfile(identity));
              callback({ token, user: optimistic });
              void getOrCreateProfile(firebaseUser.uid, identity.email, identity.name)
                .then((hydrated) => callback({ token, user: hydrated }))
                .catch(() => undefined);
              optimisticGuestUid = null;
              optimisticGuestExpiresAt = 0;
              return;
            }

            // Returning guest session: load stored profile first to avoid name-screen flicker.
            const hydrated = await getOrCreateProfile(firebaseUser.uid, identity.email, identity.name);
            callback({ token, user: hydrated });
            return;
          }
          const user = await getOrCreateProfile(firebaseUser.uid, identity.email, identity.name);
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

