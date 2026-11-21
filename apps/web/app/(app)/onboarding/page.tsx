import type { Metadata } from "next"

import { t } from "@workspace/i18n"

import { GymProfileForm } from "./gym-profile-form"

export const metadata: Metadata = { title: t("gymProfile.title") }

export default function OnboardingPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-2xl">
        <GymProfileForm />
      </div>
    </main>
  )
}
