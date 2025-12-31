'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ArrowRight, LucideIcon } from 'lucide-react';

/** Icon type that accepts both LucideIcon and generic React components with className */
export type ActionMenuIcon = LucideIcon | React.ComponentType<{ className?: string }>;

export interface ActionMenuItem {
    /** Optional unique identifier for the action */
    id?: string;
    /** The icon component to display (LucideIcon or any component accepting className) */
    icon: ActionMenuIcon;
    /** Accessible label for the action (shown as tooltip) */
    label: string;
    /** Click handler for the action */
    onClick: () => void;
    /** Visual variant affecting hover colors */
    variant?: 'default' | 'primary' | 'destructive';
    /** Optional custom data attributes (e.g., for accessibility or testing) */
    dataAttributes?: Record<string, string>;
}

export interface ActionMenuProps {
    /** Array of action items to display */
    actions: ActionMenuItem[];
    /** Maximum number of actions to show (default: 3) */
    maxActions?: number;
    /** Shape of the container and buttons: 'rounded' for rounded-lg, 'pill' for rounded-full */
    shape?: 'rounded' | 'pill';
    /** How the menu becomes visible */
    visibility?: 'hover' | 'selected' | 'always';
    /** Show the "Enter" navigation hint arrow (useful for keyboard navigation) */
    showEnterHint?: boolean;
    /** Additional class names for the container */
    className?: string;
    /** Aria label for the action group */
    ariaLabel?: string;
    /** Stop event propagation on click (for nested clickable elements) */
    stopPropagation?: boolean;
    /** Callback for the enter hint action (main selection) */
    onSelect?: () => void;
}

const variantStyles: Record<NonNullable<ActionMenuItem['variant']>, string> = {
    default: 'hover:bg-muted text-muted-foreground hover:text-foreground',
    primary: 'hover:bg-primary/10 hover:text-primary',
    destructive: 'hover:bg-destructive/10 hover:text-destructive',
};

const visibilityStyles: Record<NonNullable<ActionMenuProps['visibility']>, string> = {
    hover: 'opacity-100 sm:opacity-0 sm:group-hover:opacity-100',
    selected: 'opacity-0 group-data-[selected=true]:opacity-100 group-focus-within:opacity-100',
    always: 'opacity-100',
};

/**
 * A unified action menu component for displaying contextual actions.
 * Can be used in cards, list items, and search results with consistent styling.
 * 
 * @example
 * // Template card with pill shape and hover visibility
 * <ActionMenu
 *   actions={[
 *     { icon: Edit, label: 'Edit', onClick: handleEdit, variant: 'primary' },
 *     { icon: Trash2, label: 'Delete', onClick: handleDelete, variant: 'destructive' },
 *   ]}
 *   shape="pill"
 *   visibility="hover"
 * />
 * 
 * @example
 * // Search result with rounded shape and selected visibility
 * <ActionMenu
 *   actions={actions}
 *   shape="rounded"
 *   visibility="selected"
 *   showEnterHint
 *   onSelect={handleSelect}
 * />
 */
export function ActionMenu({
    actions,
    maxActions = 3,
    shape = 'rounded',
    visibility = 'hover',
    showEnterHint = false,
    className,
    ariaLabel = 'Actions',
    stopPropagation = true,
    onSelect,
}: ActionMenuProps) {
    if (!actions || actions.length === 0) return null;

    const displayedActions = actions.slice(0, maxActions);
    const isRoundedPill = shape === 'pill';

    const handleContainerClick = (e: React.MouseEvent) => {
        if (stopPropagation) {
            e.stopPropagation();
        }
    };

    return (
        <div
            className={cn(
                'flex items-center gap-1 bg-background/80 backdrop-blur-sm p-1 shadow-sm border transition-all duration-200',
                isRoundedPill ? 'rounded-full' : 'rounded-lg',
                visibilityStyles[visibility],
                className
            )}
            role="group"
            aria-label={ariaLabel}
            onClick={handleContainerClick}
        >
            {displayedActions.map((action, index) => {
                const Icon = action.icon;
                const variant = action.variant || 'default';

                const handleClick = (e: React.MouseEvent) => {
                    if (stopPropagation) {
                        e.stopPropagation();
                    }
                    action.onClick();
                };

                return (
                    <Button
                        key={action.id ?? `${action.label}-${index}`}
                        variant="ghost"
                        size="icon"
                        onClick={handleClick}
                        className={cn(
                            'h-7 w-7 transition-colors',
                            isRoundedPill ? 'rounded-full' : 'rounded-md',
                            variantStyles[variant]
                        )}
                        aria-label={action.label}
                        title={action.label}
                        {...action.dataAttributes}
                    >
                        <Icon className="!h-3.5 !w-3.5" aria-hidden="true" />
                    </Button>
                );
            })}

            {showEnterHint && (
                <>
                    <div className="w-px h-4 bg-border mx-1" aria-hidden="true" />
                    {onSelect ? (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                                if (stopPropagation) e.stopPropagation();
                                onSelect();
                            }}
                            className={cn(
                                'h-7 w-7 text-muted-foreground hover:text-foreground transition-colors',
                                isRoundedPill ? 'rounded-full' : 'rounded-md'
                            )}
                            aria-label="Auswählen"
                            title="Auswählen"
                        >
                            <ArrowRight className="!h-3.5 !w-3.5" aria-hidden="true" />
                        </Button>
                    ) : (
                        <div
                            className="flex items-center justify-center h-7 w-7 text-muted-foreground"
                            aria-label="Press Enter to select"
                        >
                            <ArrowRight className="!h-3.5 !w-3.5" aria-hidden="true" />
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

ActionMenu.displayName = 'ActionMenu';
