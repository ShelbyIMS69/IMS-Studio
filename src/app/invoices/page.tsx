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
  orderBy,
  increment,
  writeBatch,
  where,
  getDoc
} from "firebase/firestore";
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Search, 
  X,
  FileText,
  Download,
  Eye,
  CheckSquare,
  Square,
  ChevronDown,
  Trash
} from "lucide-react";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { PRODUCT_VARIATIONS } from "@/lib/constants";
import { useAuth } from "@/context/AuthContext";
import * as XLSX from "xlsx";

interface LineItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  description: string;
  serialNumber: string;
  total: number;
}

interface Invoice {
  id: string;
  invoiceNo: string;
  customerId: string;
  customerName: string;
  items: LineItem[];
  subtotal: number;
  taxPercent: number;
  taxAmount: number;
  totalAmount: number;
  isDME: boolean;
  status: "draft" | "paid" | "cancelled";
  createdBy: string;
  createdByName: string;
  createdAt: string;
}

interface Product {
  id: string;
  name: string;
  itemPrice: number;
  stock: number;
  description: string;
}

interface Customer {
  id: string;
  name: string;
}

interface Variation {
  id: string;
  name: string;
  items: { name: string; quantity: number }[];
}

export default function InvoicesPage() {
  const { profile, user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [variations, setVariations] = useState<Variation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);

  // Form state
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedCustomerName, setSelectedCustomerName] = useState("");
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [showCustomerResults, setShowCustomerResults] = useState(false);
  const [isAddCustomerModalOpen, setIsAddCustomerModalOpen] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [taxPercent, setTaxPercent] = useState(0);
  const [isDME, setIsDME] = useState(false);
  const [isVariationEnabled, setIsVariationEnabled] = useState(false);
  const [selectedVariation, setSelectedVariation] = useState("");

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "invoices"), orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      const items: Invoice[] = [];
      querySnapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as Invoice);
      });
      setInvoices(items);
    } catch (error) {
      console.error("Error fetching invoices:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    const q = query(collection(db, "products"), where("status", "==", "active"));
    const querySnapshot = await getDocs(q);
    const items: Product[] = [];
    querySnapshot.forEach((doc) => {
      items.push({ id: doc.id, ...doc.data() } as Product);
    });
    setProducts(items);
  };

  const fetchCustomers = async () => {
    const q = query(collection(db, "customers"), orderBy("name", "asc"));
    const querySnapshot = await getDocs(q);
    const items: Customer[] = [];
    querySnapshot.forEach((doc) => {
      items.push({ id: doc.id, ...doc.data() } as Customer);
    });
    setCustomers(items);
  };

  const fetchVariations = async () => {
    const q = query(collection(db, "variations"), orderBy("name", "asc"));
    const querySnapshot = await getDocs(q);
    const items: Variation[] = [];
    querySnapshot.forEach((doc) => {
      items.push({ id: doc.id, ...doc.data() } as Variation);
    });
    setVariations(items);
  };

  useEffect(() => {
    fetchInvoices();
    fetchProducts();
    fetchCustomers();
    fetchVariations();
  }, []);

  const calculateTotals = (items: LineItem[], dme: boolean, tax: number) => {
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    let totalAmount = subtotal;
    
    if (dme) {
      totalAmount = subtotal * 0.2; // Subtotal minus 80% = 20% of subtotal
    }
    
    const taxAmount = (totalAmount * tax) / 100;
    totalAmount += taxAmount;

    return { subtotal, taxAmount, totalAmount };
  };

  const handleAddLineItem = (product?: Product) => {
    const newItem: LineItem = {
      productId: product?.id || "",
      productName: product?.name || "",
      quantity: 1,
      unitPrice: product?.itemPrice || 0,
      description: product?.description || "",
      serialNumber: "",
      total: product?.itemPrice || 0,
    };
    setLineItems([...lineItems, newItem]);
  };

  const handleRemoveLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const handleLineItemChange = (index: number, field: keyof LineItem, value: any) => {
    const updatedItems = [...lineItems];
    const item = { ...updatedItems[index], [field]: value };
    
    if (field === "quantity" || field === "unitPrice") {
      item.total = item.quantity * item.unitPrice;
    }
    
    if (field === "productId") {
      const product = products.find(p => p.id === value);
      if (product) {
        item.productName = product.name;
        item.unitPrice = product.itemPrice;
        item.description = product.description;
        item.total = item.quantity * item.unitPrice;
      }
    }

    updatedItems[index] = item;
    setLineItems(updatedItems);
  };

  const handleVariationChange = (variationId: string) => {
    setSelectedVariation(variationId);
    if (!variationId) return;

    const variation = variations.find(v => v.id === variationId);
    if (!variation) return;

    const newItems: LineItem[] = variation.items.map(v => {
      const product = products.find(p => p.name === v.name);
      return {
        productId: product?.id || "",
        productName: v.name,
        quantity: v.quantity,
        unitPrice: product?.itemPrice || 0,
        description: product?.description || "",
        serialNumber: "",
        total: (product?.itemPrice || 0) * v.quantity,
      };
    });

    setLineItems(newItems);
  };

  const handleOpenModal = (invoice?: Invoice) => {
    if (invoice) {
      setEditingInvoice(invoice);
      setSelectedCustomerId(invoice.customerId);
      setSelectedCustomerName(invoice.customerName);
      setLineItems(invoice.items);
      setTaxPercent(invoice.taxPercent);
      setIsDME(invoice.isDME);
    } else {
      setEditingInvoice(null);
      setSelectedCustomerId("");
      setSelectedCustomerName("");
      setLineItems([]);
      setTaxPercent(0);
      setIsDME(false);
      setIsVariationEnabled(false);
      setSelectedVariation("");
    }
    setIsModalOpen(true);
  };

  const handleAddQuickCustomer = async () => {
    if (!newCustomerName) return;
    try {
      const docRef = await addDoc(collection(db, "customers"), {
        name: newCustomerName,
        itemsPurchased: [],
        totalSales: 0,
        createdAt: new Date().toISOString(),
      });
      fetchCustomers();
      setSelectedCustomerId(docRef.id);
      setSelectedCustomerName(newCustomerName);
      setCustomerSearchQuery(newCustomerName);
      setIsAddCustomerModalOpen(false);
      setNewCustomerName("");
    } catch (error) {
      console.error("Error adding quick customer:", error);
    }
  };

  const filteredCustomersForSelect = customers.filter(c => 
    c.name.toLowerCase().includes(customerSearchQuery.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId || lineItems.length === 0) {
      alert("Please select a customer and add at least one item.");
      return;
    }

    const { subtotal, taxAmount, totalAmount } = calculateTotals(lineItems, isDME, taxPercent);

    try {
      const batch = writeBatch(db);
      const invoiceData = {
        invoiceNo: editingInvoice?.invoiceNo || `INV-${Date.now()}`,
        customerId: selectedCustomerId,
        customerName: selectedCustomerName,
        items: lineItems,
        subtotal,
        taxPercent,
        taxAmount,
        totalAmount,
        isDME,
        status: "paid",
        createdBy: user?.uid,
        createdByName: profile?.name || "Admin",
        createdAt: editingInvoice?.createdAt || new Date().toISOString(),
      };

      if (editingInvoice) {
        batch.set(doc(db, "invoices", editingInvoice.id), invoiceData);
      } else {
        const newInvoiceRef = doc(collection(db, "invoices"));
        batch.set(newInvoiceRef, invoiceData);

        // Update product stock and sales
        lineItems.forEach(item => {
          if (item.productId) {
            const productRef = doc(db, "products", item.productId);
            batch.update(productRef, {
              stock: increment(-item.quantity),
              stockOut: increment(item.quantity),
              totalSales: increment(item.total)
            });
          }
        });

        // Update customer total sales and items purchased
        const customerRef = doc(db, "customers", selectedCustomerId);
        batch.update(customerRef, {
          totalSales: increment(totalAmount),
          itemsPurchased: Array.from(new Set([...(lineItems.map(i => i.productName))]))
        });

        // Update user stats
        if (user) {
          const userRef = doc(db, "users", user.uid);
          const commission = totalAmount * 0.2;
          const authorTax = totalAmount * 0.2;
          const nettSales = totalAmount - (commission + authorTax);
          
          batch.update(userRef, {
            totalSales: increment(totalAmount),
            totalCommission: increment(commission),
            totalAuthorTax: increment(authorTax),
            nettSales: increment(nettSales)
          });
        }

        // Add to Serial Number Tracking if applicable
        lineItems.forEach(item => {
          if (item.serialNumber) {
            const serialRef = doc(collection(db, "serial_tracking"));
            batch.set(serialRef, {
              customerName: selectedCustomerName,
              weaponType: item.productName,
              serialNumber: item.serialNumber,
              date: new Date().toISOString(),
              salesperson: profile?.name || "Admin",
              invoiceNo: invoiceData.invoiceNo
            });
          }
        });
      }

      await batch.commit();
      fetchInvoices();
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error saving invoice:", error);
    }
  };

  const handleDownloadDatasheet = () => {
    const data = invoices.map(inv => ({
      "Invoice No": inv.invoiceNo,
      "Date": formatDate(inv.createdAt),
      "Customer": inv.customerName,
      "Subtotal": inv.subtotal,
      "Tax %": inv.taxPercent,
      "Total": inv.totalAmount,
      "DME": inv.isDME ? "Yes" : "No",
      "Created By": inv.createdByName
    }));
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Invoices");
    XLSX.writeFile(wb, `Invoices_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const filteredInvoices = invoices.filter(inv => 
    inv.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.invoiceNo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const { subtotal, taxAmount, totalAmount } = calculateTotals(lineItems, isDME, taxPercent);

  return (
    <MainLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Invoices</h1>
            <p className="text-muted-foreground mt-1">Manage billing and sales transactions.</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={handleDownloadDatasheet}
              className="flex items-center px-4 py-2 bg-secondary text-foreground rounded-md hover:bg-secondary/80 transition-colors"
            >
              <Download className="mr-2 h-4 w-4" /> Download Datasheet
            </button>
            <button 
              onClick={() => handleOpenModal()}
              className="flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              <Plus className="mr-2 h-4 w-4" /> Create Invoice
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-card border border-border p-4 rounded-lg">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search by customer name or invoice number..." 
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
                <th className="px-6 py-4 text-sm font-semibold">Date & Time</th>
                <th className="px-6 py-4 text-sm font-semibold">Invoice No</th>
                <th className="px-6 py-4 text-sm font-semibold">Customer</th>
                <th className="px-6 py-4 text-sm font-semibold text-center">Amount</th>
                <th className="px-6 py-4 text-sm font-semibold text-center">DME</th>
                <th className="px-6 py-4 text-sm font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground animate-pulse">Loading invoices...</td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">No invoices found.</td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-secondary/20 transition-colors">
                    <td className="px-6 py-4 text-sm">
                      {formatDate(inv.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-sm font-mono font-medium">
                      {inv.invoiceNo}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">
                      {inv.customerName}
                    </td>
                    <td className="px-6 py-4 text-center text-sm font-bold text-green-500">
                      {formatCurrency(inv.totalAmount)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {inv.isDME ? (
                        <span className="px-2 py-0.5 bg-purple-500/10 text-purple-500 text-[10px] font-bold uppercase rounded">DME</span>
                      ) : (
                        <span className="text-muted-foreground text-[10px]">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => { setViewingInvoice(inv); setIsViewModalOpen(true); }}
                          className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleOpenModal(inv)}
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

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-4xl my-8 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-xl font-bold">{editingInvoice ? "Edit Invoice" : "Create New Invoice"}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 relative">
                  <label className="text-sm font-medium text-foreground">Customer</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input 
                      type="text" 
                      placeholder="Search customer..." 
                      className="w-full pl-10 pr-4 py-2 bg-secondary/30 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                      value={customerSearchQuery}
                      onChange={(e) => {
                        setCustomerSearchQuery(e.target.value);
                        setShowCustomerResults(true);
                      }}
                      onFocus={() => setShowCustomerResults(true)}
                    />
                    {showCustomerResults && (customerSearchQuery || filteredCustomersForSelect.length > 0) && (
                      <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
                        {filteredCustomersForSelect.map(c => (
                          <button
                            key={c.id}
                            type="button"
                            className="w-full px-4 py-2 text-left text-sm hover:bg-secondary/50 transition-colors"
                            onClick={() => {
                              setSelectedCustomerId(c.id);
                              setSelectedCustomerName(c.name);
                              setCustomerSearchQuery(c.name);
                              setShowCustomerResults(false);
                            }}
                          >
                            {c.name}
                          </button>
                        ))}
                        {filteredCustomersForSelect.length === 0 && (
                          <div className="px-4 py-2 text-sm text-muted-foreground">No customers found.</div>
                        )}
                      </div>
                    )}
                  </div>
                  <button 
                    type="button"
                    onClick={() => setIsAddCustomerModalOpen(true)}
                    className="text-xs font-medium text-primary hover:underline flex items-center"
                  >
                    <Plus className="mr-1 h-3 w-3" /> Add New Customer
                  </button>
                </div>

                <div className="flex items-end gap-3">
                  <div className="flex items-center gap-2 h-10 px-4 bg-secondary/30 border border-border rounded-md">
                    <button 
                      type="button"
                      onClick={() => setIsVariationEnabled(!isVariationEnabled)}
                      className="text-primary focus:outline-none"
                    >
                      {isVariationEnabled ? <CheckSquare className="h-5 w-5" /> : <Square className="h-5 w-5" />}
                    </button>
                    <span className="text-sm text-foreground">Use Variation Set</span>
                  </div>
                  
                  {isVariationEnabled && (
                    <select 
                      className="flex-1 h-10 px-4 bg-secondary/30 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                      value={selectedVariation}
                      onChange={(e) => handleVariationChange(e.target.value)}
                    >
                      <option value="">Select Variation...</option>
                      {variations.map(v => (
                        <option key={v.id} value={v.id}>{v.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Line Items</h3>
                  <button 
                    type="button"
                    onClick={() => handleAddLineItem()}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    + Add Custom Item
                  </button>
                </div>

                <div className="border border-border rounded-lg overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-secondary/30 border-b border-border">
                      <tr>
                        <th className="px-4 py-2 font-semibold">Product</th>
                        <th className="px-4 py-2 font-semibold w-20 text-center">Qty</th>
                        <th className="px-4 py-2 font-semibold w-32">Unit Price</th>
                        <th className="px-4 py-2 font-semibold">Serial Number</th>
                        <th className="px-4 py-2 font-semibold w-32 text-right">Total</th>
                        <th className="px-4 py-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {lineItems.map((item, idx) => (
                        <tr key={idx}>
                          <td className="px-4 py-2">
                            <select 
                              className="w-full bg-transparent border-none focus:ring-0 p-0 text-sm"
                              value={item.productId}
                              onChange={(e) => handleLineItemChange(idx, "productId", e.target.value)}
                            >
                              <option value="">Select Product...</option>
                              {products.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-2">
                            <input 
                              type="number" 
                              className="w-full bg-transparent border-none text-center focus:ring-0 p-0 text-sm"
                              value={item.quantity}
                              onChange={(e) => handleLineItemChange(idx, "quantity", parseInt(e.target.value) || 0)}
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input 
                              type="number" 
                              className="w-full bg-transparent border-none focus:ring-0 p-0 text-sm"
                              value={item.unitPrice}
                              onChange={(e) => handleLineItemChange(idx, "unitPrice", parseFloat(e.target.value) || 0)}
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input 
                              type="text" 
                              placeholder="Optional"
                              className="w-full bg-transparent border-none focus:ring-0 p-0 text-sm"
                              value={item.serialNumber}
                              onChange={(e) => handleLineItemChange(idx, "serialNumber", e.target.value)}
                            />
                          </td>
                          <td className="px-4 py-2 text-right font-medium">
                            {formatCurrency(item.total)}
                          </td>
                          <td className="px-4 py-2">
                            <button 
                              type="button"
                              onClick={() => handleRemoveLineItem(idx)}
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <Trash className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex flex-col md:flex-row justify-between gap-6 pt-6 border-t border-border">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <button 
                      type="button"
                      onClick={() => setIsDME(!isDME)}
                      className="text-primary focus:outline-none"
                    >
                      {isDME ? <CheckSquare className="h-5 w-5" /> : <Square className="h-5 w-5" />}
                    </button>
                    <div>
                      <span className="text-sm font-medium text-foreground">Dirty Money Exchange (DME)</span>
                      <p className="text-xs text-muted-foreground">Applies 80% discount to subtotal</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Tax Amount (%)</label>
                    <input 
                      type="number" 
                      className="w-32 px-4 py-2 bg-secondary/30 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                      value={taxPercent}
                      onChange={(e) => setTaxPercent(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>

                <div className="w-full md:w-64 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="text-foreground">{formatCurrency(subtotal)}</span>
                  </div>
                  {isDME && (
                    <div className="flex justify-between text-sm text-purple-500 font-medium">
                      <span>DME Adjustment (-80%)</span>
                      <span>-{formatCurrency(subtotal * 0.8)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tax ({taxPercent}%)</span>
                    <span className="text-foreground">{formatCurrency(taxAmount)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t border-border pt-2 mt-2">
                    <span>Total</span>
                    <span className="text-primary">{formatCurrency(totalAmount)}</span>
                  </div>
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
                  {editingInvoice ? "Update Invoice" : "Finalize & Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Modal */}
      {isViewModalOpen && viewingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-xl font-bold font-mono">{viewingInvoice.invoiceNo}</h2>
              <button onClick={() => setIsViewModalOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-8 space-y-8">
              <div className="flex justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Bill To</p>
                  <p className="text-xl font-bold">{viewingInvoice.customerName}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Date Issued</p>
                  <p className="text-sm font-medium">{formatDate(viewingInvoice.createdAt)}</p>
                  <p className="text-xs text-muted-foreground mt-2 uppercase tracking-widest mb-1">Created By</p>
                  <p className="text-sm font-medium">{viewingInvoice.createdByName}</p>
                </div>
              </div>

              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-secondary/30 border-b border-border">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Product</th>
                      <th className="px-4 py-3 font-semibold text-center">Qty</th>
                      <th className="px-4 py-3 font-semibold text-right">Unit Price</th>
                      <th className="px-4 py-3 font-semibold text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {viewingInvoice.items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-3">
                          <div className="font-medium">{item.productName}</div>
                          {item.serialNumber && (
                            <div className="text-[10px] text-muted-foreground font-mono mt-0.5">SN: {item.serialNumber}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">{item.quantity}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground">{formatCurrency(item.unitPrice)}</td>
                        <td className="px-4 py-3 text-right font-medium">{formatCurrency(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="text-foreground">{formatCurrency(viewingInvoice.subtotal)}</span>
                  </div>
                  {viewingInvoice.isDME && (
                    <div className="flex justify-between text-sm text-purple-500 font-medium">
                      <span>DME Adjustment (-80%)</span>
                      <span>-{formatCurrency(viewingInvoice.subtotal * 0.8)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tax ({viewingInvoice.taxPercent}%)</span>
                    <span className="text-foreground">{formatCurrency(viewingInvoice.taxAmount)}</span>
                  </div>
                  <div className="flex justify-between text-xl font-bold border-t border-border pt-4 mt-2">
                    <span>Total Amount</span>
                    <span className="text-primary">{formatCurrency(viewingInvoice.totalAmount)}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-border flex gap-3">
              <button 
                onClick={() => window.print()}
                className="flex-1 px-4 py-2 bg-secondary text-foreground rounded-md hover:bg-secondary/80 transition-colors flex items-center justify-center"
              >
                Print Invoice
              </button>
              <button 
                onClick={() => setIsViewModalOpen(false)}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Add Customer Modal */}
      {isAddCustomerModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-xl font-bold">Add New Customer</h2>
              <button onClick={() => setIsAddCustomerModalOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Customer Name</label>
                <input 
                  type="text" 
                  required
                  autoFocus
                  className="w-full px-4 py-2 bg-secondary/30 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  placeholder="Full Name"
                />
              </div>
              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsAddCustomerModalOpen(false)}
                  className="flex-1 px-4 py-2 bg-secondary text-foreground rounded-md hover:bg-secondary/80 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="button"
                  onClick={handleAddQuickCustomer}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors font-semibold"
                >
                  Add Customer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
