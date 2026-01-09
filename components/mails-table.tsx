"use client"

import React, { useState, useMemo, useRef, useCallback } from "react"
import { CheckedState } from "@radix-ui/react-checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ChevronsUpDown, ArrowUp, ArrowDown, Mail, User, Calendar, FileText, Paperclip, Star, Eye, EyeOff, FileEdit, Send, Archive, MailOpen, Loader2, CheckCircle2, Inbox, Trash2 } from "lucide-react"
import { MailContextMenu } from "@/components/mail-context-menu"
import { ActionMenu } from "@/components/ui/action-menu"

interface Mail {
  id: string;
  date: string;
  subject: string;
  sender: string;
  status: 'sent' | 'draft' | 'archiv';
  type: 'inbox' | 'outbox';
  hasAttachment: boolean;
  source: 'Mietevo' | 'Outlook' | 'Gmail' | 'SMTP';
  read: boolean;
  favorite: boolean;
}

type MailSortKey = "date" | "subject" | "sender" | "status" | "type" | "source" | ""
type SortDirection = "asc" | "desc"

interface MailsTableProps {
  mails: Mail[];
  selectedMails?: Set<string>;
  onSelectionChange?: (selected: Set<string>) => void;
  onMailClick?: (mail: Mail) => void;
  onToggleRead?: (mailId: string, isRead: boolean) => void;
  onToggleFavorite?: (mailId: string, isFavorite: boolean) => void;
  onArchive?: (mailId: string) => void;
  onDeletePermanently?: (mailId: string) => void;
  hasMore?: boolean;
  isLoading?: boolean;
  loadMails?: () => void;
  sortKey?: string;
  sortDirection?: 'asc' | 'desc';
  onSortChange?: (key: string, direction: 'asc' | 'desc') => void;
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day}.${month}.${year} ${hours}:${minutes}`;
};

// Helper function to get initials from sender email/name
const getInitials = (sender: string) => {
  // If it's an email, try to extract name before @ or use first letter
  const parts = sender.split('@')[0].split('.');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  // Otherwise use first two characters
  return sender.substring(0, 2).toUpperCase();
};

export function MailsTable({
  mails,
  selectedMails: externalSelectedMails,
  onSelectionChange,
  onMailClick,
  onToggleRead,
  onToggleFavorite,
  onArchive,
  onDeletePermanently,
  hasMore = false,
  isLoading = false,
  loadMails,
  sortKey: externalSortKey = "date",
  sortDirection: externalSortDirection = "desc",
  onSortChange
}: MailsTableProps) {
  const [internalSelectedMails, setInternalSelectedMails] = useState<Set<string>>(new Set())

  // Infinite scroll observer
  const observer = useRef<IntersectionObserver | null>(null)
  const lastMailElementRef = useCallback((node: HTMLTableRowElement) => {
    if (isLoading) return
    if (observer.current) observer.current.disconnect()

    observer.current = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && loadMails) {
          loadMails()
        }
      },
      {
        root: null,
        rootMargin: '200px',
        threshold: 0.1
      }
    )

    if (node) observer.current.observe(node)
  }, [isLoading, hasMore, loadMails])

  // Context menu refs for programmatic triggering
  const contextMenuRefs = useRef<Map<string, HTMLTableRowElement>>(new Map())

  const selectedMails = externalSelectedMails ?? internalSelectedMails
  const setSelectedMails = onSelectionChange ?? setInternalSelectedMails

  // No client-side sorting - data comes pre-sorted from server
  const sortedMails = mails;

  const visibleMailIds = useMemo(() => sortedMails.map((mail) => mail.id), [sortedMails])
  const allSelected = visibleMailIds.length > 0 && visibleMailIds.every((id) => selectedMails.has(id))
  const partiallySelected = visibleMailIds.some((id) => selectedMails.has(id)) && !allSelected

  const handleSelectAll = (checked: CheckedState) => {
    const isChecked = checked === true
    const next = new Set(selectedMails)
    if (isChecked) {
      visibleMailIds.forEach((id) => next.add(id))
    } else {
      visibleMailIds.forEach((id) => next.delete(id))
    }
    setSelectedMails(next)
  }

  const handleSelectMail = (mailId: string, checked: CheckedState) => {
    const isChecked = checked === true
    const next = new Set(selectedMails)
    if (isChecked) {
      next.add(mailId)
    } else {
      next.delete(mailId)
    }
    setSelectedMails(next)
  }

  const handleSort = (key: MailSortKey) => {
    if (!onSortChange) return;

    if (externalSortKey === key) {
      onSortChange(key, externalSortDirection === "asc" ? "desc" : "asc");
    } else {
      onSortChange(key, "asc");
    }
  }

  const renderSortIcon = (key: MailSortKey) => {
    if (externalSortKey !== key) {
      return <ChevronsUpDown className="h-4 w-4 text-muted-foreground dark:text-[#BFC8D9]" />
    }
    return externalSortDirection === "asc" ? (
      <ArrowUp className="h-4 w-4 dark:text-[#f3f4f6]" />
    ) : (
      <ArrowDown className="h-4 w-4 dark:text-[#f3f4f6]" />
    )
  }

  const TableHeaderCell = ({ sortKey, children, className = '', icon: Icon, sortable = true }: { sortKey: MailSortKey, children: React.ReactNode, className?: string, icon: React.ElementType, sortable?: boolean }) => (
    <TableHead className={`${className} dark:text-[#f3f4f6] group/header`}>
      <div
        onClick={() => sortable && handleSort(sortKey)}
        className={`flex items-center gap-2 p-2 -ml-2 dark:text-[#f3f4f6] ${sortable ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors' : ''}`}
      >
        <Icon className="h-4 w-4 text-muted-foreground dark:text-[#BFC8D9]" />
        {children}
        {sortable && renderSortIcon(sortKey)}
      </div>
    </TableHead>
  )

  const getStatusIcon = (mail: Mail) => {
    if (mail.type === 'inbox') {
      return !mail.read ? (
        <div className="p-1.5 rounded-full bg-blue-100 dark:bg-blue-900/30">
          <MailOpen className="h-4 w-4 stroke-[2] text-blue-600 dark:text-blue-400" />
        </div>
      ) : (
        <div className="p-1.5 rounded-full bg-gray-100 dark:bg-gray-800">
          <Mail className="h-4 w-4 text-gray-500 dark:text-gray-400" />
        </div>
      );
    }

    if (mail.status === 'draft') {
      return (
        <div className="p-1.5 rounded-full bg-yellow-100 dark:bg-yellow-900/30">
          <FileEdit className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
        </div>
      );
    }
    if (mail.status === 'sent') {
      return (
        <div className="p-1.5 rounded-full bg-green-100 dark:bg-green-900/30">
          <Send className="h-4 w-4 text-green-600 dark:text-green-400" />
        </div>
      );
    }
    if (mail.status === 'archiv') {
      return (
        <div className="p-1.5 rounded-full bg-gray-100 dark:bg-gray-800">
          <Archive className="h-4 w-4 text-gray-600 dark:text-gray-400" />
        </div>
      );
    }

    return (
      <div className="p-1.5 rounded-full bg-gray-100 dark:bg-gray-800">
        <Mail className="h-4 w-4" />
      </div>
    );
  }

  const getSourceBadge = (source: Mail['source']) => {
    const variants = {
      'Mietevo': 'bg-primary/10 text-primary border-primary/20',
      'Outlook': 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
      'Gmail': 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
      'SMTP': 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700',
    };
    return (
      <Badge variant="outline" className={`text-xs ${variants[source]}`}>
        {source}
      </Badge>
    );
  };

  return (
    <div className="rounded-lg">
      <div className="overflow-x-auto -mx-4 sm:mx-0">
        <div className="inline-block min-w-full align-middle">
          <Table className="min-w-full">
            <TableHeader>
              <TableRow className="bg-gray-50 dark:bg-[#22272e] dark:text-[#f3f4f6] hover:bg-gray-50 dark:hover:bg-[#22272e]">
                <TableHead className="w-12 pl-0 pr-0">
                  <div className="flex items-center justify-start w-6 h-6 rounded-md">
                    <Checkbox
                      aria-label="Alle E-Mails auswählen"
                      checked={allSelected ? true : partiallySelected ? "indeterminate" : false}
                      onCheckedChange={handleSelectAll}
                      className="transition-transform duration-100 hover:scale-105"
                    />
                  </div>
                </TableHead>
                <TableHeaderCell sortKey="status" className="w-[60px] dark:text-[#f3f4f6]" icon={Mail} sortable={false}>{null}</TableHeaderCell>
                <TableHeaderCell sortKey="sender" className="min-w-[200px] dark:text-[#f3f4f6]" icon={User}>Absender</TableHeaderCell>
                <TableHeaderCell sortKey="subject" className="min-w-[250px] dark:text-[#f3f4f6]" icon={FileText}>Betreff</TableHeaderCell>
                <TableHeaderCell sortKey="date" className="w-[160px] dark:text-[#f3f4f6]" icon={Calendar}>Datum</TableHeaderCell>
                <TableHead className="w-[100px] dark:text-[#f3f4f6]">Quelle</TableHead>
                <TableHead className="w-[160px] dark:text-[#f3f4f6] text-right pr-4">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedMails.length === 0 && !isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-16">
                    <div className="flex flex-col items-center gap-4">
                      <div className="relative">
                        <Inbox className="h-12 w-12 text-muted-foreground/40" />
                        <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-muted flex items-center justify-center">
                          <Mail className="h-2.5 w-2.5 text-muted-foreground" />
                        </div>
                      </div>
                      <div className="flex flex-col items-center gap-2">
                        <h3 className="text-sm font-medium text-foreground">Keine E-Mails gefunden</h3>
                        <p className="text-xs text-muted-foreground max-w-sm text-center">
                          Es wurden noch keine E-Mails empfangen oder die aktuellen Filter ergeben keine Ergebnisse.
                        </p>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                sortedMails.map((mail, index) => {
                  const isLastRow = index === sortedMails.length - 1
                  const isSelected = selectedMails.has(mail.id)

                  return (
                    <MailContextMenu
                      key={mail.id}
                      mail={mail}
                      onToggleRead={onToggleRead}
                      onToggleFavorite={onToggleFavorite}
                      onArchive={onArchive}
                      onDeletePermanently={onDeletePermanently}
                    >
                      <TableRow
                        ref={(node) => {
                          if (node) {
                            contextMenuRefs.current.set(mail.id, node)
                          }
                          if (isLastRow && node) {
                            lastMailElementRef(node)
                          }
                        }}
                        className={`relative cursor-pointer transition-all duration-200 ease-out transform hover:scale-[1.002] active:scale-[0.998] ${!mail.read ? 'font-medium' : ''
                          } ${isSelected
                            ? 'bg-primary/10 dark:bg-primary/20'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                          }`}
                        onClick={() => onMailClick?.(mail)}
                      >
                        <TableCell
                          className="py-4"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <Checkbox
                            aria-label={`E-Mail ${mail.subject} auswählen`}
                            checked={selectedMails.has(mail.id)}
                            onCheckedChange={(checked) => handleSelectMail(mail.id, checked)}
                          />
                        </TableCell>

                        <TableCell className="py-4">
                          {getStatusIcon(mail)}
                        </TableCell>

                        <TableCell className="py-4 dark:text-[#f3f4f6]">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9 flex-shrink-0">
                              <AvatarImage src="" alt={mail.sender} />
                              <AvatarFallback className="bg-primary text-primary-foreground">
                                {getInitials(mail.sender)}
                              </AvatarFallback>
                            </Avatar>
                            <span className={`truncate max-w-[150px] ${!mail.read ? 'font-semibold' : ''}`}>
                              {mail.sender}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell className="py-4 dark:text-[#f3f4f6]">
                          <div className="flex items-center gap-2">
                            <span className={`truncate max-w-[280px] ${!mail.read ? 'font-semibold' : ''}`}>
                              {mail.subject}
                            </span>
                            {mail.hasAttachment && (
                              <Paperclip className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            )}
                            {mail.favorite && (
                              <Star className="h-4 w-4 text-yellow-400 fill-yellow-400 flex-shrink-0" />
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="py-4 dark:text-[#f3f4f6] text-sm text-muted-foreground">
                          {formatDate(mail.date)}
                        </TableCell>

                        <TableCell className="py-4">
                          {getSourceBadge(mail.source)}
                        </TableCell>

                        <TableCell
                          className="py-2 pr-4 text-right"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <ActionMenu
                            actions={[
                              {
                                id: `read-${mail.id}`,
                                icon: mail.read ? Eye : EyeOff,
                                label: mail.read ? 'Als ungelesen markieren' : 'Als gelesen markieren',
                                onClick: () => onToggleRead?.(mail.id, !mail.read),
                                variant: 'default',
                              },
                              {
                                id: `favorite-${mail.id}`,
                                icon: Star,
                                label: mail.favorite ? 'Favorit entfernen' : 'Als Favorit markieren',
                                onClick: () => onToggleFavorite?.(mail.id, !mail.favorite),
                                variant: mail.favorite ? 'primary' : 'default',
                              },
                              {
                                id: `archive-${mail.id}`,
                                icon: Archive,
                                label: 'Archivieren',
                                onClick: () => onArchive?.(mail.id),
                                variant: 'default',
                              },
                              {
                                id: `delete-${mail.id}`,
                                icon: Trash2,
                                label: 'Löschen',
                                onClick: (e) => {
                                  if (!e) return;
                                  const rowElement = contextMenuRefs.current.get(mail.id)
                                  if (rowElement) {
                                    const contextMenuEvent = new MouseEvent('contextmenu', {
                                      bubbles: true,
                                      cancelable: true,
                                      view: window,
                                      clientX: e.clientX,
                                      clientY: e.clientY,
                                    })
                                    rowElement.dispatchEvent(contextMenuEvent)
                                  }
                                },
                                variant: 'destructive',
                              }
                            ]}
                            maxActions={4}
                            shape="pill"
                            visibility="always"
                            className="inline-flex"
                          />
                        </TableCell>
                      </TableRow>
                    </MailContextMenu>
                  )
                })
              )}

              {isLoading && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="flex flex-col items-center gap-3">
                      <div className="relative">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        <div className="absolute inset-0 h-6 w-6 rounded-full border border-primary/20 animate-ping"></div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Weitere E-Mails werden geladen...
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              )}

              {!isLoading && !hasMore && sortedMails.length > 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="flex flex-col items-center gap-3">
                      <div className="relative">
                        <CheckCircle2 className="h-6 w-6 text-green-500" />
                        <div className="absolute inset-0 h-6 w-6 rounded-full bg-green-500/10 animate-pulse"></div>
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <div className="text-sm font-medium text-foreground">
                          Alle E-Mails geladen
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {sortedMails.length} E-Mails insgesamt
                        </div>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
