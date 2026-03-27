"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  signOut, 
  User as FirebaseUser,
  setPersistence,
  browserLocalPersistence
} from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { usernameToEmail } from "@/lib/utils";

interface UserProfile {
  uid: string;
  username: string;
  role: "admin" | "user";
  name: string;
  totalSales: number;
  totalCommission: number;
  totalAuthorTax: number;
  nettSales: number;
}

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if Firebase config is available
    if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
      setError("Firebase API Key is missing. Please set up your .env.local file or GitHub Secrets.");
      setLoading(false);
      return;
    }

    // Set persistence to local (keeps user logged in on refresh)
    try {
      setPersistence(auth, browserLocalPersistence);

      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        setUser(firebaseUser);
        if (firebaseUser) {
          try {
            // Fetch user profile from Firestore
            const docRef = doc(db, "users", firebaseUser.uid);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
              setProfile(docSnap.data() as UserProfile);
            } else {
              setProfile(null);
            }
          } catch (err: any) {
            console.error("Error fetching profile:", err);
          }
        } else {
          setProfile(null);
        }
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  }, []);

  const login = async (username: string, password: string) => {
    const email = usernameToEmail(username);
    await signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, logout }}>
      {error ? (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4 text-center">
          <div className="bg-destructive/10 border border-destructive/20 p-6 rounded-lg max-w-md">
            <h2 className="text-xl font-bold text-destructive mb-2">Configuration Error</h2>
            <p className="text-muted-foreground text-sm mb-4">{error}</p>
            <p className="text-xs text-muted-foreground">
              Follow the instructions in the README to set up your Firebase environment variables.
            </p>
          </div>
        </div>
      ) : children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
