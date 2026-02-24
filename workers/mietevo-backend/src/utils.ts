export const formatCurrency = (value: number | null | undefined) => {
    if (value == null) return "-";
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
};

export const isoToGermanDate = (isoString: string | null | undefined) => {
    if (!isoString) return "N/A";
    try {
        const date = new Date(isoString);
        return date.toLocaleDateString('de-DE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    } catch (e) {
        return isoString;
    }
};

export const sumZaehlerValues = (obj: Record<string, unknown> | null | undefined): number => {
    if (!obj || typeof obj !== 'object') return 0;
    return Object.values(obj).reduce((sum: number, val: unknown) => sum + (Number(val) || 0), 0);
};

export const roundToNearest5 = (value: number) => {
    return Math.round(value / 5) * 5;
};
