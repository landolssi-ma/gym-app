import type { Metadata } from "next"

import { t } from "@workspace/i18n"

import { GymProfileForm } from "./gym-profile-form"

export const metadata: Metadata = { title: t("gymProfile.title") }

export default function OnboardingPage() {
  return (
    <main className="grid min-h-dvh bg-ivory md:grid-cols-[minmax(16rem,0.7fr)_minmax(32rem,1.3fr)]">
      <section className="hidden flex-col justify-between bg-beige p-10 md:flex lg:p-14">
        <p className="font-heading text-2xl font-bold text-charcoal">FitTrack</p>
        <div className="flex flex-col gap-6">
          <div className="flex size-20 items-center justify-center rounded-2xl bg-sage/15">
            <svg viewBox="0 0 48 48" className="size-11 text-sage" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              {/* dumbbell */}
              <rect x="3" y="19" width="8" height="10" rx="3" />
              <rect x="37" y="19" width="8" height="10" rx="3" />
              <line x1="11" y1="24" x2="37" y2="24" />
              <rect x="13" y="15" width="4" height="18" rx="2" />
              <rect x="31" y="15" width="4" height="18" rx="2" />
            </svg>
          </div>
          <div className="max-w-xs">
            <p className="font-heading text-section font-bold leading-tight text-charcoal">Start with where you are.</p>
            <p className="mt-4 text-muted-foreground">A few details help us tailor your experience. Your answers stay private in your account.</p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Takes about 2 minutes.</p>
      </section>
      <section className="flex items-center justify-center px-6 py-10 sm:px-10">
        <div className="w-full max-w-xl">
          <GymProfileForm />
        </div>
      </section>
    </main>
  )
}
