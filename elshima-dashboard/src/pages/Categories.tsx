import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, FolderTree, Image } from "lucide-react";
import { categoriesApi } from "../api/categories";
import { imagesApi } from "../api/images";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
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
import type { CategoryResponse } from "../types";


const categorySchema = z.object({
  nameAr: z.string().min(1, "Name is required"),
  descriptionAr: z.string().optional(),
  parentCategoryId: z.string().nullable().optional(),
  displayOrder: z.coerce.number().default(0),
  isActive: z.boolean(),
  isDiscountActive: z.boolean().default(false),
  discountType: z.coerce.number().optional(),
  discountValue: z.coerce.number().optional(),
  discountStartDate: z.string().optional(),
  discountEndDate: z.string().optional(),
});

type CategoryForm = z.infer<typeof categorySchema>;

function flattenCategories(cats: CategoryResponse[], depth = 0): Array<CategoryResponse & { depth: number }> {
  return cats.flatMap((cat) => [
    { ...cat, depth },
    ...flattenCategories(cat.subCategories ?? [], depth + 1),
  ]);
}

export default function Categories() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<CategoryResponse | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["categories", "all"],
    queryFn: () => categoriesApi.getAll(true),
  });

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<CategoryForm>({
    resolver: zodResolver(categorySchema) as any,
    defaultValues: { isActive: true, displayOrder: 0, parentCategoryId: null, isDiscountActive: false, discountType: 0, discountValue: 0 },
  });

  const createMutation = useMutation({
    mutationFn: (fd: FormData) => categoriesApi.createWithImage(fd),
    onSuccess: () => {
      toast("تم إنشاء الفئة بنجاح", "success");
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setDialogOpen(false);
    },
    onError: (err: any) => toast(err?.response?.data?.message ?? "فشل الإنشاء", "error"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => categoriesApi.update(id, data),
    onSuccess: () => {
      toast("تم تحديث الفئة بنجاح", "success");
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setDialogOpen(false);
    },
    onError: (err: any) => toast(err?.response?.data?.message ?? "فشل التحديث", "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => categoriesApi.delete(id),
    onSuccess: () => {
      toast("تم حذف الفئة", "success");
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setDeleteDialogOpen(false);
    },
    onError: (err: any) => toast(err?.response?.data?.message ?? "فشل الحذف", "error"),
  });

  const openCreate = () => {
    setSelectedCategory(null);
    reset({ nameAr: "", descriptionAr: "", parentCategoryId: null, displayOrder: 0, isActive: true, isDiscountActive: false, discountType: 0, discountValue: 0, discountStartDate: "", discountEndDate: "" });
    setImageFile(null);
    setDialogOpen(true);
  };

  const openEdit = (cat: CategoryResponse) => {
    setSelectedCategory(cat);
    reset({
      nameAr: cat.nameAr,
      descriptionAr: cat.descriptionAr ?? undefined,
      parentCategoryId: cat.parentCategoryId,
      displayOrder: cat.displayOrder,
      isActive: cat.isActive,
      // Note: Backend GET doesn't return existing discount data for categories in this endpoint.
      isDiscountActive: false,
      discountType: 0,
      discountValue: 0,
      discountStartDate: "",
      discountEndDate: "",
    });
    setImageFile(null);
    setDialogOpen(true);
  };

  const openDelete = (cat: CategoryResponse) => {
    setSelectedCategory(cat);
    setDeleteDialogOpen(true);
  };

  const onSubmit = async (values: CategoryForm) => {
    try {
      if (selectedCategory) {
        let uploadedImageUrl = undefined;
        if (imageFile) {
          uploadedImageUrl = await imagesApi.uploadImage(imageFile);
        }

        await updateMutation.mutateAsync({
          id: selectedCategory.id,
          data: {
            nameAr: values.nameAr,
            descriptionAr: values.descriptionAr,
            parentCategoryId: values.parentCategoryId,
            displayOrder: values.displayOrder,
            isActive: values.isActive,
            ...(uploadedImageUrl ? { imageUrl: uploadedImageUrl } : {}),
            isDiscountActive: values.isDiscountActive,
            discountType: values.isDiscountActive ? values.discountType : null,
            discountValue: values.isDiscountActive ? values.discountValue : null,
            discountStartDate: values.isDiscountActive ? values.discountStartDate || null : null,
            discountEndDate: values.isDiscountActive ? values.discountEndDate || null : null,
          },
        });
      } else {
        const fd = new FormData();
        fd.append("nameAr", values.nameAr);
        if (values.descriptionAr) fd.append("descriptionAr", values.descriptionAr);
        if (values.parentCategoryId) fd.append("parentCategoryId", values.parentCategoryId);
        fd.append("displayOrder", String(values.displayOrder));
        fd.append("isActive", String(values.isActive));
        if (imageFile) fd.append("image", imageFile);

        if (values.isDiscountActive) {
          fd.append("isDiscountActive", "true");
          fd.append("discountType", String(values.discountType ?? 0));
          fd.append("discountValue", String(values.discountValue ?? 0));
          if (values.discountStartDate) fd.append("discountStartDate", values.discountStartDate);
          if (values.discountEndDate) fd.append("discountEndDate", values.discountEndDate);
        }

        await createMutation.mutateAsync(fd);
      }
    } catch (error: any) {
      toast(error?.response?.data?.message ?? error?.message ?? "حدث خطأ أثناء حفظ الفئة", "error");
    }
  };

  const categories = data?.data ?? [];
  const flat = flattenCategories(categories);
  const rootCategories = categories;

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">التصنيفات</h2>
          <p className="text-muted-foreground text-sm mt-1">{flat.length} فئة إجمالاً</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" /> إضافة فئة
        </Button>
      </div>

      {/* Table */}
      {isLoading ? (
        <LoadingPage />
      ) : flat.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <FolderTree className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>لا توجد فئات</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right py-4 w-20">الصورة</TableHead>
                <TableHead className="text-right py-4 w-auto">الاسم</TableHead>
                <TableHead className="text-right py-4">الفئة الأم</TableHead>
                <TableHead className="text-right py-4">المنتجات</TableHead>
                <TableHead className="text-right py-4">الترتيب</TableHead>
                <TableHead className="text-right py-4 w-28">الحالة</TableHead>
                <TableHead className="text-left py-4 w-28">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {flat.map((cat) => (
                <TableRow key={cat.id}>
                  <TableCell className="text-right py-4">
                    {cat.imageUrl ? (
                      <img
                        src={cat.imageUrl}
                        alt={cat.nameAr}
                        className="h-10 w-10 min-w-[40px] rounded-md object-cover ml-3"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    ) : (
                      <div className="h-10 w-10 min-w-[40px] rounded-md bg-gray-100 flex items-center justify-center ml-3">
                        <Image className="h-5 w-5 text-gray-300" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right py-4 font-medium">
                    <span style={{ paddingRight: `${cat.depth * 16}px` }} className="flex items-center">
                      {cat.depth > 0 && <span className="text-gray-400 ml-2">└─</span>}
                      {cat.nameAr}
                    </span>
                  </TableCell>
                  <TableCell className="text-right py-4 text-muted-foreground text-sm">
                    {cat.parentCategoryName || "—"}
                  </TableCell>
                  <TableCell className="text-right py-4">{cat.productCount}</TableCell>
                  <TableCell className="text-right py-4">{cat.displayOrder}</TableCell>
                  <TableCell className="text-right py-4">
                    <div className="flex justify-start">
                      <Badge variant={cat.isActive ? "success" : "secondary"}>
                        {cat.isActive ? "نشط" : "غير نشط"}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-left py-4">
                    <div className="flex justify-end gap-2 items-center h-full">
                      <Button size="sm" variant="ghost" className="h-9 w-9 p-0 hover:bg-gray-100 text-gray-600" onClick={() => openEdit(cat)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-9 w-9 p-0 hover:bg-red-50 text-red-500 hover:text-red-600" onClick={() => openDelete(cat)}>
                        <Trash2 className="h-4 w-4" />
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
            <DialogTitle>{selectedCategory ? "تعديل الفئة" : "إضافة فئة جديدة"}</DialogTitle>
            <DialogDescription>
              {selectedCategory ? "قم بتحديث تفاصيل الفئة." : "أدخل التفاصيل لإنشاء فئة جديدة."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>الاسم (بالعربية)</Label>
              <Input {...register("nameAr")} placeholder="اسم الفئة" />
              {errors.nameAr && <p className="text-xs text-red-500">{errors.nameAr.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>الوصف (بالعربية)</Label>
              <Textarea {...register("descriptionAr")} placeholder="وصف الفئة" rows={2} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>الفئة الأم</Label>
                <Select
                  value={watch("parentCategoryId") ?? "none"}
                  onValueChange={(v) => setValue("parentCategoryId", v === "none" ? null : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="لا شيء (رئيسي)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">لا شيء (رئيسي)</SelectItem>
                    {rootCategories
                      .filter((c) => c.id !== selectedCategory?.id)
                      .map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.nameAr}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>ترتيب العرض</Label>
                <Input type="number" {...register("displayOrder")} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>صورة الفئة (اختياري)</Label>
              <Input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
              />
              {selectedCategory && selectedCategory.imageUrl && !imageFile && (
                <div className="mt-2 flex items-center gap-2">
                  <img src={selectedCategory.imageUrl} alt="current" className="h-10 w-10 object-cover rounded-md" />
                  <span className="text-xs text-muted-foreground">الصورة الحالية</span>
                </div>
              )}
            </div>

            <div className="space-y-4 border p-4 rounded-lg bg-gray-50/50">
              <label className="flex items-center gap-2 text-sm cursor-pointer font-semibold text-blue-700">
                <input type="checkbox" {...register("isDiscountActive")} className="rounded" />
                تفعيل خصم على مستوى القسم
              </label>
              
              {watch("isDiscountActive") && (
                <div className="space-y-4 pt-2 border-t">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>نوع الخصم</Label>
                      <Select value={String(watch("discountType") ?? 0)} onValueChange={(v) => setValue("discountType", parseInt(v))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">نسبة مئوية (%)</SelectItem>
                          <SelectItem value="1">مبلغ ثابت (ج.م)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>القيمة</Label>
                      <Input type="number" step="0.01" min="0" {...register("discountValue")} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>تاريخ البداية (اختياري)</Label>
                      <Input type="datetime-local" {...register("discountStartDate")} />
                    </div>
                    <div className="space-y-2">
                      <Label>تاريخ النهاية (اختياري)</Label>
                      <Input type="datetime-local" {...register("discountEndDate")} />
                    </div>
                  </div>
                  {selectedCategory && (
                    <p className="text-xs text-orange-600">تسجيل: الخصم سيتم حفظه في القواعد المركزية، ولن يظهر بعد حفظه في هذه الشاشة عند التعديل مستقبلاً.</p>
                  )}
                </div>
              )}
            </div>

            <label className="flex items-center gap-2 text-sm cursor-pointer border-t pt-4">
              <input type="checkbox" {...register("isActive")} className="rounded" />
              تفعيل القسم (نشط)
            </label>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>إلغاء</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Spinner size="sm" className="ml-2" /> : null}
                {selectedCategory ? "تحديث" : "إنشاء"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>حذف الفئة</DialogTitle>
            <DialogDescription>
              هل أنت متأكد من حذف "{selectedCategory?.nameAr}"?
              {(selectedCategory?.subCategories?.length ?? 0) > 0 && (
                <span className="block mt-1 text-orange-600">
                  هذه الفئة تحتوي على {selectedCategory?.subCategories?.length} فئة فرعية.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>إلغاء</Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => selectedCategory && deleteMutation.mutate(selectedCategory.id)}
            >
              {deleteMutation.isPending ? <Spinner size="sm" className="ml-2" /> : null}
              حذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
