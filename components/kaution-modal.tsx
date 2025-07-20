"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useModalStore } from "@/hooks/use-modal-store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { KautionFormData, KautionStatus } from "@/types/Kaution";
import { updateKautionAction } from "@/app/mieter-actions";
import { toast } from "sonner";

const formSchema = z.object({
  amount: z.string().min(1, "Betrag ist erforderlich"),
  paymentDate: z.string().optional(),
  status: z.nativeEnum(KautionStatus),
});

export function KautionModal() {
  const {
    isKautionModalOpen,
    closeKautionModal,
    kautionInitialData,
    setKautionModalDirty,
  } = useModalStore();
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<KautionFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: "",
      paymentDate: "",
      status: KautionStatus.Ausstehend,
    },
  });

  useEffect(() => {
    if (kautionInitialData) {
      const { existingKaution, suggestedAmount } = kautionInitialData;
      form.reset({
        amount: existingKaution?.amount.toString() || suggestedAmount?.toString() || "",
        paymentDate: existingKaution?.paymentDate || "",
        status: existingKaution?.status || KautionStatus.Ausstehend,
      });
    }
  }, [kautionInitialData, form]);

  const onSubmit = async (values: KautionFormData) => {
    if (!kautionInitialData) return;

    setIsSaving(true);
    const formData = new FormData();
    formData.append("tenantId", kautionInitialData.tenant.id);
    formData.append("amount", values.amount);
    formData.append("paymentDate", values.paymentDate || "");
    formData.append("status", values.status);

    const result = await updateKautionAction(formData);
    setIsSaving(false);

    if (result.success) {
      toast.success("Kaution erfolgreich gespeichert");
      closeKautionModal({ force: true });
    } else {
      toast.error(result.error?.message || "Kaution konnte nicht gespeichert werden");
    }
  };

  const handleClose = () => {
    closeKautionModal();
  };

  return (
    <Dialog open={isKautionModalOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Kaution verwalten</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <p>Mieter: {kautionInitialData?.tenant.name}</p>
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Betrag (€)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      step="0.01"
                      placeholder={
                        kautionInitialData?.suggestedAmount
                          ? `Vorschlag: ${kautionInitialData.suggestedAmount}`
                          : "Betrag"
                      }
                      onChange={(e) => {
                        field.onChange(e);
                        setKautionModalDirty(true);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="paymentDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Zahlungsdatum</FormLabel>
                  <FormControl>
                    <DatePicker
                      value={field.value ? new Date(field.value) : undefined}
                      onChange={(date) => {
                        field.onChange(date?.toISOString().split("T")[0] || "");
                        setKautionModalDirty(true);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                      setKautionModalDirty(true);
                    }}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Status auswählen" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.values(KautionStatus).map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSaving}
              >
                Abbrechen
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Speichern..." : "Speichern"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
