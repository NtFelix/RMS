export type TenantBentoItem = {
    id: string
    tenant: string
    apartment: string
    apartmentId: string
    mieteRaw: number
    nebenkostenRaw?: number
    paid: boolean
    actualRent?: number
    actualNebenkosten?: number
    missedPayments: {
        rentMonths: number
        nebenkostenMonths: number
        totalAmount: number
    }
    einzug?: string | null
}

export type NebenkostenEntry = {
    id?: string
    amount?: string | number
    date?: string | null
}

export type MieterData = {
    id: string
    name: string
    einzug: string | null
    auszug: string | null
    nebenkosten?: NebenkostenEntry[] | null
    Wohnungen: {
        id: string
        name: string
        miete: number
    }
}
