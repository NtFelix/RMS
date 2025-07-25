import { OperatingCostsDataTable } from "./components/data-table";
import { columns, OperatingCost } from "./components/columns";
import { createClient } from "@/utils/supabase/server";

export const metadata = {
    title: "Betriebskosten",
};

export default async function BetriebskostenPage() {
    const supabase = await createClient();
    const { data: betriebskosten, error } = await supabase.from("Betriebskosten").select("id, jahr, haus_id, kostenart, betrag");

    if (error) {
        console.error("Error fetching operating costs:", error);
        return <div>Error loading data.</div>;
    }

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">Betriebskosten</h2>
        </div>
        <OperatingCostsDataTable columns={columns} data={betriebskosten as OperatingCost[]} />
        </div>
    );
}
