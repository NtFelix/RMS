
/**
 * Bulk create water readings
 */
export async function bulkCreateWasserAblesungen(readings: Omit<WasserAblesung, 'id' | 'user_id'>[]) {
  const supabase = await createClient();
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, message: "Benutzer nicht authentifiziert." };
    }

    if (readings.length === 0) {
       return { success: true, data: [] };
    }

    // Extract unique meter IDs from the readings
    const meterIds = [...new Set(readings.map(r => r.wasser_zaehler_id))];

    // Verify ownership of all meters
    const { data: meters, error: metersError } = await supabase
      .from("Wasser_Zaehler")
      .select('id')
      .in('id', meterIds)
      .eq('user_id', user.id);

    if (metersError) {
       console.error("Error verifying meter ownership:", metersError);
       return { success: false, message: "Fehler bei der Überprüfung der Zähler." };
    }

    const ownedMeterIds = new Set(meters?.map(m => m.id) || []);
    
    // Filter readings for owned meters
    const validReadings = readings.filter(r => ownedMeterIds.has(r.wasser_zaehler_id))
                                  .map(r => ({ ...r, user_id: user.id }));

    if (validReadings.length === 0) {
        return { success: false, message: "Keine gültigen Zähler gefunden, für die Sie berechtigt sind." };
    }

    if (validReadings.length !== readings.length) {
       console.warn("Some readings were skipped due to permission issues.");
    }

    const { data: result, error } = await supabase
      .from("Wasser_Ablesungen")
      .insert(validReadings)
      .select();

    if (error) {
      console.error("Error bulk creating water readings:", error);
      return { success: false, message: error.message };
    }

    revalidatePath("/betriebskosten");
    return { success: true, data: result };
  } catch (error: any) {
    console.error("Unexpected error in bulkCreateWasserAblesungen:", error);
    return { success: false, message: `Ein unerwarteter Fehler ist aufgetreten: ${error.message}` };
  }
}
