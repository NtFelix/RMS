'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

// Context for managing nested modal z-index
interface NestedDialogContextValue {
  level: number;
  registerModal: () => number;
  unregisterModal: (level: number) => void;
}

const NestedDialogContext = React.createContext<NestedDialogContextValue>({
  level: 0,
  registerModal: () => 0,
  unregisterModal: () => {},
});

// Provider for managing nested modal levels
export function NestedDialogProvider({ children }: { children: React.ReactNode }) {
  const [modalLevels, setModalLevels] = React.useState<Set<number>>(new Set());

  const registerModal = React.useCallback(() => {
    const newLevel = Math.max(0, ...Array.from(modalLevels)) + 1;
    setModalLevels(prev => new Set([...prev, newLevel]));
    return newLevel;
  }, [modalLevels]);

  const unregisterModal = React.useCallback((level: number) => {
    setModalLevels(prev => {
      const newSet = new Set(prev);
      newSet.delete(level);
      return newSet;
    });
  }, []);

  const currentLevel = Math.max(0, ...Array.from(modalLevels));

  return (
    <NestedDialogContext.Provider
      value={{
        level: currentLevel,
        registerModal,
        unregisterModal,
      }}
    >
      {children}
    </NestedDialogContext.Provider>
  );
}

// Hook to use nested dialog context
export function useNestedDialog() {
  return React.useContext(NestedDialogContext);
}

// Base z-index for modals
const BASE_Z_INDEX = 50;

// Calculate z-index based on nesting level
function getZIndex(level: number) {
  return BASE_Z_INDEX + level * 10;
}

// Enhanced Dialog component with nested modal support
const NestedDialog = DialogPrimitive.Root;

const NestedDialogTrigger = DialogPrimitive.Trigger;

const NestedDialogPortal = DialogPrimitive.Portal;

const NestedDialogClose = DialogPrimitive.Close;

interface NestedDialogOverlayProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay> {
  level?: number;
}

const NestedDialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  NestedDialogOverlayProps
>(({ className, level = 0, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      className
    )}
    style={{
      zIndex: getZIndex(level),
    }}
    {...props}
  />
));
NestedDialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

interface NestedDialogContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  isDirty?: boolean;
  onAttemptClose?: () => void;
  level?: number;
}

const NestedDialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  NestedDialogContentProps
>(({ className, children, isDirty = false, onAttemptClose, level, ...props }, ref) => {
  const { registerModal, unregisterModal } = useNestedDialog();
  const [modalLevel, setModalLevel] = React.useState<number>(level || 0);

  // Register this modal when it mounts
  React.useEffect(() => {
    if (level === undefined) {
      const newLevel = registerModal();
      setModalLevel(newLevel);
      return () => unregisterModal(newLevel);
    } else {
      setModalLevel(level);
    }
  }, [level, registerModal, unregisterModal]);

  // Handle escape key with dirty state check
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        
        if (isDirty && onAttemptClose) {
          onAttemptClose();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [isDirty, onAttemptClose]);

  // Handle pointer down outside with dirty state check
  const handlePointerDownOutside = React.useCallback(
    (event: Event) => {
      if (isDirty && onAttemptClose) {
        event.preventDefault();
        onAttemptClose();
      }
    },
    [isDirty, onAttemptClose]
  );

  return (
    <NestedDialogPortal>
      <NestedDialogOverlay level={modalLevel} />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          'fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg',
          className
        )}
        style={{
          zIndex: getZIndex(modalLevel) + 1,
        }}
        onPointerDownOutside={handlePointerDownOutside}
        onEscapeKeyDown={(event) => {
          event.preventDefault();
          if (isDirty && onAttemptClose) {
            onAttemptClose();
          }
        }}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </NestedDialogPortal>
  );
});
NestedDialogContent.displayName = DialogPrimitive.Content.displayName;

const NestedDialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex flex-col space-y-1.5 text-center sm:text-left',
      className
    )}
    {...props}
  />
);
NestedDialogHeader.displayName = 'NestedDialogHeader';

const NestedDialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2',
      className
    )}
    {...props}
  />
);
NestedDialogFooter.displayName = 'NestedDialogFooter';

const NestedDialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      'text-lg font-semibold leading-none tracking-tight',
      className
    )}
    {...props}
  />
));
NestedDialogTitle.displayName = DialogPrimitive.Title.displayName;

const NestedDialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
));
NestedDialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  NestedDialog,
  NestedDialogPortal,
  NestedDialogOverlay,
  NestedDialogClose,
  NestedDialogTrigger,
  NestedDialogContent,
  NestedDialogHeader,
  NestedDialogFooter,
  NestedDialogTitle,
  NestedDialogDescription,
};