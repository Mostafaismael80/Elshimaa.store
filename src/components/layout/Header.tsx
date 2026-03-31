import { Bell, Search } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Input } from "../ui/input";

const ROUTE_TITLES: Record<string, string> = {
  "/": "نظرة عامة على لوحة التحكم",
  "/products": "إدارة المنتجات",
  "/categories": "التصنيفات",
  "/orders": "إدارة الطلبات",
  "/customers": "العملاء",
  "/discounts": "الخصومات",
  "/coupons": "الكوبونات",
};

export function Header() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const title = ROUTE_TITLES[pathname] ?? "لوحة التحكم";

  return (
    <header className="h-16 flex items-center justify-between px-6 border-b bg-white shadow-sm">
      <h1 className="text-xl font-semibold text-gray-800">{title}</h1>
      <div className="flex items-center gap-4">
        <div className="relative hidden md:block">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input placeholder="بحث..." className="pr-10 pl-3 w-52 h-9 text-sm" />
        </div>
        <button className="relative rounded-full p-2 hover:bg-gray-100 transition-colors">
          <Bell className="h-5 w-5 text-gray-600" />
        </button>
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-semibold">
            {user?.fullName?.[0]?.toUpperCase() ?? "A"}
          </div>
          <span className="hidden md:block text-sm font-medium text-gray-700">{user?.fullName}</span>
        </div>
      </div>
    </header>
  );
}
