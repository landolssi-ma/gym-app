import type { Metadata } from "next"

import { t } from "@workspace/i18n"
import { Skeleton } from "@workspace/ui/components/skeleton"

import { FeatureBoundary } from "@/components/feature-error"
import { Wordmark } from "@/components/wordmark"

import { Survey } from "./survey"

export const metadata: Metadata = { title: t("survey.title") }

export default function OnboardingPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col items-center gap-8 px-4 pt-12 dotted-grid">
      <Wordmark size="header" />
      <FeatureBoundary skeleton={<Skeleton className="h-80 w-full" />}>
        <Survey />
      </FeatureBoundary>
    </main>
  )
}
