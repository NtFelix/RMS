"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"

export async function completeOnboarding() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    await supabase
      .from("profiles")
      .update({ onboarding_completed: true })
      .eq("id", user.id)
  }
  revalidatePath("/")
}

export async function resetOnboarding() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    await supabase
      .from("profiles")
      .update({ onboarding_completed: false })
      .eq("id", user.id)
  }
  revalidatePath("/")
}
