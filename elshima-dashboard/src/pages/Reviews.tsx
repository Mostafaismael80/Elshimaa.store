import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Star, Image, Upload, Trash2, ChevronLeft, ChevronRight,
  MessageSquare, Plus, Pencil,
} from "lucide-react";
import { reviewsApi } from "../api/reviews";
import { productsApi } from "../api/products";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { LoadingPage, Spinner } from "../components/ui/spinner";
import { useToast } from "../components/ui/toast";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "../components/ui/table";
import { formatDate, getFullImageUrl } from "../lib/utils";
import type { ReviewResponse, CreateReviewRequest } from "../types";

// â”€â”€â”€ Zod Schema â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const schema = z.object({
  productId: z.string().min(1, "Ø§Ù„Ù…Ù†ØªØ¬ Ù…Ø·Ù„ÙˆØ¨"),
  authorName: z.string().min(1, "Ø§Ø³Ù… Ø§Ù„ÙƒØ§ØªØ¨ Ù…Ø·Ù„ÙˆØ¨"),
  rating: z.coerce.number().min(1).max(5),
  comment: z.string().optional(),
  isFeatured: z.boolean().default(false),
});

type FormValues = z.infer<typeof schema>;

// â”€â”€â”€ Star Rating Display â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${i <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
        />
      ))}
    </div>
  );
}

// â”€â”€â”€ Star Rating Picker (interactive) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          onMouseEnter={() => setHovered(i)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(i)}
          className="p-0.5 focus:outline-none"
        >
          <Star
            className={`h-6 w-6 transition-colors ${
              i <= (hovered || value)
                ? "fill-yellow-400 text-yellow-400"
                : "text-gray-300"
            }`}
          />
        </button>
      ))}
      <span className="text-sm text-muted-foreground mr-1">{value}/5</span>
    </div>
  );
}

// â”€â”€â”€ Main Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function Reviews() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // â”€â”€ UI state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [imageDialogReview, setImageDialogReview] = useState<ReviewResponse | null>(null);
  const [selected, setSelected] = useState<ReviewResponse | null>(null);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);

  // â”€â”€ Queries â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const { data, isLoading } = useQuery({
    queryKey: ["reviews", page],
    queryFn: () => reviewsApi.getAll({ pageNumber: page, pageSize: 15 }),
  });

  const { data: productsData } = useQuery({
    queryKey: ["products-all"],
    queryFn: () => productsApi.getAll({ pageSize: 1000 }),
  });

  const reviews = data?.data?.items ?? [];
  const pagination = data?.data;
  const products = productsData?.data?.items ?? [];

  // â”€â”€ Form â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const {
    register,
    handleSubmit,
    reset,
    watch,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: { productId: "", authorName: "", rating: 5, comment: "", isFeatured: false },
  });

  // â”€â”€ Mutations â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const createMutation = useMutation({
    mutationFn: (payload: CreateReviewRequest) => reviewsApi.create(payload),
    onSuccess: (res) => {
      toast("ØªÙ… Ø¥Ù†Ø´Ø§Ø¡ Ø§Ù„Ù…Ø±Ø§Ø¬Ø¹Ø© Ø¨Ù†Ø¬Ø§Ø­", "success");
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
      setDialogOpen(false);

      // Correction 3 + Safety Refinement 4:
      // Prefer full server response; fall back to local form values if payload is minimal.
      const formVals = watch();
      const product = products.find((p) => p.id === formVals.productId);
      const serverData = res?.data ?? null;
      const shell: ReviewResponse = {
        // Local form values fill every field (guaranteed complete)
        id: serverData?.id ?? "",
        productId: serverData?.productId ?? formVals.productId,
        productName: serverData?.productName ?? product?.nameAr ?? "",
        productImage: serverData?.productImage ?? product?.listingMainImageUrl ?? product?.mainImageUrl ?? null,
        authorName: serverData?.authorName ?? formVals.authorName,
        rating: serverData?.rating ?? formVals.rating,
        comment: serverData?.comment ?? formVals.comment ?? null,
        isFeatured: serverData?.isFeatured ?? formVals.isFeatured,
        images: serverData?.images ?? [],
        createdAt: serverData?.createdAt ?? new Date().toISOString(),
      };
      if (shell.id) setImageDialogReview(shell);
    },
    onError: (err: any) => toast(err?.response?.data?.message ?? "ÙØ´Ù„ Ø¥Ù†Ø´Ø§Ø¡ Ø§Ù„Ù…Ø±Ø§Ø¬Ø¹Ø©", "error"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateReviewRequest }) =>
      reviewsApi.update(id, data),
    onSuccess: () => {
      toast("ØªÙ… Ø§Ù„ØªØ­Ø¯ÙŠØ« Ø¨Ù†Ø¬Ø§Ø­", "success");
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
      setDialogOpen(false);
    },
    onError: (err: any) => toast(err?.response?.data?.message ?? "ÙØ´Ù„ Ø§Ù„ØªØ­Ø¯ÙŠØ«", "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => reviewsApi.delete(id),
    onSuccess: () => {
      toast("ØªÙ… Ø­Ø°Ù Ø§Ù„Ù…Ø±Ø§Ø¬Ø¹Ø© ÙˆØµÙˆØ±Ù‡Ø§", "success");
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
      setDeleteDialogOpen(false);
      setSelected(null);
    },
    onError: (err: any) => toast(err?.response?.data?.message ?? "ÙØ´Ù„ Ø§Ù„Ø­Ø°Ù", "error"),
  });

  // â”€â”€ Image mutations â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const uploadMutation = useMutation({
    mutationFn: ({ reviewId, file }: { reviewId: string; file: File }) =>
      reviewsApi.uploadImage(reviewId, file),
    onSuccess: (res) => {
      toast("ØªÙ… Ø±ÙØ¹ Ø§Ù„ØµÙˆØ±Ø© Ø¨Ù†Ø¬Ø§Ø­", "success");

      // apiClient does NOT strip ApiResponse wrapper â†’ res is ApiResponse<ReviewResponse>
      // â†’ res.data is the full ReviewResponse (review + updated images list from backend)
      const updatedReview: ReviewResponse | undefined = res?.data ?? undefined;

      if (updatedReview?.id) {
        // â‘  Update modal immediately â€” works regardless of cache state
        setImageDialogReview(updatedReview);

        // â‘¡ Sync cache so table thumbnail also updates
        queryClient.setQueryData<any>(["reviews", page], (old: any) => {
          const items: any[] = old?.data?.items ?? [];
          if (!items.length) return old;
          return {
            ...old,
            data: {
              ...old.data,
              items: items.map((r: any) =>
                r.id === updatedReview.id ? updatedReview : r
              ),
            },
          };
        });
      } else {
        // Fallback: no typed data in response â€” re-fetch
        queryClient.invalidateQueries({ queryKey: ["reviews"] });
      }
    },
    onError: (err: any) => toast(err?.response?.data?.message ?? "ÙØ´Ù„ Ø±ÙØ¹ Ø§Ù„ØµÙˆØ±Ø©", "error"),
  });

  const deleteImageMutation = useMutation({
    mutationFn: (imageId: string) => reviewsApi.deleteImage(imageId),
    onSuccess: (_res, imageId) => {
      toast("ØªÙ… Ø­Ø°Ù Ø§Ù„ØµÙˆØ±Ø©", "success");

      // â‘  Update modal immediately via functional setState (no stale closure risk)
      setImageDialogReview((prev) =>
        prev ? { ...prev, images: prev.images.filter((img) => img.id !== imageId) } : prev
      );

      // â‘¡ Sync cache so table thumbnails also update
      queryClient.setQueryData<any>(["reviews", page], (old: any) => {
        const items: any[] = old?.data?.items ?? [];
        if (!items.length) return old;
        return {
          ...old,
          data: {
            ...old.data,
            items: items.map((r: any) => ({
              ...r,
              images: r.images.filter((img: any) => img.id !== imageId),
            })),
          },
        };
      });
    },
    onError: (err: any) => toast(err?.response?.data?.message ?? "ÙØ´Ù„ Ø­Ø°Ù Ø§Ù„ØµÙˆØ±Ø©", "error"),
  });

  const reorderMutation = useMutation({
    mutationFn: ({
      reviewId,
      items,
    }: {
      reviewId: string;
      items: { imageId: string; displayOrder: number }[];
    }) => reviewsApi.reorderImages(reviewId, { items }),
    onSuccess: () => {
      toast("ØªÙ… Ø¥Ø¹Ø§Ø¯Ø© ØªØ±ØªÙŠØ¨ Ø§Ù„ØµÙˆØ±", "success");
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
    },
    onError: (err: any) => toast(err?.response?.data?.message ?? "ÙØ´Ù„ Ø¥Ø¹Ø§Ø¯Ø© Ø§Ù„ØªØ±ØªÙŠØ¨", "error"),
  });

  // â”€â”€ Handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const handleFileUpload = async (reviewId: string, file: File) => {
    setUploadingFor(reviewId);
    await uploadMutation.mutateAsync({ reviewId, file });
    setUploadingFor(null);
  };

  const moveImage = (review: ReviewResponse, imageIndex: number, direction: -1 | 1) => {
    const sorted = [...review.images].sort((a, b) => a.displayOrder - b.displayOrder);
    const swapIndex = imageIndex + direction;
    if (swapIndex < 0 || swapIndex >= sorted.length) return;
    const items = sorted.map((img, i) => ({
      imageId: img.id,
      displayOrder:
        i === imageIndex
          ? sorted[swapIndex].displayOrder
          : i === swapIndex
          ? sorted[imageIndex].displayOrder
          : img.displayOrder,
    }));
    reorderMutation.mutate({ reviewId: review.id, items });
  };

  const openCreate = () => {
    setSelected(null);
    reset({ productId: "", authorName: "", rating: 5, comment: "", isFeatured: false });
    setDialogOpen(true);
  };

  const openEdit = (r: ReviewResponse) => {
    setSelected(r);
    reset({
      productId: r.productId,
      authorName: r.authorName,
      rating: r.rating,
      comment: r.comment ?? "",
      isFeatured: r.isFeatured,
    });
    setDialogOpen(true);
  };

  const onSubmit = async (values: FormValues) => {
    const payload: CreateReviewRequest = {
      productId: values.productId,
      authorName: values.authorName,
      rating: values.rating,
      comment: values.comment || undefined,
      isFeatured: values.isFeatured,
    };
    if (selected) {
      await updateMutation.mutateAsync({ id: selected.id, data: payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
  };

  // Correction 5: truncate comment to 80 chars for table display
  const truncateComment = (comment: string | null): string => {
    if (!comment) return "â€”";
    return comment.length > 80 ? comment.slice(0, 80) + "â€¦" : comment;
  };

  // â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  return (
    <div className="space-y-6" dir="rtl">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Ø§Ù„Ù…Ø±Ø§Ø¬Ø¹Ø§Øª</h2>
          <p className="text-muted-foreground text-sm mt-1">
            {pagination?.totalCount ?? 0} Ù…Ø±Ø§Ø¬Ø¹Ø©
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" /> Ø¥Ø¶Ø§ÙØ© Ù…Ø±Ø§Ø¬Ø¹Ø©
        </Button>
      </div>

      {/* Table */}
      {isLoading ? (
        <LoadingPage />
      ) : reviews.length === 0 ? (
        <Card>
          <CardContent className="py-20 text-center">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-20 text-gray-400" />
            <p className="text-lg font-semibold text-gray-700 mb-2">Ù„Ø§ ØªÙˆØ¬Ø¯ Ù…Ø±Ø§Ø¬Ø¹Ø§Øª Ø¨Ø¹Ø¯</p>
            <p className="text-sm text-muted-foreground mb-6">
              Ø§Ø¨Ø¯Ø£ Ø¨Ø¥Ø¶Ø§ÙØ© Ù…Ø±Ø§Ø¬Ø¹Ø§Øª Ø§Ù„Ø¹Ù…Ù„Ø§Ø¡ ÙˆØµÙˆØ±Ù‡Ù… Ù„ØªØ¸Ù‡Ø± Ù‡Ù†Ø§
            </p>
            <Button onClick={openCreate} className="gap-2">
              <Plus className="h-4 w-4" /> Ø¥Ø¶Ø§ÙØ© Ù…Ø±Ø§Ø¬Ø¹Ø©
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          {/* Mobile card-list: hidden on sm+ */}
          <div className="sm:hidden divide-y">
            {reviews.map((review) => (
              <div key={review.id} className="p-4 space-y-2">
                {/* Row 1: product + featured */}
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-sm truncate flex-1">{review.productName}</p>
                  <Badge variant={review.isFeatured ? "success" : "secondary"}>
                    {review.isFeatured ? "Ù…Ù…ÙŠØ²Ø©" : "Ø¹Ø§Ø¯ÙŠØ©"}
                  </Badge>
                </div>
                {/* Row 2: author + stars */}
                <div className="flex items-center justify-between">
                  <span className="text-sm">{review.authorName}</span>
                  <StarRating rating={review.rating} />
                </div>
                {/* Row 3: comment */}
                {review.comment && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{review.comment}</p>
                )}
                {/* Row 4: images + date */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    {review.images.slice(0, 3).map((img) => (
                      <img key={img.id} src={getFullImageUrl(img.imageUrl)} alt="" className="h-8 w-8 rounded object-cover border" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    ))}
                    {review.images.length > 3 && <span className="text-xs text-muted-foreground">+{review.images.length - 3}</span>}
                    {review.images.length === 0 && <span className="text-xs text-muted-foreground">â€”</span>}
                  </div>
                  <span className="text-xs text-muted-foreground">{formatDate(review.createdAt)}</span>
                </div>
                {/* Row 5: actions */}
                <div className="flex items-center gap-2 pt-1">
                  <Button size="sm" variant="outline" className="flex-1 gap-1 text-xs tap-target" onClick={() => openEdit(review)}>
                    <Pencil className="h-3 w-3" /> ØªØ¹Ø¯ÙŠÙ„
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1 gap-1 text-xs tap-target" onClick={() => setImageDialogReview(review)}>
                    <Image className="h-3 w-3" /> ØµÙˆØ±
                  </Button>
                  <label className="flex-1 cursor-pointer">
                    <Button size="sm" variant="outline" className="w-full gap-1 text-xs tap-target pointer-events-none" asChild>
                      <span>
                        {uploadingFor === review.id ? <Spinner className="h-3 w-3" /> : <Upload className="h-3 w-3" />}
                        Ø±ÙØ¹
                      </span>
                    </Button>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFileUpload(review.id, file); e.target.value = ""; }} />
                  </label>
                  <Button size="sm" variant="outline" className="tap-target px-3 text-red-500 hover:bg-red-50" onClick={() => { setSelected(review); setDeleteDialogOpen(true); }}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table: hidden on mobile */}
          <div className="hidden sm:block max-h-[70vh] overflow-y-auto w-full overflow-x-auto rounded-lg">
            <div className="min-w-[900px]">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-white">
                  <TableRow>
                    <TableHead className="text-right">Ø§Ù„Ù…Ù†ØªØ¬</TableHead>
                    <TableHead className="text-right">Ø§Ù„ÙƒØ§ØªØ¨</TableHead>
                    <TableHead className="text-right">Ø§Ù„ØªÙ‚ÙŠÙŠÙ…</TableHead>
                    <TableHead className="text-right">Ø§Ù„ØªØ¹Ù„ÙŠÙ‚</TableHead>
                    <TableHead className="text-right">Ø§Ù„ØµÙˆØ±</TableHead>
                    <TableHead className="text-right">Ù…Ù…ÙŠØ²Ø©</TableHead>
                    <TableHead className="text-right">Ø§Ù„ØªØ§Ø±ÙŠØ®</TableHead>
                    <TableHead className="text-left w-32">Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡Ø§Øª</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reviews.map((review) => (
                    <TableRow key={review.id}>
                      <TableCell className="text-right font-medium text-sm max-w-[180px] truncate">
                        {review.productName}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {review.authorName}
                      </TableCell>
                      <TableCell className="text-right">
                        <StarRating rating={review.rating} />
                      </TableCell>
                      <TableCell
                        className="text-right text-sm text-muted-foreground max-w-[280px] truncate"
                        title={review.comment ?? undefined}
                      >
                        {truncateComment(review.comment)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center gap-1">
                          {review.images
                            .sort((a, b) => a.displayOrder - b.displayOrder)
                            .slice(0, 3)
                            .map((img) => (
                              <img
                                key={img.id}
                                src={getFullImageUrl(img.imageUrl)}
                                alt=""
                                className="h-8 w-8 rounded object-cover border"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = "none";
                                }}
                              />
                            ))}
                          {review.images.length > 3 && (
                            <span className="text-xs text-muted-foreground">
                              +{review.images.length - 3}
                            </span>
                          )}
                          {review.images.length === 0 && (
                            <span className="text-xs text-muted-foreground">â€”</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={review.isFeatured ? "success" : "secondary"}>
                          {review.isFeatured ? "Ù…Ù…ÙŠØ²Ø©" : "Ø¹Ø§Ø¯ÙŠØ©"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {formatDate(review.createdAt)}
                      </TableCell>
                      <TableCell className="text-left">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="ØªØ¹Ø¯ÙŠÙ„" onClick={() => openEdit(review)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„ØµÙˆØ±" onClick={() => setImageDialogReview(review)}>
                            <Image className="h-4 w-4" />
                          </Button>
                          <label className="cursor-pointer">
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 pointer-events-none" asChild title="Ø±ÙØ¹ ØµÙˆØ±Ø©">
                              <span>
                                {uploadingFor === review.id ? <Spinner className="h-3 w-3" /> : <Upload className="h-4 w-4" />}
                              </span>
                            </Button>
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFileUpload(review.id, file); e.target.value = ""; }} />
                          </label>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-500 hover:text-red-600" title="Ø­Ø°Ù" onClick={() => { setSelected(review); setDeleteDialogOpen(true); }}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </Card>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!pagination.hasPreviousPage}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronRight className="h-4 w-4" /> Ø§Ù„Ø³Ø§Ø¨Ù‚
          </Button>
          <span className="text-sm text-muted-foreground">
            ØµÙØ­Ø© {pagination.pageNumber} Ù…Ù† {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={!pagination.hasNextPage}
            onClick={() => setPage((p) => p + 1)}
          >
            Ø§Ù„ØªØ§Ù„ÙŠ <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* â”€â”€ Create / Edit Dialog â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && setDialogOpen(false)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selected ? "ØªØ¹Ø¯ÙŠÙ„ Ù…Ø±Ø§Ø¬Ø¹Ø©" : "Ø¥Ø¶Ø§ÙØ© Ù…Ø±Ø§Ø¬Ø¹Ø© Ø¬Ø¯ÙŠØ¯Ø©"}</DialogTitle>
            <DialogDescription>
              {selected
                ? `ØªØ¹Ø¯ÙŠÙ„ Ø¨ÙŠØ§Ù†Ø§Øª Ù…Ø±Ø§Ø¬Ø¹Ø©: ${selected.authorName}`
                : "Ø£Ø¯Ø®Ù„ Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ù…Ø±Ø§Ø¬Ø¹Ø© Ø§Ù„Ø¬Ø¯ÙŠØ¯Ø©"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

            {/* Product selector */}
            <div className="space-y-2">
              <Label>Ø§Ù„Ù…Ù†ØªØ¬</Label>
              <Controller
                name="productId"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Ø§Ø®ØªØ± Ù…Ù†ØªØ¬Ø§Ù‹..." />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.nameAr}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.productId && (
                <p className="text-xs text-red-500">{errors.productId.message}</p>
              )}
            </div>

            {/* Author name â€” Correction 1 */}
            <div className="space-y-2">
              <Label>Ø§Ø³Ù… Ø§Ù„ÙƒØ§ØªØ¨</Label>
              <Input {...register("authorName")} placeholder="Ù…Ø«Ø§Ù„: Ø³Ø§Ø±Ø© Ø£Ø­Ù…Ø¯" />
              {errors.authorName && (
                <p className="text-xs text-red-500">{errors.authorName.message}</p>
              )}
            </div>

            {/* Star picker */}
            <div className="space-y-2">
              <Label>Ø§Ù„ØªÙ‚ÙŠÙŠÙ…</Label>
              <Controller
                name="rating"
                control={control}
                render={({ field }) => (
                  <StarPicker value={field.value} onChange={field.onChange} />
                )}
              />
            </div>

            {/* Comment */}
            <div className="space-y-2">
              <Label>Ø§Ù„ØªØ¹Ù„ÙŠÙ‚ (Ø§Ø®ØªÙŠØ§Ø±ÙŠ)</Label>
              <Textarea
                {...register("comment")}
                placeholder="Ø§ÙƒØªØ¨ ØªØ¹Ù„ÙŠÙ‚ Ø§Ù„Ø¹Ù…ÙŠÙ„ Ù‡Ù†Ø§..."
                rows={3}
              />
            </div>

            {/* Featured checkbox */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isFeatured"
                {...register("isFeatured")}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="isFeatured" className="cursor-pointer">
                Ù…Ø±Ø§Ø¬Ø¹Ø© Ù…Ù…ÙŠØ²Ø© (ØªØ¸Ù‡Ø± ÙÙŠ Ø§Ù„ØµÙØ­Ø© Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠØ©)
              </Label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Ø¥Ù„ØºØ§Ø¡
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Spinner className="ml-2 h-4 w-4" />}
                {selected ? "Ø­ÙØ¸ Ø§Ù„ØªØ¹Ø¯ÙŠÙ„Ø§Øª" : "Ø¥Ù†Ø´Ø§Ø¡ Ø§Ù„Ù…Ø±Ø§Ø¬Ø¹Ø©"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* â”€â”€ Delete Confirmation Dialog â€” Correction 7 â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <Dialog open={deleteDialogOpen} onOpenChange={(open) => !open && setDeleteDialogOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ø­Ø°Ù Ø§Ù„Ù…Ø±Ø§Ø¬Ø¹Ø©</DialogTitle>
            <DialogDescription>
              Ù‡Ù„ Ø£Ù†Øª Ù…ØªØ£ÙƒØ¯ Ù…Ù† Ø­Ø°Ù Ù…Ø±Ø§Ø¬Ø¹Ø© <strong>{selected?.authorName}</strong>ØŸ
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-start gap-2 rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            <span className="mt-0.5">âš ï¸</span>
            <p>
              Ø³ÙŠØ¤Ø¯ÙŠ Ø­Ø°Ù Ù‡Ø°Ù‡ Ø§Ù„Ù…Ø±Ø§Ø¬Ø¹Ø© Ø¥Ù„Ù‰ Ø­Ø°Ù Ø¬Ù…ÙŠØ¹ Ø§Ù„ØµÙˆØ± Ø§Ù„Ù…Ø±ØªØ¨Ø·Ø© Ø¨Ù‡Ø§ Ù†Ù‡Ø§Ø¦ÙŠØ§Ù‹ ÙˆÙ„Ø§ ÙŠÙ…ÙƒÙ† Ø§Ù„ØªØ±Ø§Ø¬Ø¹ Ø¹Ù† Ù‡Ø°Ø§ Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              ØªØ±Ø§Ø¬Ø¹
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => selected && deleteMutation.mutate(selected.id)}
            >
              {deleteMutation.isPending && <Spinner className="ml-2 h-4 w-4" />}
              ØªØ£ÙƒÙŠØ¯ Ø§Ù„Ø­Ø°Ù
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* â”€â”€ Image Management Dialog (Correction 8 â€” preserved verbatim) â”€â”€â”€â”€ */}
      <Dialog
        open={!!imageDialogReview}
        onOpenChange={(o) => !o && setImageDialogReview(null)}
      >
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ø¥Ø¯Ø§Ø±Ø© ØµÙˆØ± Ø§Ù„Ù…Ø±Ø§Ø¬Ø¹Ø©</DialogTitle>
            <DialogDescription>
              {imageDialogReview?.productName} â€” {imageDialogReview?.authorName}
            </DialogDescription>
          </DialogHeader>

          {imageDialogReview && (
            <div className="space-y-4">
              {/* Review info */}
              <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
                <StarRating rating={imageDialogReview.rating} />
                <span className="text-sm text-muted-foreground flex-1 truncate">
                  {imageDialogReview.comment || "Ø¨Ø¯ÙˆÙ† ØªØ¹Ù„ÙŠÙ‚"}
                </span>
              </div>

              {/* Images grid â€” sorted by displayOrder ASC */}
              {imageDialogReview.images.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <Image className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  Ù„Ø§ ØªÙˆØ¬Ø¯ ØµÙˆØ± Ù„Ù‡Ø°Ù‡ Ø§Ù„Ù…Ø±Ø§Ø¬Ø¹Ø©
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {[...imageDialogReview.images]
                    .sort((a, b) => a.displayOrder - b.displayOrder)
                    .map((img, index) => (
                      <div
                        key={img.id}
                        className="relative group border rounded-lg overflow-hidden bg-white"
                      >
                        <img
                          src={getFullImageUrl(img.imageUrl)}
                          alt=""
                          className="w-full h-32 object-cover"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-7 w-7 p-0"
                            disabled={index === 0}
                            onClick={() => moveImage(imageDialogReview, index, -1)}
                          >
                            â–¶
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-7 w-7 p-0"
                            disabled={deleteImageMutation.isPending}
                            onClick={() => deleteImageMutation.mutate(img.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-7 w-7 p-0"
                            disabled={index === imageDialogReview.images.length - 1}
                            onClick={() => moveImage(imageDialogReview, index, 1)}
                          >
                            â—€
                          </Button>
                        </div>
                        <div className="absolute bottom-1 right-1 bg-black/60 text-white text-xs px-1.5 rounded">
                          {img.displayOrder}
                        </div>
                      </div>
                    ))}
                </div>
              )}

              {/* Upload new â€” hidden when review already has an image (max 1 rule) */}
              <div className="space-y-2">
                <Label>Ø±ÙØ¹ ØµÙˆØ±Ø© Ø¬Ø¯ÙŠØ¯Ø©</Label>
                {imageDialogReview.images.length >= 1 ? (
                  <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                    ÙŠØ­ØªÙˆÙŠ Ù‡Ø°Ø§ Ø§Ù„ØªÙ‚ÙŠÙŠÙ… Ø¹Ù„Ù‰ ØµÙˆØ±Ø© Ø¨Ø§Ù„ÙØ¹Ù„. Ø§Ø­Ø°Ù Ø§Ù„ØµÙˆØ±Ø© Ø§Ù„Ø­Ø§Ù„ÙŠØ© Ø£ÙˆÙ„Ø§Ù‹ Ù„Ø±ÙØ¹ ØµÙˆØ±Ø© Ø¬Ø¯ÙŠØ¯Ø©.
                  </p>
                ) : (
                  <>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(imageDialogReview.id, file);
                        e.target.value = "";
                      }}
                    />
                    <p className="text-xs text-muted-foreground">ÙŠØªÙ… Ø±ÙØ¹ ØµÙˆØ±Ø© ÙˆØ§Ø­Ø¯Ø© ÙÙŠ ÙƒÙ„ Ù…Ø±Ø©</p>
                  </>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setImageDialogReview(null)}>
              Ø¥ØºÙ„Ø§Ù‚
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
