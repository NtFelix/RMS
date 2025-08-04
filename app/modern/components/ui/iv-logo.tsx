import { cn } from "@/lib/utils"

// Directly define the image URL here as a fallback
const MASCOT_IMAGE = {
  src: "https://ocubnwzybybcbrhsnqqs.supabase.co/storage/v1/object/public/pwa-images/favicon.png",
  alt: "ImmobilienVerwalter Mascot"
}

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
        <img
          src={MASCOT_IMAGE.src}
          alt={MASCOT_IMAGE.alt}
          className={cn(
            "object-cover w-full h-full",
            imageClassName
          )}
          loading="eager"
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
