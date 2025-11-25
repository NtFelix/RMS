"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"

export async function completeOnboarding(completed: boolean = true) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    const { error } = await supabase
      .from("profiles")
      .update({ onboarding_completed: completed })
      .eq("id", user.id)

    if (error) {
      console.error("Error updating onboarding status:", error)
      return { error }
    }
  }
  revalidatePath("/", "layout")
}

export async function checkOnboardingStatus() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    const { data, error } = await supabase
      .from("profiles")
      .select("onboarding_completed")
      .eq("id", user.id)
      .single()

    if (error) {
      console.error("Error fetching onboarding status:", error)
      return { error }
    }
    return { completed: data?.onboarding_completed ?? false }
  }
  return { completed: false }
}
