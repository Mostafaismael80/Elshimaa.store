import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Plus, Pencil, Trash2, Search, Image, Star, Package, X, Upload,
  ChevronLeft, ChevronRight, Tag, Filter,
} from "lucide-react";
import { productsApi } from "../api/products";
import { categoriesApi } from "../api/categories";
import { imagesApi } from "../api/images";
import { lookupsApi } from "../api/lookups";
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
import { formatCurrency, getFullImageUrl } from "../lib/utils";
import type { ProductResponse, CreateProductRequest, UpdateProductRequest } from "../types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ColorImage {
  imageUrl: string;      // relative path from upload API
  file: File | null;
  previewUrl: string;    // local objectURL or full server URL for display
  displayOrder: number;
  isMain: boolean;
  altText: string;
}

interface ColorSize {
  sizeId: string;
  sizeName: string;
  availableQuantity: number;
  priceOverride: number | null;
}

interface ColorEntry {
  productColorId: string; // for Smart Merge matching
  colorId: string;        // for lookup Selection
  colorName: string;      // for display only
  isDefault: boolean;
  images: ColorImage[];
  sizes: ColorSize[];
}

/** Display images for product card (exactly 2: SortOrder 0 = main, 1 = hover) */
interface DisplayImageEntry {
  imageUrl: string;
  file: File | null;
  previewUrl: string;
  sortOrder: number;
  altText: string;
}

const defaultColorEntry = (): ColorEntry => ({
  productColorId: "",
  colorId: "",
  colorName: "",
  isDefault: false,
  images: [{ imageUrl: "", file: null, previewUrl: "", displayOrder: 1, isMain: true, altText: "" }],
  sizes: [{ sizeId: "", sizeName: "", availableQuantity: undefined as any, priceOverride: null }],
});

const defaultDisplayImages = (): DisplayImageEntry[] => [
  { imageUrl: "", file: null, previewUrl: "", sortOrder: 0, altText: "الصورة الرئيسية" },
  { imageUrl: "", file: null, previewUrl: "", sortOrder: 1, altText: "صورة التمرير" },
];

// ─── Form Schema ──────────────────────────────────────────────────────────────

const productSchema = z.object({
  nameAr: z.string().min(2, "الاسم مطلوب"),
  descriptionAr: z.string().optional(),
  basePrice: z.coerce.number().min(0.01, "السعر يجب أن يكون أكبر من صفر"),
  categoryId: z.string().min(1, "الفئة مطلوبة"),
  sizeTypeId: z.string().default(""),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  includes: z.string().optional(),
  length: z.string().optional(),
  material: z.string().optional(),
  isDiscountActive: z.boolean().default(false),
  discountType: z.coerce.number().optional(),
  discountValue: z.coerce.number().optional(),
  discountStartDate: z.string().optional(),
  discountEndDate: z.string().optional(),
});

type ProductForm = z.infer<typeof productSchema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Upload pending files, return relative paths */
async function resolveImageUrl(img: { file: File | null; imageUrl: string }): Promise<string> {
  if (img.file) return imagesApi.uploadImage(img.file);
  return img.imageUrl;
}

function ProductImage({ src, alt }: { src: string | null | undefined; alt: string }) {
  if (!src) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gray-100">
        <Image className="h-10 w-10 text-gray-300" />
      </div>
    );
  }
  return (
    <img
      src={getFullImageUrl(src)}
      alt={alt}
      className="w-full h-full object-cover aspect-square"
      onError={(e) => {
        const img = e.currentTarget;
        img.onerror = null;
        img.src = "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";
      }}
    />
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Products() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // List state
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [filterActive, setFilterActive] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductResponse | null>(null);

  // Dynamic form state
  const [colors, setColors] = useState<ColorEntry[]>([defaultColorEntry()]);
  const [displayImages, setDisplayImages] = useState<DisplayImageEntry[]>(defaultDisplayImages());
  const [useDisplayImages, setUseDisplayImages] = useState(false);

  // ─── Queries ─────────────────────────────────────────────────────────────────

  const { data, isLoading } = useQuery({
    queryKey: ["products", page, search, filterActive, filterCategory],
    queryFn: () =>
      productsApi.getAll({
        pageNumber: page,
        pageSize: 20,
        search: search || undefined,
        isActive: filterActive === "active" ? true : filterActive === "inactive" ? false : undefined,
        categoryId: filterCategory !== "all" ? filterCategory : undefined,
      }),
  });

  const { data: categoriesData } = useQuery({
    queryKey: ["categories"],
    queryFn: () => categoriesApi.getAll(true),
  });

  const { data: colorsData } = useQuery({
    queryKey: ["lookups-colors"],
    queryFn: () => lookupsApi.getColors(),
  });

  const { data: sizesData } = useQuery({
    queryKey: ["lookups-sizes"],
    queryFn: () => lookupsApi.getSizes(),
  });

  const { data: sizeTypesData } = useQuery({
    queryKey: ["lookups-sizetypes"],
    queryFn: () => lookupsApi.getSizeTypes(),
  });

  const categories = categoriesData?.data ?? [];
  const systemColors = Array.isArray(colorsData) ? colorsData.filter((c, i, a) => a.findIndex(x => x.id === c.id) === i) : [];
  const systemSizes = Array.isArray(sizesData) ? sizesData.filter((s, i, a) => a.findIndex(x => x.id === s.id) === i) : [];
  const systemSizeTypes = Array.isArray(sizeTypesData) ? sizeTypesData.filter((t, i, a) => a.findIndex(x => x.id === t.id) === i) : [];

  // ─── Form ─────────────────────────────────────────────────────────────────────

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProductForm>({
    resolver: zodResolver(productSchema) as any,
    defaultValues: { nameAr: "", descriptionAr: "", basePrice: undefined as any, categoryId: "", sizeTypeId: "", isActive: true, isFeatured: false, isDiscountActive: false, discountType: 0, discountValue: undefined as any },
  });

  // ─── Mutations ────────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: (data: CreateProductRequest) => productsApi.create(data),
    onSuccess: () => {
      toast("تم إنشاء المنتج بنجاح", "success");
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setDialogOpen(false);
    },
    onError: (err: any) => toast(err?.response?.data?.message ?? "فشل إنشاء المنتج", "error"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProductRequest }) => productsApi.update(id, data),
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

      // Auto-navigate back if current page no longer exists after deletion
      const totalAfterDelete = (pagination?.totalCount ?? 1) - 1;
      const maxPage = Math.ceil(totalAfterDelete / 20);
      if (page > maxPage) setPage(Math.max(1, maxPage));
    },
    onError: (err: any) => toast(err?.response?.data?.message ?? "فشل الحذف", "error"),
  });

  // ─── Color helpers ────────────────────────────────────────────────────────────

  const addColor = () => {
    const last = colors[colors.length - 1];

    const isComplete =
      last.colorId.trim() !== "" &&
      last.colorName.trim() !== "" &&
      last.images.some((img) => img.imageUrl.trim() !== "" || img.file !== null) &&
      last.sizes.some((s) => s.sizeName.trim() !== "" && s.availableQuantity > 0);

    if (!isComplete) {
      toast(
        "يرجى إكمال بيانات اللون الحالي أولاً (اللون، صورة واحدة على الأقل، ومقاس واحد بكمية)",
        "error"
      );
      return;
    }

    setColors((prev) => [
      ...prev,
      { ...defaultColorEntry(), isDefault: prev.length === 0 },
    ]);
  };
  const removeColor = (ci: number) => setColors((prev) => prev.filter((_, i) => i !== ci));
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
  const removeImage = (ci: number, ii: number) =>
    setColors((prev) => prev.map((c, i) => (i === ci ? { ...c, images: c.images.filter((_, j) => j !== ii) } : c)));
  const setImageFile = (ci: number, ii: number, file: File) => {
    const previewUrl = URL.createObjectURL(file);
    setColors((prev) =>
      prev.map((c, i) =>
        i === ci ? { ...c, images: c.images.map((img, j) => (j === ii ? { ...img, file, previewUrl, imageUrl: "" } : img)) } : c
      )
    );
  };
  const clearImageFile = (ci: number, ii: number) =>
    setColors((prev) =>
      prev.map((c, i) =>
        i === ci ? { ...c, images: c.images.map((img, j) => (j === ii ? { ...img, file: null, previewUrl: "", imageUrl: "" } : img)) } : c
      )
    );
  const updateImage = (ci: number, ii: number, field: keyof ColorImage, value: any) =>
    setColors((prev) =>
      prev.map((c, i) =>
        i === ci ? { ...c, images: c.images.map((img, j) => (j === ii ? { ...img, [field]: value } : img)) } : c
      )
    );

  const addSize = (ci: number) =>
    setColors((prev) =>
      prev.map((c, i) =>
        i === ci ? { ...c, sizes: [...c.sizes, { sizeId: "", sizeName: "", availableQuantity: 0, priceOverride: null }] } : c
      )
    );
  const removeSize = (ci: number, si: number) =>
    setColors((prev) => prev.map((c, i) => (i === ci ? { ...c, sizes: c.sizes.filter((_, j) => j !== si) } : c)));
  const updateSize = (ci: number, si: number, field: keyof ColorSize, value: any) =>
    setColors((prev) =>
      prev.map((c, i) =>
        i === ci ? { ...c, sizes: c.sizes.map((s, j) => (j === si ? { ...s, [field]: value } : s)) } : c
      )
    );

  // ─── Display image helpers ────────────────────────────────────────────────────

  const setDisplayImageFile = (idx: number, file: File) => {
    const previewUrl = URL.createObjectURL(file);
    setDisplayImages((prev) => prev.map((d, i) => (i === idx ? { ...d, file, previewUrl, imageUrl: "" } : d)));
  };
  const clearDisplayImageFile = (idx: number) =>
    setDisplayImages((prev) => prev.map((d, i) => (i === idx ? { ...d, file: null, previewUrl: "", imageUrl: "" } : d)));

  // ─── Dialog helpers ───────────────────────────────────────────────────────────

  const openCreate = () => {
    setSelectedProduct(null);
    reset({ nameAr: "", descriptionAr: "", basePrice: 0, categoryId: "", sizeTypeId: "", isActive: true, isFeatured: false, includes: "", length: "", material: "", isDiscountActive: false, discountType: 0, discountValue: 0, discountStartDate: "", discountEndDate: "" });
    setColors([defaultColorEntry()]);
    setDisplayImages(defaultDisplayImages());
    setUseDisplayImages(false);
    setDialogOpen(true);
  };

  const openEdit = async (product: ProductResponse) => {
    setSelectedProduct(product);

    // Pre-fill form with list-response data immediately (fast path)
    reset({
      nameAr: product.nameAr,
      descriptionAr: product.descriptionAr ?? "",
      basePrice: product.basePrice || product.originalPrice || undefined,
      categoryId: product.categoryId,
      sizeTypeId: product.sizeTypeId ?? "",
      isActive: product.isActive,
      isFeatured: product.isFeatured,
      includes: (product as any).includes ?? "",
      length: (product as any).length ?? "",
      material: (product as any).material ?? "",
      isDiscountActive: product.isDiscountActive ?? product.hasDiscount ?? false,
      discountType: (product.discountType === 'Percentage' ? 0 : product.discountType === 'FixedAmount' ? 1 : 0),
      discountValue: product.discountValue ?? undefined,
      discountStartDate: product.discountStartDate ? product.discountStartDate.substring(0, 16) : "",
      discountEndDate: product.discountEndDate ? product.discountEndDate.substring(0, 16) : "",
    });

    // Load full detail to get colors with images/variants + complete product data
    try {
      const detail = await productsApi.getById(product.id);
      const fullProduct = detail.data;

      // Override form with authoritative full-detail values
      reset({
        nameAr: fullProduct.nameAr,
        descriptionAr: fullProduct.descriptionAr ?? "",
        basePrice: fullProduct.basePrice || fullProduct.originalPrice || undefined,
        categoryId: fullProduct.categoryId,
        sizeTypeId: fullProduct.sizeTypeId ?? "",
        isActive: fullProduct.isActive,
        isFeatured: fullProduct.isFeatured,
        includes: fullProduct.includes ?? "",
        length: fullProduct.length ?? "",
        material: fullProduct.material ?? "",
        isDiscountActive: fullProduct.isDiscountActive ?? fullProduct.hasDiscount ?? false,
        discountType: (fullProduct.discountType === 'Percentage' ? 0 : fullProduct.discountType === 'FixedAmount' ? 1 : 0),
        discountValue: fullProduct.discountValue ?? undefined,
        discountStartDate: fullProduct.discountStartDate ? fullProduct.discountStartDate.substring(0, 16) : "",
        discountEndDate: fullProduct.discountEndDate ? fullProduct.discountEndDate.substring(0, 16) : "",
      });

      if (fullProduct.colors && fullProduct.colors.length > 0) {
        setColors(
          fullProduct.colors.map((c) => ({
            productColorId: c.id,
            colorId: c.colorId,
            colorName: c.colorName,
            isDefault: c.isDefault,
            images: c.images.map((img) => {
              // Store relative path in imageUrl (for sending to backend)
              // Store full URL in previewUrl (for display in the form)
              const fullUrl: string = img.imageUrl ?? "";
              const idx = fullUrl.indexOf("/images/");
              const relativeUrl = idx >= 0 ? fullUrl.substring(idx + 1) : fullUrl;
              return {
                imageUrl: relativeUrl,
                file: null,
                previewUrl: fullUrl, // full URL for <img> display
                displayOrder: img.displayOrder,
                isMain: img.isMain,
                altText: img.altText ?? "",
              };
            }),
            sizes: c.variants.map((v) => ({
              sizeId: v.sizeId,
              sizeName: v.sizeName,
              availableQuantity: v.availableQuantity,
              // API returns 'price' not 'priceOverride' — use price if priceOverride is missing
              priceOverride: (v as any).priceOverride ?? (v as any).price ?? null,
            })),
          }))
        );
      } else {
        setColors([defaultColorEntry()]);
      }

      if (fullProduct.displayImages && fullProduct.displayImages.length > 0) {
        const sorted = [...fullProduct.displayImages].sort((a, b) => a.sortOrder - b.sortOrder);
        setDisplayImages(
          sorted.map((d) => {
            const fullUrl: string = d.imageUrl ?? "";
            const idx = fullUrl.indexOf("/images/");
            const relativeUrl = idx >= 0 ? fullUrl.substring(idx + 1) : fullUrl;
            return { imageUrl: relativeUrl, file: null, previewUrl: fullUrl, sortOrder: d.sortOrder, altText: d.altText ?? "" };
          })
        );
        setUseDisplayImages(true);
      } else {
        setDisplayImages(defaultDisplayImages());
        setUseDisplayImages(false);
      }

      setDialogOpen(true);
    } catch {
      toast("فشل تحميل بيانات المنتج، يرجى المحاولة مرة أخرى", "error");
    }
  };

  const openDelete = (product: ProductResponse) => {
    setSelectedProduct(product);
    setDeleteDialogOpen(true);
  };

  // ─── Submit ───────────────────────────────────────────────────────────────────

  const isValidGuid = (v: string | undefined | null) =>
    !!v && v.trim() !== "" && v !== "00000000-0000-0000-0000-000000000000";

  const resolveColorsForUpdate = async () => {
    if (colors.length === 0) {
      toast("يجب اختيار لون واحد على الأقل", "error");
      return null;
    }
    if (colors.some((c) => c.sizes.length === 0)) {
      toast("يجب اختيار مقاس واحد على الأقل", "error");
      return null;
    }
    if (colors.some((c) => c.sizes.some((s) => !isValidGuid(s.sizeId)))) {
      toast("يرجى اختيار المقاس من القائمة المنسدلة لكل لون", "error");
      return null;
    }
    if (colors.some((c) => !c.colorName?.trim())) {
      toast("يرجى التأكد من تحديد اسم اللون لكل لون", "error");
      return null;
    }

    return Promise.all(
      colors.map(async (c) => {
        const resolvedImages = await Promise.all(
          c.images.map(async (img) => ({
            imageUrl: await resolveImageUrl(img),
            displayOrder: img.displayOrder,
            isMain: img.isMain,
            altText: img.altText || undefined,
          }))
        );
        const filteredImages = resolvedImages.filter(img => img.imageUrl && img.imageUrl.trim() !== "");

        return {
          colorId: c.productColorId?.trim() || undefined,
          colorName: c.colorName.trim(),
          isDefault: c.isDefault,
          images: filteredImages,
          sizes: c.sizes.map((s) => ({
            sizeId: s.sizeId?.trim() || undefined,
            sizeName: s.sizeName.trim(),
            availableQuantity: Number(s.availableQuantity),
            priceOverride: s.priceOverride != null ? Number(s.priceOverride) : null,
          })),
        };
      })
    );
  };

  const resolveColorsForCreate = async () => {
    // Validation
    if (colors.length === 0) {
      toast("يجب اختيار لون واحد على الأقل", "error");
      return null;
    }
    if (colors.some((c) => c.sizes.length === 0)) {
      toast("يجب اختيار مقاس واحد على الأقل", "error");
      return null;
    }
    if (colors.some((c) => !c.colorId?.trim() || c.colorId === "00000000-0000-0000-0000-000000000000")) {
      toast("يرجى اختيار اللون من القائمة المنسدلة", "error");
      return null;
    }
    if (colors.some((c) => c.sizes.some(s => !s.sizeId?.trim() || s.sizeId === "00000000-0000-0000-0000-000000000000"))) {
      toast("يرجى اختيار المقاس من القائمة المنسدلة", "error");
      return null;
    }
    if (colors.some((c) => c.sizes.some(s => Number(s.availableQuantity) < 0 || isNaN(Number(s.availableQuantity))))) {
      toast("الكمية يجب أن تكون صفر أو أكثر", "error");
      return null;
    }

    return Promise.all(
      colors.map(async (c) => {
        const resolvedImages = await Promise.all(
          c.images.map(async (img) => ({
            imageUrl: await resolveImageUrl(img),
            displayOrder: img.displayOrder,
            isMain: img.isMain,
            altText: img.altText || undefined,
          }))
        );
        const filteredImages = resolvedImages.filter(img => img.imageUrl && img.imageUrl.trim() !== "");

        return {
          colorId: c.colorId.trim(),
          isDefault: c.isDefault,
          images: filteredImages,
          variants: c.sizes.map((s) => ({
            sizeId: s.sizeId!.trim(),
            availableQuantity: Number(s.availableQuantity),
            priceOverride: s.priceOverride != null ? Number(s.priceOverride) : null,
          })),
        };
      })
    );
  };


  const onSubmit = async (values: ProductForm) => {
    let resolvedDisplayImages = undefined;
    if (useDisplayImages) {
      const di = await Promise.all(
        displayImages.map(async (d) => ({
          imageUrl: await resolveImageUrl(d),
          sortOrder: d.sortOrder,
          altText: d.altText || undefined,
        }))
      );
      resolvedDisplayImages = di;
    }

    if (selectedProduct) {
      try {
        const resolvedColors = await resolveColorsForUpdate();
        if (!resolvedColors) return;

        await updateMutation.mutateAsync({
          id: selectedProduct.id,
          data: {
            nameAr: values.nameAr,
            descriptionAr: values.descriptionAr,
            basePrice: values.basePrice,
            categoryId: values.categoryId,
            isActive: values.isActive,
            isFeatured: values.isFeatured,
            includes: values.includes ?? null,
            length: values.length ?? null,
            material: values.material ?? null,
            colors: resolvedColors,
            displayImages: useDisplayImages ? resolvedDisplayImages : null,
            isDiscountActive: values.isDiscountActive,
            discountType: values.isDiscountActive ? values.discountType : null,
            discountValue: values.isDiscountActive ? values.discountValue : null,
            discountStartDate: values.isDiscountActive ? values.discountStartDate || null : null,
            discountEndDate: values.isDiscountActive ? values.discountEndDate || null : null,
          },
        });
      } catch (error: any) {
        console.error("Update product failed:", error);
        if (error?.response?.status === 413) {
          toast("فشل رفع الصورة: حجم الملف كبير جداً", "error");
        } else {
          toast(error?.response?.data?.message ?? "حدث خطأ أثناء حفظ المنتج، يرجى المحاولة مرة أخرى", "error");
        }
      }
    } else {
      if (!values.categoryId?.trim() || values.categoryId === "00000000-0000-0000-0000-000000000000") {
        toast("يرجى اختيار القسم", "error");
        return;
      }
      if (!values.sizeTypeId?.trim() || values.sizeTypeId === "00000000-0000-0000-0000-000000000000") {
        toast("يرجى إدخال معرّف نوع المقاس (sizeTypeId)", "error");
        return;
      }

      try {
        const resolvedColors = await resolveColorsForCreate();
        if (!resolvedColors) return;

        await createMutation.mutateAsync({
          nameAr: values.nameAr,
          descriptionAr: values.descriptionAr,
          basePrice: values.basePrice,
          categoryId: values.categoryId,
          sizeTypeId: values.sizeTypeId,
          isActive: values.isActive,
          isFeatured: values.isFeatured,
          includes: values.includes || null,
          length: values.length || null,
          material: values.material || null,
          colors: resolvedColors as any, // Cast to any to override typing from old DTO format in UI
          displayImages: useDisplayImages ? resolvedDisplayImages : null,
          isDiscountActive: values.isDiscountActive,
          discountType: values.isDiscountActive ? values.discountType : null,
          discountValue: values.isDiscountActive ? values.discountValue : null,
          discountStartDate: values.isDiscountActive ? values.discountStartDate || null : null,
          discountEndDate: values.isDiscountActive ? values.discountEndDate || null : null,
        });
      } catch (error: any) {
        console.error("Create product failed:", error);
        if (error?.response?.status === 413) {
          toast("فشل رفع الصورة: حجم الملف كبير جداً", "error");
        } else {
          toast(error?.response?.data?.message ?? "حدث خطأ أثناء إنشاء المنتج، يرجى المحاولة مرة أخرى", "error");
        }
      }
    }
  };

  const products = data?.data?.items ?? [];
  const pagination = data?.data;

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">المنتجات</h2>
          <p className="text-muted-foreground text-sm mt-1">{pagination?.totalCount ?? 0} منتج إجمالاً</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" /> إضافة منتج
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="البحث في المنتجات..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pr-10 pl-3 w-full"
          />
        </div>
        <Select value={filterCategory} onValueChange={(v) => { setFilterCategory(v); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="الفئة" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الفئات</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>{cat.nameAr}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterActive} onValueChange={(v) => { setFilterActive(v); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder="الحالة" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الحالات</SelectItem>
            <SelectItem value="active">نشط</SelectItem>
            <SelectItem value="inactive">غير نشط</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Filter className="h-4 w-4" />
          {pagination?.totalCount ?? 0} نتيجة
        </div>
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
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {products.map((product) => {
            // Correct image priority per API docs
            const cardImage = product.listingMainImageUrl ?? product.mainImageUrl;

            return (
              <Card key={product.id} className="overflow-hidden group hover:shadow-md transition-shadow">
                <div className="relative aspect-square bg-gray-100 overflow-hidden">
                  <ProductImage src={cardImage} alt={product.nameAr} />
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
                  {product.hasDiscount && (
                    <div className="absolute bottom-2 left-2">
                      <Badge variant="destructive" className="gap-1 text-xs">
                        <Tag className="h-3 w-3" />
                        {product.discountType === "Percentage"
                          ? `خصم %${product.discountValue}`
                          : `خصم ${product.discountValue} ج.م`}
                      </Badge>
                    </div>
                  )}
                </div>
                <CardContent className="p-3 text-right">
                  <h3 className="font-semibold text-sm truncate mb-1" dir="rtl">{product.nameAr}</h3>
                  <p className="text-xs text-muted-foreground truncate mb-2" dir="rtl">{product.categoryName}</p>
                  <div className="flex items-center justify-between mb-3" dir="rtl">
                    <div className="flex flex-col text-right">
                      <span className="font-bold text-blue-600 text-sm">{formatCurrency(product.finalPrice)}</span>
                      {product.hasDiscount && (
                        <span className="text-xs text-muted-foreground line-through">{formatCurrency(product.originalPrice)}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2" dir="rtl">
                    <Button size="sm" variant="outline" className="flex-1 gap-1 h-8 text-xs" onClick={() => openEdit(product)}>
                      <Pencil className="h-3 w-3" /> تعديل
                    </Button>
                    <Button size="sm" variant="destructive" className="gap-1 h-8 px-2" onClick={() => openDelete(product)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={!pagination.hasPreviousPage} onClick={() => setPage((p) => p - 1)}>
            <ChevronRight className="h-4 w-4" />
            السابق
          </Button>
          <span className="text-sm text-muted-foreground">
            صفحة {pagination.pageNumber} من {pagination.totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={!pagination.hasNextPage} onClick={() => setPage((p) => p + 1)}>
            التالي
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-hidden p-0 gap-0">
          <div className="max-h-[92vh] overflow-y-auto px-6 pb-6 pt-12">
            <DialogHeader>
              <DialogTitle>{selectedProduct ? "تعديل المنتج" : "إضافة منتج جديد"}</DialogTitle>
              <DialogDescription>
                {selectedProduct ? "قم بتحديث تفاصيل المنتج أدناه." : "أدخل التفاصيل لإنشاء منتج جديد."}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Basic info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label>اسم المنتج (بالعربية) *</Label>
                <Input {...register("nameAr")} placeholder="اسم المنتج" />
                {errors.nameAr && <p className="text-xs text-red-500">{errors.nameAr.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>السعر الأساسي (ج.م) *</Label>
                <Input type="number" step="0.01" placeholder="0.00" {...register("basePrice")} />
                {errors.basePrice && <p className="text-xs text-red-500">{errors.basePrice.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>الفئة *</Label>
                <Select value={watch("categoryId") || undefined} onValueChange={(v) => setValue("categoryId", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الفئة" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.nameAr}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.categoryId && <p className="text-xs text-red-500">{errors.categoryId.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>نوع المقاس {!selectedProduct && "*"}</Label>
                <Select
                  value={watch("sizeTypeId") || undefined}
                  onValueChange={(v) => { if (!selectedProduct) setValue("sizeTypeId", v); }}
                  disabled={!!selectedProduct}
                >
                  <SelectTrigger className={selectedProduct ? "opacity-60 cursor-not-allowed" : ""}>
                    <SelectValue placeholder="اختر نوع المقاس" />
                  </SelectTrigger>
                  <SelectContent>
                    {systemSizeTypes.map((st) => (
                      <SelectItem key={st.id} value={st.id}>{st.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!selectedProduct && errors.sizeTypeId && (
                  <p className="text-xs text-red-500">{errors.sizeTypeId.message}</p>
                )}
                {selectedProduct && (
                  <p className="text-xs text-muted-foreground">
                    نوع المقاس لا يمكن تغييره بعد إنشاء المنتج
                  </p>
                )}
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>الوصف (بالعربية)</Label>
                <Textarea {...register("descriptionAr")} placeholder="وصف المنتج" rows={3} />
              </div>

              {/* Optional Product Details */}
              <div className="space-y-2">
                <Label>المحتويات (includes)</Label>
                <Input {...register("includes")} placeholder="ما يتضمنه المنتج" maxLength={500} />
              </div>
              <div className="space-y-2">
                <Label>الطول (length)</Label>
                <Input {...register("length")} placeholder="مثال: 120 سم" maxLength={100} />
              </div>
              <div className="space-y-2">
                <Label>الخامة (material)</Label>
                <Input {...register("material")} placeholder="مثال: قطن 100%" maxLength={200} />
              </div>
            </div>

            <div className="flex gap-6">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" {...register("isActive")} className="rounded" /> نشط
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" {...register("isFeatured")} className="rounded" /> مميز
              </label>
            </div>

            {/* Discount Fields */}
            <div className="space-y-4 border p-4 rounded-lg bg-gray-50/50">
              <label className="flex items-center gap-2 text-sm cursor-pointer font-semibold text-blue-700">
                <input type="checkbox" {...register("isDiscountActive")} className="rounded" />
                إضافة خصم مباشر للمنتج
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
                      <Input type="number" step="0.01" min="0" placeholder="0.00" {...register("discountValue")} />
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
                  {selectedProduct && (
                    <p className="text-xs text-orange-600">تسجيل: الخصم سيتم حفظه في القواعد المركزية، ولن يظهر بعد حفظه في هذه الشاشة عند التعديل مستقبلاً.</p>
                  )}
                </div>
              )}
            </div>

            {/* Display Images */}
            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-semibold">صور البطاقة (Display Images)</Label>
                  <p className="text-xs text-muted-foreground mt-1">صورتان: الرئيسية (SortOrder 0) + التمرير (SortOrder 1)</p>
                </div>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useDisplayImages}
                    onChange={(e) => setUseDisplayImages(e.target.checked)}
                    className="rounded"
                  />
                  تفعيل
                </label>
              </div>

              {useDisplayImages && (
                <div className="grid grid-cols-2 gap-3">
                  {displayImages.map((d, idx) => (
                    <div key={idx} className="space-y-2">
                      <Label className="text-xs">{idx === 0 ? "الصورة الرئيسية (SortOrder 0)" : "صورة التمرير (SortOrder 1)"}</Label>
                      <div className="relative h-32 rounded overflow-hidden border bg-gray-100 group">
                        {d.previewUrl ? (
                          <img src={getFullImageUrl(d.previewUrl)} alt="معاينة" className="w-full h-full object-cover" />
                        ) : (
                          <div className="flex flex-col items-center justify-center h-full gap-1 text-gray-400">
                            <Image className="h-6 w-6" />
                            <span className="text-xs">بدون صورة</span>
                          </div>
                        )}
                        
                        {/* Overlay Controls */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                          <label className="cursor-pointer p-2 bg-white rounded-full hover:scale-110 transition-transform shadow-md" title="تغيير الصورة">
                            <Upload className="h-4 w-4 text-blue-600" />
                            <input type="file" accept="image/*" className="hidden"
                              onChange={(e) => { const file = e.target.files?.[0]; if (file) setDisplayImageFile(idx, file); }} />
                          </label>
                          
                          {d.previewUrl && (
                            <button type="button" onClick={() => clearDisplayImageFile(idx)}
                              className="p-2 bg-white rounded-full hover:scale-110 transition-transform shadow-md" title="حذف الصورة">
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Colors */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">الألوان والمخزون</Label>
                <Button type="button" size="sm" variant="outline" onClick={addColor} className="gap-1">
                  <Plus className="h-3 w-3" /> إضافة لون
                </Button>
              </div>

              {colors.map((color, ci) => (
                <div key={ci} className="border rounded-lg p-4 space-y-3 bg-gray-50/50">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">لون {ci + 1}</span>
                    {colors.length > 1 && (
                      <Button type="button" size="sm" variant="ghost"
                        className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => removeColor(ci)}>
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">اللون</Label>
                      <Select value={color.colorId || undefined} onValueChange={(v) => {
                        updateColor(ci, "colorId", v);
                        const selectedColor = systemColors.find(c => c.id === v);
                        if (selectedColor) {
                          updateColor(ci, "colorName", selectedColor.name);
                        }
                      }}>
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder="اختر اللون" />
                        </SelectTrigger>
                        <SelectContent>
                          {systemColors.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              <div className="flex items-center gap-2">
                                {c.hexCode && (
                                  <div className="w-3 h-3 rounded-full border border-gray-200" style={{ backgroundColor: c.hexCode }} />
                                )}
                                {c.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">اسم اللون (للعرض)</Label>
                      <Input
                        value={color.colorName}
                        onChange={(e) => updateColor(ci, "colorName", e.target.value)}
                        placeholder="أسود، أحمر..."
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={color.isDefault}
                      onChange={(e) => updateColor(ci, "isDefault", e.target.checked)} className="rounded" />
                    اللون الافتراضي
                  </label>

                  {/* Color Images */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium">صور اللون</Label>
                      <Button type="button" size="sm" variant="ghost" className="h-6 text-xs gap-1 px-2" onClick={() => addImage(ci)}>
                        <Plus className="h-3 w-3" /> إضافة صورة
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {color.images.map((img, ii) => (
                        <div key={ii} className="border rounded p-2 space-y-2 bg-white">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">صورة {ii + 1}</span>
                            {color.images.length > 1 && (
                              <Button type="button" size="sm" variant="ghost"
                                className="h-5 w-5 p-0 text-red-400" onClick={() => removeImage(ci, ii)}>
                                <X className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                          {img.previewUrl ? (
                            <div className="relative h-24 rounded overflow-hidden border bg-gray-100">
                              <img src={getFullImageUrl(img.previewUrl)} alt="معاينة" className="w-full h-full object-cover" />
                              <button type="button" onClick={() => clearImageFile(ci, ii)}
                                className="absolute top-1 left-1 bg-white rounded-full p-0.5 shadow">
                                <X className="h-3 w-3 text-red-500" />
                              </button>
                            </div>
                          ) : (
                            <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed rounded cursor-pointer bg-gray-50 hover:bg-gray-100 gap-1">
                              <Image className="h-5 w-5 text-gray-400" />
                              <span className="text-xs text-gray-500">اختر صورة</span>
                              <input type="file" accept="image/*" className="hidden"
                                onChange={(e) => { const file = e.target.files?.[0]; if (file) setImageFile(ci, ii, file); }} />
                            </label>
                          )}
                          <div className="flex gap-2">
                            <label className="flex items-center gap-1 text-xs cursor-pointer">
                              <input type="checkbox" checked={img.isMain}
                                onChange={(e) => updateImage(ci, ii, "isMain", e.target.checked)} className="rounded" />
                              رئيسية
                            </label>
                          </div>
                          <Input
                            value={img.altText}
                            onChange={(e) => updateImage(ci, ii, "altText", e.target.value)}
                            placeholder="النص البديل"
                            className="h-7 text-xs"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Sizes */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium">المقاسات والمخزون</Label>
                      <Button type="button" size="sm" variant="ghost" className="h-6 text-xs gap-1 px-2" onClick={() => addSize(ci)}>
                        <Plus className="h-3 w-3" /> إضافة مقاس
                      </Button>
                    </div>
                    {color.sizes.map((s, si) => (
                      <div key={si} className="grid grid-cols-4 gap-2 items-end">
                        <div className="space-y-1">
                          <Label className="text-xs">المقاس</Label>
                          <Select value={s.sizeId || undefined} onValueChange={(v) => {
                             updateSize(ci, si, "sizeId", v);
                             const selectedSize = systemSizes.find(size => size.id === v);
                             if (selectedSize) {
                               updateSize(ci, si, "sizeName", selectedSize.name);
                             }
                          }}>
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="اختر المقاس" />
                            </SelectTrigger>
                            <SelectContent>
                              {systemSizes
                                .filter(size => !isValidGuid(watch("sizeTypeId")) || size.sizeTypeId === watch("sizeTypeId"))
                                .map((size) => (
                                <SelectItem key={size.id} value={size.id}>{size.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">الاسم</Label>
                          <Input value={s.sizeName} onChange={(e) => updateSize(ci, si, "sizeName", e.target.value)}
                            placeholder="L, XL" className="h-8 text-xs" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">الكمية</Label>
                          <Input type="number" min={0} placeholder="0"
                            value={s.availableQuantity ?? ""}
                            onChange={(e) => updateSize(ci, si, "availableQuantity", e.target.value === "" ? undefined : Number(e.target.value))}
                            className="h-8 text-xs" />
                        </div>
                        <div className="flex items-end gap-1">
                          {color.sizes.length > 1 && (
                            <Button type="button" size="sm" variant="ghost"
                              className="h-8 w-8 p-0 text-red-400" onClick={() => removeSize(ci, si)}>
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>إلغاء</Button>
              <Button type="submit" disabled={isSubmitting || createMutation.isPending || updateMutation.isPending} className="gap-2">
                {(isSubmitting || createMutation.isPending || updateMutation.isPending) && <Spinner className="h-4 w-4" />}
                {selectedProduct ? "حفظ التغييرات" : "إنشاء المنتج"}
              </Button>
            </DialogFooter>
          </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>حذف المنتج</DialogTitle>
            <DialogDescription>
              هل تريد حذف منتج "{selectedProduct?.nameAr}"؟ هذا الإجراء لا يمكن التراجع عنه.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>إلغاء</Button>
            <Button
              variant="destructive"
              onClick={() => selectedProduct && deleteMutation.mutate(selectedProduct.id)}
              disabled={deleteMutation.isPending}
              className="gap-2"
            >
              {deleteMutation.isPending && <Spinner className="h-4 w-4" />}
              تأكيد الحذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
