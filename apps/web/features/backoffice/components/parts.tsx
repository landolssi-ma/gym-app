"use client"

import { useEffect, useState, type ReactNode } from "react"

import { t } from "@workspace/i18n"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@workspace/ui/components/alert-dialog"
import { Button } from "@workspace/ui/components/button"
import { SearchIcon } from "@workspace/ui/components/icons"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Spinner } from "@workspace/ui/components/spinner"
import { Textarea } from "@workspace/ui/components/textarea"

const dateFmt = new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric" })
const timeFmt = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" })
export const formatDate = (d: string | null) => (d ? dateFmt.format(new Date(d)) : "—")
export const formatTime = (d: string) => timeFmt.format(new Date(d))

// A search box whose value settles 300 ms after the last keystroke.
export function useSearch() {
  const [input, setInput] = useState("")
  const [query, setQuery] = useState("")
  useEffect(() => {
    const id = setTimeout(() => setQuery(input.trim()), 300)
    return () => clearTimeout(id)
  }, [input])
  const box = (
    <div className="relative max-w-sm">
      <SearchIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input className="pl-9" placeholder={t("backoffice.searchPlaceholder")} aria-label={t("backoffice.searchPlaceholder")} value={input} onChange={(e) => setInput(e.target.value)} />
    </div>
  )
  return { query, box }
}

export function DataTable({ headers, rows, empty }: { headers: string[]; rows: { key: string; cells: ReactNode[] }[]; empty: string }) {
  if (!rows.length) return <p className="text-sm text-muted-foreground">{empty}</p>
  return (
    <div className="overflow-x-auto rounded-panel border border-border bg-card">
      <table className="w-full text-left text-sm">
        <thead className="bg-muted/50 text-xs font-bold tracking-wide text-muted-foreground uppercase">
          <tr>
            {headers.map((h) => (
              <th key={h} className="px-4 py-2 font-bold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className="border-t border-border hover:bg-accent">
              {r.cells.map((cell, i) => (
                <td key={i} className="px-4 py-2">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function NextPage({ cursor, onNext }: { cursor: string | null; onNext: (c: string) => void }) {
  return cursor ? (
    <Button variant="outline" className="self-start" onClick={() => onNext(cursor)}>
      {t("backoffice.nextPage")}
    </Button>
  ) : null
}

// A destructive action that needs a reason (ban, suspend). Stays open until the action succeeds.
export function ReasonDialog({ trigger, title, body, withEndDate = false, disabled, onConfirm }: { trigger: string; title: string; body: string; withEndDate?: boolean; disabled?: boolean; onConfirm: (reason: string, endDate: string | null) => Promise<unknown> }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState("")
  const [endDate, setEndDate] = useState("")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(false)
  async function confirm(e: React.MouseEvent) {
    e.preventDefault()
    setPending(true)
    setError(false)
    try {
      await onConfirm(reason.trim(), endDate ? new Date(`${endDate}T23:59:59`).toISOString() : null)
      setOpen(false)
      setReason("")
      setEndDate("")
    } catch {
      setError(true)
    } finally {
      setPending(false)
    }
  }
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
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
          <Label htmlFor="backoffice-reason">{t("backoffice.reasonLabel")}</Label>
          <Textarea id="backoffice-reason" value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} />
          {withEndDate && (
            <>
              <Label htmlFor="backoffice-end">{t("backoffice.endDateLabel")}</Label>
              <Input id="backoffice-end" type="date" value={endDate} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setEndDate(e.target.value)} />
            </>
          )}
        </div>
        {error && (
          <p role="alert" className="text-sm font-medium text-destructive">
            {t("errors.generic")}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel>{t("backoffice.cancel")}</AlertDialogCancel>
          <AlertDialogAction variant="destructive" disabled={pending || !reason.trim()} onClick={confirm}>
            {pending && <Spinner />}
            {trigger}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
