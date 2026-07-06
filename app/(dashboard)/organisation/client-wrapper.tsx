"use client";

import { useState, useReducer, useTransition, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { StatCard } from "@/components/common/stat-card";
import { toast } from "@/hooks/use-toast";
import { LazyMotion, domAnimation } from "framer-motion";
import { cn } from "@/lib/utils";
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


interface Member {
  mitglied_id: string;
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  rolle: 'owner' | 'admin' | 'mitarbeiter';
  status: 'eingeladen' | 'aktiv' | 'deaktiviert';
  erstellt_am: string;
}

interface Invitation {
  id: string;
  organisation_id: string;
  token: string;
  email: string;
  expires_at: string;
  status: 'offen' | 'angenommen' | 'widerrufen' | 'abgelaufen';
  rolle: 'admin' | 'mitarbeiter';
  erstellt_am: string;
}

interface OrganisationClientViewProps {
  org: {
    id: string;
    owner_id: string;
    ist_versteckt: boolean;
    einstellungen: any;
  };
  initialMembers: Member[];
  initialInvitations: Invitation[];
  currentUser: any;
  canManage?: boolean;
  rpcError?: string | null;
}

type UiState = {
  currentTab: "overview" | "members" | "policies" | "audit_log";
  searchQuery: string;
  roleFilter: string;
  statusFilter: string;
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
  | { type: 'SET_TAB'; payload: "overview" | "members" | "policies" | "audit_log" }
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'SET_ROLE_FILTER'; payload: string }
  | { type: 'SET_STATUS_FILTER'; payload: string }
  | { type: 'SET_INVITE_EMAIL'; payload: string }
  | { type: 'SET_INVITE_ROLE'; payload: "admin" | "mitarbeiter" }
  | { type: 'SET_SELECTED_MEMBER'; payload: string | null }
  | { type: 'SET_PENDING_CONFIRM'; payload: UiState['pendingConfirm'] }
  | { type: 'CLEAR_INVITE_EMAIL' }
  | { type: 'RESET_FILTERS' };

const initialUiState: UiState = {
  currentTab: "overview",
  searchQuery: "",
  roleFilter: "all",
  statusFilter: "all",
  inviteEmail: "",
  inviteRole: "mitarbeiter",
  selectedMemberId: null,
  pendingConfirm: null,
};

function uiReducer(state: UiState, action: UiAction): UiState {
  switch (action.type) {
    case 'SET_TAB':
      return { ...state, currentTab: action.payload };
    case 'SET_SEARCH_QUERY':
      return { ...state, searchQuery: action.payload };
    case 'SET_ROLE_FILTER':
      return { ...state, roleFilter: action.payload };
    case 'SET_STATUS_FILTER':
      return { ...state, statusFilter: action.payload };
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
      return { ...state, searchQuery: "", roleFilter: "all", statusFilter: "all", selectedMemberId: null };
    default:
      return state;
  }
}

function OrganisationTabToggle({
  currentTab,
  onTabChange,
  tabs
}: {
  currentTab: "overview" | "members" | "policies" | "audit_log";
  onTabChange: (tab: "overview" | "members" | "policies" | "audit_log") => void;
  tabs: any[];
}) {
  return (
    <AnimatedPillToggle
      tabs={tabs}
      activeTab={currentTab}
      onTabChange={onTabChange}
      layoutId="active-org-tab-pill"
    />
  );
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
            {pendingConfirm?.type === 'role' && "Rolle &auml;ndern"}
            {pendingConfirm?.type === 'status' && "Status &auml;ndern"}
            {pendingConfirm?.type === 'delete' && "Mitglied entfernen"}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center text-sm text-muted-foreground leading-relaxed">
            {pendingConfirm?.type === 'revoke' && (
              <>M&ouml;chten Sie die Einladung f&uuml;r <strong className="text-foreground">{pendingConfirm.memberName}</strong> wirklich widerrufen? Die Person wird die Einladung nicht mehr annehmen k&ouml;nnen.</>
            )}
            {pendingConfirm?.type === 'role' && (
              <>M&ouml;chten Sie die Rolle von <strong className="text-foreground">{pendingConfirm.memberName}</strong> wirklich auf <strong className="text-foreground">{pendingConfirm.value === 'owner' ? 'Inhaber' : pendingConfirm.value === 'admin' ? 'Administrator' : 'Mitarbeiter'}</strong> &auml;ndern?</>
            )}
            {pendingConfirm?.type === 'status' && (
              <>M&ouml;chten Sie den Status von <strong className="text-foreground">{pendingConfirm.memberName}</strong> wirklich auf <strong className="text-foreground">{pendingConfirm.value === 'aktiv' ? 'Aktiv' : 'Deaktiviert'}</strong> &auml;ndern?</>
            )}
            {pendingConfirm?.type === 'delete' && (
              <>M&ouml;chten Sie <strong className="text-foreground">{pendingConfirm.memberName}</strong> wirklich aus der Organisation entfernen? Der Zugriff auf alle Daten dieser Organisation geht sofort verloren.</>
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
            {isPending ? "Bitte warten..." : "Best&auml;tigen"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function OrganisationMembersTable({
  filteredMembers,
  hasVerwaltenPermission,
  isPending,
  currentUserId,
  selectedMemberId,
  onSelectMember,
  onRoleChange,
  onStatusChange,
  onRemove
}: {
  filteredMembers: Member[];
  hasVerwaltenPermission: boolean;
  isPending: boolean;
  currentUserId?: string;
  selectedMemberId: string | null;
  onSelectMember: (id: string | null) => void;
  onRoleChange: (memberId: string, name: string, newRole: string) => void;
  onStatusChange: (memberId: string, name: string, newStatus: string) => void;
  onRemove: (memberId: string, name: string) => void;
}) {
  return (
    <Card className="rounded-[2rem] border border-zinc-200/50 dark:border-zinc-800/50 shadow-xs overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl">Aktive &amp; Deaktivierte Mitglieder</CardTitle>
        <CardDescription>Mitglieder, die Zugriff auf diese Organisation haben. Klicken Sie auf ein Mitglied, um Berechtigungen zu bearbeiten.</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-zinc-50/50 dark:bg-zinc-900/50">
              <TableRow>
                <TableHead className="py-3 pl-6">Mitglied</TableHead>
                <TableHead className="py-3">Rolle</TableHead>
                <TableHead className="py-3">Status</TableHead>
                <TableHead className="py-3">Hinzugef&uuml;gt am</TableHead>
                {hasVerwaltenPermission && <TableHead className="py-3 pr-6 text-right">Aktionen</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMembers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={hasVerwaltenPermission ? 5 : 4} className="py-8 text-center text-muted-foreground">
                    Keine Mitglieder gefunden.
                  </TableCell>
                </TableRow>
              ) : (
                filteredMembers.map((member) => {
                  const fullName = member.first_name || member.last_name
                    ? `${member.first_name || ""} ${member.last_name || ""}`.trim()
                    : "";
                  const initials = member.first_name || member.last_name
                    ? ((member.first_name?.charAt(0) ?? "") + (member.last_name?.charAt(0) ?? "")).toUpperCase()
                    : member.email.charAt(0).toUpperCase();
                  const isCurrentUser = member.user_id === currentUserId;
                  const isOwnerRow = member.rolle === 'owner';
                  const isSelected = selectedMemberId === member.mitglied_id;

                  return (
                    <TableRow
                      key={member.mitglied_id}
                      onClick={() => onSelectMember(isSelected ? null : member.mitglied_id)}
                      className={cn(
                        "cursor-pointer transition-colors duration-150",
                        isSelected
                          ? "bg-zinc-100 dark:bg-zinc-800/80 hover:bg-zinc-200 dark:hover:bg-zinc-800"
                          : "hover:bg-zinc-50/30 dark:hover:bg-zinc-900/30"
                      )}
                    >
                      <TableCell className="py-4 pl-6 flex items-center gap-3">
                        <Avatar className="h-9 w-9 border border-zinc-200/20">
                          <AvatarFallback className="bg-primary/5 text-primary text-xs font-bold">{initials}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="font-semibold text-sm">
                            {fullName || member.email.split('@')[0]}
                            {isCurrentUser && <span className="text-[10px] ml-2 text-zinc-400 font-normal border border-zinc-200 dark:border-zinc-800 px-1.5 py-0.5 rounded-full">Du</span>}
                          </span>
                          <span className="text-xs text-muted-foreground">{member.email}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-4" onClick={(e) => e.stopPropagation()}>
                        {hasVerwaltenPermission && !isOwnerRow && !isCurrentUser ? (
                          <Select defaultValue={member.rolle} onValueChange={(val) => onRoleChange(member.mitglied_id, fullName || member.email, val)} disabled={isPending}>
                            <SelectTrigger className="w-[130px] h-8 rounded-lg text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent className="rounded-lg">
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="mitarbeiter">Mitarbeiter</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant="outline" className={cn("capitalize rounded-full font-medium text-[11px]", isOwnerRow ? "bg-indigo-50/80 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400 border-indigo-200/50" : member.rolle === 'admin' ? "bg-purple-50/80 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400 border-purple-200/50" : "bg-zinc-50/80 text-zinc-700 dark:bg-zinc-950/30 dark:text-zinc-400 border-zinc-200/50")}>
                            {isOwnerRow ? "Inhaber" : member.rolle === 'admin' ? "Admin" : "Mitarbeiter"}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="py-4" onClick={(e) => e.stopPropagation()}>
                        {hasVerwaltenPermission && !isOwnerRow && !isCurrentUser ? (
                          <Select defaultValue={member.status} onValueChange={(val) => onStatusChange(member.mitglied_id, fullName || member.email, val)} disabled={isPending}>
                            <SelectTrigger className="w-[120px] h-8 rounded-lg text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent className="rounded-lg">
                              <SelectItem value="aktiv">Aktiv</SelectItem>
                              <SelectItem value="deaktiviert">Deaktiviert</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant="outline" className={cn("rounded-full font-medium text-[11px]", member.status === 'aktiv' ? "bg-emerald-50/80 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-200/50" : "bg-rose-50/80 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 border-rose-200/50")}>
                            {member.status === 'aktiv' ? "Aktiv" : "Deaktiviert"}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="py-4 text-xs text-muted-foreground" suppressHydrationWarning>
                        {new Date(member.erstellt_am).toLocaleDateString("de-DE")}
                      </TableCell>
                      {hasVerwaltenPermission && (
                        <TableCell className="py-4 pr-6 text-right" onClick={(e) => e.stopPropagation()}>
                          {!isOwnerRow && !isCurrentUser ? (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-500 rounded-lg" onClick={() => onRemove(member.mitglied_id, fullName || member.email)} disabled={isPending} title="Mitglied entfernen">
                              <Trash2 className="size-4" />
                            </Button>
                          ) : null}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function OrganisationInvitationsTable({
  invitations,
  expiredInvitationIds,
  hasVerwaltenPermission,
  isPending,
  onRevoke
}: {
  invitations: Invitation[];
  expiredInvitationIds: Set<string>;
  hasVerwaltenPermission: boolean;
  isPending: boolean;
  onRevoke: (id: string, email: string) => void;
}) {
  return (
    <Card className="rounded-[2rem] border border-zinc-200/50 dark:border-zinc-800/50 shadow-xs overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl">Ausstehende Einladungen</CardTitle>
        <CardDescription>Eingeladene Personen, die ihre Einladung noch nicht angenommen haben.</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-zinc-50/50 dark:bg-zinc-900/50">
              <TableRow>
                <TableHead className="py-3 pl-6">E-Mail-Adresse</TableHead>
                <TableHead className="py-3">Eingeladen als</TableHead>
                <TableHead className="py-3">Eingeladen am</TableHead>
                <TableHead className="py-3">Ablaufdatum</TableHead>
                {hasVerwaltenPermission && <TableHead className="py-3 pr-6 text-right">Aktionen</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {invitations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={hasVerwaltenPermission ? 5 : 4} className="py-8 text-center text-muted-foreground">
                    Keine ausstehenden Einladungen vorhanden.
                  </TableCell>
                </TableRow>
              ) : (
                invitations.map((invite) => {
                  const isExpired = expiredInvitationIds.has(invite.id);
                  return (
                    <TableRow key={invite.id} className="hover:bg-zinc-50/30 dark:hover:bg-zinc-900/30">
                      <TableCell className="py-4 pl-6 font-medium text-sm flex items-center gap-3">
                        <Avatar className="h-9 w-9 border border-zinc-200/20">
                          <AvatarFallback className="bg-zinc-100 text-zinc-500 text-xs font-bold"><Mail className="size-4" /></AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="font-semibold text-sm">{invite.email}</span>
                          {isExpired && <span className="text-[10px] text-rose-500 font-medium">Abgelaufen</span>}
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <Badge variant="outline" className={cn("capitalize rounded-full font-medium text-[11px]", invite.rolle === 'admin' ? "bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400 border-purple-200/50" : "bg-zinc-50 text-zinc-700 dark:bg-zinc-950/30 dark:text-zinc-400 border-zinc-200/50")}>
                          {invite.rolle === 'admin' ? "Admin" : "Mitarbeiter"}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4 text-xs text-muted-foreground" suppressHydrationWarning>{new Date(invite.erstellt_am).toLocaleDateString("de-DE")}</TableCell>
                      <TableCell className="py-4 text-xs text-muted-foreground" suppressHydrationWarning>{new Date(invite.expires_at).toLocaleDateString("de-DE")}</TableCell>
                      {hasVerwaltenPermission && (
                        <TableCell className="py-4 pr-6 text-right">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-500 rounded-lg" onClick={() => onRevoke(invite.id, invite.email)} disabled={isPending} title="Einladung widerrufen">
                            <X className="size-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function OrganisationInvitePanel({
  inviteEmail,
  inviteRole,
  isInviting,
  onInviteEmailChange,
  onInviteRoleChange,
  onInvite
}: {
  inviteEmail: string;
  inviteRole: "admin" | "mitarbeiter";
  isInviting: boolean;
  onInviteEmailChange: (val: string) => void;
  onInviteRoleChange: (val: "admin" | "mitarbeiter") => void;
  onInvite: (e: React.FormEvent) => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <Card className="rounded-[2rem] border border-zinc-200/50 dark:border-zinc-800/50 shadow-xs">
        <CardHeader>
          <CardTitle className="text-xl">Mitarbeiter einladen</CardTitle>
          <CardDescription>Senden Sie eine Einladung per E-Mail, um neue Teammitglieder hinzuzuf&uuml;gen.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onInvite} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold uppercase text-muted-foreground" htmlFor="email-input">E-Mail-Adresse</label>
              <Input id="email-input" type="email" placeholder="z.B. mitarbeiter@firma.de" value={inviteEmail} onChange={(e) => onInviteEmailChange(e.target.value)} className="rounded-xl border-zinc-200/80 dark:border-zinc-800/80 h-10" required disabled={isInviting} />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold uppercase text-muted-foreground" htmlFor="role-select">Rolle</label>
              <Select value={inviteRole} onValueChange={(val) => onInviteRoleChange(val as "admin" | "mitarbeiter")} disabled={isInviting}>
                <SelectTrigger id="role-select" className="rounded-xl h-10"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="mitarbeiter">Mitarbeiter</SelectItem>
                  <SelectItem value="admin">Administrator</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full mt-2 h-10 rounded-xl bg-primary hover:bg-primary/95 text-white flex items-center justify-center gap-2 font-medium" disabled={isInviting || !inviteEmail}>
              {isInviting ? (
                <><Clock className="size-4 animate-spin" /><span>Wird eingeladen...</span></>
              ) : (
                <><PlusCircle className="size-4" /><span>Einladen</span></>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function OrganisationMembersTab({
  searchQuery,
  roleFilter,
  statusFilter,
  inviteEmail,
  inviteRole,
  filteredMembers,
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
  onRoleFilterChange,
  onStatusFilterChange,
  onInviteEmailChange,
  onInviteRoleChange,
  onInvite,
  onRevoke,
  onRoleChange,
  onStatusChange,
  onRemove
}: {
  searchQuery: string;
  roleFilter: string;
  statusFilter: string;
  inviteEmail: string;
  inviteRole: "admin" | "mitarbeiter";
  filteredMembers: Member[];
  members: Member[];
  invitations: Invitation[];
  expiredInvitationIds: Set<string>;
  hasVerwaltenPermission: boolean;
  isPending: boolean;
  isInviting: boolean;
  currentUserId?: string;
  selectedMemberId: string | null;
  onSelectMember: (id: string | null) => void;
  onSearchChange: (val: string) => void;
  onRoleFilterChange: (val: string) => void;
  onStatusFilterChange: (val: string) => void;
  onInviteEmailChange: (val: string) => void;
  onInviteRoleChange: (val: "admin" | "mitarbeiter") => void;
  onInvite: (e: React.FormEvent) => void;
  onRevoke: (id: string, email: string) => void;
  onRoleChange: (memberId: string, name: string, newRole: string) => void;
  onStatusChange: (memberId: string, name: string, newStatus: string) => void;
  onRemove: (memberId: string, name: string) => void;
}) {
  const selectedMember = members.find(m => m.mitglied_id === selectedMemberId);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center justify-between">
        <div className="flex flex-1 items-center gap-4 max-w-md">
          <SearchInput placeholder="Mitarbeiter suchen..." value={searchQuery} onChange={(e) => onSearchChange(e.target.value)} className="w-full" />
        </div>
        <div className="flex items-center gap-3">
          <Select value={roleFilter} onValueChange={(val) => onRoleFilterChange(val)}>
            <SelectTrigger className="w-[160px] rounded-xl"><SelectValue placeholder="Rolle filtern" /></SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">Alle Rollen</SelectItem>
              <SelectItem value="owner">Inhaber</SelectItem>
              <SelectItem value="admin">Administrator</SelectItem>
              <SelectItem value="mitarbeiter">Mitarbeiter</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(val) => onStatusFilterChange(val)}>
            <SelectTrigger className="w-[160px] rounded-xl"><SelectValue placeholder="Status filtern" /></SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">Alle Status</SelectItem>
              <SelectItem value="aktiv">Aktiv</SelectItem>
              <SelectItem value="deaktiviert">Deaktiviert</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6 items-start">
        {/* Left/Middle Pane: Member tables & Invites */}
        <div className={cn("flex flex-col gap-6", selectedMemberId ? "w-full md:w-1/2" : "w-full md:w-2/3")}>
          <OrganisationMembersTable
            filteredMembers={filteredMembers}
            hasVerwaltenPermission={hasVerwaltenPermission}
            isPending={isPending}
            currentUserId={currentUserId}
            selectedMemberId={selectedMemberId}
            onSelectMember={onSelectMember}
            onRoleChange={onRoleChange}
            onStatusChange={onStatusChange}
            onRemove={onRemove}
          />
          <OrganisationInvitationsTable
            invitations={invitations}
            expiredInvitationIds={expiredInvitationIds}
            hasVerwaltenPermission={hasVerwaltenPermission}
            isPending={isPending}
            onRevoke={onRevoke}
          />
          {hasVerwaltenPermission && (
            <OrganisationInvitePanel
              inviteEmail={inviteEmail}
              inviteRole={inviteRole}
              isInviting={isInviting}
              onInviteEmailChange={onInviteEmailChange}
              onInviteRoleChange={onInviteRoleChange}
              onInvite={onInvite}
            />
          )}
        </div>

        {/* Right Pane: Permission Configuration */}
        <div className={cn("w-full", selectedMemberId ? "md:w-1/2" : "md:w-1/3")}>
          {selectedMember ? (
            <MitgliedPermissionDetail
              mitgliedId={selectedMember.mitglied_id}
              rolle={selectedMember.rolle}
              status={selectedMember.status}
              memberName={
                selectedMember.first_name || selectedMember.last_name
                  ? `${selectedMember.first_name || ""} ${selectedMember.last_name || ""}`.trim()
                  : selectedMember.email
              }
            />
          ) : (
            <Card className="rounded-[2rem] border border-zinc-200/50 dark:border-zinc-800/50 shadow-xs p-6 text-center text-zinc-500">
              <p className="text-sm">Klicken Sie auf ein Mitglied in der Tabelle, um dessen detaillierte Objekt- und Modulberechtigungen anzuzeigen und zu bearbeiten.</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
// End of extracted sub-components

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
  dispatch: React.Dispatch<UiAction>;
  setMembers: React.Dispatch<React.SetStateAction<Member[]>>;
  setInvitations: React.Dispatch<React.SetStateAction<Invitation[]>>;
  startInviteTransition: (callback: () => void) => void;
  startActionTransition: (callback: () => void) => void;
  toast: typeof toast;
}) {
  const handleInvite = (e: React.FormEvent) => {
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
        setMembers(prev => prev.map(m => m.mitglied_id === memberId ? { ...m, rolle: newRole as Member['rolle'] } : m));
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
        setMembers(prev => prev.map(m => m.mitglied_id === memberId ? { ...m, status: newStatus as Member['status'] } : m));
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
  currentUser,
  canManage = false,
  rpcError = null
}: OrganisationClientViewProps) {
  const [uiState, dispatch] = useReducer(uiReducer, initialUiState);
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [invitations, setInvitations] = useState<Invitation[]>(initialInvitations);
  const expiredInvitationIds = useMemo(() => {
    const now = new Date();
    const expired = new Set<string>();
    invitations.forEach(invite => {
      if (new Date(invite.expires_at) < now) {
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

  // Filtered members list
  const filteredMembers = useMemo(() => {
    return members.filter(m => {
      const name = `${m.first_name || ""} ${m.last_name || ""}`.toLowerCase();
      const email = m.email.toLowerCase();
      const query = uiState.searchQuery.toLowerCase();

      const matchesSearch = name.includes(query) || email.includes(query);
      const matchesRole = uiState.roleFilter === "all" || m.rolle === uiState.roleFilter;
      const matchesStatus = uiState.statusFilter === "all" || m.status === uiState.statusFilter;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [members, uiState.searchQuery, uiState.roleFilter, uiState.statusFilter]);

  return (
    <LazyMotion features={domAnimation}>
      <div className="flex flex-col gap-6 sm:gap-8 p-4 sm:p-8">
      {/* Page Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Organisation</h1>
        <p className="text-muted-foreground">
          Verwalten Sie Ihre Organisation, Rollen und Berechtigungen der Mitarbeiter.
        </p>
      </div>

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

      <OrganisationTabToggle
        currentTab={uiState.currentTab}
        onTabChange={(tab) => dispatch({ type: 'SET_TAB', payload: tab })}
        tabs={orgTabs}
      />

      {uiState.currentTab === "overview" && <OrganisationOverviewTab stats={stats} />}

      {uiState.currentTab === "members" && (
        <OrganisationMembersTab
          searchQuery={uiState.searchQuery}
          roleFilter={uiState.roleFilter}
          statusFilter={uiState.statusFilter}
          inviteEmail={uiState.inviteEmail}
          inviteRole={uiState.inviteRole}
          filteredMembers={filteredMembers}
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
          onRoleFilterChange={(val) => dispatch({ type: 'SET_ROLE_FILTER', payload: val })}
          onStatusFilterChange={(val) => dispatch({ type: 'SET_STATUS_FILTER', payload: val })}
          onInviteEmailChange={(val) => dispatch({ type: 'SET_INVITE_EMAIL', payload: val })}
          onInviteRoleChange={(val) => dispatch({ type: 'SET_INVITE_ROLE', payload: val })}
          onInvite={handleInvite}
          onRevoke={handleRevoke}
          onRoleChange={handleRoleChange}
          onStatusChange={handleStatusChange}
          onRemove={handleRemove}
        />
      )}

      {uiState.currentTab === "policies" && (
        <OrganisationPoliciesTab
          hasVerwaltenPermission={hasVerwaltenPermission}
        />
      )}

      {uiState.currentTab === "audit_log" && isOwnerOrAdmin && (
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

