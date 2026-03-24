import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search, ShoppingBag, Eye, CheckCircle, XCircle, Truck, Package,
  Clock, ChevronLeft, ChevronRight, Filter,
} from "lucide-react";
import { ordersApi } from "../api/orders";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent } from "../components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { LoadingPage, Spinner } from "../components/ui/spinner";
import { Textarea } from "../components/ui/textarea";
import { useToast } from "../components/ui/toast";
import { formatCurrency } from "../lib/utils";
import { ORDER_STATUS, ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "../types";
import type { OrderResponse, UpdateOrderStatusRequest } from "../types";

// ─── Status Config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  Pending:   { label: "قيد الانتظار", color: "bg-yellow-100 text-yellow-800", icon: <Clock className="h-3 w-3" /> },
  Confirmed: { label: "مؤكد",        color: "bg-blue-100 text-blue-800",   icon: <CheckCircle className="h-3 w-3" /> },
  Shipped:   { label: "تم الشحن",    color: "bg-purple-100 text-purple-800", icon: <Truck className="h-3 w-3" /> },
  Delivered: { label: "تم التسليم", color: "bg-green-100 text-green-800",  icon: <Package className="h-3 w-3" /> },
  Cancelled: { label: "ملغي",        color: "bg-red-100 text-red-800",      icon: <XCircle className="h-3 w-3" /> },
};

function OrderStatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: "bg-gray-100 text-gray-800", icon: null };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

// ─── Status transition options ─────────────────────────────────────────────────

const NEXT_STATUS_OPTIONS = [
  { value: ORDER_STATUS.Confirmed, label: "تأكيد الطلب" },
  { value: ORDER_STATUS.Shipped,   label: "شحن الطلب" },
  { value: ORDER_STATUS.Delivered, label: "تسليم الطلب" },
  { value: ORDER_STATUS.Cancelled, label: "إلغاء الطلب" },
];

export default function Orders() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [detailOrder, setDetailOrder] = useState<OrderResponse | null>(null);
  const [statusDialogOrder, setStatusDialogOrder] = useState<OrderResponse | null>(null);
  const [newStatus, setNewStatus] = useState<string>("");
  const [statusNotes, setStatusNotes] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");

  // ─── Queries ──────────────────────────────────────────────────────────────────

  const { data, isLoading } = useQuery({
    queryKey: ["orders", page, search, statusFilter],
    queryFn: () =>
      ordersApi.getAll({
        pageNumber: page,
        pageSize: 15,
        search: search || undefined,
        orderStatus: statusFilter !== "all" ? Number(statusFilter) : undefined,
        sortBy: "createdAt",
        sortDescending: true,
      }),
  });

  // ─── Mutations ────────────────────────────────────────────────────────────────

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateOrderStatusRequest }) =>
      ordersApi.updateStatus(id, body),
    onSuccess: (res) => {
      toast("تم تحديث حالة الطلب", "success");
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      setStatusDialogOrder(null);
      // Also refresh detail if open
      if (detailOrder?.id === res.data.id) setDetailOrder(res.data);
    },
    onError: (err: any) => toast(err?.response?.data?.message ?? "فشل تحديث الحالة", "error"),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => ordersApi.cancel(id),
    onSuccess: () => {
      toast("تم إلغاء الطلب", "success");
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      setDetailOrder(null);
    },
    onError: (err: any) => toast(err?.response?.data?.message ?? "فشل الإلغاء", "error"),
  });

  // ─── Status dialog ────────────────────────────────────────────────────────────

  const openStatusDialog = (order: OrderResponse) => {
    setStatusDialogOrder(order);
    setNewStatus("");
    setStatusNotes("");
    setTrackingNumber("");
  };

  const submitStatusUpdate = () => {
    if (!statusDialogOrder || !newStatus) return;
    updateStatusMutation.mutate({
      id: statusDialogOrder.id,
      body: {
        newStatus: Number(newStatus),
        notes: statusNotes || undefined,
        trackingNumber: trackingNumber || undefined,
      },
    });
  };

  const canCancel = (order: OrderResponse) =>
    order.orderStatus !== "Shipped" && order.orderStatus !== "Delivered" && order.orderStatus !== "Cancelled";

  const orders = data?.data?.items ?? [];
  const pagination = data?.data;

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">الطلبات</h2>
          <p className="text-muted-foreground text-sm mt-1">{pagination?.totalCount ?? 0} طلب إجمالاً</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="البحث برقم الطلب أو الاسم..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pr-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="الحالة" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الحالات</SelectItem>
            <SelectItem value="0">قيد الانتظار</SelectItem>
            <SelectItem value="1">مؤكد</SelectItem>
            <SelectItem value="2">تم الشحن</SelectItem>
            <SelectItem value="3">تم التسليم</SelectItem>
            <SelectItem value="4">ملغي</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Filter className="h-4 w-4" /> {pagination?.totalCount ?? 0} نتيجة
        </div>
      </div>

      {/* Orders Table */}
      {isLoading ? (
        <LoadingPage />
      ) : orders.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <ShoppingBag className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>لا توجد طلبات</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">رقم الطلب</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">العميل</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">المبلغ</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">حالة الطلب</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">الدفع</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">التاريخ</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-right font-mono text-xs">{order.orderNumber}</td>
                    <td className="px-4 py-3 text-right">
                      <div>
                        <div className="font-medium">{order.customerName}</div>
                        <div className="text-xs text-muted-foreground">{order.customerPhone}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-blue-700">{formatCurrency(order.totalAmount)}</td>
                    <td className="px-4 py-3 text-right"><OrderStatusBadge status={order.orderStatus} /></td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-xs text-gray-600">
                        {PAYMENT_STATUS_LABELS[order.paymentStatus] ?? order.paymentStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                      {new Date(order.createdAt).toLocaleDateString("ar-EG")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button size="sm" variant="outline" className="h-7 gap-1 text-xs"
                          onClick={() => setDetailOrder(order)}>
                          <Eye className="h-3 w-3" /> عرض
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 gap-1 text-xs"
                          onClick={() => openStatusDialog(order)}>
                          تحديث
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={!pagination.hasPreviousPage} onClick={() => setPage((p) => p - 1)}>
            <ChevronRight className="h-4 w-4" /> السابق
          </Button>
          <span className="text-sm text-muted-foreground">صفحة {pagination.pageNumber} من {pagination.totalPages}</span>
          <Button variant="outline" size="sm" disabled={!pagination.hasNextPage} onClick={() => setPage((p) => p + 1)}>
            التالي <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Order Detail Dialog */}
      <Dialog open={!!detailOrder} onOpenChange={(o) => !o && setDetailOrder(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تفاصيل الطلب — {detailOrder?.orderNumber}</DialogTitle>
          </DialogHeader>
          {detailOrder && (
            <div className="space-y-4 text-sm">
              {/* Status + dates */}
              <div className="flex flex-wrap gap-3 items-center">
                <OrderStatusBadge status={detailOrder.orderStatus} />
                <span className="text-xs text-muted-foreground">
                  {new Date(detailOrder.createdAt).toLocaleString("ar-EG")}
                </span>
              </div>

              {/* Customer */}
              <div className="grid grid-cols-2 gap-3 rounded-lg bg-gray-50 p-3">
                <div><span className="text-muted-foreground">الاسم: </span>{detailOrder.customerName}</div>
                <div><span className="text-muted-foreground">الهاتف: </span>{detailOrder.customerPhone}</div>
                {detailOrder.customerEmail && <div><span className="text-muted-foreground">البريد: </span>{detailOrder.customerEmail}</div>}
                <div><span className="text-muted-foreground">المحافظة: </span>{detailOrder.governorateName}</div>
                <div className="col-span-2"><span className="text-muted-foreground">العنوان: </span>{detailOrder.city} — {detailOrder.detailedAddress}</div>
              </div>

              {/* Items */}
              <div className="space-y-2">
                <h4 className="font-semibold">المنتجات</h4>
                {detailOrder.items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 border rounded p-2">
                    {item.productImageUrl && (
                      <img src={item.productImageUrl} alt={item.productName}
                        className="h-12 w-12 rounded object-cover flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{item.productName}</div>
                      <div className="text-xs text-muted-foreground">{item.colorName} / {item.sizeName} × {item.quantity}</div>
                    </div>
                    <div className="font-semibold text-blue-700">{formatCurrency(item.totalPrice)}</div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="rounded-lg bg-gray-50 p-3 space-y-1 text-sm">
                <div className="flex justify-between"><span>المجموع الفرعي</span><span>{formatCurrency(detailOrder.subTotal)}</span></div>
                <div className="flex justify-between"><span>الشحن</span><span>{formatCurrency(detailOrder.shippingCost)}</span></div>
                {detailOrder.couponDiscountAmount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>خصم الكوبون ({detailOrder.couponCode})</span>
                    <span>- {formatCurrency(detailOrder.couponDiscountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold border-t pt-1 mt-1">
                  <span>الإجمالي</span><span>{formatCurrency(detailOrder.totalAmount)}</span>
                </div>
              </div>

              {/* Tracking */}
              {detailOrder.trackingNumber && (
                <div className="text-sm">
                  <span className="font-medium">رقم التتبع: </span>
                  <span className="font-mono">{detailOrder.trackingNumber}</span>
                </div>
              )}

              {/* Status History */}
              {detailOrder.statusHistory && detailOrder.statusHistory.length > 0 && (
                <div className="space-y-1">
                  <h4 className="font-semibold">سجل الحالة</h4>
                  {detailOrder.statusHistory.map((h) => (
                    <div key={h.id} className="text-xs text-muted-foreground flex gap-2">
                      <span>{ORDER_STATUS_LABELS[h.oldStatus] ?? h.oldStatus}</span>
                      <span>→</span>
                      <span className="text-gray-700">{ORDER_STATUS_LABELS[h.newStatus] ?? h.newStatus}</span>
                      {h.notes && <span>| {h.notes}</span>}
                      <span className="mr-auto">{new Date(h.createdAt).toLocaleString("ar-EG")}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          <DialogFooter className="gap-2">
            {detailOrder && canCancel(detailOrder) && (
              <Button variant="destructive" size="sm"
                onClick={() => cancelMutation.mutate(detailOrder.id)}
                disabled={cancelMutation.isPending}
                className="gap-2">
                {cancelMutation.isPending && <Spinner className="h-4 w-4" />}
                إلغاء الطلب
              </Button>
            )}
            <Button variant="outline" onClick={() => setDetailOrder(null)}>إغلاق</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Status Dialog */}
      <Dialog open={!!statusDialogOrder} onOpenChange={(o) => !o && setStatusDialogOrder(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>تحديث حالة الطلب</DialogTitle>
            <DialogDescription>{statusDialogOrder?.orderNumber}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>الحالة الجديدة</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر الحالة" />
                </SelectTrigger>
                <SelectContent>
                  {NEXT_STATUS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>رقم التتبع (اختياري)</Label>
              <Input value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} placeholder="رقم الشحنة" />
            </div>
            <div className="space-y-2">
              <Label>ملاحظات (اختياري)</Label>
              <Textarea value={statusNotes} onChange={(e) => setStatusNotes(e.target.value)} rows={2} placeholder="ملاحظات إضافية" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialogOrder(null)}>إلغاء</Button>
            <Button onClick={submitStatusUpdate} disabled={!newStatus || updateStatusMutation.isPending} className="gap-2">
              {updateStatusMutation.isPending && <Spinner className="h-4 w-4" />}
              تحديث
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
