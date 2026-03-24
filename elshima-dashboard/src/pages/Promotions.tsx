import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, Zap } from "lucide-react";
import { promotionsApi } from "../api/promotions";
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
import { formatCurrency } from "../lib/utils";
import type { PromotionResponse } from "../types";

const PROMOTION_TYPES = [
  { label: "نسبة مئوية", value: "0" },
  { label: "مبلغ ثابت", value: "1" },
  { label: "اشتري X واحصل على Y", value: "2" },
  { label: "شحن مجاني", value: "3" },
];

const schema = z.object({
  name: z.string().min(1, "الاسم مطلوب"),
  description: z.string().optional(),
  promotionType: z.string(),
  value: z.coerce.number().optional(),
  priority: z.coerce.number().default(0),
  isStackable: z.boolean().default(true),
  allowCouponStacking: z.boolean().default(true),
  buyQuantity: z.coerce.number().optional(),
  getQuantity: z.coerce.number().optional(),
  startDate: z.string().min(1, "تاريخ البداية مطلوب"),
  endDate: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});
type FormValues = z.infer<typeof schema>;

export default function Promotions() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selected, setSelected] = useState<PromotionResponse | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["promotions", showInactive],
    queryFn: () => promotionsApi.getAll(showInactive),
  });

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: { promotionType: "0", priority: 0, isStackable: true, allowCouponStacking: true, isActive: true },
  });

  const ptValue = watch("promotionType");
  const isBuyXGetY = ptValue === "2";
  const isFreeShipping = ptValue === "3";

  const createMutation = useMutation({
    mutationFn: (data: any) => promotionsApi.create({ ...data, promotionType: parseInt(data.promotionType) }),
    onSuccess: () => { toast("تم إنشاء العرض بنجاح", "success"); queryClient.invalidateQueries({ queryKey: ["promotions"] }); setDialogOpen(false); },
    onError: (err: any) => toast(err?.response?.data?.message ?? "فشل إنشاء العرض", "error"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      promotionsApi.update(id, { ...data, promotionType: parseInt(data.promotionType) }),
    onSuccess: () => { toast("تم تحديث العرض بنجاح", "success"); queryClient.invalidateQueries({ queryKey: ["promotions"] }); setDialogOpen(false); },
    onError: (err: any) => toast(err?.response?.data?.message ?? "فشل التحديث", "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => promotionsApi.delete(id),
    onSuccess: () => { toast("تم حذف العرض بنجاح", "success"); queryClient.invalidateQueries({ queryKey: ["promotions"] }); setDeleteDialogOpen(false); },
    onError: (err: any) => toast(err?.response?.data?.message ?? "فشل الحذف", "error"),
  });

  const openCreate = () => {
    setSelected(null);
    reset({ name: "", description: "", promotionType: "0", value: 0, priority: 0, isStackable: true, allowCouponStacking: true, buyQuantity: 0, getQuantity: 0, startDate: "", endDate: "", isActive: true });
    setDialogOpen(true);
  };

  const openEdit = (p: PromotionResponse) => {
    setSelected(p);
    reset({
      name: p.name,
      description: p.description ?? "",
      promotionType: p.promotionType.toString(),
      value: p.value ?? 0,
      priority: p.priority,
      isStackable: p.isStackable,
      allowCouponStacking: p.allowCouponStacking,
      buyQuantity: p.buyQuantity ?? 0,
      getQuantity: p.getQuantity ?? 0,
      startDate: p.startDate?.slice(0, 16),
      endDate: p.endDate ? p.endDate.slice(0, 16) : "",
      isActive: p.isActive,
    });
    setDialogOpen(true);
  };

  const onSubmit = async (values: FormValues) => {
    const payload = { ...values };
    if (isFreeShipping) { payload.value = 0; payload.buyQuantity = 0; payload.getQuantity = 0; }
    if (!isBuyXGetY) { payload.buyQuantity = 0; payload.getQuantity = 0; }
    
    if (selected) {
      await updateMutation.mutateAsync({ id: selected.id, data: payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
  };

  const promotions = data?.data ?? [];

  const getStatus = (p: PromotionResponse) => {
    if (!p.isActive) return "غير نشط";
    const now = new Date();
    const start = new Date(p.startDate);
    const end = p.endDate ? new Date(p.endDate) : null;

    if (now < start) return "مجدول";
    if (end && now > end) return "منتهي";
    return "نشط";
  };

  const filteredPromotions = promotions.filter(p => {
    if (showInactive) return true;
    return getStatus(p) === "نشط";
  });

  const formatPromotionValue = (p: PromotionResponse) => {
    switch (p.promotionType) {
      case 0: return `${p.value}%`;
      case 1: return formatCurrency(p.value ?? 0);
      case 2: return `اشتري ${p.buyQuantity} وخد ${p.getQuantity}`;
      case 3: return "مجاناً";
      default: return "—";
    }
  };

  const ptTranslate: Record<number, string> = { 0: "نسبة", 1: "مبلغ", 2: "BOGO", 3: "شحن مجاني" };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">محرك العروض (Promotions)</h2>
          <p className="text-muted-foreground text-sm mt-1">{filteredPromotions.length} عرض نشط بالسلة</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
            عرض غير النشطة أو المنتهية
          </label>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" /> إضافة عرض تلقائي
          </Button>
        </div>
      </div>

      {isLoading ? <LoadingPage /> : filteredPromotions.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <Zap className="h-12 w-12 mx-auto mb-3 opacity-30 text-yellow-500" />
            <p>لا توجد عروض تلقائية مبرمجة</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right w-1/4">الاسم</TableHead>
                <TableHead className="text-right">النوع</TableHead>
                <TableHead className="text-right">القيمة</TableHead>
                <TableHead className="text-right">الأولوية</TableHead>
                <TableHead className="text-right">تتراكم؟</TableHead>
                <TableHead className="text-right">البداية</TableHead>
                <TableHead className="text-right">النهاية</TableHead>
                <TableHead className="text-right">الحالة</TableHead>
                <TableHead className="text-left w-24">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPromotions.map((p) => {
                const status = getStatus(p);
                let badgeVariant: "success" | "secondary" | "destructive" | "default" = "secondary";
                if (status === "نشط") badgeVariant = "success";
                if (status === "مجدول") badgeVariant = "default";
                if (status === "منتهي") badgeVariant = "destructive";

                return (
                  <TableRow key={p.id}>
                    <TableCell className="text-right font-medium min-w-[200px] whitespace-normal leading-relaxed">
                      {p.name}
                      {p.description && <p className="text-xs text-muted-foreground">{p.description}</p>}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">{ptTranslate[p.promotionType]}</TableCell>
                    <TableCell className="text-right font-semibold text-blue-600 whitespace-nowrap">
                      {formatPromotionValue(p)}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">{p.priority}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <div className="flex flex-col gap-1 text-xs">
                        {p.isStackable ? <span className="text-green-600">القوائم: نعم</span> : <span className="text-red-500">القوائم: لا</span>}
                        {p.allowCouponStacking ? <span className="text-green-600">الكوبون: نعم</span> : <span className="text-red-500">الكوبون: لا</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-xs whitespace-nowrap">{new Date(p.startDate).toLocaleDateString("en-GB")}</TableCell>
                    <TableCell className="text-right text-xs whitespace-nowrap">{p.endDate ? new Date(p.endDate).toLocaleDateString("en-GB") : "مفتوح"}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <Badge variant={badgeVariant}>{status}</Badge>
                    </TableCell>
                    <TableCell className="text-left whitespace-nowrap">
                      <div className="flex justify-end items-center gap-2">
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => openEdit(p)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => { setSelected(p); setDeleteDialogOpen(true); }}>
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
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{selected ? "تعديل عرض" : "إضافة عرض تلقائي جديد للمحرك"}</DialogTitle>
            <DialogDescription>هذا العرض سيُطبق أوتوماتيكياً في سلة مشتريات العميل.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label>اسم العرض (يظهر للعميل كرسالة توفير)</Label>
                <Input {...register("name")} placeholder="مثال: خصم الصيف 10%" />
                {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
              </div>
              <div className="space-y-2 col-span-2">
                <Label>وصف داخلي (اختياري)</Label>
                <Input {...register("description")} placeholder="ملاحظات للإدارة" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border p-3 bg-gray-50/50 rounded-lg">
              <div className="space-y-2">
                <Label>نوع العرض</Label>
                <Select value={watch("promotionType")} onValueChange={(v) => setValue("promotionType", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PROMOTION_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {!isFreeShipping && !isBuyXGetY && (
                <div className="space-y-2">
                  <Label>القيمة {watch("promotionType") === "0" ? "(%)" : "(ج.م)"}</Label>
                  <Input type="number" step="0.01" {...register("value")} disabled={isFreeShipping} />
                </div>
              )}

              {isBuyXGetY && (
                <>
                  <div className="space-y-2">
                    <Label>اشتري قطعة (كمية)</Label>
                    <Input type="number" min="1" {...register("buyQuantity")} />
                  </div>
                  <div className="space-y-2">
                    <Label>احصل على (كمية مجانية)</Label>
                    <Input type="number" min="1" {...register("getQuantity")} />
                  </div>
                </>
              )}
            </div>

            <div className="grid grid-cols-3 gap-4 border p-3 rounded-lg">
              <div className="space-y-2">
                <Label>الأولوية (الأكبر أولاً)</Label>
                <Input type="number" {...register("priority")} />
              </div>
              <div className="space-y-2 pt-6">
                <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                  <input type="checkbox" {...register("isStackable")} className="rounded" />
                  قابل للدمج مع عروض أخرى؟
                </label>
              </div>
              <div className="space-y-2 pt-6">
                <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                  <input type="checkbox" {...register("allowCouponStacking")} className="rounded" />
                  يسمح بإضافة كوبون معه؟
                </label>
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
              تفعيل العرض
            </label>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>إلغاء</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Spinner size="sm" className="ml-2" /> : null}
                {selected ? "تحديث العرض" : "حفظ العرض"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إلغاء تنشيط / حذف العرض</DialogTitle>
            <DialogDescription>هل أنت متأكد من حذف عرض "{selected?.name}"؟ سيؤدي ذلك لإيقافه فوراً بجميع السلات.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>تراجع</Button>
            <Button variant="destructive" disabled={deleteMutation.isPending}
              onClick={() => selected && deleteMutation.mutate(selected.id)}>
              {deleteMutation.isPending ? <Spinner size="sm" className="ml-2" /> : null}
              نعم، حذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
