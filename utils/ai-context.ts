import { createClient } from "@/utils/supabase/server";

export async function getAIContextForPathname(pathname: string) {
  const supabase = await createClient();
  let contextParts: string[] = [];

  contextParts.push(`Current Page Path: ${pathname}`);

  try {
    // Check if we are on a specific house page /haeuser/[id]
    const houseMatch = pathname.match(/\/haeuser\/([^/]+)/);
    if (houseMatch && houseMatch[1]) {
      const houseId = houseMatch[1];
      const { data: house, error } = await supabase
        .from('haeuser')
        .select('*')
        .eq('id', houseId)
        .single();
      
      if (!error && house) {
        contextParts.push(`Active House Data:
Name: ${house.name}
Address: ${house.strasse} ${house.hausnummer}, ${house.plz} ${house.ort}
Total Units: ${house.anzahl_wohnungen || 'Unknown'}`);
      }
    }

    // Check if we are on a specific tenant page /mieter/[id]
    const tenantMatch = pathname.match(/\/mieter\/([^/]+)/);
    if (tenantMatch && tenantMatch[1]) {
      const tenantId = tenantMatch[1];
      const { data: tenant, error } = await supabase
        .from('mieter')
        .select('*, wohnungen(name, haeuser(name))')
        .eq('id', tenantId)
        .single();
      
      if (!error && tenant) {
        contextParts.push(`Active Tenant Data:
Name: ${tenant.vorname} ${tenant.nachname}
Email: ${tenant.email || 'N/A'}
Phone: ${tenant.telefon || 'N/A'}
Rent: ${tenant.miete || 0}
Deposit Status: ${tenant.kaution_status || 'N/A'}
Apartment: ${tenant.wohnungen?.name || 'N/A'} in House: ${tenant.wohnungen?.haeuser?.name || 'N/A'}`);
      }
    }

    // Check if we are on a specific unit page /wohnungen/[id]
    const unitMatch = pathname.match(/\/wohnungen\/([^/]+)/);
    if (unitMatch && unitMatch[1] && !tenantMatch) {
      const unitId = unitMatch[1];
      const { data: unit, error } = await supabase
        .from('wohnungen')
        .select('*, haeuser(name)')
        .eq('id', unitId)
        .single();
      
      if (!error && unit) {
        contextParts.push(`Active Unit (Apartment) Data:
Name: ${unit.name}
House: ${unit.haeuser?.name || 'N/A'}
Floor: ${unit.etage || 'N/A'}
Type: ${unit.wohnungstyp || 'N/A'}`);
      }
    }

  } catch (err) {
    console.error("Error fetching context for AI:", err);
  }

  return contextParts.join("\n\n");
}
