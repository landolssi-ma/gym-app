"use client"

import Link from "next/link"
import { useState } from "react"

import { t } from "@workspace/i18n"
import { Badge } from "@workspace/ui/components/badge"

import { useUsers } from "../hooks"
import { DataTable, formatDate, NextPage, useSearch } from "./parts"

export function UsersList() {
  const { query, box } = useSearch()
  return (
    <div className="flex flex-col gap-4">
      {box}
      <UsersPage key={query} query={query} />
    </div>
  )
}

function UsersPage({ query }: { query: string }) {
  const [cursor, setCursor] = useState<string>()
  const { data } = useUsers(query, cursor)
  return (
    <>
      <DataTable
        headers={[t("backoffice.colName"), t("backoffice.colEmail"), t("backoffice.colRole"), t("backoffice.colStatus"), t("backoffice.colSignedUp")]}
        empty={t("backoffice.usersEmpty")}
        rows={data.users.map((u) => ({
          key: u.id,
          cells: [
            <Link key="n" href={`/admin/users/${u.id}`} className="font-medium underline-offset-2 hover:underline">
              {u.name || u.email}
            </Link>,
            <span key="e" className="text-muted-foreground">{u.email}</span>,
            <Badge key="r" variant={u.role === "admin" ? "default" : "secondary"}>{t(u.role === "admin" ? "backoffice.platformAdmin" : "backoffice.roleUser")}</Badge>,
            u.banned ? <Badge key="s" variant="destructive">{t("backoffice.banned")}</Badge> : <span key="s" className="text-xs text-muted-foreground">{t("backoffice.active")}</span>,
            <span key="c" className="text-muted-foreground">{formatDate(u.createdAt)}</span>,
          ],
        }))}
      />
      <NextPage cursor={data.nextCursor} onNext={setCursor} />
    </>
  )
}
