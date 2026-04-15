"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { getClientAuth, getClientDb } from "@/lib/firebase";
import type { UserProfile, UserRole } from "@/lib/types";

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  signIn: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const authInstance = getClientAuth();
    const dbInstance = getClientDb();

    const unsubscribe = onAuthStateChanged(authInstance, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const profileDoc = await getDoc(doc(dbInstance, "users", firebaseUser.uid));
          if (profileDoc.exists()) {
            setProfile(profileDoc.data() as UserProfile);
          } else {
            setProfile({
              uid: firebaseUser.uid,
              email: firebaseUser.email || "",
              role: "colaborador" as UserRole,
              nome: firebaseUser.displayName || firebaseUser.email || "",
            });
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
          setProfile({
            uid: firebaseUser.uid,
            email: firebaseUser.email || "",
            role: "colaborador" as UserRole,
            nome: firebaseUser.displayName || firebaseUser.email || "",
          });
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const authInstance = getClientAuth();
    await signInWithEmailAndPassword(authInstance, email, password);
  };

  const signOut = async () => {
    const authInstance = getClientAuth();
    await firebaseSignOut(authInstance);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
