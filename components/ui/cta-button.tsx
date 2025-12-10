import React from 'react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { LucideIcon } from 'lucide-react'

interface CTAButtonProps {
  variant?: 'primary' | 'secondary'
  text: string
  href?: string
  icon?: LucideIcon
  iconPosition?: 'left' | 'right'
  onClick?: () => void
  disabled?: boolean
  target?: '_blank' | '_self'
  rel?: string
  className?: string
  size?: 'sm' | 'default' | 'lg' | 'xs' | 'icon'
}

export function CTAButton({
  variant = 'primary',
  text,
  href,
  icon: Icon,
  iconPosition = 'right',
  onClick,
  disabled = false,
  target = '_self',
  rel,
  className = '',
  size = 'lg'
}: CTAButtonProps) {
  const baseClasses = size === 'lg' 
    ? 'px-12 py-6 text-xl font-semibold group'
    : size === 'default'
    ? 'px-8 py-4 text-lg font-semibold group'
    : size === 'sm'
    ? 'px-6 py-3 text-base font-semibold group'
    : 'px-4 py-2 text-sm font-semibold group'

  const primaryClasses = 'relative overflow-hidden'
  const secondaryClasses = 'text-foreground hover:bg-muted hover:text-foreground transition-all duration-300 ease-in-out transform hover:scale-105 hover:shadow-lg'

  const buttonClasses = `${baseClasses} ${variant === 'primary' ? primaryClasses : secondaryClasses} ${className}`

  const iconElement = Icon && (
    <Icon 
      className={`
        ${iconPosition === 'left' ? 'mr-2' : 'ml-2'} 
        w-5 h-5 
        transition-transform duration-300
        ${variant === 'primary' ? 'group-hover:translate-x-1' : 'group-hover:scale-110'}
      `} 
    />
  )

  const content = (
    <span className="flex items-center">
      {iconPosition === 'left' && iconElement}
      {text}
      {iconPosition === 'right' && iconElement}
    </span>
  )

  if (href) {
    return (
      <Button
        asChild
        variant={variant === 'primary' ? 'default' : 'outline'}
        size={size}
        className={buttonClasses}
        disabled={disabled}
      >
        <Link 
          href={href}
          target={target}
          rel={rel}
          onClick={onClick}
        >
          {content}
        </Link>
      </Button>
    )
  }

  return (
    <Button
      variant={variant === 'primary' ? 'default' : 'outline'}
      size={size}
      className={buttonClasses}
      onClick={onClick}
      disabled={disabled}
    >
      {content}
    </Button>
  )
}