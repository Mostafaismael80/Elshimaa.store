import { NavLink } from "react-router-dom";
import {
  Tags,
  Ticket,
  Zap,
  Megaphone,
  MessageSquare,
  Map,
  LogOut,
  Store,
  X,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { useAuth } from "../../context/AuthContext";

interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
}

const SECONDARY_NAV = [
  { label: "التصنيفات", icon: Tags, to: "/categories" },
  { label: "العروض التلقائية", icon: Zap, to: "/promotions" },
  { label: "الكوبونات", icon: Ticket, to: "/coupons" },
  { label: "الإعلانات", icon: Megaphone, to: "/announcements" },
  { label: "المراجعات", icon: MessageSquare, to: "/reviews" },
  { label: "المحافظات", icon: Map, to: "/governorates" },
];

export function MobileDrawer({ open, onClose }: MobileDrawerProps) {
  const { logout, user } = useAuth();

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 md:hidden",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Drawer panel — slides up from bottom */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 bg-sidebar text-sidebar-foreground rounded-t-2xl shadow-2xl transition-transform duration-300 ease-out md:hidden",
          open ? "translate-y-0" : "translate-y-full"
        )}
        dir="rtl"
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-sidebar-border" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <Store className="h-5 w-5 text-blue-400" />
            <span className="font-bold text-base">Elshima</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-sidebar-muted transition-colors tap-target flex items-center justify-center"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* User info */}
        {user && (
          <div className="px-4 py-3 border-b border-sidebar-border">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold shrink-0">
                {user.fullName?.[0]?.toUpperCase() ?? "A"}
              </div>
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{user.fullName}</p>
                <p className="text-xs text-slate-400 truncate">{user.email}</p>
              </div>
            </div>
          </div>
        )}

        {/* Secondary nav items */}
        <nav className="p-3 space-y-1">
          {SECONDARY_NAV.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors tap-target",
                    isActive
                      ? "bg-blue-600 text-white"
                      : "text-slate-300 hover:bg-sidebar-muted hover:text-white"
                  )
                }
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="px-3 pb-4 border-t border-sidebar-border pt-2">
          <button
            onClick={() => { logout(); onClose(); }}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm text-slate-300 hover:bg-red-600 hover:text-white transition-colors tap-target"
          >
            <LogOut className="h-5 w-5" />
            <span>تسجيل الخروج</span>
          </button>
        </div>

        {/* Safe area bottom padding */}
        <div className="pb-safe" />
      </div>
    </>
  );
}
