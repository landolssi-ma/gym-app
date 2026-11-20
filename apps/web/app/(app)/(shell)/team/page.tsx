import type { Metadata } from "next"

import { t } from "@workspace/i18n"
import { Skeleton } from "@workspace/ui/components/skeleton"

import { FeatureBoundary } from "@/components/feature-error"
import { AppShell } from "@/components/shell/app-shell"

import { TeamView } from "./team-view"

export const metadata: Metadata = { title: t("team.title") }

export default function TeamPage() {
  return (
    <AppShell title={t("team.title")} subtitle={t("team.subtitle")}>
      <FeatureBoundary skeleton={<Skeleton className="h-96 w-full" />}>
        <TeamView />
      </FeatureBoundary>
    </AppShell>
  )
}
