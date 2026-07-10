import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { cn } from "@/lib/utils";
import { PlusCircle, Shield, Users } from "lucide-react";

const rowDelays = ["0ms", "50ms", "100ms", "150ms", "200ms"];

function MemberListRows() {
  return (
    <div className="space-y-1 p-2">
      {rowDelays.map((delay, index) => (
        <div key={delay} className="flex items-center justify-between gap-3 rounded-2xl p-3" style={{ animationDelay: delay }}>
          <div className="flex min-w-0 items-center gap-3">
            <Skeleton className="size-9 shrink-0 rounded-full" />
            <div className="space-y-1.5">
              <Skeleton className={index % 2 === 0 ? "h-3.5 w-28" : "h-3.5 w-36"} />
              <Skeleton className="h-3 w-40 max-w-[42vw]" />
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <Skeleton className="h-4 w-16 rounded-full" />
            <Skeleton className="h-4 w-12 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

function DetailCardSkeleton({
  title,
  description,
  rows = 3,
  contentClassName,
}: {
  title: string;
  description: string;
  rows?: number;
  contentClassName?: string;
}) {
  return (
    <Card className="rounded-[2rem] border border-zinc-200/50 shadow-xs dark:border-zinc-800/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription className="text-xs">{description}</CardDescription>
      </CardHeader>
      <CardContent className={cn("space-y-3 pt-0", contentClassName)}>
        {Array.from({ length: rows }).map((_, index) => (
          <Skeleton key={index} className={index === 0 ? "h-10 w-full rounded-xl" : "h-8 w-full rounded-xl"} />
        ))}
      </CardContent>
    </Card>
  );
}

export function MemberPermissionsSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Berechtigungen werden geladen">
      <DetailCardSkeleton title="Zugeordnete Richtlinien" description="Richtlinien und ihre Berechtigungen werden geladen." rows={3} />
      <DetailCardSkeleton title="House Access" description="Objektzugriffe werden geladen." rows={4} />
      <DetailCardSkeleton title="Module Permissions" description="Modulrechte werden geladen." rows={5} />
    </div>
  );
}

export function PoliciesWorkspaceSkeleton({ hasVerwaltenPermission }: { hasVerwaltenPermission: boolean }) {
  return (
    <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-3" aria-busy="true" aria-label="Richtlinien werden geladen">
      <Card className="flex h-[calc(100vh-180px)] flex-col overflow-hidden rounded-[2rem] border border-zinc-200/50 shadow-xs dark:border-zinc-800/50 md:sticky md:top-24">
        <div className="space-y-3 border-b border-zinc-200/50 p-4 dark:border-zinc-800/50">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-zinc-800 dark:text-zinc-200">Richtlinien</h3>
            {hasVerwaltenPermission && (
              <Button size="sm" className="rounded-xl bg-primary text-white flex items-center gap-1.5 h-8 text-xs font-semibold px-3">
                <PlusCircle className="size-3.5" />
                <span>Erstellen</span>
              </Button>
            )}
          </div>
          <SearchInput aria-label="Richtlinien durchsuchen" className="h-9 rounded-xl text-xs" placeholder="Suchen nach Richtlinien..." wrapperClassName="w-full" />
        </div>
        <MemberListRows />
      </Card>
      <Card className="h-[calc(100vh-180px)] md:col-span-2 md:sticky md:top-24 rounded-[2rem] border border-dashed border-zinc-200 dark:border-zinc-800 shadow-xs p-12 text-center text-zinc-500 flex flex-col items-center justify-center gap-4">
        <div className="rounded-full bg-zinc-100 p-4 text-zinc-400 dark:bg-zinc-900 dark:text-zinc-600">
          <Shield className="size-10" />
        </div>
        <div className="space-y-1">
          <h3 className="font-semibold text-lg text-zinc-800 dark:text-zinc-200">Keine Richtlinie ausgewählt</h3>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            Wählen Sie eine Richtlinie aus der Liste aus oder erstellen Sie eine neue, um Berechtigungen anzuzeigen oder Einstellungen zu verwalten.
          </p>
        </div>
      </Card>
    </div>
  );
}

export function PolicyDetailsSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Richtliniendetails werden geladen">
      <div className="flex flex-col gap-4 pb-6 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex flex-col gap-0.5 min-w-0">
            <Skeleton className="h-8 w-52" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
      </div>
      <DetailCardSkeleton title="Name der Richtlinie" description="Der Richtlinienname wird geladen." rows={1} />
      <DetailCardSkeleton title="Objekt-Scope (Häuser-Zugriff)" description="Objektzugriffe werden geladen." rows={4} />
      <DetailCardSkeleton title="Modul- und Aktionsrechte" description="Modul- und Aktionsrechte werden geladen." contentClassName="p-0 sm:px-6 sm:pb-6" rows={5} />
    </div>
  );
}

export function AuditLogDetailSkeleton() {
  return (
    <div className="space-y-8 sm:space-y-10" aria-busy="true" aria-label="Audit-Log-Details werden geladen">
      <div className="space-y-5 border-t border-border/40 pt-4">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/50">Ereignis</p>
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="grid gap-2 sm:grid-cols-[140px_1fr] sm:items-center sm:gap-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className={index === 1 ? "h-6 w-20 rounded-full" : "h-4 w-44"} />
          </div>
        ))}
      </div>
      <div className="space-y-5 border-t border-border/40 pt-4">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/50">Änderungen</p>
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="grid gap-2 sm:grid-cols-[140px_1fr] sm:items-center sm:gap-4">
            <Skeleton className="h-4 w-28" />
            <div className="flex items-center gap-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-3 w-3" /><Skeleton className="h-4 w-32" /></div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function OrganisationMembersPageSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-4 sm:gap-8 sm:p-8" aria-busy="true" aria-label="Organisation wird geladen">
      <div className="flex w-full gap-1 rounded-full border border-zinc-200/30 bg-zinc-100/80 p-1 text-xs font-medium dark:border-zinc-800/30 dark:bg-zinc-900/80 sm:w-[360px]">
        <span className="flex-1 rounded-full px-3 py-2 text-center">Übersicht</span>
        <span className="flex-1 rounded-full bg-background px-3 py-2 text-center shadow-xs">Mitarbeiter</span>
        <span className="flex-1 rounded-full px-3 py-2 text-center">Richtlinien</span>
      </div>
      <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-3">
        <Card className="flex h-[calc(100vh-180px)] flex-col overflow-hidden rounded-[2rem] border border-zinc-200/50 shadow-xs dark:border-zinc-800/50 md:sticky md:top-24">
          <div className="flex flex-col gap-3 border-b border-zinc-200/50 p-4 dark:border-zinc-800/50">
            <h3 className="text-lg font-bold text-zinc-800 dark:text-zinc-200">Mitarbeiter</h3>
            <div className="flex items-center gap-2">
              <SearchInput aria-label="Mitarbeiter durchsuchen" className="h-9 rounded-xl text-xs" placeholder="Suchen nach Name oder E-Mail..." wrapperClassName="w-full" />
            </div>
          </div>
          <MemberListRows />
        </Card>
        <div className="h-[calc(100vh-180px)] overflow-hidden pr-1 md:col-span-2">
          <Card className="flex h-full flex-col items-center justify-center gap-4 rounded-[2rem] border border-dashed border-zinc-200 p-12 text-center text-zinc-500 shadow-xs dark:border-zinc-800">
            <div className="rounded-full bg-zinc-100 p-4 text-zinc-400 dark:bg-zinc-900 dark:text-zinc-600"><Users className="size-10" /></div>
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">Kein Mitglied ausgewählt</h3>
              <p className="mx-auto max-w-xs text-sm text-muted-foreground">Wählen Sie ein Mitglied aus der Liste aus, um Berechtigungen anzuzeigen.</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
