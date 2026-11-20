import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { t } from "@workspace/i18n"

import { ActivationPoll } from "./activation-poll"

export const metadata: Metadata = { title: t("checkout.title") }

// Checkout returns here. A checkout that was left or failed carries its status: back to the plans.
export default async function CheckoutSuccessPage({ searchParams }: { searchParams: Promise<{ status?: string | string[] }> }) {
  const { status } = await searchParams
  if (typeof status === "string" && !["succeeded", "active"].includes(status)) redirect("/plans")
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl items-center px-4">
      <ActivationPoll />
    </main>
  )
}
