// types/jspdf-autotable.d.ts
import jsPDF from 'jspdf'; // Import the class/default export to get its type.

declare module 'jspdf' {
  interface jsPDF { // Augment the jsPDF interface/class
    autoTable: (options: any) => jsPDF; // 'any' for options can be refined later if needed.
    lastAutoTable?: {
      finalY?: number;
      // Add other properties of lastAutoTable if they are used or needed.
    };
  }
}
