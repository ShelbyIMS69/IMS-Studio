"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(username, password);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed to login");
    } finally {
      setLoading(false);
    }
  };

  const handleSetupAdmin = async () => {
    setLoading(true);
    try {
      const { setDoc, doc } = await import("firebase/firestore");
      const { db } = await import("@/lib/firebase");
      // This doesn't create the Auth user, only the Firestore profile
      // For this prototype, we'll assume the Auth user is created in Firebase Console
      // or we use a custom collection for auth if we want full autonomy.
      // But the instructions say "Can add user and automated to database"
      await setDoc(doc(db, "users", "admin_init"), {
        username: "PabloShelby",
        name: "Pablo Shelby",
        role: "admin",
        totalSales: 0,
        totalCommission: 0,
        totalAuthorTax: 0,
        nettSales: 0,
        createdAt: new Date().toISOString()
      });
      alert("Admin profile initialized in Firestore. Note: Firebase Auth user 'pabloshelby@ims.local' with password '00000000' must exist.");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="w-full max-w-md p-8 bg-card border border-border rounded-lg shadow-xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-foreground">IMS Studio</h1>
          <p className="mt-2 text-muted-foreground">Sign in to manage your inventory</p>
        </div>

        {error && (
          <div className="mb-4 p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Username</label>
            <input
              type="text"
              required
              className="w-full px-4 py-2 bg-secondary/50 border border-border rounded-md text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Password</label>
            <input
              type="password"
              required
              className="w-full px-4 py-2 bg-secondary/50 border border-border rounded-md text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={cn(
              "w-full py-2 px-4 bg-primary text-primary-foreground font-semibold rounded-md transition-all hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed",
              loading && "animate-pulse"
            )}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="mt-4 pt-4 border-t border-border text-center">
          <button 
            onClick={handleSetupAdmin}
            className="text-xs text-muted-foreground hover:text-primary transition-colors underline"
          >
            First time? Setup Initial Admin (PabloShelby)
          </button>
        </div>

        <div className="mt-6 text-center text-xs text-muted-foreground">
          <p>© 2026 IMS Studio. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
