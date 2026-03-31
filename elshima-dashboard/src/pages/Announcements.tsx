import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, Megaphone } from "lucide-react";
import { announcementsApi } from "../api/announcements";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Card, CardContent } from "../components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "../components/ui/dialog";
import { LoadingPage, Spinner } from "../components/ui/spinner";
import { useToast } from "../components/ui/toast";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../components/ui/table";
import { formatDateShort } from "../lib/utils";
import type { AnnouncementResponse } from "../types";

// ─── Schema ─────────────────────────────────────────────────────────────────────

const hexRegex = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

const COLOR_PALETTE = [
  { label: "بني أساسي", hex: "#695434" },
  { label: "ذهبي",      hex: "#c9aa6f" },
  { label: "داكن",      hex: "#1a0e06" },
  { label: "نجاح",      hex: "#16a34a" },
  { label: "تحذير",     hex: "#ea580c" },
  { label: "خطأ",       hex: "#dc2626" },
  { label: "معلومة",    hex: "#2563eb" },
];

const schema = z
  .object({
    text: z.string().min(1, "نص الإعلان مطلوب"),
    backgroundColor: z.string().regex(hexRegex, "لون غير صالح (مثال: #FF5733)"),
    redirectUrl: z.string().optional(),
    startDate: z.string().min(1, "تاريخ البداية مطلوب"),
    endDate: z.string().min(1, "تاريخ النهاية مطلوب"),
    isActive: z.boolean(),
    priority: z.coerce.number().min(0).default(0),
  })
  .refine(
    (data) => {
      if (!data.startDate || !data.endDate) return true;
      return new Date(data.endDate) >= new Date(data.startDate);
    },
    {
      message: "تاريخ النهاية يجب أن يكون بعد تاريخ البداية",
      path: ["endDate"],
    }
  );
type FormValues = z.infer<typeof schema>;

// ─── Component ──────────────────────────────────────────────────────────────────

export default function Announcements() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selected, setSelected] = useState<AnnouncementResponse | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  // Admin list sorted by createdAt DESC (backend default)
  const { data, isLoading } = useQuery({
    queryKey: ["announcements", showInactive],
    queryFn: () => announcementsApi.getAll(showInactive),
  });

  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: { backgroundColor: "#695434", isActive: true, priority: 0 },
  });

  // ─── Mutations (refetch immediately — backend flushes cache) ──────────────

  const createMutation = useMutation({
    mutationFn: (data: any) => announcementsApi.create(data),
    onSuccess: () => {
      toast("تم إنشاء الإعلان بنجاح", "success");
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      setDialogOpen(false);
    },
    onError: (err: any) => {
      const msgs = err?.response?.data?.errors 
        ? Object.values(err.response.data.errors).flat().join(" - ")
        : err?.response?.data?.message;
      toast(msgs ?? "فشل الإنشاء", "error");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => announcementsApi.update(id, data),
    onSuccess: () => {
      toast("تم تحديث الإعلان بنجاح", "success");
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      setDialogOpen(false);
    },
    onError: (err: any) => {
      const msgs = err?.response?.data?.errors 
        ? Object.values(err.response.data.errors).flat().join(" - ")
        : err?.response?.data?.message;
      toast(msgs ?? "فشل التحديث", "error");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => announcementsApi.delete(id),
    onSuccess: () => {
      toast("تم حذف الإعلان", "success");
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      setDeleteDialogOpen(false);
    },
    onError: (err: any) => toast(err?.response?.data?.message ?? "فشل الحذف", "error"),
  });

  // ─── Dialog openers ────────────────────────────────────────────────────────

  const openCreate = () => {
    setSelected(null);
    reset({ text: "", backgroundColor: "#695434", redirectUrl: "", startDate: "", endDate: "", isActive: true, priority: 0 });
    setDialogOpen(true);
  };

  const openEdit = (a: AnnouncementResponse) => {
    setSelected(a);
    reset({
      text: a.text,
      backgroundColor: a.backgroundColor,
      redirectUrl: a.redirectUrl ?? "",
      startDate: a.startDate?.slice(0, 16),
      endDate: a.endDate?.slice(0, 16),
      isActive: a.isActive,
      priority: a.priority,
    });
    setDialogOpen(true);
  };

  const onSubmit = async (values: FormValues) => {
    // Explicitly parse and stringify to standard ISO format
    let startIso, endIso;
    try {
      startIso = new Date(values.startDate).toISOString();
      endIso = new Date(values.endDate).toISOString();
    } catch {
      toast("تاريخ غير صالح", "error");
      return;
    }

    const payload = { 
      ...values, 
      startDate: startIso,
      endDate: endIso,
      redirectUrl: (values.redirectUrl && values.redirectUrl.trim().length > 0) ? values.redirectUrl.trim() : null 
    };

    if (selected) {
      await updateMutation.mutateAsync({ id: selected.id, data: payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
  };

  const announcements = data?.data ?? [];

  // ─── Date overlap detection ────────────────────────────────────────────────

  const getOverlaps = (a: AnnouncementResponse) => {
    const aStart = new Date(a.startDate).getTime();
    const aEnd = new Date(a.endDate).getTime();
    return announcements.filter((b) => {
      if (b.id === a.id || !b.isActive) return false;
      const bStart = new Date(b.startDate).getTime();
      const bEnd = new Date(b.endDate).getTime();
      return aStart <= bEnd && aEnd >= bStart;
    });
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  const watchedBg = watch("backgroundColor");

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">الإعلانات</h2>
          <p className="text-muted-foreground text-sm mt-1">{announcements.length} إعلان</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
            عرض غير النشطة
          </label>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" /> إضافة إعلان
          </Button>
        </div>
      </div>

      {/* Table */}
      {isLoading ? <LoadingPage /> : announcements.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <Megaphone className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>لا توجد إعلانات</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right w-8">اللون</TableHead>
                <TableHead className="text-right">النص</TableHead>
                <TableHead className="text-right">الأولوية</TableHead>
                <TableHead className="text-right">الصلاحية</TableHead>
                <TableHead className="text-right">تداخل</TableHead>
                <TableHead className="text-right">الحالة</TableHead>
                <TableHead className="text-left w-24">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {announcements.map((a) => {
                const overlaps = getOverlaps(a);
                return (
                  <TableRow key={a.id}>
                    <TableCell className="text-right">
                      <div className="h-6 w-6 rounded-full border" style={{ backgroundColor: a.backgroundColor }} />
                    </TableCell>
                    <TableCell className="text-right font-medium max-w-[300px] truncate">
                      {a.text}
                      {a.redirectUrl && <p className="text-xs text-muted-foreground truncate">{a.redirectUrl}</p>}
                    </TableCell>
                    <TableCell className="text-right">{a.priority}</TableCell>
                    <TableCell className="text-right text-xs">
                      <p>{formatDateShort(a.startDate)}</p>
                      <p className="text-muted-foreground">→ {formatDateShort(a.endDate)}</p>
                    </TableCell>
                    <TableCell className="text-right">
                      {overlaps.length > 0 ? (
                        <Badge variant="destructive" className="text-xs">
                          {overlaps.length} تداخل
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={a.isCurrentlyActive ? "success" : "secondary"}>
                        {a.isCurrentlyActive ? "نشط" : a.isActive ? "مجدول" : "غير نشط"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-left">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => openEdit(a)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => { setSelected(a); setDeleteDialogOpen(true); }}>
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
            <DialogTitle>{selected ? "تعديل الإعلان" : "إضافة إعلان جديد"}</DialogTitle>
            <DialogDescription>{selected ? "قم بتحديث تفاصيل الإعلان." : "أدخل تفاصيل الإعلان الجديد."}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>نص الإعلان</Label>
              <Input {...register("text")} placeholder="خصم 30% على جميع المنتجات!" />
              {errors.text && <p className="text-xs text-red-500">{errors.text.message}</p>}
            </div>

            {/* Live Preview Banner */}
            {watch("text") && (
              <div
                className="rounded-lg px-4 py-3 text-white text-sm font-medium text-center"
                style={{ backgroundColor: hexRegex.test(watchedBg) ? watchedBg : "#3B82F6" }}
              >
                {watch("text")}
              </div>
            )}

            {/* ── Color Palette ───────────────────────────────────── */}
            <div className="space-y-2">
              <Label>لون الخلفية</Label>
              <div className="flex flex-wrap gap-2">
                {COLOR_PALETTE.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    title={c.label}
                    onClick={() => setValue("backgroundColor", c.hex)}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      watch("backgroundColor") === c.hex
                        ? "border-gray-800 scale-110 shadow-md"
                        : "border-transparent hover:border-gray-400"
                    }`}
                    style={{ backgroundColor: c.hex }}
                  />
                ))}
              </div>
              {/* Custom HEX fallback */}
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-muted-foreground">أو أدخل HEX مخصص:</span>
                <Input
                  {...register("backgroundColor")}
                  placeholder="#000000"
                  className="h-7 w-32 text-xs font-mono"
                  maxLength={7}
                />
                <div
                  className="w-8 h-7 rounded border flex items-center justify-center text-white text-xs font-bold overflow-hidden"
                  style={{ backgroundColor: hexRegex.test(watchedBg) ? watchedBg : "#000" }}
                >
                  Aa
                </div>
              </div>
              {errors.backgroundColor && <p className="text-xs text-red-500">{errors.backgroundColor.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>الأولوية (الأصغر = الأعلى)</Label>
              <Input type="number" min="0" {...register("priority")} />
            </div>

            <div className="space-y-2">
              <Label>رابط التوجيه (اختياري)</Label>
              <Input {...register("redirectUrl")} placeholder="https://example.com/sale" dir="ltr" />
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
                {errors.endDate && (
                  <p className="text-xs text-red-500">{errors.endDate.message}</p>
                )}
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" {...register("isActive")} className="rounded" />
              تفعيل الإعلان
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
            <DialogTitle>حذف الإعلان</DialogTitle>
            <DialogDescription>هل أنت متأكد من حذف هذا الإعلان؟ سيتم إزالته فوراً من جميع الصفحات.</DialogDescription>
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
