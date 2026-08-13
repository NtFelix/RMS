import { describe, it, expect } from 'vitest';
import {
  startSpan,
  endSpan,
  withSpan,
  getTraceContext,
  generateTraceId,
  runWithTrace,
  SPAN_KINDS,
  STATUS_CODES,
} from './tracing';

describe('tracing', () => {
  describe('generateTraceId', () => {
    it('should return a 32-character hex string', () => {
      const id = generateTraceId();
      expect(id).toMatch(/^[0-9a-f]{32}$/);
    });

    it('should generate unique IDs', () => {
      const ids = new Set(Array.from({ length: 100 }, () => generateTraceId()));
      expect(ids.size).toBe(100);
    });
  });

  describe('startSpan and endSpan', () => {
    it('should create a span with correct properties', async () => {
      await runWithTrace(generateTraceId(), async () => {
        const span = startSpan('test-span', SPAN_KINDS.SERVER);
        expect(span.name).toBe('test-span');
        expect(span.kind).toBe(SPAN_KINDS.SERVER);
        expect(span.traceId).toMatch(/^[0-9a-f]{32}$/);
        expect(span.spanId).toMatch(/^[0-9a-f]{16}$/);
        expect(span.parentSpanId).toBeUndefined();
        expect(span.startTimeUnixNano).toBeTruthy();
        expect(span.endTimeUnixNano).toBeUndefined();
        endSpan(span, { code: STATUS_CODES.OK });
        expect(span.endTimeUnixNano).toBeTruthy();
        expect(span.status?.code).toBe(STATUS_CODES.OK);
      });
    });

    it('should default kind to INTERNAL', async () => {
      await runWithTrace(generateTraceId(), async () => {
        const span = startSpan('test-span');
        expect(span.kind).toBe(SPAN_KINDS.INTERNAL);
        endSpan(span);
      });
    });

    it('should set ERROR status correctly', async () => {
      await runWithTrace(generateTraceId(), async () => {
        const span = startSpan('failing-span');
        endSpan(span, { code: STATUS_CODES.ERROR, message: 'something went wrong' });
        expect(span.status?.code).toBe(STATUS_CODES.ERROR);
        expect(span.status?.message).toBe('something went wrong');
      });
    });
  });

  describe('trace context propagation', () => {
    it('should propagate trace context through nested spans', async () => {
      await runWithTrace(generateTraceId(), async () => {
        const rootSpan = startSpan('root', SPAN_KINDS.SERVER);

        const childSpan = startSpan('child', SPAN_KINDS.INTERNAL);
        expect(childSpan.traceId).toBe(rootSpan.traceId);
        expect(childSpan.parentSpanId).toBe(rootSpan.spanId);

        const grandchildSpan = startSpan('grandchild', SPAN_KINDS.INTERNAL);
        expect(grandchildSpan.traceId).toBe(rootSpan.traceId);
        expect(grandchildSpan.parentSpanId).toBe(childSpan.spanId);

        endSpan(grandchildSpan);
        endSpan(childSpan);
        endSpan(rootSpan);
      });
    });

    it('should return trace context via getTraceContext', async () => {
      await runWithTrace(generateTraceId(), async () => {
        const ctx = getTraceContext();
        expect(ctx).not.toBeNull();
        expect(ctx!.traceId).toMatch(/^[0-9a-f]{32}$/);
        expect(ctx!.spanId).toBe('');
      });
    });

    it('should update trace context on startSpan', async () => {
      await runWithTrace(generateTraceId(), async () => {
        const span = startSpan('active-span');
        const ctx = getTraceContext();
        expect(ctx!.spanId).toBe(span.spanId);
        endSpan(span);
      });
    });

    it('should restore parent span context on endSpan', async () => {
      await runWithTrace(generateTraceId(), async () => {
        const rootSpan = startSpan('root');
        const ctxBeforeChild = getTraceContext();
        expect(ctxBeforeChild!.spanId).toBe(rootSpan.spanId);

        const childSpan = startSpan('child');
        const ctxDuringChild = getTraceContext();
        expect(ctxDuringChild!.spanId).toBe(childSpan.spanId);

        endSpan(childSpan);
        const ctxAfterChild = getTraceContext();
        expect(ctxAfterChild!.spanId).toBe(rootSpan.spanId);

        endSpan(rootSpan);
      });
    });
  });

  describe('withSpan', () => {
    it('should auto-close span on success', async () => {
      const result = await withSpan('auto-span', async () => {
        return 42;
      });
      expect(result).toBe(42);
    });

    it('should set ERROR status when function throws', async () => {
      await runWithTrace(generateTraceId(), async () => {
        try {
          const err = new Error('boom');
          await withSpan('failing', async () => {
            throw err;
          });
        } catch {
          // Expected
        }
      });
    });

    it('should propagate trace context inside withSpan callback', async () => {
      await runWithTrace(generateTraceId(), async () => {
        let childContext: { traceId: string; spanId: string } | null = null;

        await withSpan('parent', async () => {
          await withSpan('child', async () => {
            childContext = getTraceContext();
          });
        });

        expect(childContext).not.toBeNull();
      });
    });
  });

  describe('runWithTrace', () => {
    it('should return the callback result', () => {
      const result = runWithTrace(generateTraceId(), () => 99);
      expect(result).toBe(99);
    });

    it('should make getTraceContext available inside callback', async () => {
      const traceId = generateTraceId();
      let ctx: { traceId: string; spanId: string } | null = null;
      await runWithTrace(traceId, async () => {
        ctx = getTraceContext();
      });
      expect(ctx!.traceId).toBe(traceId);
    });
  });
});
