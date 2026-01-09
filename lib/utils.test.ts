import { cn, calculateOverallSubscriptionActivity } from './utils';

describe('lib/utils', () => {
  describe('cn function', () => {
    it('should merge class names correctly', () => {
      expect(cn('class1', 'class2')).toBe('class1 class2');
    });

    it('should handle conditional classes', () => {
      expect(cn('base', true && 'conditional', false && 'hidden')).toBe('base conditional');
    });

    it('should handle undefined and null values', () => {
      expect(cn('base', undefined, null, 'valid')).toBe('base valid');
    });

    it('should handle empty strings', () => {
      expect(cn('base', '', 'valid')).toBe('base valid');
    });

    it('should handle arrays', () => {
      expect(cn(['class1', 'class2'], 'class3')).toBe('class1 class2 class3');
    });

    it('should handle objects', () => {
      expect(cn({ 'class1': true, 'class2': false, 'class3': true })).toBe('class1 class3');
    });

    it('should merge conflicting Tailwind classes correctly', () => {
      expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4');
    });

    it('should handle complex combinations', () => {
      const result = cn(
        'base-class',
        { 'conditional-class': true, 'hidden-class': false },
        ['array-class1', 'array-class2'],
        undefined,
        'final-class'
      );
      expect(result).toBe('base-class conditional-class array-class1 array-class2 final-class');
    });
  });

  describe('calculateOverallSubscriptionActivity', () => {
    it('should return true for active subscription', () => {
      const profile = { stripe_subscription_status: 'active' };
      expect(calculateOverallSubscriptionActivity(profile)).toBe(true);
    });

    it('should return false for canceled subscription', () => {
      const profile = { stripe_subscription_status: 'canceled' };
      expect(calculateOverallSubscriptionActivity(profile)).toBe(false);
    });

    it('should return false for incomplete subscription', () => {
      const profile = { stripe_subscription_status: 'incomplete' };
      expect(calculateOverallSubscriptionActivity(profile)).toBe(false);
    });

    it('should return false for incomplete_expired subscription', () => {
      const profile = { stripe_subscription_status: 'incomplete_expired' };
      expect(calculateOverallSubscriptionActivity(profile)).toBe(false);
    });

    it('should return false for past_due subscription', () => {
      const profile = { stripe_subscription_status: 'past_due' };
      expect(calculateOverallSubscriptionActivity(profile)).toBe(false);
    });

    it('should return false for unpaid subscription', () => {
      const profile = { stripe_subscription_status: 'unpaid' };
      expect(calculateOverallSubscriptionActivity(profile)).toBe(false);
    });

    it('should return true for trialing subscription', () => {
      const profile = { stripe_subscription_status: 'trialing' };
      expect(calculateOverallSubscriptionActivity(profile)).toBe(true);
    });

    it('should return false for null subscription status', () => {
      const profile = { stripe_subscription_status: null };
      expect(calculateOverallSubscriptionActivity(profile)).toBe(false);
    });

    it('should return false for undefined subscription status', () => {
      const profile = { stripe_subscription_status: undefined };
      expect(calculateOverallSubscriptionActivity(profile)).toBe(false);
    });

    it('should return false for empty profile', () => {
      const profile = {};
      expect(calculateOverallSubscriptionActivity(profile)).toBe(false);
    });

    it('should return false for unknown subscription status', () => {
      const profile = { stripe_subscription_status: 'unknown_status' };
      expect(calculateOverallSubscriptionActivity(profile)).toBe(false);
    });
  });
});