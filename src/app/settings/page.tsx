"use client";

import { useState, useEffect } from "react";
import MainLayout from "@/components/MainLayout";
import { db } from "@/lib/firebase";
import { 
  collection, 
  getDocs, 
  query,
  doc,
  setDoc,
  deleteDoc,
  addDoc,
  orderBy
} from "firebase/firestore";
import { 
  Settings as SettingsIcon, 
  Plus, 
  Edit2,
  Trash2, 
  Save, 
  Info,
  Package,
  DollarSign,
  ChevronRight,
  ChevronDown,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PRODUCT_VARIATIONS as DEFAULT_VARIATIONS } from "@/lib/constants";

interface VariationItem {
  name: string;
  quantity: number;
}

interface Variation {
  id: string;
  name: string;
  items: VariationItem[];
}

export default function SettingsPage() {
  const [variations, setVariations] = useState<Variation[]>([]);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState("$");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVariation, setEditingVariation] = useState<Variation | null>(null);

  // Form state
  const [newVarName, setNewVarName] = useState("");
  const [newVarItems, setNewVarItems] = useState<VariationItem[]>([{ name: "", quantity: 1 }]);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      // Fetch variations
      const vQuery = query(collection(db, "variations"), orderBy("name", "asc"));
      const vSnapshot = await getDocs(vQuery);
      
      if (vSnapshot.empty) {
        // Initialize with defaults if empty
        const items: Variation[] = [];
        for (const [name, itemsList] of Object.entries(DEFAULT_VARIATIONS)) {
          const docRef = await addDoc(collection(db, "variations"), {
            name,
            items: itemsList
          });
          items.push({ id: docRef.id, name, items: itemsList as VariationItem[] });
        }
        setVariations(items);
      } else {
        const items: Variation[] = [];
        vSnapshot.forEach((doc) => {
          items.push({ id: doc.id, ...doc.data() } as Variation);
        });
        setVariations(items);
      }

      // Fetch general settings (currency etc)
      // For now, just using local state
    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleOpenModal = (variation?: Variation) => {
    if (variation) {
      setEditingVariation(variation);
      setNewVarName(variation.name);
      setNewVarItems(variation.items);
    } else {
      setEditingVariation(null);
      setNewVarName("");
      setNewVarItems([{ name: "", quantity: 1 }]);
    }
    setIsModalOpen(true);
  };

  const handleAddItemRow = () => {
    setNewVarItems([...newVarItems, { name: "", quantity: 1 }]);
  };

  const handleRemoveItemRow = (index: number) => {
    setNewVarItems(newVarItems.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof VariationItem, value: any) => {
    const updated = [...newVarItems];
    updated[index] = { ...updated[index], [field]: value };
    setNewVarItems(updated);
  };

  const handleSaveVariation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVarName || newVarItems.length === 0) return;

    try {
      if (editingVariation) {
        await setDoc(doc(db, "variations", editingVariation.id), {
          name: newVarName,
          items: newVarItems.filter(i => i.name)
        });
      } else {
        await addDoc(collection(db, "variations"), {
          name: newVarName,
          items: newVarItems.filter(i => i.name)
        });
      }
      fetchSettings();
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error saving variation:", error);
    }
  };

  const handleDeleteVariation = async (id: string) => {
    if (confirm("Are you sure you want to delete this variation?")) {
      try {
        await deleteDoc(doc(db, "variations", id));
        fetchSettings();
      } catch (error) {
        console.error("Error deleting variation:", error);
      }
    }
  };

  return (
    <MainLayout>
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-1">Configure your system preferences and business rules.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* General Settings */}
          <div className="lg:col-span-1 space-y-6">
            <div className="p-6 bg-card border border-border rounded-lg shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <SettingsIcon className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">General Settings</h2>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Currency Symbol</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      className="flex-1 px-4 py-2 bg-secondary/30 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                    />
                    <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors">
                      Update
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">This symbol will be used throughout the app.</p>
                </div>

                <div className="pt-4 border-t border-border">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">System Version</span>
                    <span className="text-foreground font-mono">1.0.0-beta</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 bg-card border border-border rounded-lg shadow-sm border-l-4 border-l-blue-500">
              <div className="flex gap-3">
                <Info className="h-5 w-5 text-blue-500 shrink-0" />
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Cloud Sync</h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    All changes are automatically synced to the cloud. Multi-user access is supported based on roles.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Product Variations Management */}
          <div className="lg:col-span-2 space-y-6">
            <div className="p-6 bg-card border border-border rounded-lg shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-semibold">Product Variations</h2>
                </div>
                <button 
                  onClick={() => handleOpenModal()}
                  className="flex items-center px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  <Plus className="mr-1 h-4 w-4" /> Add Variation
                </button>
              </div>

              <div className="space-y-3">
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground animate-pulse">Loading variations...</div>
                ) : variations.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No variations defined yet.</div>
                ) : (
                  variations.map((v) => (
                    <div key={v.id} className="group flex items-center justify-between p-4 bg-secondary/20 border border-border rounded-lg hover:bg-secondary/30 transition-all">
                      <div className="flex-1">
                        <h4 className="font-bold text-foreground flex items-center gap-2">
                          {v.name}
                          <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full uppercase tracking-tighter">
                            {v.items.length} items
                          </span>
                        </h4>
                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                          {v.items.map((item, i) => (
                            <span key={i} className="text-xs text-muted-foreground">
                              {item.name} <span className="text-foreground font-medium">({item.quantity})</span>
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleOpenModal(v)}
                          className="p-2 text-muted-foreground hover:text-foreground hover:bg-card rounded-md transition-colors"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteVariation(v.id)}
                          className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-xl my-8 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-xl font-bold">{editingVariation ? "Edit Variation" : "New Variation"}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveVariation} className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Variation Set Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g., Combat Specialist Bundle"
                  className="w-full px-4 py-2 bg-secondary/30 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  value={newVarName}
                  onChange={(e) => setNewVarName(e.target.value)}
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Included Items</h3>
                  <button 
                    type="button"
                    onClick={handleAddItemRow}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    + Add Product Row
                  </button>
                </div>

                <div className="space-y-2">
                  {newVarItems.map((item, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <input 
                        type="text" 
                        required
                        placeholder="Product Name"
                        className="flex-1 px-4 py-2 bg-secondary/30 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                        value={item.name}
                        onChange={(e) => handleItemChange(idx, "name", e.target.value)}
                      />
                      <input 
                        type="number" 
                        required
                        min="1"
                        placeholder="Qty"
                        className="w-20 px-4 py-2 bg-secondary/30 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(idx, "quantity", parseInt(e.target.value) || 0)}
                      />
                      <button 
                        type="button"
                        onClick={() => handleRemoveItemRow(idx)}
                        className="p-2 text-muted-foreground hover:text-destructive"
                        disabled={newVarItems.length === 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
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
                  {editingVariation ? "Update Variation" : "Create Variation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
