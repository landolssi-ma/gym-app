"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { XIcon } from "lucide-react"
import * as ToastPrimitive from "radix-ui/toast"

import { Button } from "@workspace/ui/components/button"
import { dismissToast, getServerToasts, getToasts, subscribeToasts } from "@workspace/ui/hooks/use-toast"
import { cn } from "@workspace/ui/lib/utils"

const toastVariants = cva(
  "relative flex w-full items-start gap-3 rounded-md border border-border p-4 pr-12 shadow-none",
  {
    variants: {
      variant: {
        default: "bg-card text-card-foreground",
        destructive: "bg-destructive-subtle text-foreground [&>svg]:text-destructive",
      },
    },
    defaultVariants: { variant: "default" },
  },
)

function ToastProvider(props: React.ComponentProps<typeof ToastPrimitive.Provider>) {
  return <ToastPrimitive.Provider data-slot="toast-provider" {...props} />
}

function ToastViewport({ className, ...props }: React.ComponentProps<typeof ToastPrimitive.Viewport>) {
  return (
    <ToastPrimitive.Viewport
      data-slot="toast-viewport"
      role="status"
      aria-live="polite"
      className={cn("fixed inset-x-4 bottom-4 z-50 flex flex-col gap-2 sm:left-auto sm:w-96", className)}
      {...props}
    />
  )
}

function Toast({ className, variant, ...props }: React.ComponentProps<typeof ToastPrimitive.Root> & VariantProps<typeof toastVariants>) {
  return <ToastPrimitive.Root data-slot="toast" className={cn(toastVariants({ variant }), className)} {...props} />
}

function ToastTitle({ className, ...props }: React.ComponentProps<typeof ToastPrimitive.Title>) {
  return <ToastPrimitive.Title data-slot="toast-title" className={cn("font-bold", className)} {...props} />
}

function ToastDescription({ className, ...props }: React.ComponentProps<typeof ToastPrimitive.Description>) {
  return <ToastPrimitive.Description data-slot="toast-description" className={cn("text-sm", className)} {...props} />
}

function ToastClose({ className, label, ...props }: React.ComponentProps<typeof ToastPrimitive.Close> & { label: string }) {
  return (
    <ToastPrimitive.Close data-slot="toast-close" asChild {...props}>
      <Button variant="ghost" size="icon" className={cn("absolute top-1 right-1", className)} aria-label={label}>
        <XIcon aria-hidden />
      </Button>
    </ToastPrimitive.Close>
  )
}

// Mount once near the app root; feature components only call useToast().toast().
function Toaster({ closeLabel }: { closeLabel: string }) {
  const queued = React.useSyncExternalStore(subscribeToasts, getToasts, getServerToasts)
  return (
    <ToastProvider duration={4000}>
      {queued.map((item) => (
        <Toast key={item.id} open onOpenChange={(open) => !open && dismissToast(item.id)} variant={item.variant}>
          <div className="min-w-0">
            <ToastTitle>{item.title}</ToastTitle>
            {item.description && <ToastDescription>{item.description}</ToastDescription>}
          </div>
          <ToastClose label={closeLabel} />
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  )
}

export { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport, Toaster }
