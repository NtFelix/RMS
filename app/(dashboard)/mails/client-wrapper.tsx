
"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ButtonWithTooltip } from "@/components/ui/button-with-tooltip";
import { PlusCircle, Mail as MailIcon, Send, Clock, Inbox, FileEdit, Star, Archive, RefreshCw } from "lucide-react";
import { StatCard } from "@/components/common/stat-card";
import { MailsTable } from "@/components/mails-table";
import { MailDetailPanel } from "@/components/mail-detail-panel";
import { MailBulkActionBar } from "@/components/mail-bulk-action-bar";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { PAGINATION } from "@/constants";
import {
  getEmailSummary,
  updateEmailReadStatus,
  toggleEmailFavorite,
  moveEmailToFolder,
  deleteEmailPermanently,
  type EmailSummary
} from "@/lib/email-utils";
import { useRouter } from "next/navigation";
import { type LegacyMail, type Mail as DbMail, convertToLegacyMail } from "@/types/Mail";
import { useToast } from "@/hooks/use-toast";

// Re-export for backward compatibility
export type Mail = LegacyMail;

interface MailsClientViewProps {
  initialMails: LegacyMail[];
  userId: string;
}

function AddMailButton({ onAdd }: { onAdd: () => void }) {
  return (
    <ButtonWithTooltip onClick={onAdd} size="sm" className="h-9 sm:w-auto">
      <PlusCircle className="mr-2 h-4 w-4" />
      Neue E-Mail
    </ButtonWithTooltip>
  );
}

export default function MailsClientView({
  initialMails,
  userId,
}: MailsClientViewProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("inbox");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMails, setSelectedMails] = useState<Set<string>>(new Set());
  const [selectedMail, setSelectedMail] = useState<LegacyMail | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [mailData, setMailData] = useState<LegacyMail[]>(initialMails);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [sortKey, setSortKey] = useState<string>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Fetch email summary on mount using efficient RPC function
  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const summaryData = await getEmailSummary();
        setSummary(summaryData);
      } catch (error) {
        console.error('Error fetching email summary:', error);
      }
    };
    fetchSummary();
  }, []);

  // Summary state from server (more accurate than client-side calculation)
  const [summary, setSummary] = useState<EmailSummary>({
    total: 0, unread: 0, inbox: 0, sent: 0, drafts: 0, archive: 0, trash: 0, spam: 0, favorites: 0
  });

  const handleAddMail = useCallback(() => {
    // TODO: Implement mail creation logic
    console.log("Neue E-Mail hinzufügen");
  }, []);

  const handleMailClick = useCallback((mail: LegacyMail) => {
    setSelectedMail(mail);
  }, []);

  const handleClosePanel = useCallback(() => {
    setSelectedMail(null);
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      // Refresh the page to get latest data
      router.refresh();
      // Refresh summary using efficient RPC
      const summaryData = await getEmailSummary();
      setSummary(summaryData);
    } catch (error) {
      console.error('Error refreshing emails:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [router]);

  const handleToggleRead = useCallback(async (mailId: string, isRead: boolean) => {
    try {
      await updateEmailReadStatus(mailId, isRead);
      toast({ title: isRead ? 'Als gelesen markiert' : 'Als ungelesen markiert' });
      router.refresh();
    } catch (error) {
      toast({ title: 'Fehler beim Aktualisieren', variant: 'destructive' });
    }
  }, [router, toast]);

  const handleToggleFavorite = useCallback(async (mailId: string, isFavorite: boolean) => {
    try {
      await toggleEmailFavorite(mailId, isFavorite);
      toast({ title: isFavorite ? 'Als Favorit markiert' : 'Favorit entfernt' });
      router.refresh();
    } catch (error) {
      toast({ title: 'Fehler beim Aktualisieren', variant: 'destructive' });
    }
  }, [router, toast]);

  const handleArchive = useCallback(async (mailId: string) => {
    try {
      await moveEmailToFolder(mailId, 'archive');
      toast({ title: 'E-Mail archiviert' });
      router.refresh();
    } catch (error) {
      toast({ title: 'Fehler beim Archivieren', variant: 'destructive' });
    }
  }, [router, toast]);

  const handleDeletePermanently = useCallback(async (mailId: string) => {
    try {
      // Close the detail panel if this email is currently selected
      if (selectedMail?.id === mailId) {
        setSelectedMail(null);
      }

      await deleteEmailPermanently(mailId, userId);
      toast({ title: 'E-Mail endgültig gelöscht' });
      router.refresh();
    } catch (error) {
      console.error('Error deleting email:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        mailId,
        userId
      });
      const errorMessage = error instanceof Error ? error.message : 'Fehler beim Löschen';
      toast({ title: errorMessage, variant: 'destructive' });
    }
  }, [router, userId, selectedMail, toast]);

  // Bulk action handlers
  const handleBulkExport = useCallback(() => {
    const selectedMailsData = mailData.filter(m => selectedMails.has(m.id));

    const headers = ['Datum', 'Betreff', 'Empfänger', 'Status', 'Typ', 'Quelle'];
    const csvHeader = headers.join(',');

    const escapeCsvValue = (value: string) => {
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    };

    const csvRows = selectedMailsData.map(m => {
      const row = [
        m.date,
        m.subject,
        m.sender,
        m.status,
        m.type,
        m.source,
      ];
      return row.map(v => escapeCsvValue(String(v))).join(',');
    });

    const csv = [csvHeader, ...csvRows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `emails_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({ title: `${selectedMails.size} E-Mails exportiert` });
  }, [selectedMails, mailData, toast]);

  const handleBulkMarkAsRead = useCallback(async () => {
    try {
      const promises = Array.from(selectedMails).map(id =>
        updateEmailReadStatus(id, true)
      );
      await Promise.all(promises);
      toast({ title: `${selectedMails.size} E-Mails als gelesen markiert` });
      router.refresh();
    } catch (error) {
      toast({ title: 'Fehler beim Aktualisieren', variant: 'destructive' });
    }
  }, [selectedMails, router, toast]);

  const handleBulkMarkAsUnread = useCallback(async () => {
    try {
      const promises = Array.from(selectedMails).map(id =>
        updateEmailReadStatus(id, false)
      );
      await Promise.all(promises);
      toast({ title: `${selectedMails.size} E-Mails als ungelesen markiert` });
      router.refresh();
    } catch (error) {
      toast({ title: 'Fehler beim Aktualisieren', variant: 'destructive' });
    }
  }, [selectedMails, router, toast]);

  const handleBulkToggleFavorite = useCallback(async () => {
    try {
      const promises = Array.from(selectedMails).map(id => {
        const mail = mailData.find(m => m.id === id);
        return toggleEmailFavorite(id, !mail?.favorite);
      });
      await Promise.all(promises);
      toast({ title: `${selectedMails.size} E-Mails aktualisiert` });
      router.refresh();
    } catch (error) {
      toast({ title: 'Fehler beim Aktualisieren', variant: 'destructive' });
    }
  }, [selectedMails, mailData, router, toast]);

  const handleBulkArchive = useCallback(async () => {
    try {
      const promises = Array.from(selectedMails).map(id =>
        moveEmailToFolder(id, 'archive')
      );
      await Promise.all(promises);
      toast({ title: `${selectedMails.size} E-Mails archiviert` });
      setSelectedMails(new Set());
      router.refresh();
    } catch (error) {
      toast({ title: 'Fehler beim Archivieren', variant: 'destructive' });
    }
  }, [selectedMails, router, toast]);

  const handleBulkDeletePermanently = useCallback(async () => {
    try {
      const promises = Array.from(selectedMails).map(id =>
        deleteEmailPermanently(id, userId)
      );
      await Promise.all(promises);
      toast({ title: `${selectedMails.size} E-Mails endgültig gelöscht` });
      setSelectedMails(new Set());
      router.refresh();
    } catch (error) {
      toast({ title: 'Fehler beim Löschen', variant: 'destructive' });
    }
  }, [selectedMails, userId, router, toast]);

  const handleBulkMoveToFolder = useCallback(async (folder: string) => {
    try {
      const promises = Array.from(selectedMails).map(id =>
        moveEmailToFolder(id, folder)
      );
      await Promise.all(promises);
      toast({ title: `${selectedMails.size} E-Mails verschoben` });
      setSelectedMails(new Set());
      router.refresh();
    } catch (error) {
      toast({ title: 'Fehler beim Verschieben', variant: 'destructive' });
    }
  }, [selectedMails, router, toast]);

  // Filter all mails based on tab and search
  const filteredMails = useMemo(() => {
    const mailsByTab = mailData.filter(mail => {
      switch (activeTab) {
        case 'inbox':
          return mail.type === 'inbox';
        case 'drafts':
          return mail.status === 'draft';
        case 'sent':
          return mail.status === 'sent';
        case 'favorites':
          return mail.favorite;
        case 'archive':
          return mail.status === 'archiv';
        default:
          return true;
      }
    });

    if (!searchQuery) {
      return mailsByTab;
    }

    return mailsByTab.filter(mail =>
      mail.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mail.sender.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [mailData, activeTab, searchQuery]);

  // Load more mails function - matches finance page pattern
  const loadMoreMails = useCallback(async (resetData = false) => {
    if (isLoading || (!hasMore && !resetData)) return;

    setIsLoading(true);

    const targetPage = resetData ? 1 : page + 1;

    try {
      const params = new URLSearchParams({
        page: targetPage.toString(),
        pageSize: PAGINATION.DEFAULT_PAGE_SIZE.toString(),
        sortKey: sortKey,
        sortDirection: sortDirection,
      });

      const response = await fetch(`/api/mails?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch more emails');
      }

      const newMails = await response.json();
      const totalCount = parseInt(response.headers.get('X-Total-Count') || '0', 10);

      // Convert to legacy format using the centralized conversion function
      const convertedMails: LegacyMail[] = (newMails as DbMail[]).map(convertToLegacyMail);

      if (resetData) {
        // Replace all data when resetting (e.g., after sort change)
        setMailData(convertedMails);
        setPage(1);
      } else {
        // Append new mails, avoiding duplicates
        setMailData(prev => {
          const existingIds = new Set(prev.map((m: LegacyMail) => m.id));
          const uniqueNewMails = convertedMails.filter((m: LegacyMail) => !existingIds.has(m.id));
          return [...prev, ...uniqueNewMails];
        });
        setPage(targetPage);
      }

      // Check if there are more records to load
      const loadedCount = resetData ? convertedMails.length : mailData.length + convertedMails.length;
      setHasMore(loadedCount < totalCount);
    } catch (error) {
      console.error('Error loading more mails:', error);
      toast({ title: 'Fehler beim Laden weiterer E-Mails', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [page, hasMore, isLoading, mailData.length, sortKey, sortDirection, toast]);

  // Reload data when sort changes
  // Note: We intentionally exclude loadMoreMails from deps to avoid infinite loops
  // since loadMoreMails itself depends on mailData.length which it modifies
  useEffect(() => {
    loadMoreMails(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortKey, sortDirection]);



  const tabs = [
    { id: "inbox", label: "Posteingang", icon: Inbox },
    { id: "drafts", label: "Entwürfe", icon: FileEdit },
    { id: "sent", label: "Gesendet", icon: Send },
    { id: "favorites", label: "Favoriten", icon: Star },
    { id: "archive", label: "Archiv", icon: Archive },
  ];

  return (
    <div className="flex flex-col gap-8 p-8 bg-white dark:bg-[#181818]">
      <div className="flex flex-wrap gap-4">
        <StatCard
          title="E-Mails Gesamt"
          value={summary.total}
          icon={<MailIcon className="h-4 w-4 text-muted-foreground" />}
          className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-sm rounded-3xl"
        />
        <StatCard
          title="Ungelesen"
          value={summary.unread}
          icon={<Inbox className="h-4 w-4 text-muted-foreground" />}
          className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-sm rounded-3xl"
        />
        <StatCard
          title="Gesendet / Entwurf"
          value={`${summary.sent} / ${summary.drafts}`}
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
            <div className="mt-1 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="h-9"
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                Aktualisieren
              </Button>
              <AddMailButton onAdd={handleAddMail} />
            </div>
          </div>
        </CardHeader>
        <div className="px-6">
          <div className="h-px bg-gray-200 dark:bg-gray-700 w-full"></div>
        </div>
        <CardContent className="flex flex-col gap-6">
          <div className="flex flex-col gap-4 mt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {tabs.map(tab => (
                  <Button
                    key={tab.id}
                    variant={activeTab === tab.id ? "default" : "ghost"}
                    onClick={() => setActiveTab(tab.id)}
                    className="h-9 rounded-full"
                  >
                    <tab.icon className="mr-2 h-4 w-4" />
                    {tab.label}
                  </Button>
                ))}
              </div>
              <SearchInput
                mode="table"
                placeholder="E-Mails suchen..."
                className="rounded-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onClear={() => setSearchQuery("")}
              />
            </div>
          </div>
          <MailBulkActionBar
            selectedMails={selectedMails}
            mails={filteredMails}
            onClearSelection={() => setSelectedMails(new Set())}
            onExport={handleBulkExport}
            onMarkAsRead={handleBulkMarkAsRead}
            onMarkAsUnread={handleBulkMarkAsUnread}
            onToggleFavorite={handleBulkToggleFavorite}
            onArchive={handleBulkArchive}
            onDeletePermanently={handleBulkDeletePermanently}
            onMoveToFolder={handleBulkMoveToFolder}
          />
          <MailsTable
            mails={filteredMails}
            selectedMails={selectedMails}
            onSelectionChange={setSelectedMails}
            onMailClick={handleMailClick}
            onToggleRead={handleToggleRead}
            onToggleFavorite={handleToggleFavorite}
            onArchive={handleArchive}
            onDeletePermanently={handleDeletePermanently}
            hasMore={hasMore}
            isLoading={isLoading}
            loadMails={() => loadMoreMails(false)}
            sortKey={sortKey}
            sortDirection={sortDirection}
            onSortChange={(key, direction) => {
              setSortKey(key);
              setSortDirection(direction);
            }}
          />
        </CardContent>
      </Card>
      {selectedMail && (
        <MailDetailPanel
          mail={selectedMail}
          onClose={handleClosePanel}
          userId={userId}
        />
      )}
    </div>
  );
}
