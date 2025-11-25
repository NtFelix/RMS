"use server"

import { createServerClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"

export async function completeOnboarding() {
  const cookieStore = cookies()
  const supabase = createServerClient(cookieStore)
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
  const cookieStore = cookies()
  const supabase = createServerClient(cookieStore)
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
