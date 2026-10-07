import { handleGoogleSignIn, handleMicrosoftSignIn } from './auth-helpers';
import { createClient } from '@/utils/supabase/client';
import { trackGoogleAuthInitiated, trackGoogleAuthFailed, trackSocialAuthInitiated, trackSocialAuthFailed } from './posthog-auth-events';

// Mock dependencies
jest.mock('@/utils/supabase/client', () => ({
  createClient: jest.fn(),
}));

jest.mock('./constants', () => ({
  BASE_URL: 'https://test-url.com',
  ROUTES: {
    HOME: '/dashboard',
  },
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
          redirectTo: 'http://localhost/auth/callback?origin=http%3A%2F%2Flocalhost',
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

    it('should preserve a safe redirect for Google sign-in', async () => {
      mockSupabase.auth.signInWithOAuth.mockResolvedValue({ error: null });

      const result = await handleGoogleSignIn('login', '/oauth/consent?authorization_id=abc123def456');

      expect(result).toEqual({ error: null });
      expect(mockSupabase.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: {
          redirectTo: 'http://localhost/auth/callback?origin=http%3A%2F%2Flocalhost&redirect=%2Foauth%2Fconsent%3Fauthorization_id%3Dabc123def456',
          queryParams: {
            access_type: 'offline',
          },
        },
      });
    });

    it('should drop an unsafe redirect for Google sign-in', async () => {
      mockSupabase.auth.signInWithOAuth.mockResolvedValue({ error: null });

      const result = await handleGoogleSignIn('login', 'https://evil.example/oauth/consent');

      expect(result).toEqual({ error: null });
      expect(mockSupabase.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: {
          redirectTo: 'http://localhost/auth/callback?origin=http%3A%2F%2Flocalhost',
          queryParams: {
            access_type: 'offline',
          },
        },
      });
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
          redirectTo: 'http://localhost/auth/callback?origin=http%3A%2F%2Flocalhost',
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

    it('should preserve a safe redirect for Microsoft sign-in', async () => {
      mockSupabase.auth.signInWithOAuth.mockResolvedValue({ error: null });

      const result = await handleMicrosoftSignIn('login', '/oauth/consent?authorization_id=abc123def456');

      expect(result).toEqual({ error: null });
      expect(mockSupabase.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'azure',
        options: {
          redirectTo: 'http://localhost/auth/callback?origin=http%3A%2F%2Flocalhost&redirect=%2Foauth%2Fconsent%3Fauthorization_id%3Dabc123def456',
          scopes: 'email profile openid',
        },
      });
    });
  });
});
