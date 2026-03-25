import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Tags,
  Ticket,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Store,
  Map,
  Zap,
  Percent,
  Megaphone,
  MessageSquare,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { useAuth } from "../../context/AuthContext";
import { useState } from "react";

interface NavItem {
  label: string;
  icon: React.ReactNode;
  to: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: "الرئيسية", icon: <LayoutDashboard className="h-5 w-5" />, to: "/" },
  { label: "المنتجات", icon: <Package className="h-5 w-5" />, to: "/products" },
  { label: "التصنيفات", icon: <Tags className="h-5 w-5" />, to: "/categories" },
  { label: "الطلبات", icon: <ShoppingCart className="h-5 w-5" />, to: "/orders" },
  { label: "العملاء", icon: <Users className="h-5 w-5" />, to: "/customers" },
  { label: "محرك العروض", icon: <Zap className="h-5 w-5" />, to: "/promotions" },
  { label: "الخصومات", icon: <Percent className="h-5 w-5" />, to: "/discounts" },
  { label: "الكوبونات", icon: <Ticket className="h-5 w-5" />, to: "/coupons" },
  { label: "الإعلانات", icon: <Megaphone className="h-5 w-5" />, to: "/announcements" },
  { label: "المراجعات", icon: <MessageSquare className="h-5 w-5" />, to: "/reviews" },
  { label: "المحافظات", icon: <Map className="h-5 w-5" />, to: "/governorates" },
];

export function Sidebar() {
  const { logout, user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "flex flex-col h-screen bg-sidebar text-sidebar-foreground transition-all duration-300 border-l border-sidebar-border",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-5 border-b border-sidebar-border">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <Store className="h-7 w-7 text-blue-400" />
            <span className="font-bold text-lg tracking-tight">Elshima</span>
          </div>
        )}
        {collapsed && <Store className="h-7 w-7 text-blue-400 mx-auto" />}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className={cn(
            "rounded-md p-1 hover:bg-sidebar-muted transition-colors",
            collapsed && "mx-auto"
          )}
        >
          {collapsed ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-4 py-2.5 mx-2 rounded-md text-sm font-medium transition-colors",
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-slate-300 hover:bg-sidebar-muted hover:text-white",
                collapsed && "justify-center px-2"
              )
            }
            title={collapsed ? item.label : undefined}
          >
            {item.icon}
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User & Logout */}
      <div className="border-t border-sidebar-border p-4">
        {!collapsed && (
          <div className="mb-3 px-2">
            <p className="text-sm font-medium truncate">{user?.fullName}</p>
            <p className="text-xs text-slate-400 truncate">{user?.email}</p>
          </div>
        )}
        <button
          onClick={() => logout()}
          className={cn(
            "flex items-center gap-3 w-full px-2 py-2 rounded-md text-sm text-slate-300 hover:bg-red-600 hover:text-white transition-colors",
            collapsed && "justify-center"
          )}
          title={collapsed ? "تسجيل الخروج" : undefined}
        >
          <LogOut className="h-5 w-5" />
          {!collapsed && <span>تسجيل الخروج</span>}
        </button>
      </div>
    </aside>
  );
}
