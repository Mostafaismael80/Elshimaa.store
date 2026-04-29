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

const COLOR_PRESETS = [
  { label: "الأساسي",    bg: "#1A0E06", text: "#C9A96E" },
  { label: "أسود فاخر",  bg: "#0D0702", text: "#EAD8B5" },
  { label: "بني دافئ",   bg: "#3D2010", text: "#C9A96E" },
  { label: "ذهبي كريمي", bg: "#EAD8B5", text: "#1A0E06" },
  { label: "كريمي ناعم", bg: "#F9F5F0", text: "#A07838" },
  { label: "عنبري",      bg: "#6B5F54", text: "#EAD8B5" },
  { label: "أحمر ملكي",  bg: "#5C0A0A", text: "#EAD8B5" },
];

const schema = z
  .object({
    text: z.string().min(1, "نص الإعلان مطلوب"),
    backgroundColor: z.string().regex(hexRegex, "لون غير صالح (مثال: #FF5733)"),
    textColor: z.string().regex(hexRegex, "لون النص غير صالح (مثال: #FFFFFF)"),
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

// ─── Status Utility ────────────────────────────────────────────────────────────

function computeAnnouncementStatus(startDate: string, endDate: string): 'نشط' | 'مجدول' | 'منتهي' {
  const now = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (end < now) return 'منتهي';
  if (start > now) return 'مجدول';
  return 'نشط';
}

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
    queryKey: ["announcements"],
    queryFn: () => announcementsApi.getAll(),
  });

  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: { backgroundColor: "#695434", textColor: "#FFFFFF", isActive: true, priority: 0 },
  });

  // ─── Mutations (refetch immediately — backend flushes cache) ──────────

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
    reset({ text: "", backgroundColor: "#695434", textColor: "#FFFFFF", redirectUrl: "", startDate: "", endDate: "", isActive: true, priority: 0 });
    setDialogOpen(true);
  };

  const openEdit = (a: AnnouncementResponse) => {
    setSelected(a);
    reset({
      text: a.text,
      backgroundColor: a.backgroundColor,
      textColor: a.textColor ?? "#FFFFFF",
      redirectUrl: a.redirectUrl ?? "",
      startDate: a.startDate?.slice(0, 16),
      endDate: a.endDate?.slice(0, 16),
      isActive: a.isActive,
      priority: a.priority,
    });
    setDialogOpen(true);
  };

  const onSubmit = async (values: FormValues) => {
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

  const allAnnouncements = data?.data ?? [];
  const announcements = showInactive
    ? allAnnouncements
    : allAnnouncements.filter((a) => computeAnnouncementStatus(a.startDate, a.endDate) === 'نشط');

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

  // ─── Watched values for live preview ─────────────────────────────────────

  const watchedBg   = watch("backgroundColor");
  const watchedText = watch("textColor");
  const watchedMsg  = watch("text");

  const validBg   = hexRegex.test(watchedBg)   ? watchedBg   : "#695434";
  const validText = hexRegex.test(watchedText)  ? watchedText : "#FFFFFF";

  // ─── Render ───────────────────────────────────────────────────────────────

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
                <TableHead className="text-right w-16">الألوان</TableHead>
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
                      {/* Diagonal split square: bg / text color */}
                      <div
                        className="h-7 w-7 rounded-md border overflow-hidden"
                        style={{
                          background: `linear-gradient(135deg, ${a.backgroundColor} 50%, ${a.textColor ?? "#FFFFFF"} 50%)`,
                        }}
                        title={`خلفية: ${a.backgroundColor} | نص: ${a.textColor ?? "#FFFFFF"}`}
                      />
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
                      {(() => {
                        const status = computeAnnouncementStatus(a.startDate, a.endDate);
                        if (status === 'نشط') {
                          return <Badge variant="success">نشط</Badge>;
                        }
                        if (status === 'مجدول') {
                          return <Badge variant="warning">مجدول</Badge>;
                        }
                        return <Badge variant="secondary">منتهي</Badge>;
                      })()}
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

            {/* ── Live Preview Banner (real-time bg + text color) ─── */}
            <div
              className="rounded-lg px-4 py-3 text-sm font-medium text-center transition-colors duration-150 min-h-[44px] flex items-center justify-center"
              style={{ backgroundColor: validBg, color: validText }}
            >
              {watchedMsg || <span style={{ opacity: 0.5 }}>معاينة الإعلان</span>}
            </div>

            {/* ── Color Presets (bg + text together) ─────────────── */}
            <div className="space-y-2">
              <Label>الثيم اللوني</Label>
              <div className="flex gap-2 flex-wrap">
                {COLOR_PRESETS.map((p) => {
                  const isActive = watch("backgroundColor") === p.bg && watch("textColor") === p.text;
                  return (
                    <button
                      key={p.bg}
                      type="button"
                      title={p.label}
                      onClick={() => {
                        setValue("backgroundColor", p.bg);
                        setValue("textColor", p.text);
                      }}
                      className="flex flex-col items-center gap-1 group"
                    >
                      <div
                        className={`w-9 h-9 rounded-lg border-2 transition-all shadow overflow-hidden ${
                          isActive
                            ? "border-blue-500 scale-110"
                            : "border-transparent group-hover:border-blue-400"
                        }`}
                        style={{ background: `linear-gradient(135deg, ${p.bg} 50%, ${p.text} 50%)` }}
                      />
                      <span className="text-[10px] text-gray-400">{p.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Custom HEX inputs ────────────────────────────────── */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">لون الخلفية (HEX)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    {...register("backgroundColor")}
                    placeholder="#000000"
                    className="h-8 text-xs font-mono"
                    maxLength={7}
                    dir="ltr"
                  />
                  <div
                    className="w-8 h-8 rounded border flex-shrink-0"
                    style={{ backgroundColor: validBg }}
                  />
                </div>
                {errors.backgroundColor && <p className="text-xs text-red-500">{errors.backgroundColor.message}</p>}
              </div>
              <div className="space-y-1">
                <Label className="text-xs">لون النص (HEX)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    {...register("textColor")}
                    placeholder="#FFFFFF"
                    className="h-8 text-xs font-mono"
                    maxLength={7}
                    dir="ltr"
                  />
                  <div
                    className="w-8 h-8 rounded border flex-shrink-0"
                    style={{ backgroundColor: validText }}
                  />
                </div>
                {errors.textColor && <p className="text-xs text-red-500">{errors.textColor.message}</p>}
              </div>
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
