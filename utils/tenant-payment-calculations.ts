export const getLatestNebenkostenAmount = (entries?: any[] | null): number => {
    if (!Array.isArray(entries)) return 0

    const parsedEntries = entries
        .map(entry => {
            const amount = typeof entry.amount === 'number' ? entry.amount : Number(entry.amount)
            const dateValue = entry.date ? new Date(entry.date) : null
            return {
                amount: !Number.isNaN(amount) ? amount : 0,
                dateValue,
            }
        })
        .filter(entry => entry.amount > 0)

    if (!parsedEntries.length) return 0

    parsedEntries.sort((a, b) => {
        if (!a.dateValue && !b.dateValue) return 0
        if (!a.dateValue) return 1
        if (!b.dateValue) return -1
        return b.dateValue.getTime() - a.dateValue.getTime()
    })

    return parsedEntries[0]?.amount ?? 0
}

export const calculateMissedPayments = (tenant: any, finances: any[], includeDetails: boolean = false) => {
    const mieteRaw = Number(tenant.Wohnungen?.miete) || 0
    const nebenkostenRaw = getLatestNebenkostenAmount(tenant.nebenkosten)

    // Filter finances for this tenant's apartment
    const tenantFinances = finances.filter((finance: any) =>
        finance.wohnung_id === (tenant.wohnung_id || tenant.Wohnungen?.id)
    )

    // Calculate missed payments history
    const moveInDate = new Date(tenant.einzug || new Date().toISOString())
    const currentDate = new Date()

    let missedRentMonths = 0
    let missedNebenkostenMonths = 0
    let totalMissedAmount = 0
    const details: { date: string, type: 'rent' | 'nebenkosten', amount: number }[] = []

    // Check each month from move-in to current
    for (let year = moveInDate.getFullYear(); year <= currentDate.getFullYear(); year++) {
        const startMonth = (year === moveInDate.getFullYear()) ? moveInDate.getMonth() : 0
        const endMonth = (year === currentDate.getFullYear()) ? currentDate.getMonth() : 11

        for (let month = startMonth; month <= endMonth; month++) {
            // Construct dates manually to avoid timezone issues with toISOString()
            const monthStart = `${year}-${String(month + 1).padStart(2, '0')}-01`
            const lastDayOfMonth = new Date(year, month + 1, 0).getDate()
            const monthEnd = `${year}-${String(month + 1).padStart(2, '0')}-${lastDayOfMonth}`

            // Check rent payments for this month
            const rentPaid = tenantFinances
                .filter((f: any) =>
                    f.datum >= monthStart &&
                    f.datum <= monthEnd &&
                    f.name?.toLowerCase().includes('mietzahlung')
                )
                .reduce((sum: number, f: any) => sum + (Number(f.betrag) || 0), 0)

            if (rentPaid < mieteRaw) {
                missedRentMonths++
                const missingAmount = mieteRaw - rentPaid
                totalMissedAmount += missingAmount
                if (includeDetails) {
                    details.push({
                        date: monthStart,
                        type: 'rent',
                        amount: missingAmount
                    })
                }
            }

            // Check nebenkosten payments if applicable
            if (nebenkostenRaw > 0) {
                const nebenkostenPaid = tenantFinances
                    .filter((f: any) =>
                        f.datum >= monthStart &&
                        f.datum <= monthEnd &&
                        f.name?.toLowerCase().includes('nebenkosten')
                    )
                    .reduce((sum: number, f: any) => sum + (Number(f.betrag) || 0), 0)

                if (nebenkostenPaid < nebenkostenRaw) {
                    missedNebenkostenMonths++
                    const missingAmount = nebenkostenRaw - nebenkostenPaid
                    totalMissedAmount += missingAmount
                    if (includeDetails) {
                        details.push({
                            date: monthStart,
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
