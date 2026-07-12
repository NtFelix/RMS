import { createClient } from "@/utils/supabase/server";

function sanitize(value: string): string {
  return value
    .replace(/[\n\r\t]+/g, ' ')
    .replace(/[\x00-\x1f\x7f-\x9f]/g, '')
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '[uuid]')
    .substring(0, 200);
}

export async function getAIContextForPathname(pathname: string) {
  const supabase = await createClient();
  let contextParts: string[] = [];

  contextParts.push(`Current Page Path: ${sanitize(pathname)}`);

  try {
    const houseMatch = pathname.match(/\/haeuser\/([^/]+)/);
    const tenantMatch = pathname.match(/\/mieter\/([^/]+)/);
    const unitMatch = pathname.match(/\/wohnungen\/([^/]+)/);

    const queries: (() => Promise<void>)[] = [];

    if (houseMatch && houseMatch[1]) {
      const houseId = houseMatch[1];
      queries.push(async () => {
        const { data: house, error } = await supabase.from('haeuser').select('*').eq('id', houseId).single();
        if (!error && house) {
          contextParts.push(`Active House Data:
Name: ${sanitize(house.name)}
Address: ${sanitize(house.strasse)} ${sanitize(house.hausnummer)}, ${sanitize(house.plz)} ${sanitize(house.ort)}
Total Units: ${sanitize(String(house.anzahl_wohnungen ?? 'Unknown'))}`);
        }
      });
    }

    if (tenantMatch && tenantMatch[1]) {
      const tenantId = tenantMatch[1];
      queries.push(async () => {
        const { data: tenant, error } = await supabase.from('mieter')
          .select('*, wohnungen(name, haeuser(name))')
          .eq('id', tenantId)
          .single();
        if (!error && tenant) {
          contextParts.push(`Active Tenant Data:
Name: ${sanitize(tenant.vorname)} ${sanitize(tenant.nachname)}
Email: ${sanitize(tenant.email || 'N/A')}
Phone: ${sanitize(tenant.telefon || 'N/A')}
Rent: ${sanitize(String(tenant.miete ?? 0))}
Deposit Status: ${sanitize(tenant.kaution_status || 'N/A')}
Apartment: ${sanitize(tenant.wohnungen?.name || 'N/A')} in House: ${sanitize(tenant.wohnungen?.haeuser?.name || 'N/A')}`);
        }
      });
    }

    if (unitMatch && unitMatch[1] && !tenantMatch) {
      const unitId = unitMatch[1];
      queries.push(async () => {
        const { data: unit, error } = await supabase.from('wohnungen')
          .select('*, haeuser(name)')
          .eq('id', unitId)
          .single();
        if (!error && unit) {
          contextParts.push(`Active Unit (Apartment) Data:
Name: ${sanitize(unit.name)}
House: ${sanitize(unit.haeuser?.name || 'N/A')}
Floor: ${sanitize(unit.etage || 'N/A')}
Type: ${sanitize(unit.wohnungstyp || 'N/A')}`);
        }
      });
    }

    await Promise.all(queries.map(fn => fn()));

  } catch (err) {
    console.error("Error fetching context for AI:", err);
  }

  return contextParts.join("\n\n");
}
