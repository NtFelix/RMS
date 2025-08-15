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
import { CheckCircle2, XCircle, Info } from "lucide-react"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts?.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props} variant={props.variant}>
            <div className="flex items-start space-x-3">
              {props.variant === "success" && <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />}
              {props.variant === "destructive" && <XCircle className="h-5 w-5 text-red-500 mt-0.5" />}
              {props.variant === "default" && <Info className="h-5 w-5 text-blue-500 mt-0.5" />}
              <div className="grid gap-1">
                {title && <ToastTitle>{title}</ToastTitle>}
                {description && (
                  <ToastDescription>{description}</ToastDescription>
                )}
              </div>
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
