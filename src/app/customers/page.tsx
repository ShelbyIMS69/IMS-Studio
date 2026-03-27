"use client";

import { useState, useEffect } from "react";
import MainLayout from "@/components/MainLayout";
import { db } from "@/lib/firebase";
import { 
  collection, 
  addDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  doc,
  query,
  orderBy
} from "firebase/firestore";
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Search, 
  Users, 
  X,
  History,
  TrendingUp
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

interface Customer {
  id: string;
  name: string;
  itemsPurchased: string[]; // This will be updated based on invoices
  totalSales: number; // This will be updated based on invoices
  email?: string;
  phone?: string;
  createdAt: any;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
  });

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "customers"), orderBy("name", "asc"));
      const querySnapshot = await getDocs(q);
      const items: Customer[] = [];
      querySnapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as Customer);
      });
      setCustomers(items);
    } catch (error) {
      console.error("Error fetching customers:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleOpenModal = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer);
      setFormData({
        name: customer.name,
        email: customer.email || "",
        phone: customer.phone || "",
      });
    } else {
      setEditingCustomer(null);
      setFormData({
        name: "",
        email: "",
        phone: "",
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCustomer(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCustomer) {
        await updateDoc(doc(db, "customers", editingCustomer.id), {
          ...formData,
        });
      } else {
        await addDoc(collection(db, "customers"), {
          ...formData,
          itemsPurchased: [],
          totalSales: 0,
          createdAt: new Date().toISOString(),
        });
      }
      fetchCustomers();
      handleCloseModal();
    } catch (error) {
      console.error("Error saving customer:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this customer?")) {
      try {
        await deleteDoc(doc(db, "customers", id));
        fetchCustomers();
      } catch (error) {
        console.error("Error deleting customer:", error);
      }
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <MainLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Customers</h1>
            <p className="text-muted-foreground mt-1">Manage your customer relationships and history.</p>
          </div>
          <button 
            onClick={() => handleOpenModal()}
            className="flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            <Plus className="mr-2 h-4 w-4" /> Add Customer
          </button>
        </div>

        <div className="flex items-center gap-4 bg-card border border-border p-4 rounded-lg">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search by customer name..." 
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
                <th className="px-6 py-4 text-sm font-semibold">Customer Name</th>
                <th className="px-6 py-4 text-sm font-semibold">Contact Info</th>
                <th className="px-6 py-4 text-sm font-semibold">Items Purchased</th>
                <th className="px-6 py-4 text-sm font-semibold text-center">Total Sales</th>
                <th className="px-6 py-4 text-sm font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground animate-pulse">Loading customers...</td>
                </tr>
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">No customers found.</td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-secondary/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-foreground">{customer.name}</div>
                      <div className="text-xs text-muted-foreground">Added on {new Date(customer.createdAt).toLocaleDateString()}</div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="text-foreground">{customer.email || "No email"}</div>
                      <div className="text-muted-foreground">{customer.phone || "No phone"}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {customer.itemsPurchased && customer.itemsPurchased.length > 0 ? (
                          customer.itemsPurchased.slice(0, 3).map((item, i) => (
                            <span key={i} className="px-2 py-0.5 bg-secondary/50 rounded text-[10px] text-muted-foreground">
                              {item}
                            </span>
                          ))
                        ) : (
                          <span className="text-muted-foreground text-xs italic">No purchases yet</span>
                        )}
                        {customer.itemsPurchased && customer.itemsPurchased.length > 3 && (
                          <span className="text-[10px] text-muted-foreground">+{customer.itemsPurchased.length - 3} more</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-green-500 font-bold">{formatCurrency(customer.totalSales || 0)}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleOpenModal(customer)}
                          className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(customer.id)}
                          className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
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
              <h2 className="text-xl font-bold">{editingCustomer ? "Edit Customer" : "Add New Customer"}</h2>
              <button onClick={handleCloseModal} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Customer Name</label>
                <input 
                  type="text" 
                  required
                  className="w-full px-4 py-2 bg-secondary/30 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Full Name"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Email Address</label>
                <input 
                  type="email" 
                  className="w-full px-4 py-2 bg-secondary/30 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="customer@example.com"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Phone Number</label>
                <input 
                  type="tel" 
                  className="w-full px-4 py-2 bg-secondary/30 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  placeholder="+1 (555) 000-0000"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2 bg-secondary text-foreground rounded-md hover:bg-secondary/80 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors font-semibold"
                >
                  {editingCustomer ? "Update Customer" : "Create Customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
