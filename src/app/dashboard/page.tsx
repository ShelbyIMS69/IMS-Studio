"use client";

import { useState, useEffect } from "react";
import MainLayout from "@/components/MainLayout";
import { useAuth } from "@/context/AuthContext";
import { formatCurrency, cn } from "@/lib/utils";
import { db } from "@/lib/firebase";
import { 
  collection, 
  getDocs, 
  query, 
  orderBy, 
  limit,
  where,
  Timestamp
} from "firebase/firestore";
import { 
  TrendingUp, 
  Users, 
  Package, 
  DollarSign,
  Trophy
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from "recharts";

interface SalesPerson {
  name: string;
  totalSales: number;
  totalCommission: number;
}

export default function DashboardPage() {
  const { profile } = useAuth();
  const [topSalespeople, setTopSalespeople] = useState<SalesPerson[]>([]);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch top salespeople
      const usersQuery = query(
        collection(db, "users"), 
        orderBy("totalSales", "desc"), 
        limit(5)
      );
      const usersSnapshot = await getDocs(usersQuery);
      const staff: SalesPerson[] = [];
      usersSnapshot.forEach((doc) => {
        const data = doc.data();
        staff.push({
          name: data.name || data.username,
          totalSales: data.totalSales || 0,
          totalCommission: data.totalCommission || 0
        });
      });
      setTopSalespeople(staff);

      // Simple mock for monthly data as it requires aggregation
      setMonthlyData([
        { name: "Jan", sales: 4000 },
        { name: "Feb", sales: 3000 },
        { name: "Mar", sales: 2000 },
        { name: "Apr", sales: 2780 },
        { name: "May", sales: 1890 },
        { name: "Jun", sales: 2390 },
      ]);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return (
    <MainLayout>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
        <div className="text-sm text-muted-foreground">
          Welcome back, <span className="text-foreground font-medium">{profile?.name || "User"}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-6 bg-card border border-border rounded-lg shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-muted-foreground">Total Sales</h3>
            <DollarSign className="h-4 w-4 text-primary" />
          </div>
          <div className="text-2xl font-bold">{formatCurrency(profile?.totalSales || 0)}</div>
          <p className="text-xs text-muted-foreground mt-1">+12% from last month</p>
        </div>

        <div className="p-6 bg-card border border-border rounded-lg shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-muted-foreground">Commission</h3>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </div>
          <div className="text-2xl font-bold">{formatCurrency(profile?.totalCommission || 0)}</div>
          <p className="text-xs text-muted-foreground mt-1">20% of total sales</p>
        </div>

        <div className="p-6 bg-card border border-border rounded-lg shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-muted-foreground">Author Tax</h3>
            <TrendingUp className="h-4 w-4 text-red-500" />
          </div>
          <div className="text-2xl font-bold">{formatCurrency(profile?.totalAuthorTax || 0)}</div>
          <p className="text-xs text-muted-foreground mt-1">20% of total sales</p>
        </div>

        <div className="p-6 bg-card border border-border rounded-lg shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-muted-foreground">Nett Sales</h3>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold">{formatCurrency(profile?.nettSales || 0)}</div>
          <p className="text-xs text-muted-foreground mt-1">After commission & tax</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 bg-card border border-border rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold mb-6">Sales Overview</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" />
                <XAxis 
                  dataKey="name" 
                  stroke="#888" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                />
                <YAxis 
                  stroke="#888" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                  tickFormatter={(value) => `$${value}`} 
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#1e1e1e", border: "1px solid #333", borderRadius: "8px" }}
                  itemStyle={{ color: "#fff" }}
                />
                <Bar dataKey="sales" fill="currentColor" className="fill-primary" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-6 bg-card border border-border rounded-lg shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold">Commission Ranking</h3>
            <Trophy className="h-5 w-5 text-yellow-500" />
          </div>
          <div className="space-y-4">
            {topSalespeople.map((person, idx) => (
              <div key={person.name} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                <div className="flex items-center">
                  <span className={cn(
                    "flex items-center justify-center w-8 h-8 rounded-full mr-4 text-sm font-bold",
                    idx === 0 ? "bg-yellow-500/20 text-yellow-500" : 
                    idx === 1 ? "bg-slate-300/20 text-slate-300" : 
                    "bg-orange-400/20 text-orange-400"
                  )}>
                    {idx + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium">{person.name}</p>
                    <p className="text-xs text-muted-foreground">Sales: {formatCurrency(person.totalSales)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-green-500">{formatCurrency(person.totalCommission)}</p>
                  <p className="text-xs text-muted-foreground">Commission</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
