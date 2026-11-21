"use client"

import { startImpersonation } from "@workspace/auth/client"
import { t } from "@workspace/i18n"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { useToast } from "@workspace/ui/hooks/use-toast"

import { useBackofficeActions, useUser } from "../hooks"
import { DataTable, formatDate, formatTime, ReasonDialog } from "./parts"

export function UserDetail({ userId }: { userId: string }) {
  const { data: u } = useUser(userId)
  const actions = useBackofficeActions()
  const { toast } = useToast()
  const isAdmin = u.role === "admin"
  const fail = () => toast({ title: t("errors.generic"), variant: "destructive" })

  // A full navigation: the new session cookie must replace the admin's for every request.
  async function impersonate() {
    const res = await startImpersonation(u.id)
    if (!res.ok) return fail()
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/dashboard")
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">{u.name || u.email}</h1>
          <p className="text-sm text-muted-foreground">{u.email}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {isAdmin && <Badge>{t("backoffice.platformAdmin")}</Badge>}
            {u.banned ? <Badge variant="destructive">{t("backoffice.banned")}</Badge> : <Badge variant="secondary">{t("backoffice.active")}</Badge>}
            <span className="text-xs text-muted-foreground">{t("backoffice.signedUpOn", { date: formatDate(u.createdAt) })}</span>
          </div>
          {u.banned && (
            <p className="mt-2 text-sm">
              {t("backoffice.banDetails", { reason: u.banReason ?? "—", until: u.banExpires ? formatDate(u.banExpires) : t("backoffice.banIndefinite") })}
            </p>
          )}
        </div>
        {/* The API refuses these for platform admins too; the buttons only hide what would fail. */}
        {!isAdmin && (
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={impersonate} disabled={u.banned ?? false}>
              {t("backoffice.impersonate")}
            </Button>
            {u.banned ? (
              <Button variant="outline" disabled={actions.unban.isPending} onClick={() => actions.unban.mutateAsync(u.id).catch(fail)}>
                {t("backoffice.unban")}
              </Button>
            ) : (
              <ReasonDialog trigger={t("backoffice.ban")} title={t("backoffice.banTitle")} body={t("backoffice.banBody")} withEndDate onConfirm={(reason, expiresAt) => actions.ban.mutateAsync({ id: u.id, reason, expiresAt })} />
            )}
          </div>
        )}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{t("backoffice.sessions")}</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            headers={[t("backoffice.colDevice"), t("backoffice.colIp"), t("backoffice.colLastActive"), ""]}
            empty={t("backoffice.noSessions")}
            rows={u.sessions.map((s) => ({
              key: s.id,
              cells: [
                <span key="d">
                  {s.userAgent ?? "—"} {s.impersonatedBy && <Badge variant="secondary">{t("backoffice.impersonation")}</Badge>}
                </span>,
                s.ipAddress ?? "—",
                formatTime(s.updatedAt),
                !isAdmin && (
                  <Button key="r" size="sm" variant="outline" disabled={actions.revokeSession.isPending} onClick={() => actions.revokeSession.mutateAsync({ id: u.id, sessionId: s.id }).catch(fail)}>
                    {t("backoffice.revoke")}
                  </Button>
                ),
              ],
            }))}
          />
        </CardContent>
      </Card>
    </div>
  )
}
