"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface WaterDropletLoaderProps {
  className?: string
  size?: "sm" | "md" | "lg"
}

export function WaterDropletLoader({ className, size = "md" }: WaterDropletLoaderProps) {
  const sizeClasses = {
    sm: "w-16 h-20",
    md: "w-24 h-28",
    lg: "w-32 h-40",
  }

  const svgSizes = {
    sm: { width: 64, height: 80 },
    md: { width: 96, height: 112 },
    lg: { width: 128, height: 160 },
  }

  const sizes = svgSizes[size]

  return (
    <div className={cn("relative flex items-center justify-center", sizeClasses[size], className)}>
      <svg
        width={sizes.width}
        height={sizes.height}
        viewBox="0 0 100 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-lg"
      >
        <defs>
          {/* Animated gradient that moves from bottom to top */}
          <linearGradient id="moving-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0" />
            <stop offset="50%" stopColor="#3B82F6" stopOpacity="1" />
            <stop offset="100%" stopColor="#60A5FA" stopOpacity="1" />
            <animate
              attributeName="y1"
              values="100%;0%;100%"
              dur="2s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="y2"
              values="200%;100%;200%"
              dur="2s"
              repeatCount="indefinite"
            />
          </linearGradient>
        </defs>

        {/* Droplet outline */}
        <path
          d="M50 5 C50 5, 20 35, 20 60 C20 77.67, 33.43 92, 50 92 C66.57 92 80 77.67 80 60 C80 35, 50 5, 50 5 Z"
          fill="none"
          stroke="#E5E7EB"
          strokeWidth="2.5"
          className="dark:stroke-gray-700"
        />

        {/* Animated border moving from bottom to top */}
        <motion.path
          d="M50 5 C50 5, 20 35, 20 60 C20 77.67, 33.43 92, 50 92 C66.57 92 80 77.67 80 60 C80 35, 50 5, 50 5 Z"
          fill="none"
          stroke="url(#moving-gradient)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="200"
          animate={{
            strokeDashoffset: [200, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "linear",
          }}
        />

        {/* Inner fill with subtle animation */}
        <motion.path
          d="M50 5 C50 5, 20 35, 20 60 C20 77.67, 33.43 92, 50 92 C66.57 92 80 77.67 80 60 C80 35, 50 5, 50 5 Z"
          fill="#3B82F6"
          opacity="0.1"
          animate={{
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Light reflection */}
        <ellipse
          cx="38"
          cy="40"
          rx="6"
          ry="10"
          fill="white"
          opacity="0.4"
        />
      </svg>
    </div>
  )
}
