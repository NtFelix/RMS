
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
import { CustomCombobox } from "@/components/ui/custom-combobox";

interface Mail {
  id: string;
  date: string;
  subject: string;
  recipient: string;
  status: 'sent' | 'draft';
  type: 'inbox' | 'outbox';
  hasAttachment: boolean;
  source: 'Mietfluss' | 'Outlook' | 'Gmail' | 'SMTP';
  read: boolean;
  favorite: boolean;
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
  const [filters, setFilters] = useState({
    status: "all",
    searchQuery: "",
    type: "all",
    attachment: "all",
    source: "all",
    read_favorite: "all",
  });
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

  const handleFilterChange = (key: keyof typeof filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const filteredMails = useMemo(() => {
    return initialMails.filter(mail => {
      if (filters.status !== "all" && mail.status !== filters.status) return false;
      if (filters.type !== "all" && mail.type !== filters.type) return false;
      if (filters.attachment === "with" && !mail.hasAttachment) return false;
      if (filters.attachment === "without" && mail.hasAttachment) return false;
      if (filters.source !== "all" && mail.source !== filters.source) return false;
      if (filters.read_favorite === "read" && !mail.read) return false;
      if (filters.read_favorite === "unread" && mail.read) return false;
      if (filters.read_favorite === "favorite" && !mail.favorite) return false;
      if (filters.searchQuery && !mail.subject.toLowerCase().includes(filters.searchQuery.toLowerCase()) && !mail.recipient.toLowerCase().includes(filters.searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [initialMails, filters]);

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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 w-full">
              <CustomCombobox
                options={[{ value: "all", label: "Alle Typen" }, { value: "inbox", label: "Posteingang" }, { value: "outbox", label: "Postausgang" }]}
                value={filters.type}
                onChange={(value) => handleFilterChange('type', value ?? 'all')}
                placeholder="Typ auswählen"
                searchPlaceholder="Typ suchen..."
                emptyText="Kein Typ gefunden"
                width="w-full"
              />
              <CustomCombobox
                options={[{ value: "all", label: "Alle Anhänge" }, { value: "with", label: "Mit Anhang" }, { value: "without", label: "Ohne Anhang" }]}
                value={filters.attachment}
                onChange={(value) => handleFilterChange('attachment', value ?? 'all')}
                placeholder="Anhang auswählen"
                searchPlaceholder="Anhang suchen..."
                emptyText="Kein Anhang gefunden"
                width="w-full"
              />
              <CustomCombobox
                options={[{ value: "all", label: "Alle Quellen" }, { value: "Mietfluss", label: "Mietfluss" }, { value: "Outlook", label: "Outlook (coming soon)" }, { value: "Gmail", label: "Gmail (coming soon)" }, { value: "SMTP", label: "SMTP (coming soon)" }]}
                value={filters.source}
                onChange={(value) => handleFilterChange('source', value ?? 'all')}
                placeholder="Quelle auswählen"
                searchPlaceholder="Quelle suchen..."
                emptyText="Keine Quelle gefunden"
                width="w-full"
              />
              <CustomCombobox
                options={[{ value: "all", label: "Alle" }, { value: "read", label: "Gelesen" }, { value: "unread", label: "Ungelesen" }, { value: "favorite", label: "Favorit" }]}
                value={filters.read_favorite}
                onChange={(value) => handleFilterChange('read_favorite', value ?? 'all')}
                placeholder="Status auswählen"
                searchPlaceholder="Status suchen..."
                emptyText="Kein Status gefunden"
                width="w-full"
              />
              <div className="relative col-span-1 sm:col-span-2 md:col-span-3 lg:col-span-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="E-Mails suchen..."
                  className="pl-10 rounded-full"
                  onChange={(e) => handleFilterChange('searchQuery', e.target.value)}
                />
              </div>
            </div>
          </div>
          <MailsTable
            mails={filteredMails}
            filter={filters.status}
            searchQuery={filters.searchQuery}
            selectedMails={selectedMails}
            onSelectionChange={setSelectedMails}
          />
        </CardContent>
      </Card>
    </div>
  );
}
