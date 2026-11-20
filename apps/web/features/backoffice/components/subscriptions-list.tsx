"use client"

import Link from "next/link"
import { useState } from "react"

import { PLAN_IDS, PLANS } from "@workspace/billing"
import { t } from "@workspace/i18n"
import { NativeSelect, NativeSelectOption } from "@workspace/ui/components/native-select"

import { useSubscriptions } from "../hooks"
import type { SubscriptionFilters } from "../services"
import { DataTable, formatDate, NextPage } from "./parts"

const STATUSES = ["trialing", "active", "past_due", "canceled", "ended"] as const

export function SubscriptionsList() {
  const [filters, setFilters] = useState<SubscriptionFilters>({})
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-3">
        <NativeSelect aria-label={t("backoffice.colStatus")} value={filters.status ?? ""} onChange={(e) => setFilters({ ...filters, status: (e.target.value || undefined) as SubscriptionFilters["status"] })}>
          <NativeSelectOption value="">{t("backoffice.allStatuses")}</NativeSelectOption>
          {STATUSES.map((s) => (
            <NativeSelectOption key={s} value={s}>
              {s}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <NativeSelect aria-label={t("backoffice.colPlan")} value={filters.plan ?? ""} onChange={(e) => setFilters({ ...filters, plan: e.target.value || undefined })}>
          <NativeSelectOption value="">{t("backoffice.allPlans")}</NativeSelectOption>
          {PLAN_IDS.map((p) => (
            <NativeSelectOption key={p} value={p}>
              {PLANS[p].name}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>
      <SubscriptionsPage key={JSON.stringify(filters)} filters={filters} />
    </div>
  )
}

function SubscriptionsPage({ filters }: { filters: SubscriptionFilters }) {
  const [cursor, setCursor] = useState<string>()
  const { data } = useSubscriptions(filters, cursor)
  return (
    <>
      <DataTable
        headers={[t("backoffice.colWorkspace"), t("backoffice.colPlan"), t("backoffice.colStatus"), t("backoffice.colPeriodEnd"), t("backoffice.colCancels")]}
        empty={t("backoffice.subscriptionsEmpty")}
        rows={data.subscriptions.map((s) => ({
          key: s.organizationId,
          cells: [
            <Link key="w" href={`/admin/organizations/${s.organizationId}`} className="font-medium hover:underline">
              {s.organizationName}
            </Link>,
            `${s.plan} · ${s.interval}`,
            s.status,
            formatDate(s.currentPeriodEnd),
            t(s.cancelAtPeriodEnd ? "backoffice.yes" : "backoffice.no"),
          ],
        }))}
      />
      <NextPage cursor={data.nextCursor} onNext={setCursor} />
    </>
  )
}
