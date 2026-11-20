"use client"

import Link from "next/link"
import { useState } from "react"

import { t } from "@workspace/i18n"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"

import { useAuditLog } from "../hooks"
import type { AuditFilters } from "../services"
import { DataTable, formatTime, NextPage } from "./parts"

// Dates are whole days in the admin's time zone: `to` includes the chosen day.
const dayStart = (d: string) => (d ? new Date(`${d}T00:00:00`).toISOString() : undefined)
const dayEnd = (d: string) => (d ? new Date(new Date(`${d}T00:00:00`).getTime() + 86_400_000).toISOString() : undefined)

export function AuditLog({ initial }: { initial: AuditFilters }) {
  const [form, setForm] = useState({ organizationId: initial.organizationId ?? "", actorId: initial.actorId ?? "", action: initial.action ?? "", from: "", to: "" })
  const [filters, setFilters] = useState<AuditFilters>(initial)
  const field = (key: keyof typeof form, label: string, type = "text") => (
    <div className="flex flex-col gap-1">
      <Label htmlFor={`audit-${key}`}>{label}</Label>
      <Input id={`audit-${key}`} type={type} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
    </div>
  )
  return (
    <div className="flex flex-col gap-4">
      <form
        className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6 lg:items-end"
        onSubmit={(e) => {
          e.preventDefault()
          setFilters({ organizationId: form.organizationId.trim(), actorId: form.actorId.trim(), action: form.action.trim(), from: dayStart(form.from), to: dayEnd(form.to) })
        }}
      >
        {field("organizationId", t("backoffice.colWorkspace"))}
        {field("actorId", t("backoffice.colActor"))}
        {field("action", t("backoffice.colAction"))}
        {field("from", t("backoffice.from"), "date")}
        {field("to", t("backoffice.to"), "date")}
        <button type="submit" className="min-h-9 rounded-control bg-primary px-4 text-sm font-semibold text-primary-foreground">
          {t("backoffice.filter")}
        </button>
      </form>
      <AuditPage key={JSON.stringify(filters)} filters={filters} />
    </div>
  )
}

function AuditPage({ filters }: { filters: AuditFilters }) {
  const [cursor, setCursor] = useState<string>()
  const { data } = useAuditLog(filters, cursor)
  return (
    <>
      <DataTable
        headers={[t("backoffice.colTime"), t("backoffice.colAction"), t("backoffice.colActor"), t("backoffice.colWorkspace"), t("backoffice.colTarget"), t("backoffice.colDetails")]}
        empty={t("backoffice.auditEmpty")}
        rows={data.entries.map((e) => ({
          key: e.id,
          cells: [
            <span key="t" className="whitespace-nowrap">{formatTime(e.createdAt)}</span>,
            <code key="a" className="text-xs">{e.action}</code>,
            <span key="u">
              <Link href={`/admin/users/${e.actorId}`} className="hover:underline">
                {e.actorEmail ?? e.actorId}
              </Link>
              {e.impersonatorId && (
                <span className="block text-xs text-muted-foreground">
                  {t("backoffice.viaImpersonation")} <Link href={`/admin/users/${e.impersonatorId}`} className="underline">{e.impersonatorId}</Link>
                </span>
              )}
            </span>,
            e.organizationId ? (
              <Link key="w" href={`/admin/organizations/${e.organizationId}`} className="font-mono text-xs hover:underline">
                {e.organizationId}
              </Link>
            ) : (
              "—"
            ),
            <span key="g" className="text-xs">{e.targetType} <span className="font-mono">{e.targetId}</span></span>,
            <code key="m" className="text-xs break-all">{Object.keys(e.metadata).length ? JSON.stringify(e.metadata) : ""}</code>,
          ],
        }))}
      />
      <NextPage cursor={data.nextCursor} onNext={setCursor} />
    </>
  )
}
