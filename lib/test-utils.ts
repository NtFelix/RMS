/**
 * Utility functions for environment checks and testing states.
 * Shared between API routes and server actions.
 */

export const isTestEnv = (): boolean => {
    return process.env.CI === 'true' || process.env.NODE_ENV === 'test';
};

export const isStripeMocked = (): boolean => {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    const isMockKey = secretKey?.startsWith('mock-');
    return !secretKey || !!isMockKey;
};
