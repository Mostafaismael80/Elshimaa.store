import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Star, Image, Upload, Trash2, ChevronLeft, ChevronRight, MessageSquare } from "lucide-react";
import { reviewsApi } from "../api/reviews";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { LoadingPage, Spinner } from "../components/ui/spinner";
import { useToast } from "../components/ui/toast";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../components/ui/table";
import { formatDate } from "../lib/utils";
import type { ReviewResponse } from "../types";

// Review visibility/deletion depends on backend-supported endpoints.
// This module only implements image management (upload, delete, reorder).

// ─── Star Rating Display ────────────────────────────────────────────────────────

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

// ─── Component ──────────────────────────────────────────────────────────────────

export default function Reviews() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [imageDialogReview, setImageDialogReview] = useState<ReviewResponse | null>(null);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);

  // ─── Queries ──────────────────────────────────────────────────────────────

  const { data, isLoading } = useQuery({
    queryKey: ["reviews", page],
    queryFn: () => reviewsApi.getAll({ pageNumber: page, pageSize: 15 }),
  });

  // ─── Mutations ────────────────────────────────────────────────────────────

  const uploadMutation = useMutation({
    mutationFn: ({ reviewId, file }: { reviewId: string; file: File }) =>
      reviewsApi.uploadImage(reviewId, file),
    onSuccess: () => {
      toast("تم رفع الصورة بنجاح", "success");
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
    },
    onError: (err: any) => toast(err?.response?.data?.message ?? "فشل رفع الصورة", "error"),
  });

  const deleteImageMutation = useMutation({
    mutationFn: (imageId: string) => reviewsApi.deleteImage(imageId),
    onSuccess: () => {
      toast("تم حذف الصورة", "success");
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
    },
    onError: (err: any) => toast(err?.response?.data?.message ?? "فشل حذف الصورة", "error"),
  });

  const reorderMutation = useMutation({
    mutationFn: ({ reviewId, items }: { reviewId: string; items: { imageId: string; displayOrder: number }[] }) =>
      reviewsApi.reorderImages(reviewId, { items }),
    onSuccess: () => {
      toast("تم إعادة ترتيب الصور", "success");
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
    },
    onError: (err: any) => toast(err?.response?.data?.message ?? "فشل إعادة الترتيب", "error"),
  });

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleFileUpload = async (reviewId: string, file: File) => {
    setUploadingFor(reviewId);
    await uploadMutation.mutateAsync({ reviewId, file });
    setUploadingFor(null);
  };

  const openImageDialog = (review: ReviewResponse) => {
    setImageDialogReview(review);
  };

  const moveImage = (review: ReviewResponse, imageIndex: number, direction: -1 | 1) => {
    const sorted = [...review.images].sort((a, b) => a.displayOrder - b.displayOrder);
    const swapIndex = imageIndex + direction;
    if (swapIndex < 0 || swapIndex >= sorted.length) return;

    const items = sorted.map((img, i) => ({
      imageId: img.id,
      displayOrder: i === imageIndex ? sorted[swapIndex].displayOrder
        : i === swapIndex ? sorted[imageIndex].displayOrder
        : img.displayOrder,
    }));

    reorderMutation.mutate({ reviewId: review.id, items });
  };

  const reviews = data?.data?.items ?? [];
  const pagination = data?.data;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">المراجعات</h2>
          <p className="text-muted-foreground text-sm mt-1">
            {pagination?.totalCount ?? 0} مراجعة — إدارة صور المراجعات فقط
          </p>
        </div>
      </div>

      {/* Table */}
      {isLoading ? <LoadingPage /> : reviews.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>لا توجد مراجعات</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">المنتج</TableHead>
                <TableHead className="text-right">العميل</TableHead>
                <TableHead className="text-right">التقييم</TableHead>
                <TableHead className="text-right">التعليق</TableHead>
                <TableHead className="text-right">الصور</TableHead>
                <TableHead className="text-right">التاريخ</TableHead>
                <TableHead className="text-left w-28">إدارة الصور</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reviews.map((review) => (
                <TableRow key={review.id}>
                  <TableCell className="text-right font-medium text-sm max-w-[200px] truncate">
                    {review.productName}
                  </TableCell>
                  <TableCell className="text-right text-sm">{review.customerName}</TableCell>
                  <TableCell className="text-right">
                    <StarRating rating={review.rating} />
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground max-w-[250px] truncate">
                    {review.comment || "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center gap-1">
                      {review.images
                        .sort((a, b) => a.displayOrder - b.displayOrder)
                        .slice(0, 3)
                        .map((img) => (
                          <img
                            key={img.id}
                            src={img.imageUrl}
                            alt=""
                            className="h-8 w-8 rounded object-cover border"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                          />
                        ))}
                      {review.images.length > 3 && (
                        <span className="text-xs text-muted-foreground">+{review.images.length - 3}</span>
                      )}
                      {review.images.length === 0 && (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">
                    {formatDate(review.createdAt)}
                  </TableCell>
                  <TableCell className="text-left">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => openImageDialog(review)}>
                        <Image className="h-3 w-3" /> إدارة
                      </Button>
                      <label className="cursor-pointer">
                        <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs pointer-events-none" asChild>
                          <span>
                            {uploadingFor === review.id ? <Spinner className="h-3 w-3" /> : <Upload className="h-3 w-3" />}
                            رفع
                          </span>
                        </Button>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(review.id, file);
                            e.target.value = "";
                          }}
                        />
                      </label>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={!pagination.hasPreviousPage} onClick={() => setPage((p) => p - 1)}>
            <ChevronRight className="h-4 w-4" /> السابق
          </Button>
          <span className="text-sm text-muted-foreground">صفحة {pagination.pageNumber} من {pagination.totalPages}</span>
          <Button variant="outline" size="sm" disabled={!pagination.hasNextPage} onClick={() => setPage((p) => p + 1)}>
            التالي <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Image Management Dialog */}
      <Dialog open={!!imageDialogReview} onOpenChange={(o) => !o && setImageDialogReview(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>إدارة صور المراجعة</DialogTitle>
            <DialogDescription>
              {imageDialogReview?.productName} — {imageDialogReview?.customerName}
            </DialogDescription>
          </DialogHeader>
          {imageDialogReview && (
            <div className="space-y-4">
              {/* Review info */}
              <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
                <StarRating rating={imageDialogReview.rating} />
                <span className="text-sm text-muted-foreground flex-1 truncate">{imageDialogReview.comment || "بدون تعليق"}</span>
              </div>

              {/* Images grid — sorted by displayOrder ASC */}
              {imageDialogReview.images.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <Image className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  لا توجد صور لهذه المراجعة
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {[...imageDialogReview.images]
                    .sort((a, b) => a.displayOrder - b.displayOrder)
                    .map((img, index) => (
                      <div key={img.id} className="relative group border rounded-lg overflow-hidden bg-white">
                        <img src={img.imageUrl} alt="" className="w-full h-32 object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <Button
                            size="sm" variant="secondary" className="h-7 w-7 p-0"
                            disabled={index === 0}
                            onClick={() => moveImage(imageDialogReview, index, -1)}
                          >
                            ▶
                          </Button>
                          <Button
                            size="sm" variant="destructive" className="h-7 w-7 p-0"
                            disabled={deleteImageMutation.isPending}
                            onClick={() => deleteImageMutation.mutate(img.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm" variant="secondary" className="h-7 w-7 p-0"
                            disabled={index === imageDialogReview.images.length - 1}
                            onClick={() => moveImage(imageDialogReview, index, 1)}
                          >
                            ◀
                          </Button>
                        </div>
                        <div className="absolute bottom-1 right-1 bg-black/60 text-white text-xs px-1.5 rounded">
                          {img.displayOrder}
                        </div>
                      </div>
                    ))}
                </div>
              )}

              {/* Upload new */}
              <div className="space-y-2">
                <Label>رفع صورة جديدة</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(imageDialogReview.id, file);
                    e.target.value = "";
                  }}
                />
                <p className="text-xs text-muted-foreground">يتم رفع صورة واحدة في كل مرة</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setImageDialogReview(null)}>إغلاق</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
