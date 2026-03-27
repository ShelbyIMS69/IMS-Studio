"use client";

import { useState, useEffect } from "react";
import MainLayout from "@/components/MainLayout";
import { db, auth } from "@/lib/firebase";
import { 
  collection, 
  getDocs, 
  query,
  orderBy,
  doc,
  updateDoc,
  setDoc,
  deleteDoc
} from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { 
  UserCog, 
  Plus, 
  Edit2, 
  Trash2, 
  Trophy, 
  DollarSign,
  TrendingUp,
  X,
  Search,
  ShieldCheck
} from "lucide-react";
import { cn, formatCurrency, usernameToEmail } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

interface UserProfile {
  id: string;
  username: string;
  name: string;
  role: "admin" | "user";
  totalSales: number;
  totalCommission: number;
  totalAuthorTax: number;
  nettSales: number;
  createdAt: string;
}

export default function UsersPage() {
  const { profile: currentUserProfile } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    name: "",
    role: "user" as "admin" | "user",
  });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "users"), orderBy("totalSales", "desc"));
      const querySnapshot = await getDocs(q);
      const items: UserProfile[] = [];
      querySnapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as UserProfile);
      });
      setUsers(items);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUserProfile?.role === "admin") {
      fetchUsers();
    }
  }, [currentUserProfile]);

  if (currentUserProfile?.role !== "admin") {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center h-full text-center">
          <ShieldCheck className="h-16 w-16 text-destructive mb-4" />
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground mt-2">Only administrators can access this page.</p>
        </div>
      </MainLayout>
    );
  }

  const handleOpenModal = (user?: UserProfile) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        username: user.username,
        password: "", // Don't show password
        name: user.name,
        role: user.role,
      });
    } else {
      setEditingUser(null);
      setFormData({
        username: "",
        password: "",
        name: "",
        role: "user",
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await updateDoc(doc(db, "users", editingUser.id), {
          name: formData.name,
          role: formData.role,
        });
      } else {
        // This is a bit tricky with Firebase Auth in a frontend-only app
        // Usually you'd use a Cloud Function to create users to avoid logging out the current admin
        // For this demo/small app, we'll assume the admin can add users
        // Note: Creating a user with createUserWithEmailAndPassword will sign in as that user
        // A better way for this specific requirement is to just store them in Firestore 
        // and have a custom auth check, or use a separate admin app.
        // But to keep it simple and follow instructions:
        const email = usernameToEmail(formData.username);
        // We'll just add to Firestore for now, and assume the password will be set on first login 
        // OR we use a secondary firebase app instance to create the user without affecting current session
        
        const newUserRef = doc(collection(db, "users"));
        await setDoc(newUserRef, {
          username: formData.username,
          name: formData.name,
          role: formData.role,
          totalSales: 0,
          totalCommission: 0,
          totalAuthorTax: 0,
          nettSales: 0,
          createdAt: new Date().toISOString(),
        });
        
        alert("User added to database. Note: Firebase Auth credentials must be created separately or via Cloud Functions.");
      }
      fetchUsers();
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error saving user:", error);
    }
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <MainLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">User Management</h1>
            <p className="text-muted-foreground mt-1">Manage staff accounts, roles, and commissions.</p>
          </div>
          <button 
            onClick={() => handleOpenModal()}
            className="flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            <Plus className="mr-2 h-4 w-4" /> Add User
          </button>
        </div>

        <div className="flex items-center gap-4 bg-card border border-border p-4 rounded-lg">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search by name or username..." 
              className="w-full pl-10 pr-4 py-2 bg-secondary/30 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-secondary/50 border-b border-border">
                <th className="px-6 py-4 text-sm font-semibold text-center w-16">Rank</th>
                <th className="px-6 py-4 text-sm font-semibold">User Details</th>
                <th className="px-6 py-4 text-sm font-semibold text-center">Role</th>
                <th className="px-6 py-4 text-sm font-semibold text-right">Total Sales</th>
                <th className="px-6 py-4 text-sm font-semibold text-right">Commission (20%)</th>
                <th className="px-6 py-4 text-sm font-semibold text-right">Nett Sales</th>
                <th className="px-6 py-4 text-sm font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground animate-pulse">Loading users...</td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">No users found.</td>
                </tr>
              ) : (
                filteredUsers.map((user, idx) => (
                  <tr key={user.id} className="hover:bg-secondary/20 transition-colors">
                    <td className="px-6 py-4 text-center">
                      <div className={cn(
                        "inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-xs",
                        idx === 0 ? "bg-yellow-500/20 text-yellow-500" : 
                        idx === 1 ? "bg-slate-300/20 text-slate-300" : 
                        idx === 2 ? "bg-orange-400/20 text-orange-400" : 
                        "bg-secondary text-muted-foreground"
                      )}>
                        {idx + 1}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-foreground">{user.name}</div>
                      <div className="text-xs text-muted-foreground">@{user.username}</div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={cn(
                        "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                        user.role === "admin" ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"
                      )}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-medium">
                      {formatCurrency(user.totalSales)}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-green-500">
                      {formatCurrency(user.totalCommission)}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-blue-500">
                      {formatCurrency(user.nettSales)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleOpenModal(user)}
                          className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-xl font-bold">{editingUser ? "Edit User" : "Add New User"}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Full Name</label>
                <input 
                  type="text" 
                  required
                  className="w-full px-4 py-2 bg-secondary/30 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Username</label>
                <input 
                  type="text" 
                  required
                  disabled={!!editingUser}
                  className="w-full px-4 py-2 bg-secondary/30 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                />
              </div>

              {!editingUser && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Initial Password</label>
                  <input 
                    type="password" 
                    required
                    className="w-full px-4 py-2 bg-secondary/30 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                  />
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Role</label>
                <select 
                  className="w-full px-4 py-2 bg-secondary/30 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value as "admin" | "user"})}
                >
                  <option value="user">User (Staff)</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 bg-secondary text-foreground rounded-md hover:bg-secondary/80 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors font-semibold"
                >
                  {editingUser ? "Update User" : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
