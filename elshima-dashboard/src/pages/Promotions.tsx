import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, Zap } from "lucide-react";
import { promotionsApi } from "../api/promotions";
import { productsApi } from "../api/products";
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

// ─── Business Logic Enums ────────────────────────────────────────────────────────
const BIZ_TYPES = [
  { label: "خصم على السلة", value: "cart_discount" },
  { label: "خصم على جميع المنتجات", value: "sitewide_discount" },
  { label: "اشتري X واحصل على Y", value: "buy_x_get_y" },
  { label: "شحن مجاني", value: "free_shipping" },
];

const DISCOUNT_TYPES = [
  { label: "نسبة مئوية (%)", value: "0" },
  { label: "مبلغ ثابت (ج.م)", value: "1" },
];

const schema = z.object({
  name: z.string().min(1, "الاسم مطلوب"),
  bizType: z.string().min(1, "نوع العرض مطلوب"),
  discountType: z.string().optional(), // 0 or 1
  value: z.coerce.number().optional().default(0),
  minOrderValue: z.coerce.number().nullable().optional(),
  priority: z.coerce.number().default(0),
  isStackable: z.boolean().default(true),
  allowCouponStacking: z.boolean().default(true),
  productId: z.string().optional(),
  buyQuantity: z.coerce.number().optional().default(0),
  getQuantity: z.coerce.number().optional().default(0),
  getProductId: z.string().optional(),
  startDate: z.string().min(1, "تاريخ البداية مطلوب"),
  endDate: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
}).refine((data) => {
  if (!data.startDate || !data.endDate) return true;
  return new Date(data.endDate) >= new Date(data.startDate);
}, { message: "تاريخ النهاية يجب أن يكون بعد تاريخ البداية", path: ["endDate"] }).refine((data) => {
  // Fix #5: Percentage value must not exceed 100
  const isPercent = (data.bizType === "cart_discount" || data.bizType === "sitewide_discount") && data.discountType === "0";
  if (isPercent && data.value > 100) return false;
  return true;
}, { message: "النسبة المئوية لا يمكن أن تتجاوز 100%", path: ["value"] }).refine((data) => {
  // BUG #4: Required product must be selected for BuyXGetY
  if (data.bizType === "buy_x_get_y" && (!data.productId || data.productId === "none")) return false;
  return true;
}, { message: "يجب اختيار المنتج المطلوب", path: ["productId"] });

type FormValues = z.infer<typeof schema>;

export default function Promotions() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selected, setSelected] = useState<PromotionResponse | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  const { data, isLoading } = useQuery({ queryKey: ["promotions", showInactive], queryFn: () => promotionsApi.getAll(showInactive) });
  const { data: productsData } = useQuery({ queryKey: ["products-all"], queryFn: () => productsApi.getAll({ pageSize: 1000 }) });
  
  const products = productsData?.data?.items ?? [];
  const promotions = data?.data ?? [];

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: { bizType: "cart_discount", discountType: "0", priority: 0, isStackable: true, allowCouponStacking: true, isActive: true },
  });

  const bizType = watch("bizType");
  const isPercentOrFixed = bizType === "cart_discount" || bizType === "sitewide_discount";
  const needsMinOrder = bizType === "cart_discount" || bizType === "free_shipping";

  // ─── Mutations ────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (payload: any) => promotionsApi.create(payload),
    onSuccess: () => {
      toast("تم إنشاء العرض بنجاح", "success");
      queryClient.invalidateQueries({ queryKey: ["promotions"] });
      setDialogOpen(false);
    },
    onError: (err: any) => toast(err?.response?.data?.message ?? "فشل البناء", "error"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => promotionsApi.update(id, data),
    onSuccess: () => {
      toast("تم التحديث بنجاح", "success");
      queryClient.invalidateQueries({ queryKey: ["promotions"] });
      setDialogOpen(false);
    },
    onError: (err: any) => toast(err?.response?.data?.message ?? "فشل التحديث", "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => promotionsApi.delete(id),
    onSuccess: () => {
      toast("تم الحذف بنجاح", "success");
      queryClient.invalidateQueries({ queryKey: ["promotions"] });
      setDeleteDialogOpen(false);
    },
  });

  // ─── Transformer ────────────────────────────────────────────────────────────
  const mapUiToApi = (vals: FormValues) => {
    let type = 0, scope = 0;
    if (vals.bizType === "cart_discount") {
      type = parseInt(vals.discountType || "0"); scope = 2; // Cart
    } else if (vals.bizType === "sitewide_discount") {
      type = parseInt(vals.discountType || "0"); scope = 3; // AllProducts
    } else if (vals.bizType === "free_shipping") {
      type = 3; scope = 2; // Cart FreeShipping
    } else if (vals.bizType === "buy_x_get_y") {
      type = 2; scope = 0; // Product
    }

    return {
      name: vals.name, type, scope, value: isPercentOrFixed ? vals.value : 0,
      priority: vals.priority, isStackable: vals.isStackable, allowCouponStacking: vals.allowCouponStacking,
      minOrderValue: needsMinOrder && vals.minOrderValue && vals.minOrderValue > 0 ? vals.minOrderValue : null,
      productId: vals.bizType === "buy_x_get_y" && vals.productId !== "none" ? vals.productId : null,
      buyQuantity: vals.bizType === "buy_x_get_y" ? vals.buyQuantity : null,
      getQuantity: vals.bizType === "buy_x_get_y" ? vals.getQuantity : null,
      getProductId: vals.bizType === "buy_x_get_y" && vals.getProductId && vals.getProductId !== "none" ? vals.getProductId : null,
      startDate: vals.startDate, endDate: vals.endDate || null, isActive: vals.isActive
    };
  };

  const mapApiToUi = (p: PromotionResponse): FormValues => {
    let biz = "cart_discount";
    if (p.type === "FreeShipping") biz = "free_shipping";
    else if (p.type === "BuyXGetY") biz = "buy_x_get_y";
    else if (p.scope === "AllProducts") biz = "sitewide_discount";

    return {
      name: p.name, bizType: biz, discountType: p.type === "Fixed" ? "1" : "0", value: p.value || 0,
      minOrderValue: p.minOrderValue, priority: p.priority, isStackable: p.isStackable, allowCouponStacking: p.allowCouponStacking,
      productId: p.productId || "none", buyQuantity: p.buyQuantity || 0, getQuantity: p.getQuantity || 0, getProductId: p.getProductId || "none",
      startDate: p.startDate?.slice(0, 16), endDate: p.endDate ? p.endDate.slice(0, 16) : "", isActive: p.isActive
    };
  };

  const onSubmit = async (values: FormValues) => {
    const payload = mapUiToApi(values);
    if (selected) await updateMutation.mutateAsync({ id: selected.id, data: payload });
    else await createMutation.mutateAsync(payload);
  };

  const openCreate = () => {
    setSelected(null);
    reset({ name: "", bizType: "cart_discount", discountType: "0", value: 0, minOrderValue: null, priority: 0, isStackable: true, allowCouponStacking: true, isActive: true, productId: "none", getProductId: "none", buyQuantity: 1, getQuantity: 1, startDate: "", endDate: "" });
    setDialogOpen(true);
  };

  const openEdit = (p: PromotionResponse) => { setSelected(p); reset(mapApiToUi(p)); setDialogOpen(true); };

  const getStatus = (p: PromotionResponse) => {
    if (!p.isActive) return "غير نشط";
    const now = new Date(), start = new Date(p.startDate), end = p.endDate ? new Date(p.endDate) : null;
    return now < start ? "مجدول" : end && now > end ? "منتهي" : "نشط";
  };

  const filteredPromotions = promotions.filter(p => showInactive || getStatus(p) === "نشط");

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">العروض التلقائية</h2>
          <p className="text-muted-foreground text-sm mt-1">
            {filteredPromotions.length} عرض {showInactive ? "إجمالي" : "نشط"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />عرض جميع العروض (بما فيها المعطّلة والمنتهية)</label>
          <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> إضافة عرض جديد</Button>
        </div>
      </div>

      {isLoading ? <LoadingPage /> : filteredPromotions.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground"><Zap className="h-12 w-12 mx-auto mb-3 opacity-30 text-yellow-500" /><p>لا توجد عروض تلقائية مبرمجة</p></CardContent></Card>
      ) : (
        <Card>
          <div className="max-h-[70vh] overflow-y-auto w-full overflow-x-auto rounded-lg">
            <div className="min-w-[900px]">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-white">
                  <TableRow>
                    <TableHead className="text-right">الاسم</TableHead>
                    <TableHead className="text-right">نوع العرض</TableHead>
                    <TableHead className="text-right">تفاصيل</TableHead>
                    <TableHead className="text-right">الحد الأدنى للطلب</TableHead>
                    <TableHead className="text-right">البداية / النهاية</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                    <TableHead className="text-left w-24">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPromotions.map((p) => {
                    const status = getStatus(p);
                    // Colored badge colors per type
                    const typeInfo: Record<string, { label: string; color: string }> = {
                      FreeShipping: { label: "🚚 شحن مجاني", color: "#0ea5e9" },
                      BuyXGetY:     { label: "🎁 اشتري X وخذ Y", color: "#8b5cf6" },
                      Percentage:   { label: p.scope === "AllProducts" ? "🌐 خصم شامل %" : "🛒 خصم % على السلة", color: "#f59e0b" },
                      Fixed:        { label: p.scope === "AllProducts" ? "🌐 خصم شامل ث" : "🛒 خصم ثابت على السلة", color: "#ef4444" },
                    };
                    const info = typeInfo[p.type] ?? { label: p.type, color: "#6b7280" };
                    const valText = p.type === "Percentage" ? `${p.value}%` : p.type === "Fixed" ? formatCurrency(p.value) : p.type === "BuyXGetY" ? `اشتري ${p.buyQuantity} وخذ ${p.getQuantity} مجاناً` : "مجاناً";
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="text-right font-medium">{p.name}</TableCell>
                        <TableCell className="text-right">
                          <span style={{ background: info.color + "18", color: info.color, borderRadius: 6, padding: "2px 8px", fontSize: "0.78rem", fontWeight: 600, whiteSpace: "nowrap" }}>
                            {info.label}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-semibold" style={{ color: info.color }}>{valText}</TableCell>
                        <TableCell className="text-right">{p.minOrderValue ? formatCurrency(p.minOrderValue) : "—"}</TableCell>
                        <TableCell className="text-right text-xs">
                          <div className="flex flex-col gap-1">
                            <span>من: {new Date(p.startDate).toLocaleDateString("en-GB")}</span>
                            <span className="text-muted-foreground">إلى: {p.endDate ? new Date(p.endDate).toLocaleDateString("en-GB") : "مفتوح"}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant={status === "نشط" ? "success" : status === "مجدول" ? "default" : status === "منتهي" ? "destructive" : "secondary"}>{status}</Badge>
                        </TableCell>
                        <TableCell className="text-left">
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-500" onClick={() => { setSelected(p); setDeleteDialogOpen(true); }}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        </Card>
      )}

      {/* Editor Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl flex flex-col" style={{ maxHeight: '90vh' }}>
          <DialogHeader><DialogTitle>{selected ? "تعديل عرض" : "إضافة عرض جديد"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
            <div className="space-y-4 overflow-y-auto flex-1 pr-1">
            <div className="space-y-2">
              <Label>اسم العرض (يظهر للعميل)</Label>
              <Input {...register("name")} />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4 border p-3 bg-gray-50/50 rounded-lg">
              <div className="space-y-2 col-span-2">
                <Label>النوع والتطبيق</Label>
                <Select value={watch("bizType")} onValueChange={(v) => setValue("bizType", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{BIZ_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              {isPercentOrFixed && (
                <>
                  <div className="space-y-2">
                    <Label>طريقة الخصم</Label>
                    <Select value={watch("discountType")} onValueChange={(v) => setValue("discountType", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{DISCOUNT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>القيمة {watch("discountType") === "0" ? "(%)" : "(ج.م)"}</Label>
                    <Input type="number" step="0.01" {...register("value")} />
                  </div>
                </>
              )}

              {needsMinOrder && (
                <div className="space-y-2 col-span-2">
                  <Label>الحد الأدنى للطلب (للتفعيل - اختياري)</Label>
                  <Input type="number" step="0.01" {...register("minOrderValue")} placeholder="مثال: 500" />
                </div>
              )}

              {bizType === "buy_x_get_y" && (
                <>
                  <div className="space-y-2 col-span-2">
                    <Label>المنتج المطلوب (الذي يجب شراؤه)</Label>
                    <Select value={watch("productId")} onValueChange={(v) => setValue("productId", v)}>
                      <SelectTrigger><SelectValue placeholder="يرجى الاختيار..." /></SelectTrigger>
                      <SelectContent>
                        {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.nameAr}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {errors.productId && <p className="text-xs text-red-500">{errors.productId.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>اشتري كمية</Label>
                    <Input type="number" min="1" {...register("buyQuantity")} />
                  </div>
                  <div className="space-y-2">
                    <Label>واحصل على كمية</Label>
                    <Input type="number" min="1" {...register("getQuantity")} />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>المنتج المجاني (اختياري - افتراضياً نفس المنتج)</Label>
                    <Select value={watch("getProductId")} onValueChange={(v) => setValue("getProductId", v)}>
                      <SelectTrigger><SelectValue/></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">نفس المنتج المطلوب</SelectItem>
                        {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.nameAr}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </div>

            <div className="grid grid-cols-4 gap-4 border p-3 rounded-lg">
              <div className="space-y-2"><Label>ترتيب الأولوية</Label><Input type="number" {...register("priority")} /></div>
              <div className="space-y-2 pt-6"><label className="flex items-center gap-2 text-xs" title="هل يُطبَّق هذا العرض مع عروض أخرى في نفس الوقت؟"><input type="checkbox" {...register("isStackable")} />يتراكم مع عروض أخرى؟ ℹ️</label></div>
              <div className="space-y-2 pt-6"><label className="flex items-center gap-2 text-xs"><input type="checkbox" {...register("allowCouponStacking")} />يسمح بكوبون؟</label></div>
              <div className="space-y-2 pt-6"><label className="flex items-center gap-2 text-xs"><input type="checkbox" {...register("isActive")} />تفعيل حالياً</label></div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>من تاريخ</Label><Input type="datetime-local" {...register("startDate")} /></div>
              <div className="space-y-2"><Label>إلى تاريخ</Label><Input type="datetime-local" {...register("endDate")} /></div>
            </div>

            </div>{/* end scrollable area */}

            <DialogFooter className="pt-2 shrink-0">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>إلغاء</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? <Spinner className="ml-2" /> : null}حفظ العرض</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>حذف العرض</DialogTitle><DialogDescription>تأكيد الحذف النهائي؟</DialogDescription></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>تراجع</Button>
            <Button variant="destructive" onClick={() => selected && deleteMutation.mutate(selected.id)}>تأكيد</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
