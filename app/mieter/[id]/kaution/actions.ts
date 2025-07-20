'use server';

import { z } from 'zod';
import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { KautionStatus, KAUTION_STATUS } from '@/types/Tenant';

const FormSchema = z.object({
  tenantId: z.string(),
  amount: z.preprocess(
    (a) => parseFloat(z.string().parse(a).replace(',', '.')),
    z.number().positive('Betrag muss eine positive Zahl sein')
  ),
  paymentDate: z.string().optional(),
  status: z.nativeEnum(KAUTION_STATUS),
});

export async function updateKautionAction(formData: FormData) {
  const validatedFields = FormSchema.safeParse({
    tenantId: formData.get('tenantId'),
    amount: formData.get('amount'),
    paymentDate: formData.get('paymentDate'),
    status: formData.get('status'),
  });

  if (!validatedFields.success) {
    return {
      success: false,
      error: {
        message: 'Ungültige Eingabe.',
        errors: validatedFields.error.flatten().fieldErrors,
      },
    };
  }

  const supabase = createClient();
  const { tenantId, amount, paymentDate, status } = validatedFields.data;

  const kautionData = {
    amount,
    paymentDate: paymentDate || null,
    status,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('Mieter')
    .update({ kaution: kautionData })
    .eq('id', tenantId);

  if (error) {
    return {
      success: false,
      error: { message: 'Kaution konnte nicht gespeichert werden.' },
    };
  }

  revalidatePath('/mieter');
  return { success: true };
}

export async function getSuggestedKaution(
  tenantId: string
): Promise<{ suggestedAmount?: number }> {
  const supabase = createClient();

  const { data: tenant, error } = await supabase
    .from('Mieter')
    .select('wohnung_id')
    .eq('id', tenantId)
    .single();

  if (error || !tenant || !tenant.wohnung_id) {
    return {};
  }

  const { data: wohnung, error: wohnungError } = await supabase
    .from('Wohnungen')
    .select('miete')
    .eq('id', tenant.wohnung_id)
    .single();

  if (wohnungError || !wohnung || !wohnung.miete) {
    return {};
  }

  return { suggestedAmount: wohnung.miete * 3 };
}
