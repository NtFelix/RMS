import type React from "react"
import { AuthProvider } from "@/components/auth-provider"
import { CommandMenu } from "@/components/command-menu"
import { DashboardLayout } from "@/components/dashboard-layout"

export default function DashboardRootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <AuthProvider>
      <CommandMenu />
      <DashboardLayout>{children}</DashboardLayout>
    </AuthProvider>
  )
}
