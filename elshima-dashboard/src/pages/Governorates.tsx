import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { governoratesApi } from "../api/governorates";
import { Card, CardContent } from "../components/ui/card";
import { Map, MapPin, Pencil } from "lucide-react";
import { LoadingPage, Spinner } from "../components/ui/spinner";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "../components/ui/dialog";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { useToast } from "../components/ui/toast";
import { formatCurrency } from "../lib/utils";
import type { GovernorateResponse } from "../types";

export default function Governorates() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selected, setSelected] = useState<GovernorateResponse | null>(null);
  const [newCost, setNewCost] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["governorates"],
    queryFn: () => governoratesApi.getAll(),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, cost }: { id: string; cost: number }) => governoratesApi.updateShippingCost(id, { shippingCost: cost }),
    onSuccess: () => {
      toast("تم تحديث تكلفة الشحن بنجاح", "success");
      queryClient.invalidateQueries({ queryKey: ["governorates"] });
      setDialogOpen(false);
    },
    onError: (err: any) => toast(err?.response?.data?.message ?? "فشل التحديث", "error"),
  });

  const openEdit = (gov: GovernorateResponse) => {
    setSelected(gov);
    setNewCost(gov.shippingCost.toString());
    setDialogOpen(true);
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    const cost = parseFloat(newCost);
    if (isNaN(cost) || cost < 0) {
      toast("رجاء إدخال تكلفة شحن صحيحة", "error");
      return;
    }
    updateMutation.mutate({ id: selected.id, cost });
  };

  const governorates = data?.data ?? [];

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">المحافظات وتكاليف الشحن</h2>
          <p className="text-muted-foreground text-sm mt-1">{governorates.length} محافظة</p>
        </div>
      </div>

      {isLoading ? (
        <LoadingPage />
      ) : governorates.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <Map className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>لا توجد محافظات</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16 text-right">ID</TableHead>
                <TableHead className="text-right">الاسم</TableHead>
                <TableHead className="text-right">تكلفة الشحن</TableHead>
                <TableHead className="text-right">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {governorates.map((gov) => (
                <TableRow key={gov.id}>
                  <TableCell className="text-right font-mono text-xs">{gov.id}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-blue-500" />
                      <span className="font-medium">{gov.nameAr}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-semibold text-blue-700">
                    {formatCurrency(gov.shippingCost)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" onClick={() => openEdit(gov)} className="gap-1 h-8 text-xs">
                      <Pencil className="h-3 w-3" /> تعديل السعر
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>تعديل تكلفة الشحن</DialogTitle>
            <DialogDescription>
              تحديث تكلفة الشحن لمحافظة: {selected?.nameAr}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4 pt-2">
            <div className="space-y-2 text-right">
              <Label>تكلفة الشحن (ج.م)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={newCost}
                onChange={(e) => setNewCost(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending && <Spinner className="h-4 w-4 ml-2" />}
                حفظ التغييرات
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
