import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Menu,
} from "lucide-react";
import { cn } from "../../lib/utils";

interface BottomNavProps {
  onMoreClick: () => void;
}

const PRIMARY_NAV = [
  { label: "الرئيسية", icon: LayoutDashboard, to: "/" },
  { label: "المنتجات", icon: Package, to: "/products" },
  { label: "الطلبات", icon: ShoppingCart, to: "/orders" },
  { label: "العملاء", icon: Users, to: "/customers" },
];

export function BottomNav({ onMoreClick }: BottomNavProps) {
  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-50 h-16 bg-sidebar border-t border-sidebar-border flex items-stretch md:hidden"
      dir="rtl"
    >
      {PRIMARY_NAV.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center justify-center flex-1 gap-0.5 text-sidebar-foreground transition-colors tap-target",
                isActive
                  ? "text-blue-400 bg-sidebar-muted"
                  : "text-slate-400 hover:text-white"
              )
            }
          >
            <Icon className="h-5 w-5" />
            <span className="text-xs leading-none">{item.label}</span>
          </NavLink>
        );
      })}

      {/* More button */}
      <button
        onClick={onMoreClick}
        className="flex flex-col items-center justify-center flex-1 gap-0.5 text-slate-400 hover:text-white transition-colors tap-target"
      >
        <Menu className="h-5 w-5" />
        <span className="text-xs leading-none">المزيد</span>
      </button>
    </nav>
  );
}
