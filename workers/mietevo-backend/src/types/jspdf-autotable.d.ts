import 'jspdf';

declare module 'jspdf' {
    interface jsPDF {
        autoTable: (options: unknown) => jsPDF; // Using unknown instead of any
        lastAutoTable: {
            finalY: number;
        };
    }
}
