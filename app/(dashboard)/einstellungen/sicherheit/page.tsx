import { createClient } from "@/utils/supabase/server"
import SecuritySection from "@/components/settings/security-section"

export default async function SicherheitPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return <SecuritySection initialEmail={user?.email ?? ""} />
}
