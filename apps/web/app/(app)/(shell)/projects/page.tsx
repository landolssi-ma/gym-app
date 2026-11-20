import type { Metadata } from "next"

import { t } from "@workspace/i18n"
import { Skeleton } from "@workspace/ui/components/skeleton"

import { FeatureBoundary } from "@/components/feature-error"
import { AppShell } from "@/components/shell/app-shell"
import { ProjectsView } from "@/features/projects"

export const metadata: Metadata = { title: t("projects.title") }

export default function ProjectsPage() {
  return (
    <AppShell title={t("projects.title")} subtitle={t("projects.subtitle")}>
      <FeatureBoundary skeleton={<Skeleton className="h-96 w-full" />}>
        <ProjectsView />
      </FeatureBoundary>
    </AppShell>
  )
}
