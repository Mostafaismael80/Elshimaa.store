import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, Ticket, Copy, CheckCheck } from "lucide-react";
import { couponsApi } from "../api/coupons";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Card, CardContent } from "../components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { LoadingPage, Spinner } from "../components/ui/spinner";
import { useToast } from "../components/ui/toast";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../components/ui/table";
import { formatCurrency, formatDateShort } from "../lib/utils";
import type { CouponResponse } from "../types";

const DISCOUNT_TYPES = [
  { label: "نسبة مئوية", value: "0" },
  { label: "مبلغ ثابت", value: "1" },
];

const schema = z.object({
  code: z.string().min(1, "Code is required"),
  description: z.string().optional(),
  discountType: z.string(),
  discountValue: z.coerce.number().min(0),
  minimumOrderAmount: z.coerce.number().min(0).optional(),
  maximumDiscountAmount: z.coerce.number().min(0).optional(),
  usageLimit: z.coerce.number().nullable().optional(),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  isActive: z.boolean(),
});
type FormValues = z.infer<typeof schema>;

export default function Coupons() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selected, setSelected] = useState<CouponResponse | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["coupons", showInactive],
    queryFn: () => couponsApi.getAll(showInactive),
  });

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: { discountType: "0", isActive: true },
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => couponsApi.create({ ...data, discountType: parseInt(data.discountType) }),
    onSuccess: () => { toast("تم إنشاء الكوبون", "success"); queryClient.invalidateQueries({ queryKey: ["coupons"] }); setDialogOpen(false); },
    onError: (err: any) => toast(err?.response?.data?.message ?? "فشل الإنشاء", "error"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      couponsApi.update(id, { ...data, discountType: parseInt(data.discountType) }),
    onSuccess: () => { toast("تم تحديث الكوبون", "success"); queryClient.invalidateQueries({ queryKey: ["coupons"] }); setDialogOpen(false); },
    onError: (err: any) => toast(err?.response?.data?.message ?? "فشل التحديث", "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => couponsApi.delete(id),
    onSuccess: () => { toast("تم حذف الكوبون", "success"); queryClient.invalidateQueries({ queryKey: ["coupons"] }); setDeleteDialogOpen(false); },
    onError: (err: any) => toast(err?.response?.data?.message ?? "فشل الحذف", "error"),
  });

  const openCreate = () => {
    setSelected(null);
    reset({ code: "", description: "", discountType: "0", discountValue: 0, startDate: "", endDate: "", isActive: true });
    setDialogOpen(true);
  };

  const openEdit = (c: CouponResponse) => {
    setSelected(c);
    const dtMap: Record<string, string> = { Percentage: "0", FixedAmount: "1" };
    reset({
      code: c.code,
      description: c.description ?? undefined,
      discountType: dtMap[c.discountType] ?? "0",
      discountValue: c.discountValue,
      minimumOrderAmount: c.minimumOrderAmount ?? undefined,
      maximumDiscountAmount: c.maximumDiscountAmount ?? undefined,
      usageLimit: c.usageLimit ?? undefined,
      startDate: c.startDate?.slice(0, 16),
      endDate: c.endDate?.slice(0, 16),
      isActive: c.isActive,
    });
    setDialogOpen(true);
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const onSubmit = async (values: FormValues) => {
    if (selected) {
      await updateMutation.mutateAsync({ id: selected.id, data: values });
    } else {
      await createMutation.mutateAsync(values);
    }
  };

  const coupons = data?.data ?? [];

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">الكوبونات</h2>
          <p className="text-muted-foreground text-sm mt-1">{coupons.length} كوبون</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
            عرض غير النشطة
          </label>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" /> إضافة كوبون
          </Button>
        </div>
      </div>

      {isLoading ? <LoadingPage /> : coupons.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <Ticket className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>لا توجد كوبونات</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">الكود</TableHead>
                <TableHead className="text-right">النوع</TableHead>
                <TableHead className="text-right">القيمة</TableHead>
                <TableHead className="text-right">الحد الأدنى للطلب</TableHead>
                <TableHead className="text-right">الاستخدام</TableHead>
                <TableHead className="text-right">الصلاحية</TableHead>
                <TableHead className="text-right">الحالة</TableHead>
                <TableHead className="text-right">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {coupons.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="text-right">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-sm">{c.code}</span>
                      <button onClick={() => copyCode(c.code)} className="text-muted-foreground hover:text-blue-600 transition-colors">
                        {copiedCode === c.code ? <CheckCheck className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                    {c.description && <p className="text-xs text-muted-foreground mt-0.5">{c.description}</p>}
                  </TableCell>
                  <TableCell className="text-right text-sm">{c.discountType}</TableCell>
                  <TableCell className="text-right font-semibold text-blue-600">
                    {c.discountType === "Percentage" ? `${c.discountValue}%` : formatCurrency(c.discountValue)}
                  </TableCell>
                  <TableCell className="text-right text-sm">{(c.minimumOrderAmount ?? 0) > 0 ? formatCurrency(c.minimumOrderAmount ?? 0) : "—"}</TableCell>
                  <TableCell className="text-right">
                    <div className="text-sm">
                      <span className="font-medium">{c.usedCount}</span>
                      {c.usageLimit && <span className="text-muted-foreground"> / {c.usageLimit}</span>}
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-xs">
                    <div>
                      <p>{formatDateShort(c.startDate)}</p>
                      <p className="text-muted-foreground">→ {formatDateShort(c.endDate)}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant={c.isValid && c.isActive ? "success" : "secondary"}>
                      {c.isValid && c.isActive ? "صالح" : "منتهي"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-start gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEdit(c)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => { setSelected(c); setDeleteDialogOpen(true); }}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selected ? "تعديل الكوبون" : "إضافة كوبون جديد"}</DialogTitle>
            <DialogDescription>قم بإعداد تفاصيل الكوبون أدناه.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>كود الكوبون</Label>
                <Input {...register("code")} placeholder="SAVE20" className="uppercase" />
                {errors.code && <p className="text-xs text-red-500">{errors.code.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>نوع الخصم</Label>
                <Select value={watch("discountType")} onValueChange={(v) => setValue("discountType", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DISCOUNT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>الوصف (اختياري)</Label>
              <Input {...register("description")} placeholder="كوبون خصم الصيف" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>القيمة {watch("discountType") === "0" ? "(%)" : "(ج.م)"}</Label>
                <Input type="number" step="0.01" {...register("discountValue")} />
              </div>
              <div className="space-y-2">
                <Label>الحد الأدنى لقيمة الطلب</Label>
                <Input type="number" step="0.01" {...register("minimumOrderAmount")} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>الحد الأقصى للخصم (ج.م)</Label>
                <Input type="number" step="0.01" {...register("maximumDiscountAmount")} />
              </div>
              <div className="space-y-2">
                <Label>حد الاستخدام (فارغ = غير محدود)</Label>
                <Input type="number" {...register("usageLimit")} placeholder="100" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>تاريخ البداية</Label>
                <Input type="datetime-local" {...register("startDate")} />
                {errors.startDate && <p className="text-xs text-red-500">{errors.startDate.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>تاريخ النهاية</Label>
                <Input type="datetime-local" {...register("endDate")} />
                {errors.endDate && <p className="text-xs text-red-500">{errors.endDate.message}</p>}
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" {...register("isActive")} className="rounded" />
              نشط
            </label>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>إلغاء</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Spinner size="sm" className="ml-2" /> : null}
                {selected ? "تحديث" : "إنشاء"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>حذف الكوبون</DialogTitle>
            <DialogDescription>هل أنت متأكد من حذف الكوبون "{selected?.code}"?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>إلغاء</Button>
            <Button variant="destructive" disabled={deleteMutation.isPending}
              onClick={() => selected && deleteMutation.mutate(selected.id)}>
              {deleteMutation.isPending ? <Spinner size="sm" className="ml-2" /> : null}
              حذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
