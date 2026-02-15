import { describe, it, expect, vi } from 'vitest';
import { handleFileGeneration, processQueue, Env } from './index';
import { formatCurrency, isoToGermanDate, sumZaehlerValues, roundToNearest5 } from './utils';
import { ExecutionContext } from './logger';

describe('Backend Worker Tests', () => {
    const mockEnv = {
        GEMINI_API_KEY: 'test-key',
        SUPABASE_URL: 'https://test.supabase.co',
        SUPABASE_SERVICE_ROLE_KEY: 'test-role-key',
        RATE_LIMITER: {
            limit: vi.fn().mockResolvedValue({ success: true })
        },
        WORKER_AUTH_KEY: 'test-auth-key'
    };

    const mockCtx = {
        waitUntil: vi.fn()
    };

    describe('Helper Functions', () => {
        it('formatCurrency should format numbers as EUR', () => {
            // Use contains because the output might have non-breaking spaces
            expect(formatCurrency(10.5)).toContain('10,50');
            expect(formatCurrency(1000)).toContain('1.000,00');
            expect(formatCurrency(null)).toBe('-');
            expect(formatCurrency(undefined)).toBe('-');
        });

        it('isoToGermanDate should format ISO string to German date', () => {
            expect(isoToGermanDate('2024-01-01')).toBe('01.01.2024');
            expect(isoToGermanDate('2024-12-24T12:00:00Z')).toBe('24.12.2024');
            expect(isoToGermanDate(null)).toBe('N/A');
            expect(isoToGermanDate('')).toBe('N/A');
        });

        it('sumZaehlerValues should sum up values in an object', () => {
            const data = { a: 10, b: '20', c: null, d: undefined, e: 5.5 };
            expect(sumZaehlerValues(data)).toBe(35.5);
            expect(sumZaehlerValues({})).toBe(0);
            expect(sumZaehlerValues(null)).toBe(0);
        });

        it('roundToNearest5 should round to nearest multiple of 5', () => {
            expect(roundToNearest5(2.4)).toBe(0);
            expect(roundToNearest5(2.5)).toBe(5);
            expect(roundToNearest5(7.4)).toBe(5);
            expect(roundToNearest5(7.5)).toBe(10);
            expect(roundToNearest5(12)).toBe(10);
            expect(roundToNearest5(13)).toBe(15);
        });
    });

    describe('File Generation Handler', () => {
        it('should generate CSV correctly', async () => {
            const mockData = [
                { name: 'John', age: 30 },
                { name: 'Jane', age: 25 }
            ];

            const request = new Request('https://worker.com/export', {
                method: 'POST',
                body: JSON.stringify({
                    type: 'csv',
                    data: mockData,
                    filename: 'test.csv'
                })
            });

            const response = await handleFileGeneration(request, mockEnv as unknown as Env, mockCtx as unknown as ExecutionContext);

            expect(response.status).toBe(200);
            expect(response.headers.get('Content-Type')).toBe('text/csv');
            expect(response.headers.get('Content-Disposition')).toContain('test.csv');

            const text = await response.text();
            expect(text).toContain('John,30');
            expect(text).toContain('Jane,25');
        });

        it('should generate PDF correctly', async () => {
            const request = new Request('https://worker.com/export', {
                method: 'POST',
                body: JSON.stringify({
                    type: 'pdf',
                    template: 'house-overview',
                    nebenkosten: {
                        startdatum: '2023-01-01',
                        enddatum: '2023-12-31',
                        haus_name: 'Test Haus'
                    },
                    totalArea: 100,
                    totalCosts: 1000,
                    costPerSqm: 10,
                    filename: 'test.pdf'

                })
            });

            const response = await handleFileGeneration(request, mockEnv as unknown as Env, mockCtx as unknown as ExecutionContext);

            expect(response.status).toBe(200);
            expect(response.headers.get('Content-Type')).toBe('application/pdf');
            expect(response.headers.get('Content-Disposition')).toContain('test.pdf');
        });

        it('should return 404 for unknown request type', async () => {

            const request = new Request('https://worker.com/unknown', {
                method: 'POST',
                body: JSON.stringify({
                    type: 'unknown'
                })
            });

            const response = await handleFileGeneration(request, mockEnv as unknown as Env, mockCtx as unknown as ExecutionContext);
            expect(response.status).toBe(404);
        });
    });

    describe('Queue Processing Handler', () => {
        it('should return 401 if auth key is missing or wrong', async () => {
            const request = new Request('https://worker.com/process-queue', {
                method: 'POST',
                headers: {
                    'x-worker-auth': 'wrong-key'
                },
                body: JSON.stringify({ user_id: 'test-user' })
            });

            const response = await processQueue(request, mockEnv as unknown as Env, mockCtx as unknown as ExecutionContext);
            expect(response.status).toBe(401);
            expect(await response.text()).toBe('Unauthorized');
        });

        it('should proceed if auth key is correct', async () => {
            // We expect it to fail later because we haven't mocked Supabase RPCs,
            // but we can check if it gets past the auth check.
            const request = new Request('https://worker.com/process-queue', {
                method: 'POST',
                headers: {
                    'x-worker-auth': 'test-auth-key'
                },
                body: JSON.stringify({ user_id: 'test-user' })
            });

            const response = await processQueue(request, mockEnv as unknown as Env, mockCtx as unknown as ExecutionContext);
            // It should probably hit the Supabase client creation and then fail on an RPC call
            expect(response.status).not.toBe(401);
        });
    });

    it('should pass a basic smoke test', () => {
        expect(true).toBe(true);
    });
});

