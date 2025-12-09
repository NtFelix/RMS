"use client"

import { motion } from "framer-motion"

/**
 * Shared 3D decorative elements for auth pages (login, register, etc.)
 * 
 * Centralizes the opacity and styling configuration for easier maintenance.
 * Update the constants below to change the appearance across all auth pages.
 */

// ============================================================================
// OPACITY CONFIGURATION
// Adjust these values to change the visibility of 3D elements across all auth pages
// ============================================================================

const RING_OPACITY = {
    primary: 0.06,    // Top-right and left rotating rings
    secondary: 0.04,  // Bottom rotating ring
}

const SPHERE_OPACITY = {
    overall: 0.55,           // Overall opacity for all spheres (CSS opacity class)
    shadowPrimary: 0.12,     // Shadow intensity for larger spheres
    shadowSecondary: 0.1,    // Shadow intensity for smaller sphere
    gradientHighlight: 0.6,  // Brightest part of sphere gradient
    gradientMid: 0.2,        // Middle gradient value
    gradientLow: 0.04,       // Darkest visible part of gradient
    accentPrimary: 0.5,      // Accent-colored sphere primary gradient
    accentSecondary: 0.12,   // Accent-colored sphere secondary gradient
    border: 0.05,            // Border opacity
    reflection: 0.25,        // Inner glass reflection opacity
    smallHighlight: 0.5,     // Small sphere highlight
    smallLow: 0.05,          // Small sphere low gradient
}

// ============================================================================
// COMPONENT
// ============================================================================

export function Auth3DDecorations() {
    return (
        <>
            {/* 3D Decorative rotating rings */}
            <div className="absolute inset-0 pointer-events-none" style={{ transformStyle: 'preserve-3d' }}>
                <motion.div
                    className={`absolute -top-32 -right-32 w-96 h-96 border border-white/[${RING_OPACITY.primary}] rounded-full`}
                    style={{ borderColor: `rgba(255, 255, 255, ${RING_OPACITY.primary})` }}
                    animate={{ rotateX: [0, 360], rotateY: [0, 360], rotateZ: [0, 180] }}
                    transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
                />
                <motion.div
                    className={`absolute top-1/2 -left-32 w-80 h-80 border border-white/[${RING_OPACITY.primary}] rounded-full`}
                    style={{ borderColor: `rgba(255, 255, 255, ${RING_OPACITY.primary})` }}
                    animate={{ rotateX: [0, -360], rotateY: [0, 180], rotateZ: [0, -90] }}
                    transition={{ duration: 35, repeat: Infinity, ease: "linear" }}
                />
                <motion.div
                    className={`absolute -bottom-32 left-1/2 w-[30rem] h-[30rem] border border-white/[${RING_OPACITY.secondary}] rounded-full`}
                    style={{ borderColor: `rgba(255, 255, 255, ${RING_OPACITY.secondary})` }}
                    animate={{ rotateX: [45, 405], rotateY: [0, 0], rotateZ: [0, 360] }}
                    transition={{ duration: 45, repeat: Infinity, ease: "linear" }}
                />
            </div>

            {/* 3D Spheres (High gloss) */}
            <motion.div
                className="absolute top-20 right-20 w-24 h-24 rounded-full"
                style={{
                    opacity: SPHERE_OPACITY.overall,
                    boxShadow: `0 20px 50px rgba(0,0,0,${SPHERE_OPACITY.shadowPrimary})`,
                    background: `radial-gradient(circle at 30% 30%, rgba(255,255,255,${SPHERE_OPACITY.gradientHighlight}) 0%, rgba(255,255,255,${SPHERE_OPACITY.gradientMid}) 20%, rgba(255,255,255,${SPHERE_OPACITY.gradientLow}) 60%, transparent 100%)`,
                    backdropFilter: "blur(2px)"
                }}
                animate={{
                    y: [0, -20, 0],
                    scale: [1, 1.05, 1],
                    rotate: [0, 10, 0]
                }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
                className="absolute bottom-32 left-12 w-32 h-32 rounded-full"
                style={{
                    opacity: SPHERE_OPACITY.overall,
                    boxShadow: `0 20px 50px rgba(0,0,0,${SPHERE_OPACITY.shadowPrimary})`,
                    background: `radial-gradient(circle at 70% 30%, rgba(var(--accent-rgb),${SPHERE_OPACITY.accentPrimary}) 0%, rgba(var(--accent-rgb),${SPHERE_OPACITY.accentSecondary}) 40%, transparent 100%)`,
                    border: `1px solid rgba(255,255,255,${SPHERE_OPACITY.border})`
                }}
                animate={{
                    y: [0, 25, 0],
                    x: [0, 10, 0],
                    rotate: [0, -10, 0]
                }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            >
                {/* Inner glass reflection */}
                <div
                    className="absolute inset-0 rounded-full"
                    style={{
                        background: `radial-gradient(circle at 30% 30%, rgba(255,255,255,${SPHERE_OPACITY.reflection}) 0%, transparent 30%)`
                    }}
                />
            </motion.div>

            <motion.div
                className="absolute top-1/2 right-1/4 w-16 h-16 rounded-full"
                style={{
                    opacity: SPHERE_OPACITY.overall,
                    boxShadow: `0 10px 30px rgba(0,0,0,${SPHERE_OPACITY.shadowSecondary})`,
                    background: `radial-gradient(circle at 30% 30%, rgba(255,255,255,${SPHERE_OPACITY.smallHighlight}) 0%, rgba(255,255,255,${SPHERE_OPACITY.smallLow}) 50%, transparent 100%)`
                }}
                animate={{
                    y: [0, -15, 0],
                    x: [0, -10, 0]
                }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            />
        </>
    )
}
