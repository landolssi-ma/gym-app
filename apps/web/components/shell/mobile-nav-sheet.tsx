"use client"

import { useRouter } from "next/navigation"

import { t } from "@workspace/i18n"
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@workspace/ui/components/dialog"
import { MenuIcon } from "@workspace/ui/components/icons"

import { ADMIN_NAV, NAV, SETTINGS_NAV, visibleItems } from "@/config/nav"
import type { Me } from "@/features/auth"

import { Avatar } from "./avatar"
import { SidebarNav } from "./sidebar-nav"
import { displayName, signOutAndRedirect } from "./user-identity"

// Below the xl breakpoint the sidebar and the user menu become this sheet. It reuses SidebarNav and
// the same nav config, so mobile can never drift from desktop.
export function MobileNavSheet({ me }: { me: Me }) {
  const router = useRouter()
  const name = displayName(me.user.name, me.user.email)
  return (
    <Dialog>
      <DialogTrigger className="flex min-h-11 items-center gap-2 rounded-full border border-border bg-card px-2.5 py-1.5" aria-label={t("app.openMenu")}>
        <Avatar name={name} image={me.user.image} className="size-8 text-xs" />
        <MenuIcon className="size-4" aria-hidden />
      </DialogTrigger>
      <DialogContent className="inset-x-0 top-auto bottom-0 mx-0 max-h-dvh max-w-none translate-y-0 gap-4 overflow-y-auto rounded-t-2xl rounded-b-none border-b-0 p-6">
        <DialogTitle className="sr-only">{t("app.mobileMenuTitle")}</DialogTitle>
        <div className="mx-auto h-1.5 w-10 rounded-full bg-border" aria-hidden="true" />
        <div className="flex items-center gap-3">
          <Avatar name={name} image={me.user.image} className="size-10 text-sm" />
          <div className="flex flex-col">
            <span className="text-sm font-bold">{name}</span>
            <span className="text-xs text-muted-foreground">{me.user.email}</span>
          </div>
        </div>
        <SidebarNav items={visibleItems(NAV, { role: me.orgRole, features: me.features })} />
        <div className="border-t-2 border-border" />
        <p className="px-3 text-xs font-bold text-muted-foreground uppercase">{t("app.settingsLabel")}</p>
        <SidebarNav items={[...SETTINGS_NAV, ...(me.isAdmin ? [ADMIN_NAV] : [])]} />
        <div className="border-t-2 border-border" />
        <button type="button" onClick={() => signOutAndRedirect(router)} className="min-h-11 rounded-md px-3 py-2.5 text-left text-sm font-semibold text-foreground hover:bg-accent">
          {t("common.signOut")}
        </button>
      </DialogContent>
    </Dialog>
  )
}
