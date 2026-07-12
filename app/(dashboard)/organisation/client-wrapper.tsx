"use client";

import { useState, useReducer, useTransition, useMemo, useEffect, useRef, type Dispatch, type SetStateAction, type FormEvent } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { StatCard } from "@/components/common/stat-card";
import { toast } from "@/hooks/use-toast";
import { LazyMotion, domAnimation } from "framer-motion";
import { cn } from "@/lib/utils";
import { useTabParams } from "@/hooks/use-tab-params";
import { AnimatedPillToggle } from "@/components/ui/animated-pill-toggle";
import {
  Users,
  Shield,
  Mail,
  X,
  PlusCircle,
  Network,
  Lock,
  Trash2,
  AlertTriangle,
  Clock
} from "lucide-react";
import { SearchInput } from "@/components/ui/search-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createEinladungAction,
  revokeEinladungAction,
  setMitgliedRolleAction,
  setMitgliedStatusAction,
  removeMitgliedAction
} from "@/app/organisation-actions";

import { MitgliedPermissionDetail } from "@/components/organisation/mitglied-permission-detail";
import { OrganisationPoliciesTab } from "@/components/organisation/organisation-policies-tab";
import { OrganisationAuditLogTab } from "@/components/organisation/organisation-audit-log-tab";
import type { OrganisationMember, OrganisationInvitation, OrganisationPolicy, HausWithWohnungen } from "@/lib/organisation-types";
import type { User } from "@supabase/supabase-js";


export type Member = OrganisationMember;
export type Invitation = OrganisationInvitation;

interface OrganisationClientViewProps {
  org: {
    id: string;
    owner_id: string;
    ist_versteckt: boolean;
    einstellungen: Record<string, unknown> | null;
  };
  initialMembers: OrganisationMember[];
  initialInvitations: OrganisationInvitation[];
  initialPolicies: OrganisationPolicy[];
  initialHaeuser: HausWithWohnungen[];
  currentUser: User;
  canManage?: boolean;
  rpcError?: string | null;
}

type UiState = {
  searchQuery: string;
  inviteEmail: string;
  inviteRole: "admin" | "mitarbeiter";
  selectedMemberId: string | null;
  pendingConfirm: {
    type: 'role' | 'status' | 'delete' | 'revoke';
    memberId?: string;
    invitationId?: string;
    value?: string;
    memberName?: string;
  } | null;
};

type UiAction =
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'SET_INVITE_EMAIL'; payload: string }
  | { type: 'SET_INVITE_ROLE'; payload: "admin" | "mitarbeiter" }
  | { type: 'SET_SELECTED_MEMBER'; payload: string | null }
  | { type: 'SET_PENDING_CONFIRM'; payload: UiState['pendingConfirm'] }
  | { type: 'CLEAR_INVITE_EMAIL' }
  | { type: 'RESET_FILTERS' };

const initialUiState: UiState = {
  searchQuery: "",
  inviteEmail: "",
  inviteRole: "mitarbeiter",
  selectedMemberId: null,
  pendingConfirm: null,
};

function uiReducer(state: UiState, action: UiAction): UiState {
  switch (action.type) {
    case 'SET_SEARCH_QUERY':
      return { ...state, searchQuery: action.payload };
    case 'SET_INVITE_EMAIL':
      return { ...state, inviteEmail: action.payload };
    case 'SET_INVITE_ROLE':
      return { ...state, inviteRole: action.payload };
    case 'SET_SELECTED_MEMBER':
      return { ...state, selectedMemberId: action.payload };
    case 'SET_PENDING_CONFIRM':
      return { ...state, pendingConfirm: action.payload };
    case 'CLEAR_INVITE_EMAIL':
      return { ...state, inviteEmail: "" };
    case 'RESET_FILTERS':
      return { ...state, searchQuery: "", selectedMemberId: null };
    default:
      return state;
  }
}

function OrganisationOverviewTab({ stats }: { stats: { active: number; admins: number; pendingInvites: number; ownerName: string } }) {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Aktive Mitarbeiter"
        value={stats.active}
        icon={<Users className="size-4 text-emerald-500" />}
        description="Mitarbeiter mit aktivem Zugriff"
      />
      <StatCard
        title="Administratoren / Inhaber"
        value={stats.admins}
        icon={<Shield className="size-4 text-purple-500" />}
        description="Mitarbeiter mit Verwaltungsrechten"
      />
      <StatCard
        title="Offene Einladungen"
        value={stats.pendingInvites}
        icon={<Mail className="size-4 text-amber-500" />}
        description="Ausstehende Einladungen"
      />
      <StatCard
        title="Organisationseigent&uuml;mer"
        value={stats.ownerName.split('@')[0]}
        icon={<Lock className="size-4 text-indigo-500" />}
        description={stats.ownerName}
      />
    </div>
  );
}

function OrganisationConfirmDialog({
  pendingConfirm,
  isPending,
  onConfirm,
  onClose
}: {
  pendingConfirm: UiState['pendingConfirm'];
  isPending: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <AlertDialog open={pendingConfirm !== null} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="rounded-[2rem] max-w-md border border-zinc-200/50 dark:border-zinc-800/50">
        <AlertDialogHeader className="flex flex-col gap-3">
          <div className="mx-auto bg-amber-500/10 text-amber-500 p-4 rounded-full w-fit">
            <AlertTriangle className="size-8" />
          </div>
          <AlertDialogTitle className="text-xl font-bold text-center">
            {pendingConfirm?.type === 'revoke' && "Einladung widerrufen"}
            {pendingConfirm?.type === 'role' && "Rolle ändern"}
            {pendingConfirm?.type === 'status' && "Status ändern"}
            {pendingConfirm?.type === 'delete' && "Mitglied entfernen"}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center text-sm text-muted-foreground leading-relaxed">
            {pendingConfirm?.type === 'revoke' && (
              <>Möchten Sie die Einladung für <strong className="text-foreground">{pendingConfirm.memberName}</strong> wirklich widerrufen? Die Person wird die Einladung nicht mehr annehmen können.</>
            )}
            {pendingConfirm?.type === 'role' && (
              <>Möchten Sie die Rolle von <strong className="text-foreground">{pendingConfirm.memberName}</strong> wirklich auf <strong className="text-foreground">{pendingConfirm.value === 'owner' ? 'Inhaber' : pendingConfirm.value === 'admin' ? 'Administrator' : 'Mitarbeiter'}</strong> ändern?</>
            )}
            {pendingConfirm?.type === 'status' && (
              <>Möchten Sie den Status von <strong className="text-foreground">{pendingConfirm.memberName}</strong> wirklich auf <strong className="text-foreground">{pendingConfirm.value === 'aktiv' ? 'Aktiv' : 'Deaktiviert'}</strong> ändern?</>
            )}
            {pendingConfirm?.type === 'delete' && (
              <>Möchten Sie <strong className="text-foreground">{pendingConfirm.memberName}</strong> wirklich aus der Organisation entfernen? Der Zugriff auf alle Daten dieser Organisation geht sofort verloren.</>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex flex-col-reverse sm:flex-row gap-2 mt-4">
          <AlertDialogCancel className="rounded-xl flex-1 border border-zinc-200 dark:border-zinc-800" disabled={isPending}>
            Abbrechen
          </AlertDialogCancel>
          <AlertDialogAction
            className="rounded-xl flex-1 bg-amber-500 hover:bg-amber-600 text-white font-medium"
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isPending}
          >
            {isPending ? "Bitte warten..." : "Bestätigen"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}



function OrganisationMembersTab({
  searchQuery,
  inviteEmail,
  inviteRole,
  members,
  invitations,
  expiredInvitationIds,
  hasVerwaltenPermission,
  isPending,
  isInviting,
  currentUserId,
  selectedMemberId,
  onSelectMember,
  onSearchChange,
  onInviteEmailChange,
  onInviteRoleChange,
  onInvite,
  onRevoke,
  onRoleChange,
  onStatusChange,
  onRemove
}: {
  searchQuery: string;
  inviteEmail: string;
  inviteRole: "admin" | "mitarbeiter";
  members: OrganisationMember[];
  invitations: OrganisationInvitation[];
  expiredInvitationIds: Set<string>;
  hasVerwaltenPermission: boolean;
  isPending: boolean;
  isInviting: boolean;
  currentUserId?: string;
  selectedMemberId: string | null;
  onSelectMember: (id: string | null) => void;
  onSearchChange: (val: string) => void;
  onInviteEmailChange: (val: string) => void;
  onInviteRoleChange: (val: "admin" | "mitarbeiter") => void;
  onInvite: (e: FormEvent) => void;
  onRevoke: (id: string, email: string) => void;
  onRoleChange: (memberId: string, name: string, newRole: string) => void;
  onStatusChange: (memberId: string, name: string, newStatus: string) => void;
  onRemove: (memberId: string, name: string) => void;
}) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const hasSubmittedInvite = useRef(false);

  // Unified list of members and invitations
  const unifiedMembers = useMemo(() => {
    const list: {
      id: string;
      type: 'member' | 'invitation';
      name: string;
      email: string;
      role: 'owner' | 'admin' | 'mitarbeiter';
      status: 'aktiv' | 'eingeladen' | 'deaktiviert';
      isExpiredInvitation?: boolean;
      member: OrganisationMember;
      invitation: OrganisationInvitation;
    }[] = [];

    // Add members
    members.forEach(m => {
      const fullName = m.first_name || m.last_name
        ? `${m.first_name || ""} ${m.last_name || ""}`.trim()
        : m.email.split('@')[0];
      list.push({
        id: m.mitglied_id,
        type: 'member',
        name: fullName,
        email: m.email,
        role: m.rolle,
        status: m.status === 'aktiv' ? 'aktiv' : 'deaktiviert',
        member: m,
        invitation: null as unknown as OrganisationInvitation,
      });
    });

    // Add open/pending invitations
    invitations.forEach(inv => {
      if (inv.status === 'offen') {
        const isExpired = expiredInvitationIds.has(inv.id);
        list.push({
          id: inv.id,
          type: 'invitation',
          name: inv.email.split('@')[0],
          email: inv.email,
          role: inv.rolle,
          status: isExpired ? 'deaktiviert' : 'eingeladen',
          isExpiredInvitation: isExpired,
          member: null as unknown as OrganisationMember,
          invitation: inv,
        });
      }
    });

    // Sort: owners -> admins -> mitarbeiter
    list.sort((a, b) => {
      const roleOrder = { owner: 0, admin: 1, mitarbeiter: 2 };
      const statusOrder = { aktiv: 0, eingeladen: 1, deaktiviert: 2 };
      
      if (roleOrder[a.role] !== roleOrder[b.role]) {
        return roleOrder[a.role] - roleOrder[b.role];
      }
      if (statusOrder[a.status] !== statusOrder[b.status]) {
        return statusOrder[a.status] - statusOrder[b.status];
      }
      return a.name.localeCompare(b.name);
    });

    return list;
  }, [members, invitations, expiredInvitationIds]);

  // Filter list by search query
  const filteredUnifiedMembers = useMemo(() => {
    if (!searchQuery) return unifiedMembers;
    const query = searchQuery.toLowerCase();
    return unifiedMembers.filter(item => 
      item.name.toLowerCase().includes(query) || 
      item.email.toLowerCase().includes(query)
    );
  }, [unifiedMembers, searchQuery]);

  // Find currently selected item (could be member or invitation)
  const selectedItem = useMemo(() => {
    return unifiedMembers.find(item => item.id === selectedMemberId) || null;
  }, [unifiedMembers, selectedMemberId]);

  const handleInviteSubmit = (e: FormEvent) => {
    e.preventDefault();
    hasSubmittedInvite.current = true;
    onInvite(e);
  };

  // Close dialog when invite completes (inviteEmail cleared on success via CLEAR_INVITE_EMAIL dispatch)
  useEffect(() => {
    if (hasSubmittedInvite.current && !inviteEmail) {
      setInviteOpen(false);
      hasSubmittedInvite.current = false;
    }
  }, [inviteEmail]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
      {/* Left Pane: Unified Member List */}
      <Card className="md:col-span-1 rounded-[2rem] border border-zinc-200/50 dark:border-zinc-800/50 shadow-xs overflow-hidden h-[calc(100vh-180px)] flex flex-col md:sticky md:top-24">
        <div className="p-4 border-b border-zinc-200/50 dark:border-zinc-800/50 flex flex-col gap-3 shrink-0">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg text-zinc-800 dark:text-zinc-200">Mitarbeiter</h3>
            {hasVerwaltenPermission && (
              <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="rounded-xl bg-primary hover:bg-primary/95 text-white flex items-center gap-1.5 h-8 text-xs font-semibold px-3">
                    <PlusCircle className="size-3.5" />
                    <span>Einladen</span>
                  </Button>
                </DialogTrigger>
                <DialogContent size="sm" className="rounded-[2rem]">
                  <DialogHeader>
                    <DialogTitle className="text-lg font-bold">Mitarbeiter einladen</DialogTitle>
                    <DialogDescription className="text-xs">
                      Senden Sie eine Einladung per E-Mail, um neue Teammitglieder hinzuzufügen.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleInviteSubmit} className="flex flex-col gap-4 py-2">
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-semibold uppercase text-muted-foreground" htmlFor="email-input">E-Mail-Adresse</label>
                      <Input
                        id="email-input"
                        type="email"
                        placeholder="z.B. mitarbeiter@firma.de"
                        value={inviteEmail}
                        onChange={(e) => onInviteEmailChange(e.target.value)}
                        className="rounded-xl border-zinc-200/85 dark:border-zinc-800/85 h-10"
                        required
                        disabled={isInviting}
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-semibold uppercase text-muted-foreground" htmlFor="role-select">Rolle</label>
                      <Select
                        value={inviteRole}
                        onValueChange={(val) => onInviteRoleChange(val as "admin" | "mitarbeiter")}
                        disabled={isInviting}
                      >
                        <SelectTrigger id="role-select" className="rounded-xl h-10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="mitarbeiter">Mitarbeiter</SelectItem>
                          <SelectItem value="admin">Administrator</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <DialogFooter className="mt-2">
                      <Button
                        type="submit"
                        className="w-full h-10 rounded-xl bg-primary hover:bg-primary/95 text-white flex items-center justify-center gap-2 font-medium"
                        disabled={isInviting || !inviteEmail}
                      >
                        {isInviting ? (
                          <><Clock className="size-4 animate-spin" /><span>Wird eingeladen...</span></>
                        ) : (
                          <><PlusCircle className="size-4" /><span>Einladung senden</span></>
                        )}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
          <div className="flex items-center gap-2">
            <SearchInput
              aria-label="Mitarbeiter durchsuchen"
              placeholder="Suchen nach Name oder E-Mail..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full h-9 text-xs rounded-xl"
              wrapperClassName="w-full"
            />
          </div>
        </div>

        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 bg-zinc-50/30 dark:bg-zinc-950/10">
          {filteredUnifiedMembers.length === 0 ? (
            <div className="text-center text-xs text-muted-foreground py-8">
              Keine Mitglieder gefunden.
            </div>
          ) : (
            filteredUnifiedMembers.map((item) => {
              const initials = item.name
                ? item.name.split(" ").map(n => n.charAt(0)).join("").toUpperCase().slice(0, 2)
                : item.email.charAt(0).toUpperCase();

              const isSelected = selectedMemberId === item.id;

              return (
                <div
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelectMember(isSelected ? null : item.id)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectMember(isSelected ? null : item.id); } }}
                  className={cn(
                    "p-3 rounded-2xl flex items-center justify-between gap-3 cursor-pointer transition-all duration-200 border border-transparent",
                    isSelected
                      ? "bg-zinc-100 dark:bg-zinc-800/80 border-zinc-200/50 dark:border-zinc-700/50 shadow-xs"
                      : "hover:bg-zinc-50 dark:hover:bg-zinc-900/30"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="h-9 w-9 border border-zinc-200/20 shrink-0">
                      <AvatarFallback className="bg-primary/5 text-primary text-xs font-bold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col min-w-0">
                      <span className="font-semibold text-sm text-zinc-800 dark:text-zinc-200 truncate">
                        {item.name}
                      </span>
                      <span className="text-[11px] text-muted-foreground truncate">
                        {item.email}
                      </span>
                    </div>
                  </div>

                  {/* Badges on right side */}
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    {/* Role Badge */}
                    <Badge
                      variant="outline"
                      className={cn(
                        "rounded-full font-medium text-[9px] px-2 py-0 hover:bg-transparent tracking-wide capitalize",
                        item.role === 'owner' ? "bg-amber-500/10 text-amber-700 border-amber-200/60 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-900/40" :
                        item.role === 'admin' ? "bg-blue-500/10 text-blue-700 border-blue-200/60 dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-900/40" :
                        "bg-zinc-500/10 text-zinc-700 border-zinc-200/60 dark:bg-zinc-500/20 dark:text-zinc-400 dark:border-zinc-800/40"
                      )}
                    >
                      {item.role === 'owner' ? 'Inhaber' : item.role === 'admin' ? 'Admin' : 'Mitarbeiter'}
                    </Badge>

                    {/* Status Badge */}
                    <Badge
                      variant="outline"
                      className={cn(
                        "rounded-full font-medium text-[9px] px-2 py-0 hover:bg-transparent tracking-wide",
                        item.status === 'aktiv' ? "bg-emerald-500/10 text-emerald-700 border-emerald-200/60 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-900/40" :
                        item.status === 'eingeladen' ? "bg-orange-500/10 text-orange-700 border-orange-200/60 dark:bg-orange-500/20 dark:text-orange-400 dark:border-orange-900/40" :
                        "bg-red-500/10 text-red-700 border-red-200/60 dark:bg-red-500/20 dark:text-red-400 dark:border-red-900/40"
                      )}
                    >
                      {item.status === 'aktiv' ? 'Aktiv' : item.status === 'eingeladen' ? 'Eingeladen' : 'Deaktiviert'}
                    </Badge>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>

      {/* Right Pane: Detail Panel */}
      <div className="md:col-span-2 h-[calc(100vh-180px)] overflow-y-auto pr-1 md:sticky md:top-24 scrollbar-thin">
        {selectedItem ? (
          selectedItem.type === 'member' ? (
            <MitgliedPermissionDetail
              mitgliedId={selectedItem.id}
              rolle={selectedItem.role}
              status={selectedItem.status}
              memberName={selectedItem.name}
              email={selectedItem.email}
              hasVerwaltenPermission={hasVerwaltenPermission}
              currentUserId={currentUserId}
              selectedMemberUserId={selectedItem.member.user_id}
              onRoleChange={onRoleChange}
              onStatusChange={onStatusChange}
              onRemove={onRemove}
              isPending={isPending}
            />
          ) : (
            /* Invitation Detail Panel */
            <div className="flex flex-col gap-6 h-full">
              {/* Header */}
              <div className="flex flex-col gap-3 pb-6 border-b border-zinc-200 dark:border-zinc-800">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <h2 className="text-2xl font-bold tracking-tight text-zinc-800 dark:text-zinc-200 truncate">
                    {selectedItem.email}
                  </h2>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="rounded-full font-medium text-[11px] px-2.5 py-0.5 bg-zinc-500/10 text-zinc-700 border-zinc-200 dark:bg-zinc-500/20 dark:text-zinc-400 dark:border-zinc-800">
                      {selectedItem.role === 'admin' ? 'Admin' : 'Mitarbeiter'}
                    </Badge>
                    <Badge variant="outline" className={cn("rounded-full font-medium text-[11px] px-2.5 py-0.5", 
                      selectedItem.isExpiredInvitation 
                        ? "bg-red-500/10 text-red-700 border-red-200 dark:bg-red-500/20 dark:text-red-400 dark:border-red-800"
                        : "bg-orange-500/10 text-orange-700 border-orange-200 dark:bg-orange-500/20 dark:text-orange-400 dark:border-orange-800"
                    )}>
                      {selectedItem.isExpiredInvitation ? 'Einladung abgelaufen' : 'Eingeladen'}
                    </Badge>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground" suppressHydrationWarning>
                  Eingeladen am {new Date(selectedItem.invitation.erstellt_am).toLocaleDateString("de-DE")} · Ablaufdatum: {new Date(selectedItem.invitation.expires_at).toLocaleDateString("de-DE")}
                </p>
              </div>

              {/* Centered Message Card */}
              <div className="flex flex-col items-center justify-center p-12 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-[2rem] bg-zinc-50/50 dark:bg-zinc-900/30 text-center gap-4 min-h-[250px]">
                <div className="bg-orange-500/10 text-orange-500 p-4 rounded-full">
                  <Mail className="size-8 animate-pulse" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="font-bold text-lg text-zinc-800 dark:text-zinc-200">Einladung ausstehend</h3>
                  <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
                    Dieser Benutzer wurde per E-Mail eingeladen. Detaillierte Berechtigungen und Overrides können angepasst werden, sobald er die Einladung angenommen hat.
                  </p>
                </div>
              </div>

              {/* Revoke Invitation card */}
              {hasVerwaltenPermission && (
                <Card className="rounded-[2rem] border border-zinc-200/50 dark:border-zinc-800/50 shadow-xs">
                  <CardHeader>
                    <CardTitle className="text-lg">Einladung verwalten</CardTitle>
                    <CardDescription className="text-xs">
                      Sie können diese ausstehende Einladung widerrufen. Der eingeladene Benutzer kann der Organisation dann nicht mehr beitreten.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Button
                      variant="destructive"
                      className="rounded-xl h-10 font-semibold px-4 flex items-center gap-2"
                      onClick={() => onRevoke(selectedItem.id, selectedItem.email)}
                      disabled={isPending}
                    >
                      <X className="size-4" />
                      <span>Einladung widerrufen</span>
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          )
        ) : (
          /* Empty state */
          <Card className="rounded-[2rem] border border-dashed border-zinc-200 dark:border-zinc-800 shadow-xs p-12 text-center text-zinc-500 h-full flex flex-col items-center justify-center gap-4">
            <div className="bg-zinc-100 dark:bg-zinc-900 p-4 rounded-full text-zinc-400 dark:text-zinc-600">
              <Users className="size-10" />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-lg text-zinc-800 dark:text-zinc-200">Kein Mitglied ausgewählt</h3>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                Wählen Sie ein Mitglied oder eine Einladung aus der Liste aus, um Berechtigungen anzuzeigen oder Einstellungen zu verwalten.
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
function useOrganisationActions({
  uiState,
  dispatch,
  setMembers,
  setInvitations,
  startInviteTransition,
  startActionTransition,
  toast: showToast
}: {
  uiState: UiState;
  dispatch: Dispatch<UiAction>;
  setMembers: Dispatch<SetStateAction<OrganisationMember[]>>;
  setInvitations: Dispatch<SetStateAction<OrganisationInvitation[]>>;
  startInviteTransition: (callback: () => void) => void;
  startActionTransition: (callback: () => void) => void;
  toast: typeof toast;
}) {
  const handleInvite = (e: FormEvent) => {
    e.preventDefault();
    if (!uiState.inviteEmail) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(uiState.inviteEmail)) {
      showToast({
        title: "Ungültige E-Mail-Adresse",
        description: "Bitte geben Sie eine gültige E-Mail-Adresse ein.",
        variant: "destructive"
      });
      return;
    }

    startInviteTransition(async () => {
      const res = await createEinladungAction(uiState.inviteEmail, uiState.inviteRole);
      if (res.success) {
        const emailOk = res.email?.sent;
        showToast({
          title: emailOk ? "Einladung gesendet" : "Einladung erstellt",
          description: emailOk
            ? `Die Einladung für ${uiState.inviteEmail} wurde versendet.`
            : `Die Einladung für ${uiState.inviteEmail} wurde erstellt, aber die E-Mail konnte nicht versendet werden${res.email?.error ? ` (${res.email.error})` : ''}.`,
          variant: emailOk ? "success" : "default"
        });
        dispatch({ type: 'CLEAR_INVITE_EMAIL' });
        if (res.data) {
          setInvitations(prev => [res.data, ...prev]);
        }
      } else {
        showToast({
          title: "Einladung fehlgeschlagen",
          description: res.error?.message || "Ein Fehler ist aufgetreten.",
          variant: "destructive"
        });
      }
    });
  };

  const handleRevoke = (id: string, email: string) => {
    dispatch({
      type: 'SET_PENDING_CONFIRM',
      payload: { type: 'revoke', invitationId: id, memberName: email }
    });
  };

  const confirmRevoke = () => {
    if (!uiState.pendingConfirm?.invitationId) return;
    const { invitationId } = uiState.pendingConfirm;

    startActionTransition(async () => {
      const res = await revokeEinladungAction(invitationId);
      if (res.success) {
        showToast({ title: "Einladung widerrufen", description: "Die Einladung wurde erfolgreich widerrufen.", variant: "success" });
        setInvitations(prev => prev.filter(i => i.id !== invitationId));
      } else {
        showToast({ title: "Fehler", description: res.error?.message || "Die Einladung konnte nicht widerrufen werden.", variant: "destructive" });
      }
      dispatch({ type: 'SET_PENDING_CONFIRM', payload: null });
    });
  };

  const handleRoleChange = (memberId: string, name: string, newRole: string) => {
    dispatch({
      type: 'SET_PENDING_CONFIRM',
      payload: { type: 'role', memberId, value: newRole, memberName: name }
    });
  };

  const confirmRoleChange = () => {
    if (!uiState.pendingConfirm?.memberId || !uiState.pendingConfirm?.value) return;
    const { memberId, value: newRole, memberName } = uiState.pendingConfirm;

    startActionTransition(async () => {
      const res = await setMitgliedRolleAction(memberId, newRole);
      if (res.success) {
        showToast({
          title: "Rolle aktualisiert",
          description: `Die Rolle von ${memberName} wurde auf ${
            newRole === 'owner' ? 'Inhaber' : newRole === 'admin' ? 'Administrator' : 'Mitarbeiter'
          } geändert.`,
          variant: "success"
        });
        setMembers(prev => prev.map(m => m.mitglied_id === memberId ? { ...m, rolle: newRole as OrganisationMember['rolle'] } : m));
      } else {
        showToast({ title: "Fehler beim Ändern der Rolle", description: res.error?.message || "Die Rolle konnte nicht geändert werden.", variant: "destructive" });
      }
      dispatch({ type: 'SET_PENDING_CONFIRM', payload: null });
    });
  };

  const handleStatusChange = (memberId: string, name: string, newStatus: string) => {
    dispatch({
      type: 'SET_PENDING_CONFIRM',
      payload: { type: 'status', memberId, value: newStatus, memberName: name }
    });
  };

  const confirmStatusChange = () => {
    if (!uiState.pendingConfirm?.memberId || !uiState.pendingConfirm?.value) return;
    const { memberId, value: newStatus, memberName } = uiState.pendingConfirm;

    startActionTransition(async () => {
      const res = await setMitgliedStatusAction(memberId, newStatus);
      if (res.success) {
        showToast({
          title: "Status aktualisiert",
          description: `Der Status von ${memberName} wurde auf ${
            newStatus === 'aktiv' ? 'Aktiv' : 'Deaktiviert'
          } geändert.`,
          variant: "success"
        });
        setMembers(prev => prev.map(m => m.mitglied_id === memberId ? { ...m, status: newStatus as OrganisationMember['status'] } : m));
      } else {
        showToast({ title: "Fehler beim Ändern des Status", description: res.error?.message || "Der Status konnte nicht geändert werden.", variant: "destructive" });
      }
      dispatch({ type: 'SET_PENDING_CONFIRM', payload: null });
    });
  };

  const handleRemove = (memberId: string, name: string) => {
    dispatch({
      type: 'SET_PENDING_CONFIRM',
      payload: { type: 'delete', memberId, memberName: name }
    });
  };

  const confirmRemove = () => {
    if (!uiState.pendingConfirm?.memberId) return;
    const { memberId, memberName } = uiState.pendingConfirm;

    startActionTransition(async () => {
      const res = await removeMitgliedAction(memberId);
      if (res.success) {
        showToast({ title: "Mitarbeiter entfernt", description: `${memberName} wurde aus der Organisation entfernt.`, variant: "success" });
        setMembers(prev => prev.filter(m => m.mitglied_id !== memberId));
      } else {
        showToast({ title: "Fehler beim Entfernen", description: res.error?.message || "Der Mitarbeiter konnte nicht entfernt werden.", variant: "destructive" });
      }
      dispatch({ type: 'SET_PENDING_CONFIRM', payload: null });
    });
  };

  return {
    handleInvite,
    handleRevoke,
    handleRoleChange,
    handleStatusChange,
    handleRemove,
    confirmRevoke,
    confirmRoleChange,
    confirmStatusChange,
    confirmRemove
  };
}

export default function OrganisationClientView({
  initialMembers,
  initialInvitations,
  initialPolicies,
  initialHaeuser,
  currentUser,
  canManage = false,
  rpcError = null
}: OrganisationClientViewProps) {
  const [currentTab, setCurrentTab] = useTabParams<"overview" | "members" | "policies" | "audit_log">("overview", ["overview", "members", "policies", "audit_log"]);
  const [uiState, dispatch] = useReducer(uiReducer, initialUiState);
  const [members, setMembers] = useState<OrganisationMember[]>(initialMembers);
  const [invitations, setInvitations] = useState<OrganisationInvitation[]>(initialInvitations);
  // Pass initial props directly — stable references from server component
  const expiryThreshold = useRef(Date.now());
  const expiredInvitationIds = useMemo(() => {
    const expired = new Set<string>();
    invitations.forEach(invite => {
      if (new Date(invite.expires_at).getTime() < expiryThreshold.current) {
        expired.add(invite.id);
      }
    });
    return expired;
  }, [invitations]);

  const [isInviting, startInviteTransition] = useTransition();
  const [isPending, startActionTransition] = useTransition();

  const isUserOwner = useMemo(() => {
    return members.some(m => m.user_id === currentUser?.id && m.rolle === 'owner');
  }, [members, currentUser]);

  const hasVerwaltenPermission = canManage || isUserOwner;

  const isOwnerOrAdmin = useMemo(() => {
    return members.some(
      m => m.user_id === currentUser?.id && 
           m.status === 'aktiv' && 
           (m.rolle === 'owner' || m.rolle === 'admin')
    );
  }, [members, currentUser]);

  const orgTabs = useMemo(() => {
    const list: { value: "overview" | "members" | "policies" | "audit_log"; label: string; icon: any }[] = [
      { value: "overview", label: "Übersicht", icon: Network },
      { value: "members", label: "Mitarbeiter", icon: Users },
      { value: "policies", label: "Richtlinien", icon: Shield },
    ];
    if (isOwnerOrAdmin) {
      list.push({ value: "audit_log" as const, label: "Audit-Log", icon: Clock });
    }
    return list;
  }, [isOwnerOrAdmin]);

  const {
    handleInvite,
    handleRevoke,
    handleRoleChange,
    handleStatusChange,
    handleRemove,
    confirmRevoke,
    confirmRoleChange,
    confirmStatusChange,
    confirmRemove
  } = useOrganisationActions({
    uiState,
    dispatch,
    setMembers,
    setInvitations,
    startInviteTransition,
    startActionTransition,
    toast
  });

  // Compute stats for overview tab
  const stats = useMemo(() => {
    const active = members.filter(m => m.status === 'aktiv').length;
    const admins = members.filter(m => m.rolle === 'admin' || m.rolle === 'owner').length;
    const pendingInvites = invitations.filter(i => i.status === 'offen').length;
    const ownerName = members.find(m => m.rolle === 'owner')?.email || "Unbekannt";

    return { active, admins, pendingInvites, ownerName };
  }, [members, invitations]);

  return (
    <LazyMotion features={domAnimation}>
      <div className="flex flex-col gap-6 sm:gap-8 p-4 sm:p-8">


      {/* Inline RPC error banner */}
      {rpcError && (
        <div role="alert" className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800/40 dark:bg-amber-900/20 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
          <AlertTriangle className="size-4 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">Mitgliederdaten konnten nicht geladen werden</p>
            <p className="text-xs mt-0.5 opacity-75">{rpcError}</p>
          </div>
        </div>
      )}

      <AnimatedPillToggle
        tabs={orgTabs}
        activeTab={currentTab}
        onTabChange={setCurrentTab}
        layoutId="active-org-tab-pill"
      />

      {currentTab === "overview" && <OrganisationOverviewTab stats={stats} />}

      {currentTab === "members" && (
        <OrganisationMembersTab
          searchQuery={uiState.searchQuery}
          inviteEmail={uiState.inviteEmail}
          inviteRole={uiState.inviteRole}
          members={members}
          invitations={invitations}
          expiredInvitationIds={expiredInvitationIds}
          hasVerwaltenPermission={hasVerwaltenPermission}
          isPending={isPending}
          isInviting={isInviting}
          currentUserId={currentUser?.id}
          selectedMemberId={uiState.selectedMemberId}
          onSelectMember={(id) => dispatch({ type: 'SET_SELECTED_MEMBER', payload: id })}
          onSearchChange={(val) => dispatch({ type: 'SET_SEARCH_QUERY', payload: val })}
          onInviteEmailChange={(val) => dispatch({ type: 'SET_INVITE_EMAIL', payload: val })}
          onInviteRoleChange={(val) => dispatch({ type: 'SET_INVITE_ROLE', payload: val })}
          onInvite={handleInvite}
          onRevoke={handleRevoke}
          onRoleChange={handleRoleChange}
          onStatusChange={handleStatusChange}
          onRemove={handleRemove}
        />
      )}

      {currentTab === "policies" && (
        <OrganisationPoliciesTab
          hasVerwaltenPermission={hasVerwaltenPermission}
          initialPolicies={initialPolicies}
          initialHaeuser={initialHaeuser}
        />
      )}

      {currentTab === "audit_log" && isOwnerOrAdmin && (
        <OrganisationAuditLogTab />
      )}


      <OrganisationConfirmDialog
        pendingConfirm={uiState.pendingConfirm}
        isPending={isPending}
        onConfirm={() => {
          if (uiState.pendingConfirm?.type === 'revoke') confirmRevoke();
          if (uiState.pendingConfirm?.type === 'role') confirmRoleChange();
          if (uiState.pendingConfirm?.type === 'status') confirmStatusChange();
          if (uiState.pendingConfirm?.type === 'delete') confirmRemove();
        }}
        onClose={() => dispatch({ type: 'SET_PENDING_CONFIRM', payload: null })}
      />
    </div>
    </LazyMotion>
  );
}

