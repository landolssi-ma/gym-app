import type { Metadata } from "next"

import { t } from "@workspace/i18n"

import { GymProfileForm } from "./gym-profile-form"

export const metadata: Metadata = { title: t("gymProfile.title") }

export default function OnboardingPage() {
  return (
    <main className="grid min-h-dvh bg-ivory md:grid-cols-[minmax(16rem,0.7fr)_minmax(32rem,1.3fr)]">
      <section className="hidden flex-col justify-between bg-beige p-10 md:flex lg:p-14">
        <p className="font-heading text-2xl font-bold text-charcoal">FitAccount</p>
        <div className="max-w-sm">
          <p className="font-heading text-section font-bold leading-tight text-charcoal">Start with where you are.</p>
          <p className="mt-4 text-muted-foreground">Your answers stay in your account and help personalize the experience.</p>
        </div>
        <p className="text-xs text-muted-foreground">Sage · Beige · Ivoire · Charcoal</p>
      </section>
      <section className="flex items-center justify-center px-4 py-8 sm:px-8">
      <div className="w-full max-w-2xl">
        <GymProfileForm />
      </div>
      </section>
    </main>
  )
}
