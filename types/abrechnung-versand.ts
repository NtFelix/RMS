import type { Nebenkosten } from "@/lib/types";
import type { RechentageDetails } from "@/types/optimized-betriebskosten";

export interface MonthlyVorauszahlung {
  monthName: string;
  amount: number;
  isActiveMonth: boolean;
}

/** One tenant's calculated Abrechnung, as the Abrechnung modal shows it and the PDF service prints it */
export interface TenantCostDetails {
  tenantId: string;
  tenantName: string;
  apartmentId: string;
  apartmentName: string;
  apartmentSize: number;
  costItems: Array<{
    costName: string;
    totalCostForItem: number; // Renamed from totalCost for clarity
    calculationType: string;
    tenantShare: number;
    pricePerSqm?: number; // New field added here
    verteiler?: string | number; // Added for distribution basis display
  }>;
  waterCost: {
    totalWaterCostOverall: number; // Renamed for clarity
    calculationType: string;
    tenantShare: number;
    consumption?: number;
  };
  totalTenantCost: number;
  vorauszahlungen: number; // Added for advance payments
  monthlyVorauszahlungen: MonthlyVorauszahlung[]; // New field for monthly breakdown
  finalSettlement: number; // Added for the final settlement amount
  occupancyPercentage: number;
  daysOccupied: number;
  daysInBillingPeriod: number;
  recommendedPrepayment?: number; // Yearly recommended prepayment
  missingScheduleMonths?: number; // > 0 means some occupied months had no prepayment schedule
  // Tenant's raw move-in / move-out date, needed for the 360-basis rounding note
  einzug: string | null;
  auszug: string | null;
  // Set on the 360-day basis ('360_tage'); daysOccupied / daysInBillingPeriod are then Rechentage
  rechentage?: RechentageDetails;
}

/** A tenant row of the Versand-Modal */
export interface AbrechnungVersandTenant {
  tenantId: string;
  name: string;
  email: string | null;
  apartmentName: string;
  /** Positive = Nachzahlung, negative = Guthaben */
  finalSettlement: number;
  /** Soll prepayment per month at the end of the billing period */
  currentMonthlyPrepayment: number;
  /** Recommended prepayment per month (already rounded to 5 €), if the Abrechnung computed one */
  recommendedMonthlyPrepayment: number | null;
  tenantData: TenantCostDetails;
}

/** Everything the Versand-Modal needs from the Abrechnung it was opened from */
export interface AbrechnungVersandModalData {
  nebenkostenItem: Nebenkosten;
  ownerName: string;
  ownerAddress: string;
  tenants: AbrechnungVersandTenant[];
}

/** Per tenant choices in the Versand-Modal */
export interface AbrechnungVersandRowState {
  /** Template override; undefined = the template chosen in the modal header */
  templateId?: string;
  erhoehung?: {
    aktiv: boolean;
    /** New monthly prepayment */
    betrag: number;
    /** ISO date from which the new prepayment applies */
    abDatum: string;
  };
  /** The mail of this row was opened at least once (with the then current increase) */
  mailGeoeffnet?: boolean;
  /** The increase was saved to the tenant's prepayment schedule */
  uebernommen?: boolean;
}
