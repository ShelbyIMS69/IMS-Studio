"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Package, 
  Users, 
  FileText, 
  TrendingUp, 
  UserCog, 
  Hash, 
  Settings,
  LogOut
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Products", href: "/products", icon: Package },
  { name: "Customers", href: "/customers", icon: Users },
  { name: "Invoices", href: "/invoices", icon: FileText },
  { name: "Sales", href: "/sales", icon: TrendingUp },
  { name: "Users", href: "/users", icon: UserCog, adminOnly: true },
  { name: "Serial Tracking", href: "/serial-tracking", icon: Hash },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { profile, logout } = useAuth();

  const filteredNavItems = navItems.filter(item => 
    !item.adminOnly || (profile?.role === "admin")
  );

  return (
    <div className="flex flex-col w-64 h-screen bg-card border-r border-border">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">IMS Studio</h1>
      </div>
      
      <nav className="flex-1 px-4 space-y-1">
        {filteredNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.href);
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                isActive 
                  ? "bg-secondary text-foreground" 
                  : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
              )}
            >
              <Icon className="mr-3 h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border">
        <div className="flex items-center mb-4 px-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {profile?.name || "User"}
            </p>
            <p className="text-xs text-muted-foreground truncate uppercase">
              {profile?.role || "Role"}
            </p>
          </div>
        </div>
        <button
          onClick={() => logout()}
          className="flex items-center w-full px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-md transition-colors"
        >
          <LogOut className="mr-3 h-5 w-5" />
          Logout
        </button>
      </div>
    </div>
  );
}
