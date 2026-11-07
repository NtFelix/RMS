import { PAYMENT_KEYWORDS } from "@/utils/constants"
import { getCurrentMonthRange, getMonthDateRange, getTodayISOString, toIsoDateOnly } from "@/utils/date-calculations"

/**
 * Monthly Nebenkosten prepayment (Soll) that applies on the given date: the newest entry dated on or before it.
 * An entry dated later (e.g. an announced increase from 1 January) does not apply yet. If no entry applies yet
 * (tenant moving in later), the earliest upcoming one is used, so such tenants keep their planned amount.
 * Entries without a date count as the oldest ones; entries without a positive amount are ignored.
 */
export const getNebenkostenAmountAt = (entries: any[] | null | undefined, isoDate: string): number => {
    if (!Array.isArray(entries)) return 0

    const parsedEntries = entries
        .map(entry => {
            const amount = typeof entry.amount === 'number' ? entry.amount : Number(entry.amount)
            return {
                amount: !Number.isNaN(amount) ? amount : 0,
                iso: entry.date ? toIsoDateOnly(entry.date) : '',
            }
        })
        .filter(entry => entry.amount > 0)

    if (!parsedEntries.length) return 0

    const applicable = parsedEntries
        .filter(entry => !entry.iso || entry.iso <= isoDate)
        // Newest dated entry first, undated entries last
        .sort((a, b) => (b.iso || '').localeCompare(a.iso || ''))
    if (applicable.length) return applicable[0].amount

    const upcoming = [...parsedEntries].sort((a, b) => a.iso.localeCompare(b.iso))
    return upcoming[0]?.amount ?? 0
}

/** The monthly Nebenkosten prepayment that applies today */
export const getLatestNebenkostenAmount = (entries?: any[] | null): number =>
    getNebenkostenAmountAt(entries, getTodayISOString())

export const calculateMissedPayments = (tenant: any, finances: any[], includeDetails: boolean = false) => {
    const mieteRaw = Number(tenant.Wohnungen?.miete) || 0
    const nebenkostenRaw = getLatestNebenkostenAmount(tenant.nebenkosten)

    // Filter finances for this tenant's apartment and ensure they belong to this tenant
    const tenantFinances = finances.filter((finance: any) => {
        const isCorrectApartment = finance.wohnung_id === (tenant.wohnung_id || tenant.Wohnungen?.id)
        if (!isCorrectApartment) return false

        // Check if payment belongs to this tenant based on the note
        if (!finance.notiz) return true // No note, assume it's valid (manual entry)

        const noteLower = finance.notiz.toLowerCase()
        const nameLower = tenant.name.toLowerCase()

        // If it follows the system pattern, strictly check the name
        if (noteLower.includes(`${PAYMENT_KEYWORDS.RENT} von`) || noteLower.includes(`${PAYMENT_KEYWORDS.NEBENKOSTEN}-vorauszahlung von`)) {
            return noteLower.includes(nameLower)
        }

        return true // Note exists but doesn't follow pattern, assume valid
    })

    // Calculate missed payments history
    if (!tenant.einzug) {
        return {
            rentMonths: 0,
            nebenkostenMonths: 0,
            totalAmount: 0,
            details: includeDetails ? [] : undefined,
        }
    }
    // Parse date string manually to prevent timezone issues shifting the date
    const einzugStr = String(tenant.einzug).split('T')[0]
    const [y, m, d] = einzugStr.split('-').map(Number)
    const moveInDate = new Date(y, m - 1, d)
    // Current month in the app timezone, so the server (UTC) and browser agree at month boundaries
    const [currentYear, currentMonth] = getCurrentMonthRange().startIso.split('-').map(Number)

    let missedRentMonths = 0
    let missedNebenkostenMonths = 0
    let totalMissedAmount = 0
    const details: { date: string, type: 'rent' | 'nebenkosten', amount: number }[] = []

    // Check each month from move-in to current
    for (let year = moveInDate.getFullYear(); year <= currentYear; year++) {
        const startMonth = (year === moveInDate.getFullYear()) ? moveInDate.getMonth() : 0
        const endMonth = (year === currentYear) ? currentMonth - 1 : 11

        for (let month = startMonth; month <= endMonth; month++) {
            const { startIso: monthStart, endIso: monthEnd, daysInMonth } = getMonthDateRange(year, month + 1)

            // Calculate expected amounts (pro-rated for move-in month)
            let expectedRent = mieteRaw
            let expectedNebenkosten = nebenkostenRaw
            let paymentDate = monthStart

            const isMoveInMonth = year === moveInDate.getFullYear() && month === moveInDate.getMonth()

            if (isMoveInMonth) {
                const moveInDay = moveInDate.getDate()
                // If moved in after the 1st, pro-rate the amounts
                if (moveInDay > 1) {
                    const occupiedDays = daysInMonth - moveInDay + 1
                    const factor = occupiedDays / daysInMonth

                    expectedRent = Math.round(mieteRaw * factor * 100) / 100
                    expectedNebenkosten = Math.round(nebenkostenRaw * factor * 100) / 100

                    // Set payment date to move-in date for the first month
                    paymentDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(moveInDay).padStart(2, '0')}`
                }
            }

            // Check rent payments for this month
            const rentPaid = tenantFinances
                .filter((f: any) =>
                    f.datum >= monthStart &&
                    f.datum <= monthEnd &&
                    f.name?.toLowerCase().includes(PAYMENT_KEYWORDS.RENT)
                )
                .reduce((sum: number, f: any) => sum + (Number(f.betrag) || 0), 0)

            // Allow for small floating point differences (e.g. 0.01)
            if (rentPaid < expectedRent - 0.01) {
                missedRentMonths++
                const missingAmount = expectedRent - rentPaid
                totalMissedAmount += missingAmount
                if (includeDetails) {
                    details.push({
                        date: paymentDate,
                        type: 'rent',
                        amount: missingAmount
                    })
                }
            }

            // Check nebenkosten payments if applicable
            if (expectedNebenkosten > 0) {
                const nebenkostenPaid = tenantFinances
                    .filter((f: any) =>
                        f.datum >= monthStart &&
                        f.datum <= monthEnd &&
                        f.name?.toLowerCase().includes(PAYMENT_KEYWORDS.NEBENKOSTEN)
                    )
                    .reduce((sum: number, f: any) => sum + (Number(f.betrag) || 0), 0)

                // Allow for small floating point differences
                if (nebenkostenPaid < expectedNebenkosten - 0.01) {
                    missedNebenkostenMonths++
                    const missingAmount = expectedNebenkosten - nebenkostenPaid
                    totalMissedAmount += missingAmount
                    if (includeDetails) {
                        details.push({
                            date: paymentDate,
                            type: 'nebenkosten',
                            amount: missingAmount
                        })
                    }
                }
            }
        }
    }

    return {
        rentMonths: missedRentMonths,
        nebenkostenMonths: missedNebenkostenMonths,
        totalAmount: totalMissedAmount,
        details: includeDetails ? details : undefined
    }
}

type NebenkostenScheduleEntry = { id: string; amount: string; date: string }

/**
 * Adds a planned prepayment `{amount, date}` to a tenant's schedule (Mieter.nebenkosten). An entry with the same
 * date is replaced instead of duplicated, so saving the same increase twice changes nothing.
 */
export const upsertNebenkostenScheduleEntry = (
    entries: any[] | null | undefined,
    planned: { amount: number; date: string },
    newId: string
): NebenkostenScheduleEntry[] => {
    const schedule: NebenkostenScheduleEntry[] = (Array.isArray(entries) ? entries : []).map(entry => ({
        ...entry,
        id: String(entry.id ?? ''),
        amount: entry.amount === null || entry.amount === undefined ? '' : String(entry.amount),
        date: entry.date ?? '',
    }))
    const plannedIso = toIsoDateOnly(planned.date)
    const amount = String(planned.amount)
    const existing = schedule.findIndex(entry => entry.date && toIsoDateOnly(entry.date) === plannedIso)
    if (existing >= 0) {
        schedule[existing] = { ...schedule[existing], amount }
        return schedule
    }
    return [...schedule, { id: newId, amount, date: plannedIso }]
}
