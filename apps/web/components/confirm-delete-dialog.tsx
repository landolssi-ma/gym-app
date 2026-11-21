"use client"

import { useId, useState } from "react"

import { t } from "@workspace/i18n"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@workspace/ui/components/alert-dialog"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Spinner } from "@workspace/ui/components/spinner"

import { ApiError } from "@/lib/api-fetch"
import { errorMessage } from "@/lib/errors"

// A destructive action: the dialog names what goes, and Delete stays disabled until `value` is typed
// exactly (no normalization).
export function ConfirmDeleteDialog({ trigger, title, body, confirmLabel, value, disabled, onConfirm }: { trigger: string; title: string; body: string; confirmLabel: string; value: string; disabled?: boolean; onConfirm: (typed: string) => Promise<unknown> }) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState("")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function confirm(e: React.MouseEvent) {
    e.preventDefault()
    setPending(true)
    setError(null)
    try {
      await onConfirm(typed)
    } catch (err) {
      setError(errorMessage(err instanceof ApiError ? err.message : undefined))
      setPending(false)
    }
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setTyped("")
      }}
    >
      <AlertDialogTrigger asChild>
        <Button variant="destructive" disabled={disabled}>
          {trigger}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{body}</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex flex-col gap-2">
          <Label htmlFor={id}>{confirmLabel}</Label>
          <Input id={id} value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
          {error && (
            <p role="alert" className="text-sm font-medium text-destructive">
              {error}
            </p>
          )}
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
          <AlertDialogAction variant="destructive" disabled={typed !== value || pending} onClick={confirm}>
            {pending && <Spinner />}
            {t("common.delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
