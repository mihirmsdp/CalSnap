import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { authService } from "@/services/auth";
import { OnboardingData, UserProfile } from "@/types/models";

interface AuthContextValue {
  user: UserProfile | null;
  token: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: (idToken: string) => Promise<void>;
  signInAsGuest: () => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
  recoverPassword: (email: string) => Promise<void>;
  completeOnboarding: (data: OnboardingData) => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }): React.JSX.Element => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = authService.subscribe(
      (session) => {
        setUser(session?.user || null);
        setToken(session?.token || null);
        setLoading(false);
      },
      () => {
        setUser(null);
        setToken(null);
        setLoading(false);
      }
    );
    void authService.getSession().then((session) => {
      if (session) {
        setUser(session.user);
        setToken(session.token);
      }
    });
    return unsubscribe;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      loading,
      signIn: async (email, password) => {
        const session = await authService.signIn(email, password);
        setUser(session.user);
        setToken(session.token);
      },
      signInWithGoogle: async (idToken) => {
        const session = await authService.signInWithGoogle(idToken);
        setUser(session.user);
        setToken(session.token);
      },
      signInAsGuest: async () => {
        const session = await authService.signInAsGuest();
        setUser(session.user);
        setToken(session.token);
      },
      signUp: async (email, password, name) => {
        const session = await authService.signUp(email, password, name);
        setUser(session.user);
        setToken(session.token);
      },
      signOut: async () => {
        await authService.signOut();
        setUser(null);
        setToken(null);
      },
      recoverPassword: authService.recoverPassword
      ,
      completeOnboarding: async (data) => {
        if (!user) {
          throw new Error("No active user.");
        }
        const updated = await authService.completeOnboarding(user.id, data);
        setUser(updated);
      },
      updateProfile: async (updates) => {
        if (!user) {
          throw new Error("No active user.");
        }

        const payload = {
          name: updates.name,
          avatarUrl: updates.avatarUrl,
          age: updates.age,
          height: updates.height,
          weight: updates.weight,
          gender: updates.gender,
          dailyGoals: updates.dailyGoals,
          onboardingData: updates.onboardingData
        };

        const sanitized = Object.fromEntries(
          Object.entries(payload).filter(([, value]) => value !== undefined)
        );

        const updated = await authService.updateProfile(user.id, sanitized);
        setUser(updated);
      },
      changePassword: async (currentPassword, newPassword) => {
        await authService.changePassword(currentPassword, newPassword);
      }
    }),
    [loading, token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
