"use client"

import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

export function Toaster() {
  console.log("[DebugToaster] Rendering or re-rendering.");
  const { toasts } = useToast()

  console.log("[DebugToaster] Toasts received from useToast():", JSON.stringify(toasts, null, 2));

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport className="fixed top-0 right-0 z-[100] flex max-h-screen w-full flex-col p-4 sm:top-0 sm:right-0 sm:bottom-auto md:max-w-[420px]" />
    </ToastProvider>
  )
}
