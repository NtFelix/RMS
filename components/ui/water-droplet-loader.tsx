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
          {/* Water gradient */}
          <linearGradient id="water-fill-gradient" x1="50" y1="0" x2="50" y2="120">
            <stop offset="0%" stopColor="#60A5FA" />
            <stop offset="100%" stopColor="#3B82F6" />
          </linearGradient>

          {/* Clip path for the droplet shape */}
          <clipPath id="droplet-clip">
            <path d="M50 5 C50 5, 20 35, 20 60 C20 77.67, 33.43 92, 50 92 C66.57 92 80 77.67 80 60 C80 35, 50 5, 50 5 Z" />
          </clipPath>
        </defs>

        {/* Droplet outline */}
        <path
          d="M50 5 C50 5, 20 35, 20 60 C20 77.67, 33.43 92, 50 92 C66.57 92 80 77.67 80 60 C80 35, 50 5, 50 5 Z"
          fill="none"
          stroke="#3B82F6"
          strokeWidth="2.5"
          opacity="0.3"
          className="dark:opacity-40"
        />

        {/* Water fill animation - rises from bottom to top */}
        <g clipPath="url(#droplet-clip)">
          <motion.rect
            x="0"
            y="0"
            width="100"
            height="120"
            fill="url(#water-fill-gradient)"
            initial={{ y: 120 }}
            animate={{
              y: [120, 5, 120],
            }}
            transition={{
              duration: 3.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />

          {/* Wave effect on top of water */}
          <motion.path
            d="M 0,0 Q 25,-3 50,0 T 100,0 L 100,10 L 0,10 Z"
            fill="rgba(255, 255, 255, 0.2)"
            initial={{ y: 120 }}
            animate={{
              y: [120, 5, 120],
            }}
            transition={{
              duration: 3.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </g>

        {/* Light reflection */}
        <ellipse
          cx="38"
          cy="40"
          rx="6"
          ry="10"
          fill="white"
          opacity="0.5"
          clipPath="url(#droplet-clip)"
        />
        
        {/* Smaller reflection */}
        <ellipse
          cx="42"
          cy="50"
          rx="3"
          ry="5"
          fill="white"
          opacity="0.3"
          clipPath="url(#droplet-clip)"
        />
      </svg>
    </div>
  )
}
