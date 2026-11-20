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
    <main className="mx-auto flex max-w-md flex-col gap-4 px-4 pt-8 sm:px-6 sm:pt-16">
      <SignInForm error={typeof error === "string" ? error : undefined} next={validNext} signup={mode === "signup"} />
    </main>
  )
}
