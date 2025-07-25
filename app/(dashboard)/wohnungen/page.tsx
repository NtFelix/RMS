import { ApartmentsDataTable } from "./components/data-table";
import { columns, Apartment } from "./components/columns";
import { createClient } from "@/utils/supabase/server";

export const metadata = {
  title: "Wohnungen",
};

export default async function WohnungenPage() {
  const supabase = await createClient();
  const { data: wohnungen, error } = await supabase.from("Wohnungen").select("id, name, flaeche, miete, haus_id");

  if (error) {
    console.error("Error fetching apartments:", error);
    return <div>Error loading data.</div>;
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Wohnungen</h2>
      </div>
      <ApartmentsDataTable columns={columns} data={wohnungen as Apartment[]} />
    </div>
  );
}
