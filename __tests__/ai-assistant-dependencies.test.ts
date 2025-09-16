/**
 * Test to verify AI Assistant dependencies are properly installed and configured
 */

describe('AI Assistant Dependencies', () => {
  test('should have @google/genai dependency available', () => {
    expect(() => {
      require('@google/genai');
    }).not.toThrow();
  });

  test('should have mime dependency available', () => {
    expect(() => {
      require('mime');
    }).not.toThrow();
  });

  test('should have PostHog environment variables configured', () => {
    // Check that PostHog environment variables are available
    const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY || process.env.POSTHOG_API_KEY;
    const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || process.env.POSTHOG_HOST;
    
    expect(posthogKey).toBeDefined();
    expect(posthogHost).toBeDefined();
  });

  test('should have GEMINI_API_KEY environment variable configured', () => {
    // In test environment, we just check that the variable is defined in the example
    // The actual key would be set in production/development environments
    expect(process.env.GEMINI_API_KEY).toBeDefined();
  });
});