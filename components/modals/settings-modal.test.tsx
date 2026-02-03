import { render, screen } from '@testing-library/react';
import { SettingsModal } from './settings-modal';
import { useFeatureFlagEnabled } from 'posthog-js/react';
import { POSTHOG_FEATURE_FLAGS } from '@/lib/constants';

// Mock posthog-js/react
jest.mock('posthog-js/react', () => ({
  useFeatureFlagEnabled: jest.fn(),
}));

// Mock child components to simplify testing
jest.mock('../settings/profile-section', () => () => <div data-testid="profile-section">Profile Section</div>);
jest.mock('../settings/security-section', () => () => <div data-testid="security-section">Security Section</div>);
jest.mock('../settings/oauth-apps-section', () => () => <div data-testid="oauth-apps-section">OAuth Apps Section</div>);
jest.mock('../settings/subscription-section', () => () => <div data-testid="subscription-section">Subscription Section</div>);
jest.mock('../settings/mail-section', () => () => <div data-testid="mail-section">Mail Section</div>);
jest.mock('../settings/display-section', () => () => <div data-testid="display-section">Display Section</div>);
jest.mock('../settings/export-section', () => () => <div data-testid="export-section">Export Section</div>);
jest.mock('../settings/feature-preview-section', () => () => <div data-testid="feature-preview-section">Feature Preview Section</div>);
jest.mock('../settings/information-section', () => () => <div data-testid="information-section">Information Section</div>);

describe('SettingsModal', () => {
  const mockOnOpenChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows the Mails tab when the feature flag is enabled', () => {
    (useFeatureFlagEnabled as jest.Mock).mockReturnValue(true);

    render(<SettingsModal open={true} onOpenChange={mockOnOpenChange} />);

    expect(screen.getByText('E-Mail')).toBeInTheDocument();
  });

  it('hides the Mails tab when the feature flag is disabled', () => {
    (useFeatureFlagEnabled as jest.Mock).mockReturnValue(false);

    render(<SettingsModal open={true} onOpenChange={mockOnOpenChange} />);

    expect(screen.queryByText('E-Mail')).not.toBeInTheDocument();
  });
});
