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
  Package, 
  ArrowUpRight,
  TrendingUp,
  X
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

interface Product {
  id: string;
  name: string;
  stock: number;
  itemPrice: number;
  stockOut: number;
  description: string;
  totalSales: number;
  status: "active" | "inactive";
  createdAt: any;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    stock: 0,
    itemPrice: 0,
    description: "",
    status: "active" as "active" | "inactive",
  });

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "products"), orderBy("name", "asc"));
      const querySnapshot = await getDocs(q);
      const items: Product[] = [];
      querySnapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as Product);
      });
      setProducts(items);
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleOpenModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        stock: product.stock,
        itemPrice: product.itemPrice,
        description: product.description,
        status: product.status,
      });
    } else {
      setEditingProduct(null);
      setFormData({
        name: "",
        stock: 0,
        itemPrice: 0,
        description: "",
        status: "active",
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingProduct) {
        await updateDoc(doc(db, "products", editingProduct.id), {
          ...formData,
          totalSales: (formData.itemPrice * (editingProduct.stockOut || 0)),
        });
      } else {
        await addDoc(collection(db, "products"), {
          ...formData,
          stockOut: 0,
          totalSales: 0,
          createdAt: new Date().toISOString(),
        });
      }
      fetchProducts();
      handleCloseModal();
    } catch (error) {
      console.error("Error saving product:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this product?")) {
      try {
        await deleteDoc(doc(db, "products", id));
        fetchProducts();
      } catch (error) {
        console.error("Error deleting product:", error);
      }
    }
  };

  const handleAddStock = async (product: Product) => {
    const amount = prompt(`How much stock to add for ${product.name}?`, "1");
    if (amount && !isNaN(parseInt(amount))) {
      try {
        await updateDoc(doc(db, "products", product.id), {
          stock: product.stock + parseInt(amount)
        });
        fetchProducts();
      } catch (error) {
        console.error("Error adding stock:", error);
      }
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <MainLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Products</h1>
            <p className="text-muted-foreground mt-1">Manage your inventory products and stock levels.</p>
          </div>
          <button 
            onClick={() => handleOpenModal()}
            className="flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            <Plus className="mr-2 h-4 w-4" /> Add Product
          </button>
        </div>

        <div className="flex items-center gap-4 bg-card border border-border p-4 rounded-lg">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search products..." 
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
                <th className="px-6 py-4 text-sm font-semibold">Product Name</th>
                <th className="px-6 py-4 text-sm font-semibold text-center">Stock</th>
                <th className="px-6 py-4 text-sm font-semibold text-center">Stock Value</th>
                <th className="px-6 py-4 text-sm font-semibold text-center">Price</th>
                <th className="px-6 py-4 text-sm font-semibold text-center">Stock Out</th>
                <th className="px-6 py-4 text-sm font-semibold text-center">Total Sales</th>
                <th className="px-6 py-4 text-sm font-semibold text-center">Status</th>
                <th className="px-6 py-4 text-sm font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-muted-foreground animate-pulse">Loading products...</td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-muted-foreground">No products found.</td>
                </tr>
              ) : (
                filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-secondary/20 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-medium text-foreground">{product.name}</div>
                      <div className="text-xs text-muted-foreground truncate max-w-xs">{product.description}</div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span className={cn(
                          "px-2 py-0.5 rounded text-xs font-medium",
                          product.stock <= 5 ? "bg-red-500/10 text-red-500" : "bg-green-500/10 text-green-500"
                        )}>
                          {product.stock}
                        </span>
                        <button 
                          onClick={() => handleAddStock(product)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-primary hover:bg-primary/10 rounded transition-all"
                          title="Add Stock"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center text-sm font-medium">
                      {formatCurrency(product.stock * product.itemPrice)}
                    </td>
                    <td className="px-6 py-4 text-center text-sm font-medium">
                      {formatCurrency(product.itemPrice)}
                    </td>
                    <td className="px-6 py-4 text-center text-sm">
                      <span className="text-orange-500 font-medium">{product.stockOut || 0}</span>
                    </td>
                    <td className="px-6 py-4 text-center text-sm">
                      <span className="text-green-500 font-bold">{formatCurrency(product.totalSales || 0)}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={cn(
                        "inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                        product.status === "active" ? "bg-green-500/10 text-green-500" : "bg-muted text-muted-foreground"
                      )}>
                        {product.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleOpenModal(product)}
                          className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(product.id)}
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
              <h2 className="text-xl font-bold">{editingProduct ? "Edit Product" : "Add New Product"}</h2>
              <button onClick={handleCloseModal} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Product Name</label>
                <input 
                  type="text" 
                  required
                  className="w-full px-4 py-2 bg-secondary/30 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Stock</label>
                  <input 
                    type="number" 
                    required
                    min="0"
                    className="w-full px-4 py-2 bg-secondary/30 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    value={formData.stock}
                    onChange={(e) => setFormData({...formData, stock: parseInt(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Item Price</label>
                  <input 
                    type="number" 
                    required
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-2 bg-secondary/30 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    value={formData.itemPrice}
                    onChange={(e) => setFormData({...formData, itemPrice: parseFloat(e.target.value)})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Description</label>
                <textarea 
                  rows={3}
                  className="w-full px-4 py-2 bg-secondary/30 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Status</label>
                <select 
                  className="w-full px-4 py-2 bg-secondary/30 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value as "active" | "inactive"})}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
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
                  {editingProduct ? "Update Product" : "Create Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
