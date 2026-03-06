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

const DISCOUNT_TYPES = [
  { label: "نسبة مئوية", value: "0" },
  { label: "مبلغ ثابت", value: "1" },
];

const TARGET_TYPES = [
  { label: "جميع المنتجات", value: "0" },
  { label: "منتج", value: "1" },
  { label: "فئة", value: "2" },
];

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  discountType: z.string(),
  discountValue: z.coerce.number().min(0),
  targetType: z.string(),
  targetId: z.string().nullable().optional(),
  startDate: z.string().min(1, "Start date required"),
  endDate: z.string().min(1, "End date required"),
  isActive: z.boolean(),
});
type FormValues = z.infer<typeof schema>;

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

  const createMutation = useMutation({
    mutationFn: (data: any) => discountsApi.create({ ...data, discountType: parseInt(data.discountType), targetType: parseInt(data.targetType) }),
    onSuccess: () => { toast("تم إنشاء الخصم", "success"); queryClient.invalidateQueries({ queryKey: ["discounts"] }); setDialogOpen(false); },
    onError: (err: any) => toast(err?.response?.data?.message ?? "فشل الإنشاء", "error"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      discountsApi.update(id, { ...data, discountType: parseInt(data.discountType), targetType: parseInt(data.targetType) }),
    onSuccess: () => { toast("تم تحديث الخصم", "success"); queryClient.invalidateQueries({ queryKey: ["discounts"] }); setDialogOpen(false); },
    onError: (err: any) => toast(err?.response?.data?.message ?? "فشل التحديث", "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => discountsApi.delete(id),
    onSuccess: () => { toast("تم حذف الخصم", "success"); queryClient.invalidateQueries({ queryKey: ["discounts"] }); setDeleteDialogOpen(false); },
    onError: (err: any) => toast(err?.response?.data?.message ?? "فشل الحذف", "error"),
  });

  const openCreate = () => {
    setSelected(null);
    reset({ name: "", discountType: "0", discountValue: 0, targetType: "0", targetId: null, startDate: "", endDate: "", isActive: true });
    setDialogOpen(true);
  };

  const openEdit = (d: DiscountResponse) => {
    setSelected(d);
    const dtMap: Record<string, string> = { Percentage: "0", FixedAmount: "1" };
    const ttMap: Record<string, string> = { All: "0", Product: "1", Category: "2" };
    reset({
      name: d.name,
      discountType: dtMap[d.discountType] ?? "0",
      discountValue: d.discountValue,
      targetType: ttMap[d.targetType] ?? "0",
      targetId: d.targetId,
      startDate: d.startDate?.slice(0, 16),
      endDate: d.endDate?.slice(0, 16),
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
  const isActive = (d: DiscountResponse) => d.isActive && new Date(d.endDate) >= new Date();

  return (
    <div className="space-y-6">
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
                <TableHead>الاسم</TableHead>
                <TableHead>النوع</TableHead>
                <TableHead>القيمة</TableHead>
                <TableHead>الهدف</TableHead>
                <TableHead>البداية</TableHead>
                <TableHead>النهاية</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead className="text-left">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {discounts.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.name}</TableCell>
                  <TableCell>{d.discountType}</TableCell>
                  <TableCell className="font-semibold text-blue-600">
                    {d.discountType === "Percentage" ? `${d.discountValue}%` : formatCurrency(d.discountValue)}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm">{d.targetType}</p>
                      {d.targetName && <p className="text-xs text-muted-foreground">{d.targetName}</p>}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">{formatDateShort(d.startDate)}</TableCell>
                  <TableCell className="text-xs">{formatDateShort(d.endDate)}</TableCell>
                  <TableCell>
                    <Badge variant={isActive(d) ? "success" : "secondary"}>
                      {isActive(d) ? "نشط" : "غير نشط"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-start gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEdit(d)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => { setSelected(d); setDeleteDialogOpen(true); }}>
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
            <DialogTitle>{selected ? "تعديل الخصم" : "إضافة خصم جديد"}</DialogTitle>
            <DialogDescription>قم بإعداد تفاصيل الخصم أدناه.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>اسم الخصم</Label>
              <Input {...register("name")} placeholder="عرض الصيف" />
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
                <Input type="number" step="0.01" {...register("discountValue")} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>نوع الهدف</Label>
              <Select value={watch("targetType")} onValueChange={(v) => setValue("targetType", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TARGET_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
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
            <DialogTitle>حذف الخصم</DialogTitle>
            <DialogDescription>هل أنت متأكد من حذف "{selected?.name}"?</DialogDescription>
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
