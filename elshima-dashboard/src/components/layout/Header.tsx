import { Bell, Search } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Input } from "../ui/input";

const ROUTE_TITLES: Record<string, string> = {
  "/": "نظرة عامة",
  "/products": "المنتجات",
  "/categories": "التصنيفات",
  "/orders": "الطلبات",
  "/customers": "العملاء",
  "/discounts": "الخصومات",
  "/coupons": "الكوبونات",
  "/promotions": "العروض التلقائية",
  "/announcements": "الإعلانات",
  "/reviews": "المراجعات",
  "/governorates": "المحافظات",
};

export function Header() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const title = ROUTE_TITLES[pathname] ?? "لوحة التحكم";

  return (
    <header className="h-14 md:h-16 flex items-center justify-between px-4 md:px-6 border-b bg-white shadow-sm shrink-0">
      {/* Page title — truncates on narrow screens */}
      <h1 className="text-base md:text-xl font-semibold text-gray-800 truncate min-w-0 flex-1">
        {title}
      </h1>

      <div className="flex items-center gap-2 md:gap-4 shrink-0 mr-2">
        {/* Search — desktop only */}
        <div className="relative hidden md:block">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input placeholder="بحث..." className="pr-10 pl-3 w-52 h-9 text-sm" />
        </div>

        {/* Bell */}
        <button className="relative rounded-full p-2 hover:bg-gray-100 transition-colors tap-target flex items-center justify-center">
          <Bell className="h-5 w-5 text-gray-600" />
        </button>

        {/* Avatar */}
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-semibold shrink-0">
            {user?.fullName?.[0]?.toUpperCase() ?? "A"}
          </div>
          <span className="hidden md:block text-sm font-medium text-gray-700 truncate max-w-32">
            {user?.fullName}
          </span>
        </div>
      </div>
    </header>
  );
}
