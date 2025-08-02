import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

interface LoadingStateProps {
  message?: string
  className?: string
  size?: "sm" | "md" | "lg"
  showSpinner?: boolean
}

export function LoadingState({ 
  message = "Lädt...", 
  className,
  size = "md",
  showSpinner = true 
}: LoadingStateProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center space-y-4 p-8",
      className
    )}>
      {showSpinner && (
        <div className="relative">
          <Spinner size={size} className="text-primary" />
          {/* Pulsing background circle for extra visual appeal */}
          <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping" />
        </div>
      )}
      <div className="text-center space-y-2">
        <p className="text-sm font-medium text-muted-foreground animate-pulse">
          {message}
        </p>
        <div className="flex space-x-1 justify-center">
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  )
}