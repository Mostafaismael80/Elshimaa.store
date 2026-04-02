import { useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { BottomNav } from "./BottomNav";
import { MobileDrawer } from "./MobileDrawer";
import { useAuth } from "../../context/AuthContext";

export function Layout() {
  const { isAuthenticated, isAdmin } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isAdmin) return (
    <div className="flex h-screen items-center justify-center px-4">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">وصول مرفوض</h2>
        <p className="text-gray-500">تحتاج إلى صلاحيات المسؤول للوصول إلى لوحة التحكم.</p>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Desktop sidebar — hidden on mobile */}
      <Sidebar />

      {/* Main content area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />
        {/*
          Mobile: p-4 pb-20 (extra bottom padding to clear fixed bottom nav)
          Desktop: p-6
        */}
        <main className="flex-1 overflow-y-auto p-4 pb-20 md:p-6 md:pb-6">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom navigation — hidden on md+ */}
      <BottomNav onMoreClick={() => setDrawerOpen(true)} />
      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}
