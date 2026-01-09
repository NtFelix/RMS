'use client'

import React from 'react'
import Image from 'next/image'

interface MediaContentProps {
  src: string
  alt?: string
  type: 'image' | 'video'
  className?: string
  priority?: boolean
}

export function MediaContent({ src, alt = '', type, className = '', priority = false }: MediaContentProps) {
  if (type === 'video') {
    return (
      <video
        src={src}
        className={`w-full h-auto rounded-2xl ${className}`}
        autoPlay
        muted
        loop
        playsInline
      >
        Your browser does not support the video tag.
      </video>
    )
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={1200}
      height={800}
      className={`w-full h-auto rounded-2xl ${className}`}
      priority={priority}
      unoptimized // Supabase images are stored as pre-optimized .avif
    />
  )
}
