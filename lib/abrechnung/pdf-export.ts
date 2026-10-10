/**
 * Client helpers for the Abrechnung PDFs, shared by the Abrechnung modal and the Versand-Modal.
 */
import type { Nebenkosten } from "@/lib/types";
import type { TenantCostDetails } from "@/types/abrechnung-versand";

export type BillingAddress = {
  line1?: string;
  line2?: string;
  city?: string;
  postal_code?: string;
  country?: string;
} | null;

/** The landlord's billing address (Stripe customer), preferred by the PDF service for the sender line */
export async function fetchCustomerBillingAddress(): Promise<BillingAddress> {
  try {
    const response = await fetch('/api/stripe/customer');
    if (!response.ok) {
      throw new Error('Failed to fetch customer data');
    }
    const data = await response.json();
    return data.customer?.address || null;
  } catch (error) {
    console.error('Error fetching billing address:', error);
    return null;
  }
}

/** Single-line landlord address from the billing address, e.g. "Straße 1, 12345 Ort" */
export function formatBillingAddress(address: BillingAddress): string {
  if (!address) return '';
  const plzOrt = [address.postal_code, address.city].filter(Boolean).join(' ');
  return [address.line1, address.line2, plzOrt].filter(part => part && part.trim()).join(', ');
}

/**
 * Extracts city from an address string.
 * Attempts to find a city component by looking for parts that:
 * - Are not just a German postal code (5 digits)
 * - Have more than 2 characters
 * Falls back to the last part of the address if no clear city is found.
 * Returns empty string if no extraction is possible.
 *
 * NOTE: This logic mirrors the worker's city extraction for consistency.
 * @see workers/mietevo-backend/src/index.ts - generateSingleTenantPDF
 */
export function extractCityFromAddress(address: string | null | undefined): string {
  if (!address) return '';

  const parts = address.split(',').map(p => p.trim());
  // Attempt to find a part that looks like a city (not just a postal code or street number)
  const potentialCity = parts.find(p => !/^\d{5}$/.test(p) && p.length > 2);
  if (potentialCity) {
    return potentialCity;
  }
  // Fallback to the last part if no clear city is found
  if (parts.length > 0) {
    return parts[parts.length - 1];
  }
  return '';
}

export function settlementPeriod(nebenkostenItem: Pick<Nebenkosten, 'startdatum' | 'enddatum'>): string {
  return `${nebenkostenItem.startdatum}_${nebenkostenItem.enddatum}`;
}

export function settlementFilename(nebenkostenItem: Pick<Nebenkosten, 'startdatum' | 'enddatum'>, tenantName: string): string {
  return `Abrechnung_${settlementPeriod(nebenkostenItem)}_${tenantName.replace(/\s+/g, '_')}.pdf`;
}

/** Generates one tenant's Abrechnung PDF through the PDF service */
export async function generateTenantSettlementPdf({
  tenantData,
  nebenkostenItem,
  ownerName,
  ownerAddress,
  billingAddress,
}: {
  tenantData: TenantCostDetails;
  nebenkostenItem: Nebenkosten;
  ownerName: string;
  ownerAddress: string;
  billingAddress: BillingAddress;
}): Promise<{ blob: Blob; filename: string; pageCount: number }> {
  const { generatePDF } = await import('@/lib/worker-client');
  const filename = settlementFilename(nebenkostenItem, tenantData.tenantName);

  const response = await generatePDF({
    tenantData,
    nebenkostenItem,
    ownerName,
    ownerAddress,
    // If we can find a valid city, pass it directly; otherwise the worker will derive it
    houseCity: extractCityFromAddress(ownerAddress),
    billingAddress,
    filename,
  });

  return {
    blob: await response.blob(),
    filename,
    pageCount: parseInt(response.headers.get('X-PDF-Page-Count') || '0', 10),
  };
}

/** Saves a blob through the browser's download (ends up in the download folder) */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Revoke after the click has been handled, so the download can still read the blob
  setTimeout(() => window.URL.revokeObjectURL(url), 0);
}
