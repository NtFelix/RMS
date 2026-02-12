declare module 'jspdf' {
    export class jsPDF {
        constructor(options?: any);
        text(text: string, x: number, y: number, options?: any): void;
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
        head?: any[][];
        body?: any[][];
        startY?: number;
        theme?: string;
        headStyles?: any;
        styles?: any;
        bodyStyles?: any;
        columnStyles?: any;
        willDrawCell?: (data: any) => void;
        didParseCell?: (data: any) => void;
        tableWidth?: number;
        margin?: any;
    }

    export default function autoTable(doc: jsPDF, options: AutoTableOptions): void;
}
