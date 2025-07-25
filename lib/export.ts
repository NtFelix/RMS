import jsPDF from "jspdf";
import "jspdf-autotable";

export function exportToCsv<TData>(data: TData[], columns: (keyof TData)[], fileName: string) {
    const header = columns.join(",") + "\n";
    const body = data.map(row =>
        columns.map(col => row[col]).join(",")
    ).join("\n");
    const csv = header + body;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    if (link.href) {
        URL.revokeObjectURL(link.href);
    }
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute("download", `${fileName}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

export function exportToPdf<TData>(data: TData[], columns: (keyof TData)[], fileName: string) {
    const doc = new jsPDF();
    const tableData = data.map(row => columns.map(col => row[col]));
    (doc as any).autoTable({
        head: [columns.map(c => String(c))],
        body: tableData,
    });
    doc.save(`${fileName}.pdf`);
}
