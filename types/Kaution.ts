export interface KautionFormData {
  amount: string;
  paymentDate: string;
  status: 'Erhalten' | 'Ausstehend' | 'Zurückgezahlt';
}

export const KautionStatus = {
  Erhalten: 'Erhalten',
  Ausstehend: 'Ausstehend',
  Zurückgezahlt: 'Zurückgezahlt',
} as const;

export type KautionStatusType = (typeof KautionStatus)[keyof typeof KautionStatus];
