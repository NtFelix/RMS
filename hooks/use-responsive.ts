"use client";

import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Custom hook for debounced window resize events.
 * Calls the callback function after the specified delay when the window is resized.
 * 
 * @param callback - Function to call on resize (debounced)
 * @param delay - Debounce delay in milliseconds (default: 100)
 */
export function useDebouncedResize(callback: () => void, delay = 100) {
    const savedCallback = useRef(callback);

    useEffect(() => {
        savedCallback.current = callback;
    }, [callback]);

    useEffect(() => {
        let resizeTimer: ReturnType<typeof setTimeout>;

        const handleResize = () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => savedCallback.current(), delay);
        };

        if (typeof window !== 'undefined') {
            window.addEventListener('resize', handleResize);
            return () => window.removeEventListener('resize', handleResize);
        }
    }, [delay]);
}

/**
 * Custom hook to check if a container element is overflowing horizontally.
 *
 * Uses a `ResizeObserver` attached via a callback ref so measurement tracks the
 * element's real mount/unmount and size changes, and only updates state when the
 * overflow boolean actually flips. Both of these guard against a measure → setState
 * → re-render → re-measure feedback loop (React "maximum update depth exceeded"),
 * which is a risk here because the measured element is conditionally rendered based
 * on the very state this hook produces.
 *
 * @returns Object containing:
 *   - ref: Callback ref to attach to the container element
 *   - isOverflowing: Boolean indicating if content overflows the container
 */
export function useIsOverflowing(): {
    ref: (node: HTMLDivElement | null) => void;
    isOverflowing: boolean;
} {
    const [isOverflowing, setIsOverflowing] = useState(false);
    const nodeRef = useRef<HTMLDivElement | null>(null);
    const observerRef = useRef<ResizeObserver | null>(null);

    const measure = useCallback((node: HTMLDivElement | null) => {
        if (!node) return;
        const { scrollWidth, clientWidth } = node;
        const overflowing = scrollWidth > clientWidth;
        // Only trigger a re-render when the boolean actually changes. Without this
        // guard, a measurement that fires on every render can drive an infinite
        // update loop when the measured element is mounted/unmounted based on state.
        setIsOverflowing((prev) => (prev === overflowing ? prev : overflowing));
    }, []);

    // Callback ref: runs whenever the (conditionally rendered) element attaches or
    // detaches, wiring up / tearing down the ResizeObserver accordingly.
    const ref = useCallback((node: HTMLDivElement | null) => {
        if (observerRef.current) {
            observerRef.current.disconnect();
            observerRef.current = null;
        }

        nodeRef.current = node;
        if (!node) return;

        measure(node);

        if (typeof ResizeObserver !== 'undefined') {
            const observer = new ResizeObserver(() => measure(node));
            observer.observe(node);
            observerRef.current = observer;
        }
    }, [measure]);

    // Fallback for viewport/container changes that don't resize the observed node
    // itself (e.g. the surrounding layout). No-op while the node is detached.
    useDebouncedResize(useCallback(() => measure(nodeRef.current), [measure]));

    useEffect(() => {
        return () => {
            if (observerRef.current) {
                observerRef.current.disconnect();
                observerRef.current = null;
            }
        };
    }, []);

    return { ref, isOverflowing };
}
