import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  ShoppingCart,
  Package,
  TrendingUp,
  ArrowUpRight,
  Clock,
  FolderTree,
} from "lucide-react";
import { ordersApi } from "../api/orders";
import { productsApi } from "../api/products";
import { categoriesApi } from "../api/categories";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { LoadingPage } from "../components/ui/spinner";
import { formatCurrency, formatDate, ORDER_STATUS_COLORS } from "../lib/utils";
import type { OrderResponse } from "../types";

const STATUS_CHART_COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  sub?: string;
}

function KpiCard({ title, value, icon, color, sub }: KpiCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold mt-1">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <ArrowUpRight className="h-3 w-3 text-green-500" /> {sub}
            </p>}
          </div>
          <div className={`h-12 w-12 rounded-full flex items-center justify-center ${color}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function getStatusBadgeClass(status: string) {
  return ORDER_STATUS_COLORS[status] ?? "bg-gray-100 text-gray-800";
}

export default function Dashboard() {
  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ["orders", "dashboard"],
    queryFn: () => ordersApi.getAll({ pageNumber: 1, pageSize: 50 }),
  });

  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ["products", "dashboard"],
    queryFn: () => productsApi.getAll({ pageNumber: 1, pageSize: 1 }),
  });

  const { data: categoriesData, isLoading: categoriesLoading } = useQuery({
    queryKey: ["categories", "dashboard"],
    queryFn: () => categoriesApi.getAll(true),
  });

  if (ordersLoading || productsLoading || categoriesLoading) return <LoadingPage />;

  const orders: OrderResponse[] = ordersData?.data?.items ?? [];
  const totalRevenue = orders
    .filter((o) => o.orderStatus !== "Cancelled")
    .reduce((sum, o) => sum + o.totalAmount, 0);
  const totalOrders = ordersData?.data?.totalCount ?? 0;
  const totalProducts = productsData?.data?.totalCount ?? 0;

  // Calculate total categories (including subcategories)
  const countCategories = (cats: any[]): number => 
    cats.reduce((sum, cat) => sum + 1 + countCategories(cat.subCategories ?? []), 0);
  
  const totalCategories = countCategories(categoriesData?.data ?? []);

  // Orders by status
  const statusCounts: Record<string, number> = {};
  orders.forEach((o) => {
    statusCounts[o.orderStatus] = (statusCounts[o.orderStatus] ?? 0) + 1;
  });
  const statusChartData = Object.entries(statusCounts).map(([status, count]) => ({
    status,
    count,
  }));

  // Revenue by month (from current data)
  const revenueByMonth: Record<string, number> = {};
  orders
    .filter((o) => o.orderStatus !== "Cancelled")
    .forEach((o) => {
      const month = new Date(o.createdAt).toLocaleString("en-US", {
        month: "short",
        year: "2-digit",
      });
      revenueByMonth[month] = (revenueByMonth[month] ?? 0) + o.totalAmount;
    });
  const revenueChartData = Object.entries(revenueByMonth)
    .slice(-6)
    .map(([month, revenue]) => ({ month, revenue }));

  const recentOrders = orders.slice(0, 8);

  return (
    <div className="space-y-6" dir="rtl">
      {/* Approximate data notice */}
      <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
        ⚠️ قيم تقريبية بناءً على الطلبات المحمّلة فقط — لا تمثل إحصائيات تجارية كاملة
      </p>
      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="إجمالي الإيرادات"
          value={formatCurrency(totalRevenue)}
          icon={<TrendingUp className="h-6 w-6 text-green-600" />}
          color="bg-green-100"
          sub="تقريبي — من الطلبات المحمّلة"
        />
        <KpiCard
          title="إجمالي الطلبات"
          value={totalOrders.toLocaleString()}
          icon={<ShoppingCart className="h-6 w-6 text-blue-600" />}
          color="bg-blue-100"
        />
        <KpiCard
          title="إجمالي المنتجات"
          value={totalProducts.toLocaleString()}
          icon={<Package className="h-6 w-6 text-purple-600" />}
          color="bg-purple-100"
        />
        <KpiCard
          title="إجمالي الأقسام"
          value={totalCategories.toLocaleString()}
          icon={<FolderTree className="h-6 w-6 text-orange-600" />}
          color="bg-orange-100"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">الإيرادات عبر الزمن</CardTitle>
          </CardHeader>
          <CardContent>
            {revenueChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={revenueChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(Number(v) / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: any) => formatCurrency(Number(v))} />
                  <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-60 items-center justify-center text-muted-foreground text-sm">
                لا توجد بيانات إيرادات
              </div>
            )}
          </CardContent>
        </Card>

        {/* Orders by Status Pie */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">الطلبات حسب الحالة</CardTitle>
          </CardHeader>
          <CardContent>
            {statusChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={statusChartData}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, percent }: any) =>
                      `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                  >
                    {statusChartData.map((_, i) => (
                      <Cell key={i} fill={STATUS_CHART_COLORS[i % STATUS_CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-60 items-center justify-center text-muted-foreground text-sm">
                لا توجد طلبات حتى الآن
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">أحدث الطلبات</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="p-0">
          {recentOrders.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-muted-foreground">لا توجد طلبات حتى الآن</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="px-6 py-3 text-right font-medium text-muted-foreground">رقم الطلب</th>
                    <th className="px-6 py-3 text-right font-medium text-muted-foreground">العميل</th>
                    <th className="px-6 py-3 text-right font-medium text-muted-foreground">الإجمالي</th>
                    <th className="px-6 py-3 text-right font-medium text-muted-foreground">الحالة</th>
                    <th className="px-6 py-3 text-right font-medium text-muted-foreground">التاريخ</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order) => (
                    <tr key={order.id} className="border-b hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-3 text-right font-mono text-xs text-blue-600">{order.orderNumber}</td>
                      <td className="px-6 py-3 text-right">
                        <div>
                          <p className="font-medium">{order.customerName}</p>
                          <p className="text-xs text-muted-foreground">{order.customerEmail}</p>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-right font-medium">{formatCurrency(order.totalAmount)}</td>
                      <td className="px-6 py-3 text-right">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${getStatusBadgeClass(order.orderStatus)}`}>
                          {order.orderStatus}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right text-muted-foreground">{formatDate(order.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
