import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useModalStore } from '@/hooks/use-modal-store';
import {
  KautionFormData,
  kautionStatusOptions,
  KAUTION_STATUS,
} from '@/types/Tenant';
import { updateKautionAction } from '@/app/mieter/[id]/kaution/actions';
import { toast } from 'sonner';
import { useEffect } from 'react';

const FormSchema = z.object({
  amount: z
    .string()
    .nonempty('Betrag ist erforderlich.')
    .refine(
      (val) => !isNaN(parseFloat(val.replace(',', '.'))),
      'Betrag muss eine Zahl sein.'
    ),
  paymentDate: z.string().optional(),
  status: z.nativeEnum(KAUTION_STATUS),
});

export function KautionModal() {
  const {
    isKautionModalOpen,
    closeKautionModal,
    kautionInitialData,
    setKautionModalDirty,
  } = useModalStore();
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<KautionFormData>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      amount: '',
      paymentDate: '',
      status: KAUTION_STATUS.AUSSTEHEND,
    },
  });

  useEffect(() => {
    setKautionModalDirty(isDirty);
  }, [isDirty, setKautionModalDirty]);

  useEffect(() => {
    if (kautionInitialData) {
      reset({
        amount: kautionInitialData.existingKaution?.amount.toString() || '',
        paymentDate: kautionInitialData.existingKaution?.paymentDate || '',
        status:
          kautionInitialData.existingKaution?.status ||
          KAUTION_STATUS.AUSSTEHEND,
      });
    }
  }, [kautionInitialData, reset]);

  const onSubmit = async (data: KautionFormData) => {
    if (!kautionInitialData) return;

    const formData = new FormData();
    formData.append('tenantId', kautionInitialData.tenant.id);
    formData.append('amount', data.amount);
    formData.append('paymentDate', data.paymentDate || '');
    formData.append('status', data.status);

    const result = await updateKautionAction(formData);

    if (result.success) {
      toast.success('Kaution erfolgreich gespeichert.');
      closeKautionModal({ force: true });
    } else {
      toast.error(result.error?.message || 'Ein Fehler ist aufgetreten.');
    }
  };

  return (
    <Dialog open={isKautionModalOpen} onOpenChange={() => closeKautionModal()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Kaution verwalten</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4">
            <div>
              <Label>Mieter: {kautionInitialData?.tenant.name}</Label>
            </div>
            <div>
              <Label htmlFor="amount">Betrag (€)</Label>
              <Controller
                name="amount"
                control={control}
                render={({ field }) => <Input id="amount" {...field} />}
              />
              {kautionInitialData?.suggestedAmount && (
                <p className="text-sm text-muted-foreground">
                  Vorschlag: {kautionInitialData.suggestedAmount} €
                </p>
              )}
              {errors.amount && (
                <p className="text-sm text-red-500">{errors.amount.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="paymentDate">Zahlungsdatum</Label>
              <Controller
                name="paymentDate"
                control={control}
                render={({ field }) => (
                  <Input id="paymentDate" type="date" {...field} />
                )}
              />
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Status auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      {kautionStatusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => closeKautionModal()}
            >
              Abbrechen
            </Button>
            <Button type="submit">Speichern</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
