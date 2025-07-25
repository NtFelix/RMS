export const runtime = 'edge';
import { TenantsDataTable } from "./components/data-table";
import { columns, Tenant } from "./components/columns";
import { createClient } from "@/utils/supabase/server";

export const metadata = {
  title: "Mieter",
};

export default async function MieterPage() {
  const supabase = await createClient();
  const { data: mieter, error } = await supabase.from("Mieter").select("id, name, email, telefon, wohnung_id");

  if (error) {
    console.error("Error fetching tenants:", error);
    return <div>Error loading data.</div>;
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Mieter</h2>
      </div>
      <TenantsDataTable columns={columns} data={mieter as Tenant[]} />
    </div>
  );
}
