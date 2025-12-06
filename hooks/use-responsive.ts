"use client";

import { useEffect, useRef, useState, useCallback, RefObject } from 'react';

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
 * Automatically rechecks on window resize (debounced).
 * 
 * @returns Object containing:
 *   - ref: Ref to attach to the container element
 *   - isOverflowing: Boolean indicating if content overflows the container
 */
export function useIsOverflowing(): {
    ref: RefObject<HTMLDivElement | null>;
    isOverflowing: boolean;
} {
    const [isOverflowing, setIsOverflowing] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    const checkOverflow = useCallback(() => {
        if (ref.current) {
            const { scrollWidth, clientWidth } = ref.current;
            setIsOverflowing(scrollWidth > clientWidth);
        }
    }, []);

    useDebouncedResize(checkOverflow);

    useEffect(() => {
        checkOverflow();
    }, [checkOverflow]);

    return { ref, isOverflowing };
}
