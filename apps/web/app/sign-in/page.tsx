import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { t } from "@workspace/i18n"

import { isSignedInFresh } from "@/lib/api-server"

import { safeNext } from "./safe-next"
import { SignInForm } from "./sign-in-form"

export const metadata: Metadata = { title: t("auth.metaTitle") }

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ error?: string | string[]; next?: string | string[]; mode?: string | string[] }> }) {
  const { error, next, mode } = await searchParams
  const validNext = safeNext(next)
  // Reachable anonymously, so an already signed-in visitor goes straight on.
  if (await isSignedInFresh()) redirect(validNext ?? "/post-sign-in")
  return (
    <main className="grid min-h-dvh bg-ivory md:grid-cols-[minmax(18rem,0.8fr)_minmax(28rem,1.2fr)]">
      <section className="hidden flex-col justify-between bg-beige p-10 md:flex lg:p-14">
        <div>
          <p className="font-heading text-2xl font-bold text-charcoal">FitAccount</p>
          <p className="mt-2 text-sm text-muted-foreground">Your training. Your goals. One account.</p>
        </div>
        <div className="max-w-sm">
          <p className="font-heading text-section font-bold leading-tight text-charcoal">Build a routine that fits your life.</p>
          <p className="mt-4 max-w-xs text-muted-foreground">A clear gym profile helps shape each next step around your goals.</p>
        </div>
        <p className="text-xs text-muted-foreground">One plan. No subscriptions.</p>
      </section>
      <section className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <SignInForm error={typeof error === "string" ? error : undefined} next={validNext} signup={mode === "signup"} />
        </div>
      </section>
    </main>
  )
}
