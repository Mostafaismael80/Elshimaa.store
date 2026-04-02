import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Users, Mail, Phone, MapPin } from "lucide-react";
import { ordersApi } from "../api/orders";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent } from "../components/ui/card";
import { LoadingPage } from "../components/ui/spinner";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../components/ui/table";
import { formatCurrency, formatDate } from "../lib/utils";
import type { OrderResponse } from "../types";

interface CustomerSummary {
  email: string | null;
  name: string;
  phone: string;
  governorate: string;
  firstOrder: string;
  lastOrder: string;
  totalOrders: number;
  totalSpent: number;
}

function buildCustomerList(orders: OrderResponse[]): CustomerSummary[] {
  const map = new Map<string, CustomerSummary>();
  for (const order of orders) {
    const key = order.customerEmail || order.customerPhone;
    if (!key) continue;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        email: order.customerEmail,
        name: order.customerName,
        phone: order.customerPhone,
        governorate: order.governorateName,
        firstOrder: order.createdAt,
        lastOrder: order.createdAt,
        totalOrders: 1,
        totalSpent: order.orderStatus !== "Cancelled" ? order.totalAmount : 0,
      });
    } else {
      existing.totalOrders += 1;
      if (order.orderStatus !== "Cancelled") existing.totalSpent += order.totalAmount;
      if (new Date(order.createdAt) < new Date(existing.firstOrder)) existing.firstOrder = order.createdAt;
      if (new Date(order.createdAt) > new Date(existing.lastOrder)) existing.lastOrder = order.createdAt;
    }
  }
  return Array.from(map.values()).sort((a, b) => b.totalSpent - a.totalSpent);
}

export default function Customers() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;

  // Load all orders to extract customer data (API doesn't have a separate users list endpoint)
  const { data, isLoading } = useQuery({
    queryKey: ["orders", "all-customers"],
    queryFn: () => ordersApi.getAll({ pageNumber: 1, pageSize: 500 }),
  });

  const allOrders = data?.data?.items ?? [];
  const customers = buildCustomerList(allOrders);

  const filtered = customers.filter(
    (c) =>
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.email?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
      c.phone.includes(search)
  );

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">العملاء</h2>
          <p className="text-muted-foreground text-sm mt-1">{filtered.length} عميل فريد</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{customers.length}</p>
              <p className="text-xs text-muted-foreground">إجمالي العملاء</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
              <Mail className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {customers.filter((c) => c.email).length}
              </p>
              <p className="text-xs text-muted-foreground">لديهم بريد إلكتروني</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
              <MapPin className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {new Set(customers.map((c) => c.governorate)).size}
              </p>
              <p className="text-xs text-muted-foreground">المحافظات</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="relative max-w-sm">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="البحث بالاسم أو البريد الإلكتروني أو الهاتف..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="pr-9"
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <LoadingPage />
      ) : paged.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>لا يوجد عملاء</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          {/* Mobile card-list: hidden on sm+ */}
          <div className="sm:hidden divide-y">
            {paged.map((customer) => (
              <div key={customer.email || customer.phone} className="p-4 space-y-2">
                {/* Row 1: avatar + name/email */}
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-sm font-semibold shrink-0">
                    {customer.name?.[0]?.toUpperCase() ?? "?"}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{customer.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{customer.email || "—"}</p>
                  </div>
                </div>
                {/* Row 2: phone + governorate */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground text-xs">{customer.phone || "—"}</span>
                  <span className="text-xs text-muted-foreground">{customer.governorate || "—"}</span>
                </div>
                {/* Row 3: orders + spend */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">طلبات: <strong>{customer.totalOrders}</strong></span>
                  <span className="font-semibold text-sm text-green-700">{formatCurrency(customer.totalSpent)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table: hidden on mobile */}
          <div className="hidden sm:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">العميل</TableHead>
                  <TableHead className="text-right">الهاتف</TableHead>
                  <TableHead className="text-right">المحافظة</TableHead>
                  <TableHead className="text-right">إجمالي الطلبات</TableHead>
                  <TableHead className="text-right">إجمالي الإنفاق</TableHead>
                  <TableHead className="text-right">أول طلب</TableHead>
                  <TableHead className="text-right">آخر طلب</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map((customer) => (
                  <TableRow key={customer.email || customer.phone}>
                    <TableCell className="text-right">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-sm font-semibold shrink-0">
                          {customer.name?.[0]?.toUpperCase() ?? "?"}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{customer.name}</p>
                          <p className="text-xs text-muted-foreground">{customer.email || "—"}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      <div className="flex items-center gap-1.5">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        {customer.phone || "—"}
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">{customer.governorate || "—"}</TableCell>
                    <TableCell className="text-right font-semibold">{customer.totalOrders}</TableCell>
                    <TableCell className="text-right font-semibold text-green-700">
                      {formatCurrency(customer.totalSpent)}
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">{formatDate(customer.firstOrder)}</TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">{formatDate(customer.lastOrder)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>السابق</Button>
          <span className="text-sm text-muted-foreground">صفحة {page} من {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>التالي</Button>
        </div>
      )}
    </div>
  );
}
