import { render } from '@testing-library/react'
import { ProfileSkeleton, SubscriptionSkeleton, SettingsSectionSkeleton } from '@/components/settings/section-skeletons'

describe('Settings Section Skeletons', () => {
  it('renders ProfileSkeleton with titles and placeholder fields', () => {
    const { getByText } = render(<ProfileSkeleton />)
    expect(getByText('Persönliche Informationen')).toBeInTheDocument()
    expect(getByText('Rechnungsadresse')).toBeInTheDocument()
  })

  it('renders SubscriptionSkeleton with section title', () => {
    const { getByText } = render(<SubscriptionSkeleton />)
    expect(getByText('Aktueller Tarif')).toBeInTheDocument()
  })

  it('renders SettingsSectionSkeleton without throwing', () => {
    const { container } = render(<SettingsSectionSkeleton />)
    expect(container.firstChild).not.toBeNull()
  })
})
