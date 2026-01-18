"use client";

import { LazyMotion, domAnimation } from "framer-motion";
import { ReactNode } from "react";

/**
 * FramerLazyProvider
 * 
 * Reduces bundle size by only loading the 'domAnimation' subset of framer-motion features.
 * This can save ~100kB+ if you use the 'm' component instead of 'motion'.
 * 
 * Usage:
 * 1. Wrap your root layout with this provider.
 * 2. Use 'm' from framer-motion instead of 'motion' in your components.
 */
export function FramerLazyProvider({ children }: { children: ReactNode }) {
    return (
        <LazyMotion features={domAnimation} strict>
            {children}
        </LazyMotion>
    );
}
