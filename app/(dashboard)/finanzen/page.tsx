import { FinancesDataTable } from "./components/data-table";
import { columns, Finance } from "./components/columns";
import { createClient } from "@/utils/supabase/server";

export const metadata = {
  title: "Finanzen",
};

export default async function FinanzenPage() {
    const supabase = await createClient();
    const { data: finanzen, error } = await supabase.from("Finanzen").select("id, datum, beschreibung, betrag, kategorie");

    if (error) {
        console.error("Error fetching finances:", error);
        return <div>Error loading data.</div>;
    }

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">Finanzen</h2>
        </div>
        <FinancesDataTable columns={columns} data={finanzen as Finance[]} />
        </div>
    );
}
