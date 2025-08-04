import { cn } from "@/lib/utils"

interface IVLogoProps {
  className?: string
  textClassName?: string
  size?: 'sm' | 'md' | 'lg'
}

const sizeMap = {
  sm: {
    container: 'w-6 h-6',
    text: 'text-xs'
  },
  md: {
    container: 'w-7 h-7 sm:w-8 sm:h-8',
    text: 'text-xs sm:text-sm'
  },
  lg: {
    container: 'w-10 h-10 sm:w-12 sm:h-12',
    text: 'text-sm sm:text-base'
  }
}

export function IVLogo({ className, textClassName, size = 'md' }: IVLogoProps) {
  const sizeClasses = sizeMap[size]
  
  return (
    <div 
      className={cn(
        "bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center group-hover:scale-110 transition-transform",
        sizeClasses.container,
        className
      )}
    >
      <span 
        className={cn(
          "text-primary-foreground font-bold",
          sizeClasses.text,
          textClassName
        )}
      >
        IV
      </span>
    </div>
  )
}
