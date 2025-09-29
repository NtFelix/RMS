/**
 * Test suite for recommended prepayment calculation with rounding to nearest 5 euros
 * 
 * This test verifies that the recommended prepayment calculation correctly rounds
 * the monthly amount to the nearest 5 euros as requested.
 */

import { roundToNearest5 } from "@/lib/utils";
import { calculateRecommendedPrepayment as calculateRecommendedPrepaymentFromUtils } from "@/utils/abrechnung-calculations";
import type { TenantCalculationResult } from "@/types/optimized-betriebskosten";

describe('Recommended Prepayment Rounding', () => {

  // Helper function to create a mock TenantCalculationResult for testing
  const createMockTenantCalculation = (totalCosts: number): TenantCalculationResult => ({
    tenantId: 'test-tenant-id',
    tenantName: 'Test Tenant',
    apartmentName: 'Test Apartment',
    apartmentSize: 50,
    occupancyPercentage: 100,
    daysOccupied: 365,
    daysInPeriod: 365,
    operatingCosts: {
      costItems: [],
      totalCost: totalCosts
    },
    waterCosts: {
      totalBuildingWaterCost: 0,
      totalBuildingConsumption: 0,
      pricePerCubicMeter: 0,
      tenantConsumption: 0,
      totalCost: 0
    },
    totalCosts,
    prepayments: {
      monthlyPayments: [],
      totalPrepayments: 0,
      averageMonthlyPayment: 0
    },
    finalSettlement: totalCosts
  });

  // Wrapper function to test the actual production code
  const calculateRecommendedPrepayment = (totalAnnualCosts: number): number => {
    const mockTenantCalculation = createMockTenantCalculation(totalAnnualCosts);
    return calculateRecommendedPrepaymentFromUtils(mockTenantCalculation);
  };

  describe('roundToNearest5 function', () => {
    it('should round 74.35 to 75', () => {
      expect(roundToNearest5(74.35)).toBe(75);
    });

    it('should round 72.48 to 70', () => {
      expect(roundToNearest5(72.48)).toBe(70);
    });

    it('should round 73.00 to 75', () => {
      expect(roundToNearest5(73.00)).toBe(75);
    });

    it('should round 72.50 to 75 (rounds up when exactly between)', () => {
      expect(roundToNearest5(72.50)).toBe(75);
    });

    it('should round 77.50 to 80', () => {
      expect(roundToNearest5(77.50)).toBe(80);
    });

    it('should round 80.00 to 80 (no change needed)', () => {
      expect(roundToNearest5(80.00)).toBe(80);
    });

    it('should round 82.49 to 80', () => {
      expect(roundToNearest5(82.49)).toBe(80);
    });

    it('should round 82.51 to 85', () => {
      expect(roundToNearest5(82.51)).toBe(85);
    });
  });

  describe('calculateRecommendedPrepayment function', () => {
    it('should return 0 for zero or negative costs', () => {
      expect(calculateRecommendedPrepayment(0)).toBe(0);
      expect(calculateRecommendedPrepayment(-100)).toBe(0);
    });

    it('should calculate and round prepayment correctly for example case 1', () => {
      // Example: Total annual costs = 892.20 EUR
      // With 10% buffer: 892.20 * 1.1 = 981.42 EUR
      // Monthly: 981.42 / 12 = 81.785 EUR
      // Rounded to nearest 5: 80 EUR
      // Annual recommendation: 80 * 12 = 960 EUR
      const totalCosts = 892.20;
      const result = calculateRecommendedPrepayment(totalCosts);
      expect(result).toBe(960);
    });

    it('should calculate and round prepayment correctly for example case 2', () => {
      // Example: Total annual costs = 869.76 EUR  
      // With 10% buffer: 869.76 * 1.1 = 956.736 EUR
      // Monthly: 956.736 / 12 = 79.728 EUR
      // Rounded to nearest 5: 80 EUR
      // Annual recommendation: 80 * 12 = 960 EUR
      const totalCosts = 869.76;
      const result = calculateRecommendedPrepayment(totalCosts);
      expect(result).toBe(960);
    });

    it('should calculate and round prepayment correctly for case that rounds down', () => {
      // Example: Total annual costs = 800 EUR
      // With 10% buffer: 800 * 1.1 = 880 EUR
      // Monthly: 880 / 12 = 73.333... EUR
      // Rounded to nearest 5: 75 EUR
      // Annual recommendation: 75 * 12 = 900 EUR
      const totalCosts = 800;
      const result = calculateRecommendedPrepayment(totalCosts);
      expect(result).toBe(900);
    });

    it('should calculate and round prepayment correctly for case that rounds down significantly', () => {
      // Example: Total annual costs = 780 EUR
      // With 10% buffer: 780 * 1.1 = 858 EUR
      // Monthly: 858 / 12 = 71.5 EUR
      // Rounded to nearest 5: 70 EUR
      // Annual recommendation: 70 * 12 = 840 EUR
      const totalCosts = 780;
      const result = calculateRecommendedPrepayment(totalCosts);
      expect(result).toBe(840);
    });

    it('should handle edge case where monthly amount is exactly divisible by 5', () => {
      // Example: Total annual costs = 1090.91 EUR
      // With 10% buffer: 1090.91 * 1.1 = 1200.001 EUR
      // Monthly: 1200.001 / 12 = 100.00008... EUR
      // Rounded to nearest 5: 100 EUR (no change)
      // Annual recommendation: 100 * 12 = 1200 EUR
      const totalCosts = 1090.91;
      const result = calculateRecommendedPrepayment(totalCosts);
      expect(result).toBe(1200);
    });

    it('should handle small amounts correctly', () => {
      // Example: Total annual costs = 120 EUR
      // With 10% buffer: 120 * 1.1 = 132 EUR
      // Monthly: 132 / 12 = 11 EUR
      // Rounded to nearest 5: 10 EUR
      // Annual recommendation: 10 * 12 = 120 EUR
      const totalCosts = 120;
      const result = calculateRecommendedPrepayment(totalCosts);
      expect(result).toBe(120);
    });

    it('should handle very small amounts that round to 0', () => {
      // Example: Total annual costs = 20 EUR
      // With 10% buffer: 20 * 1.1 = 22 EUR
      // Monthly: 22 / 12 = 1.833... EUR
      // Rounded to nearest 5: 0 EUR (since 1.833 is closer to 0 than to 5)
      // Annual recommendation: 0 * 12 = 0 EUR
      const totalCosts = 20;
      const result = calculateRecommendedPrepayment(totalCosts);
      expect(result).toBe(0);
    });

    it('should handle amounts that round to 5', () => {
      // Example: Total annual costs = 50 EUR
      // With 10% buffer: 50 * 1.1 = 55 EUR
      // Monthly: 55 / 12 = 4.583... EUR
      // Rounded to nearest 5: 5 EUR
      // Annual recommendation: 5 * 12 = 60 EUR
      const totalCosts = 50;
      const result = calculateRecommendedPrepayment(totalCosts);
      expect(result).toBe(60);
    });
  });

  describe('Real-world scenarios', () => {
    it('should match user example: 74.35 monthly should become 75', () => {
      // If monthly amount (with buffer) is 74.35, it should round to 75
      // Working backwards: if monthly with buffer = 74.35, then annual with buffer = 892.20
      // So annual costs = 892.20 / 1.1 = 811.09
      const totalCosts = 811.09;
      const result = calculateRecommendedPrepayment(totalCosts);
      // Monthly with buffer: 811.09 * 1.1 / 12 = 74.35
      // Rounded: 75
      // Annual: 75 * 12 = 900
      expect(result).toBe(900);
    });

    it('should match user example: 72.48 monthly should become 70', () => {
      // If monthly amount (with buffer) is 72.48, it should round to 70
      // Working backwards: if monthly with buffer = 72.48, then annual with buffer = 869.76
      // So annual costs = 869.76 / 1.1 = 790.69
      const totalCosts = 790.69;
      const result = calculateRecommendedPrepayment(totalCosts);
      // Monthly with buffer: 790.69 * 1.1 / 12 = 72.48
      // Rounded: 70
      // Annual: 70 * 12 = 840
      expect(result).toBe(840);
    });
  });
});