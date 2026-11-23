import React, { useState } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { PageTopBar, RailNavItem, RailSection, RailStat, RailStats, SecondaryRail, SecondaryRailProvider, useSecondaryRail } from '.'

// Minimal stand-in for the shell: host element, drawer state
function Shell({ children }: { children: React.ReactNode }) {
  const { setHostNode, hasRail, drawerOpen } = useSecondaryRail()
  return (
    <div>
      <aside ref={setHostNode} data-testid="host" data-has-rail={hasRail} data-drawer-open={drawerOpen} />
      <main>{children}</main>
    </div>
  )
}

describe('SecondaryRail', () => {
  it('renders its children inline without a shell', () => {
    render(
      <SecondaryRail>
        <RailNavItem label="Alle" />
      </SecondaryRail>,
    )

    expect(screen.getByRole('button', { name: 'Alle' })).toBeInTheDocument()
  })

  it('portals into the host of the shell and registers a rail while mounted', () => {
    function Page() {
      const [show, setShow] = useState(true)
      return (
        <>
          <button onClick={() => setShow(false)}>weg</button>
          {show && (
            <SecondaryRail>
              <RailNavItem label="Alle" />
            </SecondaryRail>
          )}
        </>
      )
    }
    render(
      <SecondaryRailProvider>
        <Shell>
          <Page />
        </Shell>
      </SecondaryRailProvider>,
    )
    const host = screen.getByTestId('host')

    expect(host).toContainElement(screen.getByRole('button', { name: 'Alle' }))
    expect(host).toHaveAttribute('data-has-rail', 'true')

    fireEvent.click(screen.getByText('weg'))

    expect(screen.queryByRole('button', { name: 'Alle' })).not.toBeInTheDocument()
    expect(host).toHaveAttribute('data-has-rail', 'false')
  })
})

describe('RailNavItem', () => {
  it('renders a button with aria-pressed, count and forwarded data attributes', () => {
    const onClick = jest.fn()
    render(<RailNavItem label="Offen" count={3} active onClick={onClick} data-testid="filter-open" />)
    const item = screen.getByTestId('filter-open')

    expect(item.tagName).toBe('BUTTON')
    expect(item).toHaveAttribute('type', 'button')
    expect(item).toHaveAttribute('aria-pressed', 'true')
    expect(item).toHaveClass('font-medium')
    expect(item).toHaveTextContent('3')

    fireEvent.click(item)
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('renders a link with aria-current when it has an href', () => {
    render(<RailNavItem label="Häuser" href="/haeuser" active data-testid="link" />)
    const item = screen.getByTestId('link')

    expect(item.tagName).toBe('A')
    expect(item).toHaveAttribute('href', '/haeuser')
    expect(item).toHaveAttribute('aria-current', 'page')
    expect(item).not.toHaveAttribute('aria-pressed')
  })

  it('does not set the active attributes on an inactive item', () => {
    render(<RailNavItem label="Alle" href="/x" />)

    expect(screen.getByRole('link', { name: 'Alle' })).not.toHaveAttribute('aria-current')
  })
})

describe('RailSection and RailStats', () => {
  it('shows label and action of a section', () => {
    render(
      <RailSection label="Angepinnt" action={<button>neu</button>}>
        <span>Inhalt</span>
      </RailSection>,
    )

    expect(screen.getByText('Angepinnt')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'neu' })).toBeInTheDocument()
    expect(screen.getByText('Inhalt')).toBeInTheDocument()
  })

  it('shows label, value and hint of a stat', () => {
    render(
      <RailStats>
        <RailStat label="Häuser" value={12} hint="3 neu" />
      </RailStats>,
    )

    expect(screen.getByText('Häuser')).toBeInTheDocument()
    expect(screen.getByText('12')).toHaveClass('tabular-nums')
    expect(screen.getByText('3 neu')).toBeInTheDocument()
  })
})

describe('PageTopBar', () => {
  const breadcrumbs = [{ label: 'Objekte', href: '/objekte' }, { label: 'Häuser' }]

  it('renders the breadcrumb with the last entry as current page and the slots', () => {
    render(<PageTopBar breadcrumbs={breadcrumbs} search={<input aria-label="Suche" />} actions={<button>Neu</button>} />)

    expect(screen.getByRole('link', { name: 'Objekte' })).toHaveAttribute('href', '/objekte')
    expect(screen.getByText('Häuser')).toHaveAttribute('aria-current', 'page')
    expect(screen.getByLabelText('Suche')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Neu' })).toBeInTheDocument()
  })

  it('shows no rail toggle without a rail', () => {
    render(
      <SecondaryRailProvider>
        <PageTopBar breadcrumbs={breadcrumbs} />
      </SecondaryRailProvider>,
    )

    expect(screen.queryByRole('button', { name: 'Navigation öffnen' })).not.toBeInTheDocument()
  })

  it('shows a toggle that is hidden from lg on and opens the drawer when a rail exists', () => {
    render(
      <SecondaryRailProvider>
        <Shell>
          <SecondaryRail>
            <RailNavItem label="Alle" />
          </SecondaryRail>
          <PageTopBar breadcrumbs={breadcrumbs} />
        </Shell>
      </SecondaryRailProvider>,
    )
    const toggle = screen.getByRole('button', { name: 'Navigation öffnen' })

    expect(toggle).toHaveClass('lg:hidden')
    expect(toggle).toHaveAttribute('aria-expanded', 'false')

    fireEvent.click(toggle)

    expect(screen.getByTestId('host')).toHaveAttribute('data-drawer-open', 'true')
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
  })
})
