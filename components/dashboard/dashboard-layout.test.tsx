import React from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { usePathname } from 'next/navigation'
import { DashboardLayout } from './dashboard-layout'
import { PageTopBar, RailNavItem, SecondaryRail } from './shell'
import type { SidebarUserData } from '@/lib/server/user-data'

jest.mock('next/navigation', () => ({ usePathname: jest.fn() }))
jest.mock('next/dynamic', () => () => () => null)
jest.mock('@/components/dashboard/shell/primary-rail', () => ({
  PrimaryRail: () => <nav aria-label="Hauptnavigation" />,
}))
jest.mock('@/components/tasks/task-dnd-provider', () => ({
  TaskDndProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

const mockUsePathname = usePathname as jest.MockedFunction<typeof usePathname>
const sidebarData = {} as SidebarUserData

function PageWithRail() {
  return (
    <>
      <SecondaryRail>
        <RailNavItem label="Alle Häuser" />
      </SecondaryRail>
      <PageTopBar breadcrumbs={[{ label: 'Objekte' }, { label: 'Häuser' }]} />
      <p>Tabelle</p>
    </>
  )
}

describe('DashboardLayout', () => {
  beforeEach(() => {
    mockUsePathname.mockReturnValue('/haeuser')
  })

  it('renders pages without the new primitives in the main area, with no secondary rail column', () => {
    render(
      <DashboardLayout sidebarData={sidebarData}>
        <p>Alte Seite</p>
      </DashboardLayout>,
    )
    const rail = screen.getByLabelText('Kontextnavigation', { selector: 'aside' })

    expect(screen.getByRole('main')).toContainElement(screen.getByText('Alte Seite'))
    expect(rail).toHaveClass('hidden')
    expect(rail).toBeEmptyDOMElement()
    expect(screen.getByRole('navigation', { name: 'Hauptnavigation' })).toBeInTheDocument()
  })

  it('shows the secondary rail column and its content when the page renders a SecondaryRail', () => {
    render(
      <DashboardLayout sidebarData={sidebarData}>
        <PageWithRail />
      </DashboardLayout>,
    )
    const rail = screen.getByLabelText('Kontextnavigation', { selector: 'aside' })

    expect(rail).not.toHaveClass('hidden')
    expect(rail).toContainElement(screen.getByRole('button', { name: 'Alle Häuser' }))
    expect(screen.getByRole('main')).toContainElement(screen.getByText('Tabelle'))
  })

  it('opens the rail as a drawer from the top bar and closes it on backdrop click, Escape and route change', () => {
    const { rerender } = render(
      <DashboardLayout sidebarData={sidebarData}>
        <PageWithRail />
      </DashboardLayout>,
    )
    const rail = screen.getByLabelText('Kontextnavigation', { selector: 'aside' })
    const open = () => fireEvent.click(screen.getByRole('button', { name: 'Navigation öffnen' }))

    expect(rail).toHaveClass('max-lg:invisible')

    open()
    expect(rail).toHaveClass('max-lg:translate-x-0')
    fireEvent.click(screen.getByRole('button', { name: 'Navigation schließen' }))
    expect(rail).toHaveClass('max-lg:invisible')

    open()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(rail).toHaveClass('max-lg:invisible')

    open()
    mockUsePathname.mockReturnValue('/wohnungen')
    act(() => {
      rerender(
        <DashboardLayout sidebarData={sidebarData}>
          <PageWithRail />
        </DashboardLayout>,
      )
    })
    expect(rail).toHaveClass('max-lg:invisible')
    expect(screen.queryByRole('button', { name: 'Navigation schließen' })).not.toBeInTheDocument()
  })
})
