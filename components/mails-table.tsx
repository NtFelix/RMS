
"use client"

import React, { useState, useMemo, useRef, useCallback } from "react"
import { CheckedState } from "@radix-ui/react-checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { ChevronsUpDown, ArrowUp, ArrowDown, Mail, User, Calendar, FileText, MoreVertical, Paperclip, Star, Eye, EyeOff, FileEdit, Send, Archive, MailOpen, Loader2 } from "lucide-react"
import { MailContextMenu } from "@/components/mail-context-menu"







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
          console.log('[MailsTable] Loading more mails...')
          loadMails()
        }
      },
      {
        root: null, // viewport
        rootMargin: '200px', // Trigger 200px before reaching the element
        threshold: 0.1 // Trigger when 10% visible
      }
    )

    if (node) {
      console.log('[MailsTable] Observing last row')
      observer.current.observe(node)
    }
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







        className={`flex items-center gap-2 p-2 -ml-2 dark:text-[#f3f4f6] ${sortable ? 'cursor-pointer' : ''}`}>







        <Icon className="h-4 w-4 text-muted-foreground dark:text-[#BFC8D9]" />







        {children}







        {sortable && renderSortIcon(sortKey)}







      </div>







    </TableHead>







  )















  const getStatusIcon = (mail: Mail) => {







    // For inbox emails, show read/unread status with mail icons







    if (mail.type === 'inbox') {







      return !mail.read ? (
        <MailOpen className="h-4 w-4 stroke-[3]" />
      ) : (
        <Mail className="h-4 w-4" />
      );







    }















    // For outbox emails, show status-specific icons







    if (mail.status === 'draft') return <FileEdit className="h-4 w-4" />;







    if (mail.status === 'sent') return <Send className="h-4 w-4" />;







    if (mail.status === 'archiv') return <Archive className="h-4 w-4" />;















    // Fallback to read/unread icons







    return !mail.read ? (
      <MailOpen className="h-4 w-4 stroke-[3]" />
    ) : (
      <Mail className="h-4 w-4" />
    );







  }















  return (







    <div className="rounded-lg">







      <div className="overflow-x-auto -mx-4 sm:mx-0">







        <div className="inline-block min-w-full align-middle">







          <Table className="min-w-full">







            <TableHeader>







              <TableRow className="bg-gray-50 dark:bg-[#22272e] dark:text-[#f3f4f6] hover:bg-gray-50 dark:hover:bg-[#22272e] transition-all duration-200 ease-out transform hover:scale-[1.002] active:scale-[0.998] [&:hover_th]:[&:first-child]:rounded-tl-lg [&:hover_th]:[&:last-child]:rounded-tr-lg">







                <TableHead className="w-12 pl-0 pr-0 -ml-2">







                  <div className="flex items-center justify-start w-6 h-6 rounded-md transition-transform duration-100">







                    <Checkbox







                      aria-label="Alle E-Mails auswählen"







                      checked={allSelected ? true : partiallySelected ? "indeterminate" : false}







                      onCheckedChange={handleSelectAll}







                      className="transition-transform duration-100 hover:scale-105"







                    />







                  </div>







                </TableHead>







                <TableHeaderCell sortKey="status" className="w-[50px] dark:text-[#f3f4f6]" icon={Mail}>{null}</TableHeaderCell>







                <TableHeaderCell sortKey="sender" className="dark:text-[#f3f4f6]" icon={User}>Absender</TableHeaderCell>







                <TableHeaderCell sortKey="subject" className="dark:text-[#f3f4f6]" icon={FileText}>Betreff</TableHeaderCell>







                <TableHeaderCell sortKey="date" className="w-[150px] dark:text-[#f3f4f6]" icon={Calendar}>Datum</TableHeaderCell>







                <TableHeaderCell sortKey="" className="dark:text-[#f3f4f6]" icon={Paperclip} sortable={false}>Anhang</TableHeaderCell>







                <TableHeaderCell sortKey="source" className="dark:text-[#f3f4f6]" icon={Mail}>Quelle</TableHeaderCell>







                <TableHeaderCell sortKey="" className="w-[80px] dark:text-[#f3f4f6] pr-2" icon={MoreVertical} sortable={false}>Aktionen</TableHeaderCell>







              </TableRow>







            </TableHeader>







            <TableBody>







              {sortedMails.length === 0 ? (







                <TableRow>







                  <TableCell colSpan={8} className="h-24 text-center">







                    Keine E-Mails gefunden.







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
                        className={`relative cursor-pointer transition-all duration-200 ease-out transform hover:scale-[1.005] active:scale-[0.998] ${!mail.read ? 'font-semibold' : ''
                          } ${isSelected
                            ? `bg-primary/10 dark:bg-primary/20 ${isLastRow ? 'rounded-b-lg' : ''}`
                            : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                          }`}
                        onClick={() => onMailClick?.(mail)}
                      >







                        <TableCell







                          className={`py-4 ${isSelected && isLastRow ? 'rounded-bl-lg' : ''}`}







                          onClick={(event) => event.stopPropagation()}







                        >







                          <Checkbox







                            aria-label={`E-Mail ${mail.subject} auswählen`}







                            checked={selectedMails.has(mail.id)}







                            onCheckedChange={(checked) => handleSelectMail(mail.id, checked)}







                          />







                        </TableCell>







                        <TableCell className={`py-4`}>{getStatusIcon(mail)}</TableCell>







                        <TableCell className={`py-4 dark:text-[#f3f4f6]`}>{mail.sender}</TableCell>







                        <TableCell className={`py-4 dark:text-[#f3f4f6]`}>{mail.subject}</TableCell>







                        <TableCell className={`font-medium py-4 dark:text-[#f3f4f6]`}>{formatDate(mail.date)}</TableCell>







                        <TableCell className={`py-4 dark:text-[#f3f4f6]`}>{mail.hasAttachment ? <Paperclip className="h-4 w-4" /> : ''}</TableCell>







                        <TableCell className={`py-4 dark:text-[#f3f4f6]`}>{mail.source}</TableCell>







                        <TableCell







                          className={`py-2 pr-2 text-right w-[80px] ${isSelected && isLastRow ? 'rounded-br-lg' : ''}`}







                          onClick={(event) => event.stopPropagation()}







                        >







                          <div className="flex items-center justify-end">
                            {mail.favorite && <Star className="h-4 w-4 text-yellow-400 mr-2" />}
                            {mail.read ? <EyeOff className="h-4 w-4 text-gray-400 mr-2" /> : <Eye className="h-4 w-4 text-blue-500 mr-2" />}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 p-0 hover:bg-gray-200 dark:hover:bg-gray-700"
                              onClick={(e) => {
                                e.stopPropagation()
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
                              }}
                            >
                              <span className="sr-only">Menü öffnen</span>
                              <MoreVertical className="h-3.5 w-3.5" />
                            </Button>







                          </div>







                        </TableCell>
                      </TableRow>
                    </MailContextMenu>
                  )







                })







              )}
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      <span className="text-sm text-muted-foreground">Weitere E-Mails werden geladen...</span>
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












