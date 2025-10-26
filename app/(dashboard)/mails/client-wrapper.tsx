
"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ButtonWithTooltip } from "@/components/ui/button-with-tooltip";
import { PlusCircle, Mail, Send, Clock, Inbox, FileEdit, Star, Archive, RefreshCw } from "lucide-react";
import { StatCard } from "@/components/stat-card";
import { MailsTable } from "@/components/mails-table";
import { MailDetailPanel } from "@/components/mail-detail-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
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
    <ButtonWithTooltip onClick={onAdd} className="sm:w-auto">
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

  const handleDelete = useCallback(async (mailId: string) => {
    try {
      await moveEmailToFolder(mailId, 'trash');
      toast.success('E-Mail in Papierkorb verschoben');
      router.refresh();
    } catch (error) {
      toast.error('Fehler beim Löschen');
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

  const filteredMails = useMemo(() => {
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
          <MailsTable
            mails={filteredMails}
            selectedMails={selectedMails}
            onSelectionChange={setSelectedMails}
            onMailClick={handleMailClick}
            onToggleRead={handleToggleRead}
            onToggleFavorite={handleToggleFavorite}
            onArchive={handleArchive}
            onDelete={handleDelete}
            onDeletePermanently={handleDeletePermanently}
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
