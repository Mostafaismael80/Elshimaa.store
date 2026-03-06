import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, Search, Image, Star, Eye, Package, X } from "lucide-react";
import { productsApi } from "../api/products";
import { categoriesApi } from "../api/categories";
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
import { formatCurrency } from "../lib/utils";
import type { ProductResponse, AddProductBatchRequest, AddProductItem } from "../types";

const BASE_URL = "http://localhost:5070";

const productSchema = z.object({
  nameAr: z.string().min(1, "الاسم مطلوب"),
  slug: z.string().optional(),
  descriptionAr: z.string().optional(),
  basePrice: z.coerce.number().min(0, "السعر يجب أن يكون >= 0"),
  percentageDiscount: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? null : Number(v)),
    z.number().min(0, "النسبة لا تقل عن 0").max(100, "النسبة لا تزيد عن 100").nullable()
  ),
  fixedAmountDiscount: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? null : Number(v)),
    z.number().min(0, "القيمة لا تقل عن 0").nullable()
  ),
  categoryId: z.string().optional(),
  categorySlug: z.string().optional(),
  sizeType: z.string().default(""),
  isActive: z.boolean(),
  isFeatured: z.boolean(),
});

type ProductForm = z.infer<typeof productSchema>;

interface ColorImage {
  imageUrl: string;
  file: File | null;
  previewUrl: string;
  displayOrder: number;
  isMain: boolean;
  altText: string;
}

interface ColorSize {
  sizeName: string;
  availableQuantity: number;
  priceOverride: number | null;
}

interface ColorEntry {
  colorName: string;
  isDefault: boolean;
  images: ColorImage[];
  sizes: ColorSize[];
}

const defaultColorEntry = (): ColorEntry => ({
  colorName: "",
  isDefault: false,
  images: [{ imageUrl: "", file: null, previewUrl: "", displayOrder: 1, isMain: true, altText: "" }],
  sizes: [{ sizeName: "", availableQuantity: 0, priceOverride: null }],
});

export default function Products() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [filterActive, setFilterActive] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductResponse | null>(null);
  const [colors, setColors] = useState<ColorEntry[]>([defaultColorEntry()]);

  const { data, isLoading } = useQuery({
    queryKey: ["products", page, search, filterActive],
    queryFn: () =>
      productsApi.getAll({
        pageNumber: page,
        pageSize: 12,
        search: search || undefined,
        isActive:
          filterActive === "active" ? true : filterActive === "inactive" ? false : undefined,
      }),
  });

  const { data: categoriesData } = useQuery({
    queryKey: ["categories"],
    queryFn: () => categoriesApi.getAll(true),
  });

  const categories = categoriesData?.data ?? [];

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<ProductForm>({
    resolver: zodResolver(productSchema) as any,
    defaultValues: {
      nameAr: "",
      slug: "",
      descriptionAr: "",
      basePrice: 0,
      percentageDiscount: null,
      fixedAmountDiscount: null,
      categorySlug: "",
      sizeType: "",
      isActive: true,
      isFeatured: false,
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: AddProductBatchRequest) => productsApi.createBatch(data),
    onSuccess: () => {
      toast("تم إنشاء المنتج بنجاح", "success");
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setDialogOpen(false);
    },
    onError: (err: any) => toast(err?.response?.data?.message ?? "فشل إنشاء المنتج", "error"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => productsApi.update(id, data),
    onSuccess: () => {
      toast("تم تحديث المنتج بنجاح", "success");
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setDialogOpen(false);
    },
    onError: (err: any) => toast(err?.response?.data?.message ?? "فشل تحديث المنتج", "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => productsApi.delete(id),
    onSuccess: () => {
      toast("تم حذف المنتج", "success");
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setDeleteDialogOpen(false);
    },
    onError: (err: any) => toast(err?.response?.data?.message ?? "فشل الحذف", "error"),
  });

  // Color management helpers
  const addColor = () =>
    setColors((prev) => [...prev, { ...defaultColorEntry(), isDefault: prev.length === 0 }]);
  const removeColor = (ci: number) =>
    setColors((prev) => prev.filter((_, i) => i !== ci));
  const updateColor = (ci: number, field: keyof ColorEntry, value: any) =>
    setColors((prev) => prev.map((c, i) => (i === ci ? { ...c, [field]: value } : c)));
  const addImage = (ci: number) =>
    setColors((prev) =>
      prev.map((c, i) =>
        i === ci
          ? { ...c, images: [...c.images, { imageUrl: "", file: null, previewUrl: "", displayOrder: c.images.length + 1, isMain: false, altText: "" }] }
          : c
      )
    );
  const setImageFile = (ci: number, ii: number, file: File) => {
    const previewUrl = URL.createObjectURL(file);
    setColors((prev) =>
      prev.map((c, i) =>
        i === ci
          ? { ...c, images: c.images.map((img, j) => j === ii ? { ...img, file, previewUrl, imageUrl: "" } : img) }
          : c
      )
    );
  };
  const clearImageFile = (ci: number, ii: number) =>
    setColors((prev) =>
      prev.map((c, i) =>
        i === ci
          ? { ...c, images: c.images.map((img, j) => j === ii ? { ...img, file: null, previewUrl: "", imageUrl: "" } : img) }
          : c
      )
    );
  const removeImage = (ci: number, ii: number) =>
    setColors((prev) =>
      prev.map((c, i) => (i === ci ? { ...c, images: c.images.filter((_, j) => j !== ii) } : c))
    );
  const updateImage = (ci: number, ii: number, field: keyof ColorImage, value: any) =>
    setColors((prev) =>
      prev.map((c, i) =>
        i === ci
          ? { ...c, images: c.images.map((img, j) => (j === ii ? { ...img, [field]: value } : img)) }
          : c
      )
    );
  const addSize = (ci: number) =>
    setColors((prev) =>
      prev.map((c, i) =>
        i === ci
          ? { ...c, sizes: [...c.sizes, { sizeName: "", availableQuantity: 0, priceOverride: null }] }
          : c
      )
    );
  const removeSize = (ci: number, si: number) =>
    setColors((prev) =>
      prev.map((c, i) => (i === ci ? { ...c, sizes: c.sizes.filter((_, j) => j !== si) } : c))
    );
  const updateSize = (ci: number, si: number, field: keyof ColorSize, value: any) =>
    setColors((prev) =>
      prev.map((c, i) =>
        i === ci
          ? { ...c, sizes: c.sizes.map((s, j) => (j === si ? { ...s, [field]: value } : s)) }
          : c
      )
    );

  const openCreate = () => {
    setSelectedProduct(null);
    reset({
      nameAr: "",
      slug: "",
      descriptionAr: "",
      basePrice: 0,
      percentageDiscount: null,
      fixedAmountDiscount: null,
      categoryId: "",
      categorySlug: "",
      sizeType: "",
      isActive: true,
      isFeatured: false,
    });
    setColors([defaultColorEntry()]);
    setDialogOpen(true);
  };

  const openEdit = (product: ProductResponse) => {
    setSelectedProduct(product);
    const catSlug = categories.find((c) => c.id === product.categoryId)?.slug ?? "";
    reset({
      nameAr: product.nameAr,
      slug: product.slug,
      descriptionAr: product.descriptionAr ?? "",
      basePrice: product.basePrice,
      percentageDiscount: product.percentageDiscount ?? null,
      fixedAmountDiscount: product.fixedAmountDiscount ?? null,
      categoryId: product.categoryId,
      categorySlug: catSlug,
      sizeType: "",
      isActive: product.isActive,
      isFeatured: product.isFeatured,
    });
    // Populate colors state from existing product colors
    if (product.colors && product.colors.length > 0) {
      setColors(product.colors.map((c) => ({
        colorName: c.colorName,
        isDefault: c.isDefault,
        images: c.images.map((img) => ({
          imageUrl: img.imageUrl,
          file: null,
          previewUrl: `${BASE_URL}${img.imageUrl}`,
          displayOrder: img.displayOrder,
          isMain: img.isMain,
          altText: img.altText ?? "",
        })),
        sizes: c.variants.map((v) => ({
          sizeName: v.sizeName,
          availableQuantity: v.availableQuantity,
          priceOverride: v.price !== product.basePrice ? v.price : null,
        })),
      })));
    } else {
      setColors([defaultColorEntry()]);
    }
    setDialogOpen(true);
  };

  const openDelete = (product: ProductResponse) => {
    setSelectedProduct(product);
    setDeleteDialogOpen(true);
  };

  // Shared helper: upload any pending files and return resolved colors payload
  const resolveColorsForSubmit = async () => {
    if (colors.length === 0 || colors.some((c) => !c.colorName.trim())) {
      toast("يرجى إدخال اسم لكل لون", "error");
      return null;
    }
    return Promise.all(
      colors.map(async (c) => ({
        colorName: c.colorName.trim(),
        isDefault: c.isDefault,
        images: await Promise.all(
          c.images.map(async (img) => {
            const url = img.file ? await productsApi.uploadImage(img.file) : img.imageUrl.trim();
            return { imageUrl: url, displayOrder: img.displayOrder, isMain: img.isMain, altText: img.altText };
          })
        ),
        sizes: c.sizes.map((s) => ({
          sizeName: s.sizeName.trim(),
          availableQuantity: Number(s.availableQuantity),
          priceOverride: s.priceOverride != null ? Number(s.priceOverride) : null,
        })),
      }))
    );
  };

  const onSubmit = async (values: ProductForm) => {
    if (selectedProduct) {
      const resolvedColors = await resolveColorsForSubmit();
      if (!resolvedColors) return;
      await updateMutation.mutateAsync({
        id: selectedProduct.id,
        data: {
          nameAr: values.nameAr,
          descriptionAr: values.descriptionAr,
          basePrice: values.basePrice,
          percentageDiscount: values.percentageDiscount ?? null,
          fixedAmountDiscount: values.fixedAmountDiscount ?? null,
          categoryId: values.categoryId ?? selectedProduct.categoryId,
          isActive: values.isActive,
          isFeatured: values.isFeatured,
          colors: resolvedColors,
        },
      });
    } else {
      if (!values.categorySlug?.trim() || !values.sizeType?.trim()) {
        toast("يرجى ملء حقلي الفئة ونوع المقاس", "error");
        return;
      }
      const resolvedColors = await resolveColorsForSubmit();
      if (!resolvedColors) return;
      const productItem: AddProductItem = {
        nameAr: values.nameAr,
        slug: values.slug?.trim() ?? "",
        descriptionAr: values.descriptionAr ?? "",
        basePrice: Number(values.basePrice),
        percentageDiscount: values.percentageDiscount ?? null,
        fixedAmountDiscount: values.fixedAmountDiscount ?? null,
        categorySlug: values.categorySlug.trim(),
        sizeType: values.sizeType.trim(),
        isActive: values.isActive,
        isFeatured: values.isFeatured,
        colors: resolvedColors.map((c) => ({
          colorName: c.colorName,
          isDefault: c.isDefault,
          images: c.images.map((img) => ({
            imageUrl: img.imageUrl,
            displayOrder: img.displayOrder,
            isMain: img.isMain,
            altText: img.altText,
          })),
          sizes: c.sizes.map((s) => ({
            sizeName: s.sizeName,
            availableQuantity: Number(s.availableQuantity),
            priceOverride: s.priceOverride != null ? Number(s.priceOverride) : null,
          })),
        })),
      };
      const batchRequest: AddProductBatchRequest = { products: [productItem] };
      await createMutation.mutateAsync(batchRequest);
    }
  };

  const products = data?.data?.items ?? [];
  const pagination = data?.data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">المنتجات</h2>
          <p className="text-muted-foreground text-sm mt-1">
            {pagination?.totalCount ?? 0} منتج إجمالاً
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" /> إضافة منتج
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="البحث في المنتجات..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pr-9"
          />
        </div>
        <Select value={filterActive} onValueChange={(v) => { setFilterActive(v); setPage(1); }}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="الحالة" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الحالات</SelectItem>
            <SelectItem value="active">نشط</SelectItem>
            <SelectItem value="inactive">غير نشط</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Product Grid */}
      {isLoading ? (
        <LoadingPage />
      ) : products.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>لا توجد منتجات</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => (
            <Card key={product.id} className="overflow-hidden group hover:shadow-md transition-shadow">
              <div className="relative aspect-video bg-gray-100 overflow-hidden">
                {product.mainImageUrl ? (
                  <img
                    src={`${BASE_URL}${product.mainImageUrl}`}
                    alt={product.nameAr}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      const img = e.currentTarget;
                      img.onerror = null;
                      // Use inline transparent pixel to avoid repeated network retries for missing placeholders.
                      img.src = "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";
                    }}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <Image className="h-10 w-10 text-gray-300" />
                  </div>
                )}
                {product.isFeatured && (
                  <div className="absolute top-2 left-2">
                    <Badge variant="warning" className="gap-1">
                      <Star className="h-3 w-3" /> مميز
                    </Badge>
                  </div>
                )}
                <div className="absolute top-2 right-2">
                  <Badge variant={product.isActive ? "success" : "secondary"}>
                    {product.isActive ? "نشط" : "غير نشط"}
                  </Badge>
                </div>
              </div>
              <CardContent className="p-4">
                <h3 className="font-semibold text-sm truncate mb-1">{product.nameAr}</h3>
                <p className="text-xs text-muted-foreground truncate mb-2">{product.categoryName}</p>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="font-bold text-blue-600">{formatCurrency(product.discountedPrice || product.basePrice)}</span>
                    {product.discountPercentage > 0 && (
                      <span className="ml-1 text-xs text-muted-foreground line-through">{formatCurrency(product.basePrice)}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Eye className="h-3 w-3" /> {product.viewCount}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1 gap-1" onClick={() => openEdit(product)}>
                    <Pencil className="h-3 w-3" /> تعديل
                  </Button>
                  <Button size="sm" variant="destructive" className="gap-1" onClick={() => openDelete(product)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline" size="sm"
            disabled={!pagination.hasPreviousPage}
            onClick={() => setPage((p) => p - 1)}
          >
            السابق
          </Button>
          <span className="text-sm text-muted-foreground">
            صفحة {pagination.pageNumber} من {pagination.totalPages}
          </span>
          <Button
            variant="outline" size="sm"
            disabled={!pagination.hasNextPage}
            onClick={() => setPage((p) => p + 1)}
          >
            التالي
          </Button>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedProduct ? "تعديل المنتج" : "إضافة منتج جديد"}</DialogTitle>
            <DialogDescription>
              {selectedProduct ? "قم بتحديث تفاصيل المنتج أدناه." : "أدخل التفاصيل لإنشاء منتج جديد."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Basic fields */}
            <div className="space-y-2">
              <Label>اسم المنتج (بالعربية)</Label>
              <Input {...register("nameAr")} placeholder="اسم المنتج" />
              {errors.nameAr && <p className="text-xs text-red-500">{errors.nameAr.message}</p>}
            </div>

            {/* Slug */}
            {!selectedProduct ? (
              <div className="space-y-2">
                <Label>الرابط المختصر (اختياري)</Label>
                <Input {...register("slug")} placeholder="product-slug" />
              </div>
            ) : (
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs">الرابط المختصر</Label>
                <p className="text-sm bg-gray-50 border rounded px-3 py-2 text-gray-600 font-mono">{selectedProduct.slug}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label>الوصف (بالعربية)</Label>
              <Textarea {...register("descriptionAr")} placeholder="وصف المنتج" rows={3} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>السعر الأساسي (ج.م)</Label>
                <Input type="number" step="0.01" {...register("basePrice")} />
                {errors.basePrice && <p className="text-xs text-red-500">{errors.basePrice.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>نسبة الخصم % (اختياري)</Label>
                <Input type="number" step="0.01" min={0} max={100} {...register("percentageDiscount")} />
                {errors.percentageDiscount && <p className="text-xs text-red-500">{errors.percentageDiscount.message as string}</p>}
              </div>
              <div className="space-y-2">
                <Label>الخصم الثابت (ج.م) (اختياري)</Label>
                <Input type="number" step="0.01" min={0} {...register("fixedAmountDiscount")} />
                {errors.fixedAmountDiscount && <p className="text-xs text-red-500">{errors.fixedAmountDiscount.message as string}</p>}
              </div>
              <div className="space-y-2">
                <Label>الفئة</Label>
                <Select
                  value={selectedProduct ? watch("categoryId") : watch("categorySlug")}
                  onValueChange={(v) => {
                    if (selectedProduct) setValue("categoryId", v);
                    else setValue("categorySlug", v);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الفئة" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={selectedProduct ? cat.id : cat.slug}>
                        {cat.nameAr}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {!selectedProduct && (
              <div className="space-y-2">
                <Label>نوع المقاس</Label>
                <Input {...register("sizeType")} placeholder="مثل: ملابس، أحذية" />
              </div>
            )}

            <div className="flex gap-6">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" {...register("isActive")} className="rounded" />
                نشط
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" {...register("isFeatured")} className="rounded" />
                مميز
              </label>
            </div>

            {/* Dynamic colors section */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">الألوان</Label>
                  <Button type="button" size="sm" variant="outline" onClick={addColor} className="gap-1">
                    <Plus className="h-3 w-3" /> إضافة لون
                  </Button>
                </div>

                {colors.map((color, ci) => (
                  <div key={ci} className="border rounded-lg p-4 space-y-3 bg-gray-50/50">
                    {/* Color header */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">لون {ci + 1}</span>
                      {colors.length > 1 && (
                        <Button
                          type="button" size="sm" variant="ghost"
                          className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => removeColor(ci)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    {/* Color name + isDefault */}
                    <div className="grid grid-cols-2 gap-3 items-end">
                      <div className="space-y-1">
                        <Label className="text-xs">اسم اللون</Label>
                        <Input
                          value={color.colorName}
                          onChange={(e) => updateColor(ci, "colorName", e.target.value)}
                          placeholder="مثل: أسود، أحمر"
                          className="h-8 text-sm"
                        />
                      </div>
                      <label className="flex items-center gap-2 text-sm cursor-pointer pb-1">
                        <input
                          type="checkbox"
                          checked={color.isDefault}
                          onChange={(e) => updateColor(ci, "isDefault", e.target.checked)}
                          className="rounded"
                        />
                        اللون الافتراضي
                      </label>
                    </div>

                    {/* Images */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium">الصور</Label>
                        <Button
                          type="button" size="sm" variant="ghost"
                          className="h-6 text-xs gap-1 px-2"
                          onClick={() => addImage(ci)}
                        >
                          <Plus className="h-3 w-3" /> إضافة صورة
                        </Button>
                      </div>
                      {color.images.map((img, ii) => (
                        <div key={ii} className="border rounded p-3 space-y-2 bg-white">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">صورة {ii + 1}</span>
                            {color.images.length > 1 && (
                              <Button
                                type="button" size="sm" variant="ghost"
                                className="h-5 w-5 p-0 text-red-400 hover:text-red-600"
                                onClick={() => removeImage(ci, ii)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">الصورة</Label>
                            {img.previewUrl ? (
                              <div className="relative w-full h-28 rounded overflow-hidden border bg-gray-100">
                                <img src={img.previewUrl} alt="معاينة" className="w-full h-full object-cover" />
                                <button
                                  type="button"
                                  onClick={() => clearImageFile(ci, ii)}
                                  className="absolute top-1 left-1 bg-white rounded-full p-0.5 shadow hover:bg-red-50"
                                >
                                  <X className="h-3 w-3 text-red-500" />
                                </button>
                              </div>
                            ) : (
                              <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors gap-1">
                                <Image className="h-6 w-6 text-gray-400" />
                                <span className="text-xs text-gray-500">اضغط لاختيار صورة</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) setImageFile(ci, ii, file);
                                  }}
                                />
                              </label>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-xs">النص البديل</Label>
                              <Input
                                value={img.altText}
                                onChange={(e) => updateImage(ci, ii, "altText", e.target.value)}
                                placeholder="اختياري"
                                className="h-8 text-sm"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">ترتيب العرض</Label>
                              <Input
                                type="number"
                                value={img.displayOrder}
                                onChange={(e) => updateImage(ci, ii, "displayOrder", Number(e.target.value))}
                                className="h-8 text-sm"
                              />
                            </div>
                          </div>
                          <label className="flex items-center gap-2 text-xs cursor-pointer">
                            <input
                              type="checkbox"
                              checked={img.isMain}
                              onChange={(e) => updateImage(ci, ii, "isMain", e.target.checked)}
                              className="rounded"
                            />
                            الصورة الرئيسية
                          </label>
                        </div>
                      ))}
                    </div>

                    {/* Sizes */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium">المقاسات</Label>
                        <Button
                          type="button" size="sm" variant="ghost"
                          className="h-6 text-xs gap-1 px-2"
                          onClick={() => addSize(ci)}
                        >
                          <Plus className="h-3 w-3" /> إضافة مقاس
                        </Button>
                      </div>
                      {color.sizes.map((s, si) => (
                        <div key={si} className="border rounded p-3 space-y-2 bg-white">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">مقاس {si + 1}</span>
                            {color.sizes.length > 1 && (
                              <Button
                                type="button" size="sm" variant="ghost"
                                className="h-5 w-5 p-0 text-red-400 hover:text-red-600"
                                onClick={() => removeSize(ci, si)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div className="space-y-1">
                              <Label className="text-xs">اسم المقاس</Label>
                              <Input
                                value={s.sizeName}
                                onChange={(e) => updateSize(ci, si, "sizeName", e.target.value)}
                                placeholder="M, L, XL"
                                className="h-8 text-sm"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">الكمية المتاحة</Label>
                              <Input
                                type="number"
                                min={0}
                                value={s.availableQuantity}
                                onChange={(e) => updateSize(ci, si, "availableQuantity", Number(e.target.value))}
                                className="h-8 text-sm"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">تجاوز السعر</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={s.priceOverride ?? ""}
                                onChange={(e) =>
                                  updateSize(ci, si, "priceOverride", e.target.value === "" ? null : Number(e.target.value))
                                }
                                placeholder="اختياري"
                                className="h-8 text-sm"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Spinner size="sm" className="ml-2" /> : null}
                {selectedProduct ? "تحديث" : "إنشاء"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>\u062d\u0630\u0641 \u0627\u0644\u0645\u0646\u062a\u062c</DialogTitle>
            <DialogDescription>
              \u0647\u0644 \u0623\u0646\u062a \u0645\u062a\u0623\u0643\u062f \u0645\u0646 \u062d\u0630\u0641 "{selectedProduct?.nameAr}"? \u0644\u0627 \u064a\u0645\u0643\u0646 \u0627\u0644\u062a\u0631\u0627\u062c\u0639 \u0639\u0646 \u0647\u0630\u0647 \u0627\u0644\u0639\u0645\u0644\u064a\u0629.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              \u0625\u0644\u063a\u0627\u0621
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => selectedProduct && deleteMutation.mutate(selectedProduct.id)}
            >
              {deleteMutation.isPending ? <Spinner size="sm" className="ml-2" /> : null}
              \u062d\u0630\u0641
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
