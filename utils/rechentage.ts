import { toIsoDateOnly } from "./date-calculations";

/**
 * 360-day basis ("30/360") for the operating cost settlement.
 *
 * Every month counts 30 Rechentage, split into two halves of 15. Move-in and move-out dates are
 * not counted day by day: the day boundary they sit on is rounded to the nearest Rechenpunkt
 * (before the 1st, between the 15th and 16th, after the last day of the month), on a tie to the
 * earlier one. A move-in on day e sits on the boundary before e, a move-out on day a on the
 * boundary after a, so a move-out and a seamless follow-up move-in always share one boundary and
 * an apartment never hands out more or less than 30 Rechentage per month.
 *
 * Water costs stay on calendar days and must not use this module.
 */

export type Rechenbasis = 'kalendertage' | '360_tage';

export const RECHENBASIS_KALENDERTAGE: Rechenbasis = 'kalendertage';
export const RECHENBASIS_360_TAGE: Rechenbasis = '360_tage';

export const RECHENTAGE_PRO_MONAT = 30;
const RECHENTAGE_PRO_HALBMONAT = 15;

export const isRechenbasis360 = (item: { rechenbasis?: string | null } | null | undefined): boolean =>
  item?.rechenbasis === RECHENBASIS_360_TAGE;

interface DateParts { year: number; month: number; day: number }

const parseDateParts = (date: string): DateParts | null => {
  const match = toIsoDateOnly(date).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) return null;
  return { year, month, day };
};

const daysInMonth = (year: number, month: number): number => new Date(Date.UTC(year, month, 0)).getUTCDate();

const monthKey = ({ year, month }: { year: number; month: number }): number => year * 12 + month - 1;

const toIso = (year: number, month: number, day: number): string =>
  `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

/**
 * Round a day boundary inside a month to its Rechenpunkt.
 * @param daysBefore calendar days of the month before the boundary (0 = before the 1st, N = after the last day)
 * @returns the Rechentage of the month before the rounded boundary: 0, 15 or 30
 */
export function roundBoundaryToRechenpunkt(daysBefore: number, monthDays: number): 0 | 15 | 30 {
  if (daysBefore <= RECHENTAGE_PRO_HALBMONAT) {
    // Tie goes to the earlier point
    return daysBefore <= RECHENTAGE_PRO_HALBMONAT - daysBefore ? 0 : 15;
  }
  return daysBefore - RECHENTAGE_PRO_HALBMONAT <= monthDays - daysBefore ? 15 : 30;
}

/** Position of a rounded boundary in Rechentage, counted from the start of `originMonthKey` */
const boundaryPosition = (parts: DateParts, daysBefore: number, originMonthKey: number): number =>
  (monthKey(parts) - originMonthKey) * RECHENTAGE_PRO_MONAT +
  roundBoundaryToRechenpunkt(daysBefore, daysInMonth(parts.year, parts.month));

/** A move-in on day e sits on the boundary before e */
const moveInPosition = (parts: DateParts, originMonthKey: number): number =>
  boundaryPosition(parts, parts.day - 1, originMonthKey);

/** A move-out on day a sits on the boundary after a */
const moveOutPosition = (parts: DateParts, originMonthKey: number): number =>
  boundaryPosition(parts, parts.day, originMonthKey);

/** Inclusive first day covered from a position (the day right after the boundary) */
const positionToFirstDayIso = (position: number, originMonthKey: number): string => {
  const key = originMonthKey + Math.floor(position / RECHENTAGE_PRO_MONAT);
  const year = Math.floor(key / 12);
  const month = key % 12 + 1;
  return toIso(year, month, position % RECHENTAGE_PRO_MONAT === 0 ? 1 : RECHENTAGE_PRO_HALBMONAT + 1);
};

/** Inclusive last day covered up to a position (the day right before the boundary) */
const positionToLastDayIso = (position: number, originMonthKey: number): string => {
  const offset = position % RECHENTAGE_PRO_MONAT;
  // A boundary at a month start closes the previous month on its last day
  const key = originMonthKey + Math.floor(position / RECHENTAGE_PRO_MONAT) - (offset === 0 ? 1 : 0);
  const year = Math.floor(key / 12);
  const month = key % 12 + 1;
  return toIso(year, month, offset === 0 ? daysInMonth(year, month) : RECHENTAGE_PRO_HALBMONAT);
};

export interface RechentagePeriod {
  /** Month key of the first period month; positions count from its start */
  originMonthKey: number;
  /** Positions of the period's rounded start and end boundary */
  start: number;
  end: number;
  /** Rechentage of the whole period: the denominator of every time share (360 for 12 whole months) */
  totalRechentage: number;
}

/**
 * The period in Rechentage. Start and end are rounded like a move-in and a move-out, so a period
 * of whole months counts 30 per month and no denominator is hard-wired.
 */
export function getRechentagePeriod(startdatum: string, enddatum: string): RechentagePeriod | null {
  const startParts = parseDateParts(startdatum);
  const endParts = parseDateParts(enddatum);
  if (!startParts || !endParts) return null;
  const originMonthKey = monthKey(startParts);
  const start = moveInPosition(startParts, originMonthKey);
  const end = moveOutPosition(endParts, originMonthKey);
  if (end < start) return null;
  return { originMonthKey, start, end, totalRechentage: end - start };
}

/** Total Rechentage of a period (0 for an invalid period) */
export const calculateTotalRechentage = (startdatum: string, enddatum: string): number =>
  getRechentagePeriod(startdatum, enddatum)?.totalRechentage ?? 0;

export interface TenantRechentage {
  tenantId: string;
  /** Rechentage inside the period */
  rechentage: number;
  totalRechentage: number;
  /** rechentage / totalRechentage */
  ratio: number;
  /** Positions of the tenant's rounded, period-clipped boundaries; only set when rechentage > 0 */
  start?: number;
  end?: number;
  /** Inclusive calendar days the Rechentage stand for (e.g. a move-in on 10.03. is billed from 16.03.) */
  billedFromIso?: string;
  billedToIso?: string;
  /** Whether rounding moved a move-in or move-out date that lies inside the period */
  einzugGerundet: boolean;
  auszugGerundet: boolean;
  /** The rounded move-in (first billed day) and move-out (last billed day), set when the date lies inside the period */
  einzugGerundetIso?: string;
  auszugGerundetIso?: string;
}

/**
 * Rechentage of a tenant within the period. A tenant without a move-in date counts 0, as on the
 * calendar basis; without a move-out date the tenant stays until the period end.
 */
export function calculateTenantRechentage(
  tenant: { id: string; einzug: string | null; auszug: string | null },
  startdatum: string,
  enddatum: string
): TenantRechentage {
  const period = getRechentagePeriod(startdatum, enddatum);
  const empty: TenantRechentage = {
    tenantId: tenant.id,
    rechentage: 0,
    totalRechentage: period?.totalRechentage ?? 0,
    ratio: 0,
    einzugGerundet: false,
    auszugGerundet: false,
  };
  if (!period || !tenant.einzug) return empty;

  const einzugParts = parseDateParts(tenant.einzug);
  if (!einzugParts) return empty;
  const auszugParts = tenant.auszug ? parseDateParts(tenant.auszug) : null;
  if (tenant.auszug && !auszugParts) return empty;

  const rawStart = moveInPosition(einzugParts, period.originMonthKey);
  const rawEnd = auszugParts ? moveOutPosition(auszugParts, period.originMonthKey) : period.end;

  // Rounding notes for the dialog and PDF, also when the tenant ends up with 0 Rechentage
  const einzugIso = toIsoDateOnly(tenant.einzug);
  const auszugIso = auszugParts ? toIsoDateOnly(tenant.auszug) : '';
  const einzugInPeriod = einzugIso > toIsoDateOnly(startdatum) && einzugIso <= toIsoDateOnly(enddatum);
  const auszugInPeriod = auszugIso !== '' && auszugIso >= toIsoDateOnly(startdatum) && auszugIso < toIsoDateOnly(enddatum);
  const einzugGerundetIso = einzugInPeriod ? positionToFirstDayIso(rawStart, period.originMonthKey) : undefined;
  const auszugGerundetIso = auszugInPeriod ? positionToLastDayIso(rawEnd, period.originMonthKey) : undefined;
  const rounding = {
    einzugGerundet: einzugGerundetIso !== undefined && einzugGerundetIso !== einzugIso,
    auszugGerundet: auszugGerundetIso !== undefined && auszugGerundetIso !== auszugIso,
    ...(einzugGerundetIso ? { einzugGerundetIso } : {}),
    ...(auszugGerundetIso ? { auszugGerundetIso } : {}),
  };

  const start = Math.max(period.start, rawStart);
  const end = Math.min(period.end, rawEnd);
  if (end <= start) return { ...empty, ...rounding };

  const rechentage = end - start;
  return {
    tenantId: tenant.id,
    rechentage,
    totalRechentage: period.totalRechentage,
    ratio: period.totalRechentage > 0 ? rechentage / period.totalRechentage : 0,
    start,
    end,
    billedFromIso: positionToFirstDayIso(start, period.originMonthKey),
    billedToIso: positionToLastDayIso(end, period.originMonthKey),
    ...rounding,
  };
}

/**
 * Rechentage of an already computed tenant range in one calendar month of the period (0, 15 or 30).
 * Lets month loops compute the tenant's range once instead of once per month.
 */
export function rechentageInMonth(
  occupancy: TenantRechentage,
  period: RechentagePeriod | null,
  year: number,
  month: number
): number {
  if (!period || occupancy.start === undefined || occupancy.end === undefined) return 0;
  const monthStart = (monthKey({ year, month }) - period.originMonthKey) * RECHENTAGE_PRO_MONAT;
  const monthEnd = monthStart + RECHENTAGE_PRO_MONAT;
  return Math.max(0, Math.min(occupancy.end, monthEnd, period.end) - Math.max(occupancy.start, monthStart, period.start));
}

/**
 * Rechentage of a tenant in one calendar month of the period (0, 15 or 30).
 * `year`/`month` (1-12) name the calendar month; months outside the period count 0.
 */
export function calculateTenantRechentageInMonth(
  tenant: { id: string; einzug: string | null; auszug: string | null },
  startdatum: string,
  enddatum: string,
  year: number,
  month: number
): number {
  return rechentageInMonth(
    calculateTenantRechentage(tenant, startdatum, enddatum),
    getRechentagePeriod(startdatum, enddatum),
    year,
    month
  );
}

/** Whether a period is a window of 12 whole months (first of a month to the last day 12 months later) */
export function isValid360Period(startdatum: string, enddatum: string): boolean {
  const start = parseDateParts(startdatum);
  if (!start || start.day !== 1) return false;
  return toIsoDateOnly(enddatum) === get360PeriodEnd(toIso(start.year, start.month, 1));
}

/** Last day of the 12-month window that starts in the month of `startdatum` */
export function get360PeriodEnd(startdatum: string): string {
  const start = parseDateParts(startdatum);
  if (!start) return '';
  const key = monthKey(start) + 11;
  const year = Math.floor(key / 12);
  const month = key % 12 + 1;
  return toIso(year, month, daysInMonth(year, month));
}
