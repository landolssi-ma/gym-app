"use client"

import Link from "next/link"

import { t } from "@workspace/i18n"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { useToast } from "@workspace/ui/hooks/use-toast"

import { useBackofficeActions, useOrganization } from "../hooks"
import { WorkspaceState } from "./organizations-list"
import { DataTable, formatDate, ReasonDialog } from "./parts"

export function OrganizationDetail({ orgId }: { orgId: string }) {
  const { data: o } = useOrganization(orgId)
  const actions = useBackofficeActions()
  const { toast } = useToast()
  const sub = o.subscription
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">{o.name}</h1>
          <p className="font-mono text-xs text-muted-foreground">{o.id}</p>
          <div className="mt-2 flex gap-2">
            <WorkspaceState suspended={o.suspended} deletedAt={o.deletedAt} />
            <Link href={`/admin/audit?organizationId=${o.id}`} className="text-xs underline">
              {t("backoffice.viewAudit")}
            </Link>
          </div>
        </div>
        {o.suspended ? (
          <Button variant="outline" disabled={actions.unsuspend.isPending} onClick={() => actions.unsuspend.mutateAsync(o.id).catch(() => toast({ title: t("errors.generic"), variant: "destructive" }))}>
            {t("backoffice.unsuspend")}
          </Button>
        ) : (
          <ReasonDialog trigger={t("backoffice.suspend")} title={t("backoffice.suspendTitle")} body={t("backoffice.suspendBody")} onConfirm={(reason) => actions.suspend.mutateAsync({ id: o.id, reason })} />
        )}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{t("backoffice.subscription")}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          {sub ? (
            <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div><dt className="text-muted-foreground">{t("backoffice.colPlan")}</dt><dd className="font-semibold">{sub.plan} · {sub.interval}</dd></div>
              <div><dt className="text-muted-foreground">{t("backoffice.colStatus")}</dt><dd className="font-semibold">{sub.status}</dd></div>
              <div><dt className="text-muted-foreground">{t("backoffice.colPeriodEnd")}</dt><dd className="font-semibold">{formatDate(sub.currentPeriodEnd)}</dd></div>
              <div><dt className="text-muted-foreground">{t("backoffice.colCancels")}</dt><dd className="font-semibold">{t(sub.cancelAtPeriodEnd ? "backoffice.yes" : "backoffice.no")}</dd></div>
            </dl>
          ) : (
            <p className="text-muted-foreground">{t("backoffice.noSubscription")}</p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t("backoffice.members")}</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            headers={[t("backoffice.colName"), t("backoffice.colEmail"), t("backoffice.colRole")]}
            empty={t("backoffice.noMembers")}
            rows={o.members.map((m) => ({
              key: m.userId,
              cells: [
                <Link key="n" href={`/admin/users/${m.userId}`} className="font-medium hover:underline">
                  {m.name || m.email}
                </Link>,
                m.email,
                m.role,
              ],
            }))}
          />
        </CardContent>
      </Card>
    </div>
  )
}
