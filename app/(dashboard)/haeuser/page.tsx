import { HousesDataTable } from "./components/data-table";
import { columns, House } from "./components/columns";
import { createClient } from "@/utils/supabase/server";

export const metadata = {
  title: "Häuser",
};

export default async function HaeuserPage() {
  const supabase = await createClient();
  const { data: haeuser, error } = await supabase.from("Haeuser").select("id, name, ort, strasse");

  if (error) {
    console.error("Error fetching houses:", error);
    return <div>Error loading data.</div>;
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Häuser</h2>
      </div>
      <HousesDataTable columns={columns} data={haeuser as House[]} />
    </div>
  );
}
