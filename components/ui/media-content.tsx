'use client'

import React from 'react'

interface MediaContentProps {
  src: string
  alt?: string
  type: 'image' | 'video'
  className?: string
}

export function MediaContent({ src, alt = '', type, className = '' }: MediaContentProps) {
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
    <img
      src={src}
      alt={alt}
      className={`w-full h-auto rounded-2xl ${className}`}
    />
  )
}
