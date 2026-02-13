import 'jspdf';

declare module 'jspdf' {
    interface jsPDF {
        autoTable: (options: any) => jsPDF; // You can use a more specific type for options if available
        lastAutoTable: {
            finalY: number;
        };
    }
}
