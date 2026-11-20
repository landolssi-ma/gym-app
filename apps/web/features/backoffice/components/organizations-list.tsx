"use client"

import Link from "next/link"
import { useState } from "react"

import { t } from "@workspace/i18n"
import { Badge } from "@workspace/ui/components/badge"

import { useOrganizations } from "../hooks"
import { DataTable, formatDate, NextPage, useSearch } from "./parts"

export function OrganizationsList() {
  const { query, box } = useSearch()
  return (
    <div className="flex flex-col gap-4">
      {box}
      <OrganizationsPage key={query} query={query} />
    </div>
  )
}

function OrganizationsPage({ query }: { query: string }) {
  const [cursor, setCursor] = useState<string>()
  const { data } = useOrganizations(query, cursor)
  return (
    <>
      <DataTable
        headers={[t("backoffice.colName"), t("backoffice.colOwner"), t("backoffice.colMembers"), t("backoffice.colPlan"), t("backoffice.colStatus"), t("backoffice.colCreated")]}
        empty={t("backoffice.workspacesEmpty")}
        rows={data.organizations.map((o) => ({
          key: o.id,
          cells: [
            <Link key="n" href={`/admin/organizations/${o.id}`} className="font-medium hover:underline">
              {o.name}
            </Link>,
            o.ownerEmail ?? "—",
            o.memberCount,
            o.plan ? `${o.plan} · ${o.status}` : "—",
            <WorkspaceState key="s" suspended={o.suspended} deletedAt={o.deletedAt} />,
            formatDate(o.createdAt),
          ],
        }))}
      />
      <NextPage cursor={data.nextCursor} onNext={setCursor} />
    </>
  )
}

export function WorkspaceState({ suspended, deletedAt }: { suspended: boolean; deletedAt: string | null }) {
  if (deletedAt) return <Badge variant="destructive">{t("backoffice.deletedOn", { date: formatDate(deletedAt) })}</Badge>
  if (suspended) return <Badge variant="destructive">{t("backoffice.suspended")}</Badge>
  return <span className="text-xs text-muted-foreground">{t("backoffice.active")}</span>
}
