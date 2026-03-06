import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Search, Eye, ChevronDown, ShoppingCart } from "lucide-react";
import { ordersApi } from "../api/orders";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent } from "../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { LoadingPage, Spinner } from "../components/ui/spinner";
import { Textarea } from "../components/ui/textarea";
import { useToast } from "../components/ui/toast";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../components/ui/table";
import { formatCurrency, formatDate, ORDER_STATUS_COLORS, PAYMENT_STATUS_COLORS } from "../lib/utils";
import type { OrderResponse } from "../types";

const ORDER_STATUSES = [
  { label: "قيد الانتظار", value: "0" },
  { label: "مؤكد", value: "1" },
  { label: "قيد المعالجة", value: "2" },
  { label: "مُشحون", value: "3" },
  { label: "مُسلَّم", value: "4" },
  { label: "ملغي", value: "5" },
];

const statusSchema = z.object({
  newStatus: z.string(),
  notes: z.string().optional(),
  trackingNumber: z.string().optional(),
});
type StatusForm = z.infer<typeof statusSchema>;

export default function Orders() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [detailOrder, setDetailOrder] = useState<OrderResponse | null>(null);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderResponse | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["orders", page, search, filterStatus],
    queryFn: () =>
      ordersApi.getAll({
        pageNumber: page,
        pageSize: 15,
        search: search || undefined,
        orderStatus: filterStatus !== "all" ? filterStatus : undefined,
      }),
  });

  const { register, handleSubmit, reset, setValue, watch, formState: { isSubmitting } } = useForm<StatusForm>({
    resolver: zodResolver(statusSchema),
    defaultValues: { newStatus: "1" },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      ordersApi.updateStatus(id, { ...data, newStatus: parseInt(data.newStatus) }),
    onSuccess: () => {
      toast("تم تحديث حالة الطلب", "success");
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      setStatusDialogOpen(false);
    },
    onError: (err: any) => toast(err?.response?.data?.message ?? "فشل تحديث الحالة", "error"),
  });

  const openStatusDialog = (order: OrderResponse) => {
    setSelectedOrder(order);
    reset({ newStatus: "1", notes: "", trackingNumber: "" });
    setStatusDialogOpen(true);
  };

  const orders = data?.data?.items ?? [];
  const pagination = data?.data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">الطلبات</h2>
          <p className="text-muted-foreground text-sm mt-1">
            {pagination?.totalCount ?? 0} طلب إجمالاً
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="البحث برقم الطلب أو العميل..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pr-9"
          />
        </div>
        <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); setPage(1); }}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="جميع الحالات" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الحالات</SelectItem>
            {ORDER_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.label}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {isLoading ? (
        <LoadingPage />
      ) : orders.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>لا توجد طلبات</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>رقم الطلب</TableHead>
                <TableHead>العميل</TableHead>
                <TableHead>العناصر</TableHead>
                <TableHead>الإجمالي</TableHead>
                <TableHead>الدفع</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>التاريخ</TableHead>
                <TableHead className="text-left">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-mono text-xs text-blue-600">{order.orderNumber}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">{order.customerName}</p>
                      <p className="text-xs text-muted-foreground">{order.customerPhone}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">{order.items?.length ?? 0}</TableCell>
                  <TableCell className="font-semibold">{formatCurrency(order.totalAmount)}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${PAYMENT_STATUS_COLORS[order.paymentStatus] ?? "bg-gray-100 text-gray-800"}`}>
                      {order.paymentStatus}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${ORDER_STATUS_COLORS[order.orderStatus] ?? "bg-gray-100 text-gray-800"}`}>
                      {order.orderStatus}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatDate(order.createdAt)}</TableCell>
                  <TableCell>
                    <div className="flex justify-start gap-2">
                      <Button size="sm" variant="outline" onClick={() => setDetailOrder(order)}>
                        <Eye className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => openStatusDialog(order)}
                        disabled={order.orderStatus === "Cancelled" || order.orderStatus === "Delivered"}>
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={!pagination.hasPreviousPage} onClick={() => setPage((p) => p - 1)}>السابق</Button>
          <span className="text-sm text-muted-foreground">صفحة {pagination.pageNumber} من {pagination.totalPages}</span>
          <Button variant="outline" size="sm" disabled={!pagination.hasNextPage} onClick={() => setPage((p) => p + 1)}>التالي</Button>
        </div>
      )}

      {/* Order Detail Dialog */}
      <Dialog open={!!detailOrder} onOpenChange={(open) => !open && setDetailOrder(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تفاصيل الطلب — {detailOrder?.orderNumber}</DialogTitle>
            <DialogDescription>تم الطلب في {formatDate(detailOrder?.createdAt)}</DialogDescription>
          </DialogHeader>
          {detailOrder && (
            <div className="space-y-4">
              {/* Customer Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">العميل</p>
                  <p className="font-medium">{detailOrder.customerName}</p>
                  <p>{detailOrder.customerEmail}</p>
                  <p>{detailOrder.customerPhone}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">عنوان الشحن</p>
                  <p className="font-medium">{detailOrder.governorateName}</p>
                  <p>{detailOrder.city}</p>
                  <p>{detailOrder.detailedAddress}</p>
                </div>
              </div>

              {/* Items */}
              <div>
                <p className="text-sm font-semibold mb-2">أصناف الطلب</p>
                <div className="space-y-2">
                  {detailOrder.items.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                      {item.productImageUrl && (
                        <img src={`https://localhost:7210${item.productImageUrl}`} alt={item.productName}
                          className="h-10 w-10 rounded-md object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      )}
                      <div className="flex-1">
                        <p className="font-medium text-sm">{item.productName}</p>
                        <p className="text-xs text-muted-foreground">{item.colorName} / {item.sizeName}</p>
                      </div>
                      <div className="text-right text-sm">
                        <p className="font-medium">{formatCurrency(item.totalPrice)}</p>
                        <p className="text-xs text-muted-foreground">x{item.quantity} @ {formatCurrency(item.unitPrice)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Order Summary */}
              <div className="border-t pt-3 space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">المجموع الفرعي</span><span>{formatCurrency(detailOrder.subTotal)}</span></div>
                {detailOrder.discountAmount > 0 && <div className="flex justify-between text-green-600"><span>الخصم</span><span>-{formatCurrency(detailOrder.discountAmount)}</span></div>}
                {detailOrder.couponDiscountAmount > 0 && <div className="flex justify-between text-green-600"><span>كوبون ({detailOrder.couponCode})</span><span>-{formatCurrency(detailOrder.couponDiscountAmount)}</span></div>}
                <div className="flex justify-between"><span className="text-muted-foreground">الشحن</span><span>{formatCurrency(detailOrder.shippingCost)}</span></div>
                <div className="flex justify-between font-bold text-base border-t pt-1 mt-1"><span>الإجمالي</span><span>{formatCurrency(detailOrder.totalAmount)}</span></div>
              </div>

              {/* Status History */}
              {detailOrder.statusHistory?.length > 0 && (
                <div>
                  <p className="text-sm font-semibold mb-2">سجل الحالة</p>
                  <div className="space-y-2">
                    {detailOrder.statusHistory.map((h) => (
                      <div key={h.id} className="flex items-start gap-3 text-sm">
                        <div className="h-2 w-2 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                        <div>
                          <p><span className="text-muted-foreground">{h.oldStatus}</span> → <span className="font-medium">{h.newStatus}</span></p>
                          {h.notes && <p className="text-xs text-muted-foreground">{h.notes}</p>}
                          <p className="text-xs text-muted-foreground">{formatDate(h.createdAt)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Update Status Dialog */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تحديث حالة الطلب</DialogTitle>
            <DialogDescription>الطلب: {selectedOrder?.orderNumber}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit((values) => selectedOrder && updateStatusMutation.mutateAsync({ id: selectedOrder.id, data: values }))} className="space-y-4">
            <div className="space-y-2">
              <Label>الحالة الجديدة</Label>
              <Select value={watch("newStatus")} onValueChange={(v) => setValue("newStatus", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ORDER_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>رقم التتبع (اختياري)</Label>
              <Input {...register("trackingNumber")} placeholder="TRK-12345" />
            </div>
            <div className="space-y-2">
              <Label>ملاحظات (اختياري)</Label>
              <Textarea {...register("notes")} rows={2} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setStatusDialogOpen(false)}>إلغاء</Button>
              <Button type="submit" disabled={isSubmitting || updateStatusMutation.isPending}>
                {(isSubmitting || updateStatusMutation.isPending) ? <Spinner size="sm" className="ml-2" /> : null}
                تحديث الحالة
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
