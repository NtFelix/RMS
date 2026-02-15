declare module 'jspdf' {
    export class jsPDF {
        constructor(options?: unknown);
        text(text: string, x: number, y: number, options?: unknown): void;
        setFontSize(size: number): void;
        setFont(font: string, style: string): void;
        setTextColor(r: number, g: number, b: number): void;
        output(type: string): ArrayBuffer;
        getNumberOfPages(): number;
        internal: {
            pageSize: {
                getWidth(): number;
                getHeight(): number;
            };
        };
    }
}

declare module 'jspdf-autotable' {
    import { jsPDF } from 'jspdf';

    export interface AutoTableOptions {
        head?: unknown[][];
        body?: unknown[][];
        startY?: number;
        theme?: string;
        headStyles?: unknown;
        styles?: unknown;
        bodyStyles?: unknown;
        columnStyles?: unknown;
        willDrawCell?: (data: unknown) => void;
        didParseCell?: (data: unknown) => void;
        tableWidth?: number;
        margin?: unknown;
    }

    export default function autoTable(doc: jsPDF, options: AutoTableOptions): void;
}
