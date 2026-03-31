import { handleGoogleSignIn, handleMicrosoftSignIn } from './auth-helpers';
import { createClient } from '@/utils/supabase/client';
import { trackGoogleAuthInitiated, trackGoogleAuthFailed, trackSocialAuthInitiated, trackSocialAuthFailed } from './posthog-auth-events';

// Mock dependencies
jest.mock('@/utils/supabase/client', () => ({
  createClient: jest.fn(),
}));

jest.mock('./constants', () => ({
  BASE_URL: 'https://test-url.com',
}));

jest.mock('./posthog-auth-events', () => ({
  trackGoogleAuthInitiated: jest.fn(),
  trackGoogleAuthFailed: jest.fn(),
  trackSocialAuthInitiated: jest.fn(),
  trackSocialAuthFailed: jest.fn(),
}));

describe('auth-helpers', () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSupabase = {
      auth: {
        signInWithOAuth: jest.fn(),
      },
    };

    (createClient as jest.Mock).mockReturnValue(mockSupabase);
  });

  describe('handleGoogleSignIn', () => {
    it('should initiate Google sign-in successfully', async () => {
      mockSupabase.auth.signInWithOAuth.mockResolvedValue({ error: null });

      const result = await handleGoogleSignIn('login');

      expect(result).toEqual({ error: null });
      expect(trackGoogleAuthInitiated).toHaveBeenCalledWith('login');
      expect(mockSupabase.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: {
          redirectTo: 'https://test-url.com/auth/callback',
          queryParams: {
            access_type: 'offline',
          },
        },
      });
    });

    it('should handle Google sign-in error', async () => {
      mockSupabase.auth.signInWithOAuth.mockResolvedValue({
        error: { message: 'Auth failed' },
      });

      const result = await handleGoogleSignIn('signup');

      expect(result).toEqual({ error: 'Auth failed' });
      expect(trackGoogleAuthInitiated).toHaveBeenCalledWith('signup');
      expect(trackGoogleAuthFailed).toHaveBeenCalledWith('signup', 'oauth_error', 'Auth failed');
    });
  });

  describe('handleMicrosoftSignIn', () => {
    it('should initiate Microsoft sign-in successfully', async () => {
      mockSupabase.auth.signInWithOAuth.mockResolvedValue({ error: null });

      const result = await handleMicrosoftSignIn('login');

      expect(result).toEqual({ error: null });
      expect(trackSocialAuthInitiated).toHaveBeenCalledWith('microsoft', 'login');
      expect(mockSupabase.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'azure',
        options: {
          redirectTo: 'https://test-url.com/auth/callback',
          scopes: 'email profile openid',
        },
      });
    });

    it('should handle Microsoft sign-in error', async () => {
      mockSupabase.auth.signInWithOAuth.mockResolvedValue({
        error: { message: 'Auth failed' },
      });

      const result = await handleMicrosoftSignIn('signup');

      expect(result).toEqual({ error: 'Auth failed' });
      expect(trackSocialAuthInitiated).toHaveBeenCalledWith('microsoft', 'signup');
      expect(trackSocialAuthFailed).toHaveBeenCalledWith('microsoft', 'signup', 'oauth_error', 'Auth failed');
    });
  });
});
