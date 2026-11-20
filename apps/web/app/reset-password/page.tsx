import type { Metadata } from "next"

import { t } from "@workspace/i18n"

import { ResetPasswordForm } from "./reset-password-form"

export const metadata: Metadata = { title: t("auth.resetHeading") }

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string | string[]; error?: string | string[] }> }) {
  const { token, error } = await searchParams
  return (
    <main className="mx-auto flex max-w-md flex-col gap-4 px-4 pt-8 sm:px-6 sm:pt-16">
      <ResetPasswordForm token={typeof token === "string" && !error ? token : null} />
    </main>
  )
}
