import type { Metadata } from "next"

import { t } from "@workspace/i18n"
import { Skeleton } from "@workspace/ui/components/skeleton"

import { FeatureBoundary } from "@/components/feature-error"
import { AppShell } from "@/components/shell/app-shell"

import { ProfileView } from "./profile-view"

export const metadata: Metadata = { title: t("settings.profile.title") }

export default function Page() {
  return (
    <AppShell title={t("settings.profile.title")} subtitle={t("settings.profile.subtitle")}>
      <FeatureBoundary skeleton={<Skeleton className="mx-auto h-80 w-full max-w-180" />}>
        <ProfileView />
      </FeatureBoundary>
    </AppShell>
  )
}
