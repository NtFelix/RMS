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
import { useState, ReactNode } from "react"
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

interface MailActionHandlers {
  onToggleRead?: (mailId: string, isRead: boolean) => void;
  onToggleFavorite?: (mailId: string, isFavorite: boolean) => void;
  onArchive?: (mailId: string) => void;
  onDeletePermanently?: (mailId: string) => void;
}

interface MailActionsProps extends MailActionHandlers {
  mail: Mail;
}

/**
 * Shared delete confirmation dialog component
 */
interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

function DeleteConfirmDialog({ open, onOpenChange, onConfirm }: DeleteConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
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
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
          >
            Löschen
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/**
 * Shared hook for mail action state and handlers
 */
function useMailActions(mail: Mail, handlers: MailActionHandlers) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleToggleRead = () => {
    handlers.onToggleRead?.(mail.id, !mail.read);
  };

  const handleToggleFavorite = () => {
    handlers.onToggleFavorite?.(mail.id, !mail.favorite);
  };

  const handleArchive = () => {
    handlers.onArchive?.(mail.id);
  };

  const handleDeleteClick = () => {
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = () => {
    setShowDeleteDialog(false);
    handlers.onDeletePermanently?.(mail.id);
  };

  return {
    showDeleteDialog,
    setShowDeleteDialog,
    handleToggleRead,
    handleToggleFavorite,
    handleArchive,
    handleDeleteClick,
    handleDeleteConfirm,
  };
}

/**
 * Shared action item content for read/unread toggle
 */
function ReadActionContent({ isRead }: { isRead: boolean }) {
  return isRead ? (
    <>
      <Mail className="mr-2 h-4 w-4" />
      Als ungelesen markieren
    </>
  ) : (
    <>
      <MailOpen className="mr-2 h-4 w-4" />
      Als gelesen markieren
    </>
  );
}

/**
 * Shared action item content for favorite toggle
 */
function FavoriteActionContent({ isFavorite }: { isFavorite: boolean }) {
  return (
    <>
      <Star className={`mr-2 h-4 w-4 ${isFavorite ? 'fill-yellow-400 text-yellow-400' : ''}`} />
      {isFavorite ? 'Favorit entfernen' : 'Als Favorit markieren'}
    </>
  );
}

interface MailContextMenuProps extends MailActionsProps {
  children: ReactNode;
}

export function MailContextMenu({
  mail,
  children,
  onToggleRead,
  onToggleFavorite,
  onArchive,
  onDeletePermanently,
}: MailContextMenuProps) {
  const actions = useMailActions(mail, {
    onToggleRead,
    onToggleFavorite,
    onArchive,
    onDeletePermanently,
  });

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          {children}
        </ContextMenuTrigger>
        <ContextMenuContent className="w-56">
          <ContextMenuItem onClick={actions.handleToggleRead}>
            <ReadActionContent isRead={mail.read} />
          </ContextMenuItem>
          <ContextMenuItem onClick={actions.handleToggleFavorite}>
            <FavoriteActionContent isFavorite={mail.favorite} />
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={actions.handleArchive}>
            <Archive className="mr-2 h-4 w-4" />
            Archivieren
          </ContextMenuItem>
          <ContextMenuItem
            onClick={actions.handleDeleteClick}
            className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Löschen
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      <DeleteConfirmDialog
        open={actions.showDeleteDialog}
        onOpenChange={actions.setShowDeleteDialog}
        onConfirm={actions.handleDeleteConfirm}
      />
    </>
  );
}

export function MailActionsDropdown({
  mail,
  onToggleRead,
  onToggleFavorite,
  onArchive,
  onDeletePermanently,
}: MailActionsProps) {
  const actions = useMailActions(mail, {
    onToggleRead,
    onToggleFavorite,
    onArchive,
    onDeletePermanently,
  });

  const dropdownItemClass = "focus:bg-gray-200 focus:text-foreground hover:bg-gray-100 hover:scale-[1.02] dark:context-menu-item";

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
          <DropdownMenuItem onClick={actions.handleToggleRead} className={dropdownItemClass}>
            <ReadActionContent isRead={mail.read} />
          </DropdownMenuItem>
          <DropdownMenuItem onClick={actions.handleToggleFavorite} className={dropdownItemClass}>
            <FavoriteActionContent isFavorite={mail.favorite} />
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={actions.handleArchive} className={dropdownItemClass}>
            <Archive className="mr-2 h-4 w-4" />
            Archivieren
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={actions.handleDeleteClick}
            className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950 hover:bg-red-50 hover:scale-[1.02]"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Löschen
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DeleteConfirmDialog
        open={actions.showDeleteDialog}
        onOpenChange={actions.setShowDeleteDialog}
        onConfirm={actions.handleDeleteConfirm}
      />
    </>
  );
}
