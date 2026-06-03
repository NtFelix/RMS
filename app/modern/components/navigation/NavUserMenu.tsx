"use client"

import { User } from "@supabase/supabase-js"
import { LayoutDashboard, Settings, LogOut, ChevronDown } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { ROUTES } from "@/lib/constants"
import { useUserProfile } from "@/hooks/use-user-profile"

interface NavUserMenuProps {
  currentUser: User | null
  handleLogout: () => Promise<void>
  handleOpenLoginModal: () => void
  handleRegisterClick: () => void
}

export function NavUserMenu({
  currentUser,
  handleLogout,
  handleOpenLoginModal,
  handleRegisterClick,
}: NavUserMenuProps) {
  const { userName } = useUserProfile()

  if (!currentUser) {
    return (
      <div className="flex items-center pr-0">
        <Button
          variant="ghost"
          onClick={handleOpenLoginModal}
          className="px-4 py-2 h-9 text-sm font-medium text-foreground hover:bg-muted/50"
        >
          Anmelden
        </Button>
        <Button
          onClick={handleRegisterClick}
          className="ml-2 px-4 py-2 h-9 text-sm font-medium bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          Kostenlos testen
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center pr-0">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" className="p-2 rounded-full text-sm font-medium text-foreground hover:bg-gray-200 hover:text-foreground dark:btn-ghost-hover transition-colors duration-200 flex items-center gap-2 cursor-pointer">
            <Avatar className="size-6">
              <AvatarImage src={currentUser.user_metadata?.avatar_url} alt={currentUser.email || 'User'} />
              <AvatarFallback className="text-xs">
                {currentUser.email?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <span className="whitespace-nowrap">Mein Konto</span>
            <ChevronDown className="size-3" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60 p-2">
          <div className="flex items-center gap-3 p-2">
            <Avatar className="size-10">
              <AvatarImage src={currentUser.user_metadata?.avatar_url} alt={currentUser.email || 'User'} />
              <AvatarFallback className="text-sm">
                {currentUser.email?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium line-clamp-1">
                {userName}
              </p>
              <p className="text-xs text-muted-foreground">
                {currentUser.email || 'Konto verwalten'}
              </p>
            </div>
          </div>
          <DropdownMenuSeparator className="my-2" />
          <DropdownMenuItem asChild className="px-3 py-2 rounded-xl group">
            <Link href={ROUTES.HOME} className="w-full hover:bg-primary hover:text-primary-foreground dark:hover:bg-primary/90">
              <LayoutDashboard className="size-4 mr-3 text-muted-foreground group-hover:text-white" />
              <span>Dashboard</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="px-3 py-2 rounded-xl group hover:bg-primary hover:text-primary-foreground dark:hover:bg-primary/90 cursor-pointer"
            onClick={() => {
              // Navigate to dashboard
              window.location.href = ROUTES.HOME;
            }}
          >
            <Settings className="size-4 mr-3 text-muted-foreground group-hover:text-white" />
            <span>Einstellungen</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator className="my-2" />
          <DropdownMenuItem
            onClick={handleLogout}
            className="px-3 py-2 rounded-xl group hover:bg-red-600 hover:text-white dark:hover:bg-red-600/90 cursor-pointer"
          >
            <LogOut className="size-4 mr-3 group-hover:text-white" />
            <span className="group-hover:text-white">Abmelden</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
