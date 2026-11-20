import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { t } from "@workspace/i18n"

import { Providers } from "@/components/providers"
import { isSignedInFresh } from "@/lib/api-server"

import { AcceptInviteView } from "./accept-invite-view"

export const metadata: Metadata = { title: t("team.accept.metaTitle") }

export default async function AcceptInvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  // An invitee without a session signs in (or up) first, then comes back here.
  if (!(await isSignedInFresh())) redirect(`/sign-in?next=${encodeURIComponent(`/team/accept/${token}`)}`)
  return (
    <Providers>
      <main className="mx-auto flex min-h-screen max-w-xl items-center px-4">
        <AcceptInviteView token={token} />
      </main>
    </Providers>
  )
}
