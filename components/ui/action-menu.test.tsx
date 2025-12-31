import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ActionMenu, ActionMenuItem } from './action-menu';
import { Edit, Trash2, Eye } from 'lucide-react';

describe('ActionMenu', () => {
    const mockOnEdit = jest.fn();
    const mockOnDelete = jest.fn();
    const mockOnView = jest.fn();

    const defaultActions: ActionMenuItem[] = [
        { icon: Edit, label: 'Bearbeiten', onClick: mockOnEdit, variant: 'primary' },
        { icon: Trash2, label: 'Löschen', onClick: mockOnDelete, variant: 'destructive' },
    ];

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('basic rendering', () => {
        it('renders nothing when actions array is empty', () => {
            const { container } = render(<ActionMenu actions={[]} />);
            expect(container.firstChild).toBeNull();
        });

        it('renders nothing when actions is undefined', () => {
            const { container } = render(<ActionMenu actions={undefined as any} />);
            expect(container.firstChild).toBeNull();
        });

        it('renders action buttons with correct aria-labels', () => {
            render(<ActionMenu actions={defaultActions} />);

            expect(screen.getByLabelText('Bearbeiten')).toBeInTheDocument();
            expect(screen.getByLabelText('Löschen')).toBeInTheDocument();
        });

        it('renders with correct aria-label for the group', () => {
            render(<ActionMenu actions={defaultActions} ariaLabel="Test Actions" />);

            expect(screen.getByRole('group', { name: 'Test Actions' })).toBeInTheDocument();
        });
    });

    describe('shape variants', () => {
        it('renders with rounded-full for pill shape', () => {
            render(<ActionMenu actions={defaultActions} shape="pill" />);

            const container = screen.getByRole('group');
            expect(container).toHaveClass('rounded-full');
        });

        it('renders with rounded-lg for rounded shape (default)', () => {
            render(<ActionMenu actions={defaultActions} shape="rounded" />);

            const container = screen.getByRole('group');
            expect(container).toHaveClass('rounded-lg');
        });
    });

    describe('visibility modes', () => {
        it('applies hover visibility styles by default', () => {
            render(<ActionMenu actions={defaultActions} />);

            const container = screen.getByRole('group');
            expect(container).toHaveClass('sm:opacity-0', 'sm:group-hover:opacity-100');
        });

        it('applies selected visibility styles when specified', () => {
            render(<ActionMenu actions={defaultActions} visibility="selected" />);

            const container = screen.getByRole('group');
            expect(container).toHaveClass('group-data-[selected=true]:opacity-100');
        });

        it('applies always visibility styles when specified', () => {
            render(<ActionMenu actions={defaultActions} visibility="always" />);

            const container = screen.getByRole('group');
            expect(container).toHaveClass('opacity-100');
        });
    });

    describe('action interactions', () => {
        it('calls onClick handler when action button is clicked', () => {
            render(<ActionMenu actions={defaultActions} />);

            fireEvent.click(screen.getByLabelText('Bearbeiten'));
            expect(mockOnEdit).toHaveBeenCalledTimes(1);

            fireEvent.click(screen.getByLabelText('Löschen'));
            expect(mockOnDelete).toHaveBeenCalledTimes(1);
        });

        it('stops event propagation by default', () => {
            const handleContainerClick = jest.fn();
            render(
                <div onClick={handleContainerClick}>
                    <ActionMenu actions={defaultActions} />
                </div>
            );

            fireEvent.click(screen.getByLabelText('Bearbeiten'));
            expect(handleContainerClick).not.toHaveBeenCalled();
        });

        it('does not stop propagation when stopPropagation is false', () => {
            const handleContainerClick = jest.fn();
            render(
                <div onClick={handleContainerClick}>
                    <ActionMenu actions={defaultActions} stopPropagation={false} />
                </div>
            );

            fireEvent.click(screen.getByLabelText('Bearbeiten'));
            expect(handleContainerClick).toHaveBeenCalled();
        });
    });

    describe('maxActions', () => {
        const manyActions: ActionMenuItem[] = [
            { icon: Edit, label: 'Action 1', onClick: mockOnEdit },
            { icon: Trash2, label: 'Action 2', onClick: mockOnDelete },
            { icon: Eye, label: 'Action 3', onClick: mockOnView },
            { icon: Edit, label: 'Action 4', onClick: jest.fn() },
        ];

        it('limits displayed actions to maxActions (default 3)', () => {
            render(<ActionMenu actions={manyActions} />);

            expect(screen.getByLabelText('Action 1')).toBeInTheDocument();
            expect(screen.getByLabelText('Action 2')).toBeInTheDocument();
            expect(screen.getByLabelText('Action 3')).toBeInTheDocument();
            expect(screen.queryByLabelText('Action 4')).not.toBeInTheDocument();
        });

        it('respects custom maxActions value', () => {
            render(<ActionMenu actions={manyActions} maxActions={2} />);

            expect(screen.getByLabelText('Action 1')).toBeInTheDocument();
            expect(screen.getByLabelText('Action 2')).toBeInTheDocument();
            expect(screen.queryByLabelText('Action 3')).not.toBeInTheDocument();
        });
    });

    describe('enter hint', () => {
        it('does not show enter hint by default', () => {
            render(<ActionMenu actions={defaultActions} />);

            expect(screen.queryByLabelText('Press Enter to select')).not.toBeInTheDocument();
        });

        it('shows enter hint when showEnterHint is true', () => {
            render(<ActionMenu actions={defaultActions} showEnterHint />);

            expect(screen.getByLabelText('Press Enter to select')).toBeInTheDocument();
        });
    });

    describe('custom className', () => {
        it('applies custom className to container', () => {
            render(<ActionMenu actions={defaultActions} className="custom-class absolute top-0" />);

            const container = screen.getByRole('group');
            expect(container).toHaveClass('custom-class', 'absolute', 'top-0');
        });
    });
});
