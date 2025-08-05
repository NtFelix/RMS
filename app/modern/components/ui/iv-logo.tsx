import { cn } from "@/lib/utils"
import { MASCOT_IMAGE } from "@/app/config/images"
import Image from "next/image"

interface IVLogoProps {
  className?: string
  imageClassName?: string
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
}

const sizeMap = {
  sm: {
    container: 'w-8 h-8',
    text: 'text-xs',
    imageSize: 24
  },
  md: {
    container: 'w-10 h-10 sm:w-12 sm:h-12',
    text: 'text-sm sm:text-base',
    imageSize: 32
  },
  lg: {
    container: 'w-16 h-16 sm:w-20 sm:h-20',
    text: 'text-lg sm:text-xl',
    imageSize: 48
  }
}

export function IVLogo({ 
  className, 
  imageClassName, 
  size = 'md',
  showText = false
}: IVLogoProps) {
  const sizeClasses = sizeMap[size]
  
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className={cn(
        "relative rounded-full overflow-hidden group-hover:scale-110 transition-transform",
        sizeClasses.container
      )}>
        <Image
          src={MASCOT_IMAGE.src}
          alt={MASCOT_IMAGE.alt}
          width={MASCOT_IMAGE.width}
          height={MASCOT_IMAGE.height}
          className={cn(
            "object-cover w-full h-full",
            imageClassName
          )}
          priority
        />
      </div>
      {showText && (
        <span className={cn(
          "font-bold text-foreground",
          sizeClasses.text
        )}>
          Immobilien<span className="text-primary">Verwalter</span>
        </span>
      )}
    </div>
  )
}
