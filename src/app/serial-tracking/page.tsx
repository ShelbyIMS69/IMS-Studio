"use client";

import { useState, useEffect } from "react";
import MainLayout from "@/components/MainLayout";
import { db } from "@/lib/firebase";
import { 
  collection, 
  getDocs, 
  query,
  orderBy,
  where
} from "firebase/firestore";
import { 
  Hash, 
  Search, 
  Calendar, 
  User, 
  Shield,
  FileText
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { WEAPON_TYPES } from "@/lib/constants";

interface SerialRecord {
  id: string;
  customerName: string;
  weaponType: string;
  serialNumber: string;
  date: string;
  salesperson: string;
  invoiceNo: string;
}

export default function SerialTrackingPage() {
  const [records, setRecords] = useState<SerialRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [weaponFilter, setWeaponFilter] = useState("");

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "serial_tracking"), orderBy("date", "desc"));
      const querySnapshot = await getDocs(q);
      const items: SerialRecord[] = [];
      querySnapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as SerialRecord);
      });
      setRecords(items);
    } catch (error) {
      console.error("Error fetching serial records:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const filteredRecords = records.filter(r => {
    const matchesSearch = 
      r.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.invoiceNo.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesWeapon = !weaponFilter || r.weaponType === weaponFilter;
    
    return matchesSearch && matchesWeapon;
  });

  return (
    <MainLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Serial Number Tracking</h1>
            <p className="text-muted-foreground mt-1">Track weapon serial numbers and ownership history.</p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-4 bg-card border border-border p-4 rounded-lg">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search by customer, serial number, or invoice..." 
              className="w-full pl-10 pr-4 py-2 bg-secondary/30 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select 
            className="w-full md:w-64 px-4 py-2 bg-secondary/30 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            value={weaponFilter}
            onChange={(e) => setWeaponFilter(e.target.value)}
          >
            <option value="">All Weapon Types</option>
            {WEAPON_TYPES.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-secondary/50 border-b border-border">
                <th className="px-6 py-4 text-sm font-semibold">Date</th>
                <th className="px-6 py-4 text-sm font-semibold">Serial Number</th>
                <th className="px-6 py-4 text-sm font-semibold">Weapon Type</th>
                <th className="px-6 py-4 text-sm font-semibold">Customer</th>
                <th className="px-6 py-4 text-sm font-semibold">Salesperson</th>
                <th className="px-6 py-4 text-sm font-semibold text-right">Invoice</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground animate-pulse">Loading records...</td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">No tracking records found.</td>
                </tr>
              ) : (
                filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-secondary/20 transition-colors">
                    <td className="px-6 py-4 text-sm">
                      {new Date(record.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="inline-flex items-center px-2 py-1 bg-primary/10 text-primary font-mono text-xs font-bold rounded">
                        {record.serialNumber}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">
                      {record.weaponType}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {record.customerName}
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {record.salesperson}
                    </td>
                    <td className="px-6 py-4 text-right text-xs font-mono text-muted-foreground">
                      {record.invoiceNo}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </MainLayout>
  );
}
