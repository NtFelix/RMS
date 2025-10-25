
"use client";

import { useState, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ButtonWithTooltip } from "@/components/ui/button-with-tooltip";
import { PlusCircle, Mail, Send, Clock } from "lucide-react";
import { StatCard } from "@/components/stat-card";
import { MailsTable } from "@/components/mails-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface Mail {
  id: string;
  date: string;
  subject: string;
  recipient: string;
  status: 'sent' | 'draft';
}

interface MailsClientViewProps {
  initialMails: Mail[];
}

function AddMailButton({ onAdd }: { onAdd: () => void }) {
  return (
    <ButtonWithTooltip onClick={onAdd} className="sm:w-auto">
      <PlusCircle className="mr-2 h-4 w-4" />
      Neue E-Mail
    </ButtonWithTooltip>
  );
}

export default function MailsClientView({
  initialMails,
}: MailsClientViewProps) {
  const [filter, setFilter] = useState<"sent" | "draft" | "all">("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedMails, setSelectedMails] = useState<Set<string>>(new Set());

  const summary = useMemo(() => {
    const total = initialMails.length;
    const sentCount = initialMails.filter(m => m.status === 'sent').length;
    const draftCount = total - sentCount;
    return { total, sentCount, draftCount };
  }, [initialMails]);

  const handleAddMail = useCallback(() => {
    // TODO: Implement mail creation logic
    console.log("Neue E-Mail hinzufügen");
  }, []);

  return (
    <div className="flex flex-col gap-8 p-8 bg-white dark:bg-[#181818]">
      <div className="flex flex-wrap gap-4">
        <StatCard
          title="E-Mails Gesamt"
          value={summary.total}
          icon={<Mail className="h-4 w-4 text-muted-foreground" />}
          className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-sm rounded-3xl"
        />
        <StatCard
          title="Gesendet / Entwurf"
          value={`${summary.sentCount} / ${summary.draftCount}`}
          icon={<Send className="h-4 w-4 text-muted-foreground" />}
          className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-sm rounded-3xl"
        />
      </div>
      <Card className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-sm rounded-[2rem]">
        <CardHeader>
          <div className="flex flex-row items-start justify-between">
            <div>
              <CardTitle>E-Mail-Verwaltung</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Verwalten Sie hier alle Ihre E-Mails</p>
            </div>
            <div className="mt-1">
              <AddMailButton onAdd={handleAddMail} />
            </div>
          </div>
        </CardHeader>
        <div className="px-6">
          <div className="h-px bg-gray-200 dark:bg-gray-700 w-full"></div>
        </div>
        <CardContent className="flex flex-col gap-6">
          <div className="flex flex-col gap-4 mt-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-2">
                {[
                  { value: "all" as const, label: "Alle E-Mails" },
                  { value: "sent" as const, label: "Gesendet" },
                  { value: "draft" as const, label: "Entwurf" },
                ].map(({ value, label }) => (
                  <Button
                    key={value}
                    variant={filter === value ? "default" : "ghost"}
                    onClick={() => setFilter(value)}
                    className="h-9 rounded-full"
                  >
                    {label}
                  </Button>
                ))}
              </div>
              <div className="relative w-full sm:w-auto sm:min-w-[300px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="E-Mails suchen..."
                  className="pl-10 rounded-full"
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>
          <MailsTable
            mails={initialMails}
            filter={filter}
            searchQuery={searchQuery}
            selectedMails={selectedMails}
            onSelectionChange={setSelectedMails}
          />
        </CardContent>
      </Card>
    </div>
  );
}
