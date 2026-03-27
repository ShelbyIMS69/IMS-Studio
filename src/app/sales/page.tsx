"use client";

import { useState, useEffect } from "react";
import MainLayout from "@/components/MainLayout";
import { db } from "@/lib/firebase";
import { 
  collection, 
  getDocs, 
  query,
  orderBy,
  where,
  getDoc,
  doc
} from "firebase/firestore";
import { 
  Search, 
  Download,
  Eye,
  TrendingUp,
  Calendar,
  X,
  FileText
} from "lucide-react";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import * as XLSX from "xlsx";

interface SaleRecord {
  id: string;
  invoiceNo: string;
  customerId: string;
  customerName: string;
  items: any[];
  totalAmount: number;
  createdAt: string;
  createdByName: string;
}

export default function SalesPage() {
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewingInvoice, setViewingInvoice] = useState<any | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  const fetchSales = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "invoices"), orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      const items: SaleRecord[] = [];
      querySnapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as SaleRecord);
      });
      setSales(items);
    } catch (error) {
      console.error("Error fetching sales:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, []);

  const handleDownloadDatasheet = () => {
    const data = sales.map(sale => ({
      "Date & Time": formatDate(sale.createdAt),
      "Invoice No": sale.invoiceNo,
      "Customer": sale.customerName,
      "Products": sale.items.map(i => i.productName).join(", "),
      "Total Sales": sale.totalAmount,
      "Salesperson": sale.createdByName
    }));
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sales Records");
    XLSX.writeFile(wb, `Sales_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const filteredSales = sales.filter(sale => 
    sale.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.invoiceNo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalRevenue = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);

  return (
    <MainLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Sales Records</h1>
            <p className="text-muted-foreground mt-1">Review all sales transactions and performance.</p>
          </div>
          <button 
            onClick={handleDownloadDatasheet}
            className="flex items-center px-4 py-2 bg-secondary text-foreground rounded-md hover:bg-secondary/80 transition-colors"
          >
            <Download className="mr-2 h-4 w-4" /> Download Datasheet
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-6 bg-card border border-border rounded-lg shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-muted-foreground">Total Revenue</h3>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </div>
            <div className="text-2xl font-bold text-green-500">{formatCurrency(totalRevenue)}</div>
          </div>
          <div className="p-6 bg-card border border-border rounded-lg shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-muted-foreground">Total Invoices</h3>
              <FileText className="h-4 w-4 text-primary" />
            </div>
            <div className="text-2xl font-bold">{sales.length}</div>
          </div>
          <div className="p-6 bg-card border border-border rounded-lg shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-muted-foreground">Avg. Sale Value</h3>
              <Calendar className="h-4 w-4 text-blue-500" />
            </div>
            <div className="text-2xl font-bold">{formatCurrency(sales.length ? totalRevenue / sales.length : 0)}</div>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-card border border-border p-4 rounded-lg">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search by customer or invoice..." 
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
                <th className="px-6 py-4 text-sm font-semibold">Products</th>
                <th className="px-6 py-4 text-sm font-semibold text-right">Sales Amount</th>
                <th className="px-6 py-4 text-sm font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground animate-pulse">Loading sales...</td>
                </tr>
              ) : filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">No sales records found.</td>
                </tr>
              ) : (
                filteredSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-secondary/20 transition-colors">
                    <td className="px-6 py-4 text-sm">
                      {formatDate(sale.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-sm font-mono font-medium">
                      {sale.invoiceNo}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">
                      {sale.customerName}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {sale.items.map((item, i) => (
                          <span key={i} className="px-2 py-0.5 bg-secondary/50 rounded text-[10px] text-muted-foreground">
                            {item.productName}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-bold text-green-500">
                      {formatCurrency(sale.totalAmount)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => { setViewingInvoice(sale); setIsViewModalOpen(true); }}
                        className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

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
                    {viewingInvoice.items.map((item: any, idx: number) => (
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
    </MainLayout>
  );
}
