
"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ButtonWithTooltip } from "@/components/ui/button-with-tooltip";
import { PlusCircle, Mail, Send, Clock, Inbox, FileEdit, Star, Archive, RefreshCw } from "lucide-react";
import { StatCard } from "@/components/stat-card";
import { MailsTable } from "@/components/mails-table";
import { MailDetailPanel } from "@/components/mail-detail-panel";
import { MailBulkActionBar } from "@/components/mail-bulk-action-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { PAGINATION } from "@/constants";
import { 
  getEmailCounts, 
  updateEmailReadStatus, 
  toggleEmailFavorite, 
  moveEmailToFolder,
  deleteEmailPermanently 
} from "@/lib/email-utils";
import { useRouter } from "next/navigation";
import type { LegacyMail } from "@/types/Mail";
import { toast } from "sonner";

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
  const [activeTab, setActiveTab] = useState("inbox");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMails, setSelectedMails] = useState<Set<string>>(new Set());
  const [selectedMail, setSelectedMail] = useState<LegacyMail | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [emailCounts, setEmailCounts] = useState<Record<string, number>>({});
  const [displayedMails, setDisplayedMails] = useState<LegacyMail[]>(initialMails.slice(0, PAGINATION.DEFAULT_PAGE_SIZE));
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialMails.length > PAGINATION.DEFAULT_PAGE_SIZE);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Fetch email counts on mount
  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const counts = await getEmailCounts(userId);
        setEmailCounts(counts);
      } catch (error) {
        console.error('Error fetching email counts:', error);
      }
    };
    fetchCounts();
  }, [userId]);

  const summary = useMemo(() => {
    const total = initialMails.length;
    const sentCount = initialMails.filter(m => m.status === 'sent').length;
    const draftCount = initialMails.filter(m => m.status === 'draft').length;
    const unreadCount = initialMails.filter(m => !m.read).length;
    return { total, sentCount, draftCount, unreadCount };
  }, [initialMails]);

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
      // Refresh counts
      const counts = await getEmailCounts(userId);
      setEmailCounts(counts);
    } catch (error) {
      console.error('Error refreshing emails:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [router, userId]);

  const handleToggleRead = useCallback(async (mailId: string, isRead: boolean) => {
    try {
      await updateEmailReadStatus(mailId, isRead);
      toast.success(isRead ? 'Als gelesen markiert' : 'Als ungelesen markiert');
      router.refresh();
    } catch (error) {
      toast.error('Fehler beim Aktualisieren');
    }
  }, [router]);

  const handleToggleFavorite = useCallback(async (mailId: string, isFavorite: boolean) => {
    try {
      await toggleEmailFavorite(mailId, isFavorite);
      toast.success(isFavorite ? 'Als Favorit markiert' : 'Favorit entfernt');
      router.refresh();
    } catch (error) {
      toast.error('Fehler beim Aktualisieren');
    }
  }, [router]);

  const handleArchive = useCallback(async (mailId: string) => {
    try {
      await moveEmailToFolder(mailId, 'archive');
      toast.success('E-Mail archiviert');
      router.refresh();
    } catch (error) {
      toast.error('Fehler beim Archivieren');
    }
  }, [router]);

  const handleDeletePermanently = useCallback(async (mailId: string) => {
    try {
      // Close the detail panel if this email is currently selected
      if (selectedMail?.id === mailId) {
        setSelectedMail(null);
      }
      
      await deleteEmailPermanently(mailId, userId);
      toast.success('E-Mail endgültig gelöscht');
      router.refresh();
    } catch (error) {
      console.error('Error deleting email:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        mailId,
        userId
      });
      const errorMessage = error instanceof Error ? error.message : 'Fehler beim Löschen';
      toast.error(errorMessage);
    }
  }, [router, userId, selectedMail]);

  // Bulk action handlers
  const handleBulkExport = useCallback(() => {
    const selectedMailsData = initialMails.filter(m => selectedMails.has(m.id));
    
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
        m.recipient,
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
    
    toast.success(`${selectedMails.size} E-Mails exportiert`);
  }, [selectedMails, initialMails]);

  const handleBulkMarkAsRead = useCallback(async () => {
    try {
      const promises = Array.from(selectedMails).map(id => 
        updateEmailReadStatus(id, true)
      );
      await Promise.all(promises);
      toast.success(`${selectedMails.size} E-Mails als gelesen markiert`);
      router.refresh();
    } catch (error) {
      toast.error('Fehler beim Aktualisieren');
    }
  }, [selectedMails, router]);

  const handleBulkMarkAsUnread = useCallback(async () => {
    try {
      const promises = Array.from(selectedMails).map(id => 
        updateEmailReadStatus(id, false)
      );
      await Promise.all(promises);
      toast.success(`${selectedMails.size} E-Mails als ungelesen markiert`);
      router.refresh();
    } catch (error) {
      toast.error('Fehler beim Aktualisieren');
    }
  }, [selectedMails, router]);

  const handleBulkToggleFavorite = useCallback(async () => {
    try {
      const promises = Array.from(selectedMails).map(id => {
        const mail = initialMails.find(m => m.id === id);
        return toggleEmailFavorite(id, !mail?.favorite);
      });
      await Promise.all(promises);
      toast.success(`${selectedMails.size} E-Mails aktualisiert`);
      router.refresh();
    } catch (error) {
      toast.error('Fehler beim Aktualisieren');
    }
  }, [selectedMails, initialMails, router]);

  const handleBulkArchive = useCallback(async () => {
    try {
      const promises = Array.from(selectedMails).map(id => 
        moveEmailToFolder(id, 'archive')
      );
      await Promise.all(promises);
      toast.success(`${selectedMails.size} E-Mails archiviert`);
      setSelectedMails(new Set());
      router.refresh();
    } catch (error) {
      toast.error('Fehler beim Archivieren');
    }
  }, [selectedMails, router]);

  const handleBulkDeletePermanently = useCallback(async () => {
    try {
      const promises = Array.from(selectedMails).map(id => 
        deleteEmailPermanently(id, userId)
      );
      await Promise.all(promises);
      toast.success(`${selectedMails.size} E-Mails endgültig gelöscht`);
      setSelectedMails(new Set());
      router.refresh();
    } catch (error) {
      toast.error('Fehler beim Löschen');
    }
  }, [selectedMails, userId, router]);

  const handleBulkMoveToFolder = useCallback(async (folder: string) => {
    try {
      const promises = Array.from(selectedMails).map(id => 
        moveEmailToFolder(id, folder)
      );
      await Promise.all(promises);
      toast.success(`${selectedMails.size} E-Mails verschoben`);
      setSelectedMails(new Set());
      router.refresh();
    } catch (error) {
      toast.error('Fehler beim Verschieben');
    }
  }, [selectedMails, router]);

  // Filter all mails based on tab and search
  const allFilteredMails = useMemo(() => {
    const mailsByTab = initialMails.filter(mail => {
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
      mail.recipient.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [initialMails, activeTab, searchQuery]);

  // Update displayed mails when filters change
  useEffect(() => {
    setDisplayedMails(allFilteredMails.slice(0, PAGINATION.DEFAULT_PAGE_SIZE));
    setPage(1);
    setHasMore(allFilteredMails.length > PAGINATION.DEFAULT_PAGE_SIZE);
  }, [allFilteredMails]);

  // Load more mails function
  const loadMoreMails = useCallback(() => {
    if (isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    
    // Simulate async loading with setTimeout to prevent blocking
    setTimeout(() => {
      const nextPage = page + 1;
      const startIndex = 0;
      const endIndex = nextPage * PAGINATION.DEFAULT_PAGE_SIZE;
      const newDisplayedMails = allFilteredMails.slice(startIndex, endIndex);
      
      setDisplayedMails(newDisplayedMails);
      setPage(nextPage);
      setHasMore(endIndex < allFilteredMails.length);
      setIsLoadingMore(false);
    }, 100);
  }, [page, allFilteredMails, hasMore, isLoadingMore]);

  const filteredMails = displayedMails;

  console.log("activeTab", activeTab);
  console.log("filteredMails", filteredMails);

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
          icon={<Mail className="h-4 w-4 text-muted-foreground" />}
          className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-sm rounded-3xl"
        />
        <StatCard
          title="Ungelesen"
          value={summary.unreadCount}
          icon={<Inbox className="h-4 w-4 text-muted-foreground" />}
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
              <div className="relative">
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
            isLoading={isLoadingMore}
            loadMails={loadMoreMails}
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
