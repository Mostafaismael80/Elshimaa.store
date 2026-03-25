import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, Percent } from "lucide-react";
import { discountsApi } from "../api/discounts";
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
import type { DiscountResponse } from "../types";

// ─── Constants ──────────────────────────────────────────────────────────────────

const DISCOUNT_TYPES = [
  { label: "نسبة مئوية (%)", value: "0" },
  { label: "مبلغ ثابت (ج.م)", value: "1" },
];

const TARGET_TYPES = [
  { label: "منتج", value: "0" },
  { label: "فئة", value: "1" },
];

const DISCOUNT_TYPE_LABELS: Record<string, string> = {
  Percentage: "نسبة مئوية",
  FixedAmount: "مبلغ ثابت",
};

const TARGET_TYPE_LABELS: Record<string, string> = {
  Product: "منتج",
  Category: "فئة",
};

// ─── Validity computation (frontend-side) ───────────────────────────────────────

function isDiscountValidNow(d: DiscountResponse): boolean {
  if (!d.isActive) return false;
  const now = new Date();
  const start = new Date(d.startDate);
  const end = d.endDate ? new Date(d.endDate) : null;
  return now >= start && (end === null || now <= end);
}

// ─── Schema ─────────────────────────────────────────────────────────────────────

const schema = z.object({
  name: z.string().min(1, "الاسم مطلوب"),
  discountType: z.string(),
  discountValue: z.coerce.number().min(0),
  targetType: z.string(),
  targetId: z.string().min(1, "معرّف الهدف مطلوب"),
  startDate: z.string().min(1, "تاريخ البداية مطلوب"),
  endDate: z.string().optional(),
  isActive: z.boolean(),
});
type FormValues = z.infer<typeof schema>;

// ─── Component ──────────────────────────────────────────────────────────────────

export default function Discounts() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selected, setSelected] = useState<DiscountResponse | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["discounts", showInactive],
    queryFn: () => discountsApi.getAll(showInactive),
  });

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: { discountType: "0", targetType: "0", isActive: true },
  });

  // ─── Mutations ──────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: (data: any) => discountsApi.create({
      ...data,
      discountType: parseInt(data.discountType),
      targetType: parseInt(data.targetType),
    }),
    onSuccess: () => {
      toast("تم إنشاء الخصم بنجاح", "success");
      queryClient.invalidateQueries({ queryKey: ["discounts"] });
      setDialogOpen(false);
    },
    onError: (err: any) => toast(err?.response?.data?.message ?? "فشل الإنشاء", "error"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => discountsApi.update(id, {
      ...data,
      discountType: parseInt(data.discountType),
      targetType: parseInt(data.targetType),
    }),
    onSuccess: () => {
      toast("تم تحديث الخصم بنجاح", "success");
      queryClient.invalidateQueries({ queryKey: ["discounts"] });
      setDialogOpen(false);
    },
    onError: (err: any) => toast(err?.response?.data?.message ?? "فشل التحديث", "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => discountsApi.delete(id),
    onSuccess: () => {
      toast("تم حذف الخصم", "success");
      queryClient.invalidateQueries({ queryKey: ["discounts"] });
      setDeleteDialogOpen(false);
    },
    onError: (err: any) => toast(err?.response?.data?.message ?? "فشل الحذف", "error"),
  });

  // ─── Dialog openers ────────────────────────────────────────────────────────

  const openCreate = () => {
    setSelected(null);
    reset({ name: "", discountType: "0", discountValue: 0, targetType: "0", targetId: "", startDate: "", endDate: "", isActive: true });
    setDialogOpen(true);
  };

  const openEdit = (d: DiscountResponse) => {
    setSelected(d);
    const dtMap: Record<string, string> = { Percentage: "0", FixedAmount: "1" };
    const ttMap: Record<string, string> = { Product: "0", Category: "1" };
    reset({
      name: d.name,
      discountType: dtMap[d.discountType] ?? "0",
      discountValue: d.discountValue,
      targetType: ttMap[d.targetType] ?? "0",
      targetId: d.targetId ?? "",
      startDate: d.startDate?.slice(0, 16),
      endDate: d.endDate?.slice(0, 16) ?? "",
      isActive: d.isActive,
    });
    setDialogOpen(true);
  };

  const onSubmit = async (values: FormValues) => {
    if (selected) {
      await updateMutation.mutateAsync({ id: selected.id, data: values });
    } else {
      await createMutation.mutateAsync(values);
    }
  };

  const discounts = data?.data ?? [];

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">الخصومات</h2>
          <p className="text-muted-foreground text-sm mt-1">{discounts.length} خصم</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
            عرض غير النشطة
          </label>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" /> إضافة خصم
          </Button>
        </div>
      </div>

      {/* Table */}
      {isLoading ? <LoadingPage /> : discounts.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <Percent className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>لا توجد خصومات</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">الاسم</TableHead>
                <TableHead className="text-right">النوع</TableHead>
                <TableHead className="text-right">القيمة</TableHead>
                <TableHead className="text-right">الهدف</TableHead>
                <TableHead className="text-right">اسم الهدف</TableHead>
                <TableHead className="text-right">الصلاحية</TableHead>
                <TableHead className="text-right">الحالة</TableHead>
                <TableHead className="text-left">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {discounts.map((d) => {
                const valid = isDiscountValidNow(d);
                return (
                  <TableRow key={d.id}>
                    <TableCell className="text-right font-medium">{d.name}</TableCell>
                    <TableCell className="text-right text-sm">{DISCOUNT_TYPE_LABELS[d.discountType] ?? d.discountType}</TableCell>
                    <TableCell className="text-right font-semibold text-blue-600">
                      {d.discountType === "Percentage" ? `${d.discountValue}%` : formatCurrency(d.discountValue)}
                    </TableCell>
                    <TableCell className="text-right text-sm">{TARGET_TYPE_LABELS[d.targetType] ?? d.targetType}</TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">{d.targetName ?? "—"}</TableCell>
                    <TableCell className="text-right text-xs">
                      <div>
                        <p>{formatDateShort(d.startDate)}</p>
                        <p className="text-muted-foreground">→ {d.endDate ? formatDateShort(d.endDate) : "مفتوح"}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={valid ? "success" : "secondary"}>
                        {valid ? "صالح" : d.isActive ? "غير ساري" : "غير نشط"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-left">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => openEdit(d)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => { setSelected(d); setDeleteDialogOpen(true); }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selected ? "تعديل الخصم" : "إضافة خصم جديد"}</DialogTitle>
            <DialogDescription>{selected ? "قم بتحديث تفاصيل الخصم." : "أدخل تفاصيل الخصم الجديد."}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>الاسم</Label>
              <Input {...register("name")} placeholder="خصم الصيف" />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>نوع الخصم</Label>
                <Select value={watch("discountType")} onValueChange={(v) => setValue("discountType", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DISCOUNT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>القيمة {watch("discountType") === "0" ? "(%)" : "(ج.م)"}</Label>
                <Input type="number" step="0.01" min="0" {...register("discountValue")} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>نوع الهدف</Label>
                <Select value={watch("targetType")} onValueChange={(v) => setValue("targetType", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TARGET_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>معرّف الهدف (UUID)</Label>
                <Input {...register("targetId")} placeholder="معرّف المنتج أو الفئة" className="font-mono text-xs" />
                {errors.targetId && <p className="text-xs text-red-500">{errors.targetId.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>تاريخ البداية</Label>
                <Input type="datetime-local" {...register("startDate")} />
                {errors.startDate && <p className="text-xs text-red-500">{errors.startDate.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>تاريخ النهاية (اختياري)</Label>
                <Input type="datetime-local" {...register("endDate")} />
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
            <DialogTitle>حذف الخصم</DialogTitle>
            <DialogDescription>هل أنت متأكد من حذف خصم "{selected?.name}"؟</DialogDescription>
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
