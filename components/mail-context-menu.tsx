"use client"

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import {
  Star,
  Archive,
  Trash2,
  Mail,
  MailOpen,
  MoreVertical
} from "lucide-react"
import { useState } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

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

interface MailContextMenuProps {
  mail: Mail;
  children: React.ReactNode;
  onToggleRead?: (mailId: string, isRead: boolean) => void;
  onToggleFavorite?: (mailId: string, isFavorite: boolean) => void;
  onArchive?: (mailId: string) => void;
  onDeletePermanently?: (mailId: string) => void;
}

export function MailContextMenu({
  mail,
  children,
  onToggleRead,
  onToggleFavorite,
  onArchive,
  onDeletePermanently,
}: MailContextMenuProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleDeletePermanently = () => {
    setShowDeleteDialog(false);
    onDeletePermanently?.(mail.id);
  };

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          {children}
        </ContextMenuTrigger>
        <ContextMenuContent className="w-56">
          <ContextMenuItem onClick={() => onToggleRead?.(mail.id, !mail.read)}>
            {mail.read ? (
              <>
                <Mail className="mr-2 h-4 w-4" />
                Als ungelesen markieren
              </>
            ) : (
              <>
                <MailOpen className="mr-2 h-4 w-4" />
                Als gelesen markieren
              </>
            )}
          </ContextMenuItem>
          <ContextMenuItem onClick={() => onToggleFavorite?.(mail.id, !mail.favorite)}>
            <Star className={`mr-2 h-4 w-4 ${mail.favorite ? 'fill-yellow-400 text-yellow-400' : ''}`} />
            {mail.favorite ? 'Favorit entfernen' : 'Als Favorit markieren'}
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={() => onArchive?.(mail.id)}>
            <Archive className="mr-2 h-4 w-4" />
            Archivieren
          </ContextMenuItem>
          <ContextMenuItem
            onClick={() => setShowDeleteDialog(true)}
            className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Löschen
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>E-Mail löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Diese Aktion kann nicht rückgängig gemacht werden. Die E-Mail und alle Anhänge werden permanent gelöscht.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePermanently}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

interface MailActionsDropdownProps {
  mail: Mail;
  onToggleRead?: (mailId: string, isRead: boolean) => void;
  onToggleFavorite?: (mailId: string, isFavorite: boolean) => void;
  onArchive?: (mailId: string) => void;
  onDeletePermanently?: (mailId: string) => void;
}

export function MailActionsDropdown({
  mail,
  onToggleRead,
  onToggleFavorite,
  onArchive,
  onDeletePermanently,
}: MailActionsDropdownProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleDeletePermanently = () => {
    setShowDeleteDialog(false);
    onDeletePermanently?.(mail.id);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 p-0 hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            <span className="sr-only">Menü öffnen</span>
            <MoreVertical className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem
            onClick={() => onToggleRead?.(mail.id, !mail.read)}
            className="focus:bg-gray-200 focus:text-foreground hover:bg-gray-100 hover:scale-[1.02] dark:context-menu-item"
          >
            {mail.read ? (
              <>
                <Mail className="mr-2 h-4 w-4" />
                Als ungelesen markieren
              </>
            ) : (
              <>
                <MailOpen className="mr-2 h-4 w-4" />
                Als gelesen markieren
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onToggleFavorite?.(mail.id, !mail.favorite)}
            className="focus:bg-gray-200 focus:text-foreground hover:bg-gray-100 hover:scale-[1.02] dark:context-menu-item"
          >
            <Star className={`mr-2 h-4 w-4 ${mail.favorite ? 'fill-yellow-400 text-yellow-400' : ''}`} />
            {mail.favorite ? 'Favorit entfernen' : 'Als Favorit markieren'}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => onArchive?.(mail.id)}
            className="focus:bg-gray-200 focus:text-foreground hover:bg-gray-100 hover:scale-[1.02] dark:context-menu-item"
          >
            <Archive className="mr-2 h-4 w-4" />
            Archivieren
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setShowDeleteDialog(true)}
            className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950 hover:bg-red-50 hover:scale-[1.02]"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Löschen
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>E-Mail löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Diese Aktion kann nicht rückgängig gemacht werden. Die E-Mail und alle Anhänge werden permanent gelöscht.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePermanently}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
