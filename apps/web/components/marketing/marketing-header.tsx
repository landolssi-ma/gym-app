"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"

import { t } from "@workspace/i18n"
import { NavigationMenu, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, navigationMenuTriggerStyle } from "@workspace/ui/components/navigation-menu"
import { cn } from "@workspace/ui/lib/utils"

import { Wordmark } from "@/components/wordmark"

import { MobileNav } from "./mobile-nav"
import { PRIMARY_LINKS } from "./navigation-links"

// The marketing pages render the same for everyone; whether someone is signed in is read in the
// browser (the session cookie is HttpOnly). A signed-out visitor gets a 401 and keeps Log in / Sign up.
function useSignedIn() {
  const [signedIn, setSignedIn] = useState(false)
  useEffect(() => {
    let on = true
    void fetch("/api/me")
      .then((r) => on && setSignedIn(r.ok))
      .catch(() => {})
    return () => {
      on = false
    }
  }, [])
  return signedIn
}

const triggerClassName =
  "h-auto gap-1.5 rounded-full px-3.5 py-2.25 font-semibold tracking-(--tracking-quote) hover:bg-secondary focus:bg-secondary data-[state=open]:bg-secondary [&>svg]:top-0 [&>svg]:ml-0 [&>svg]:size-3.5"

export function MarketingHeader() {
  const pathname = usePathname() ?? ""
  const signedIn = useSignedIn()
  return (
    <header className="sticky top-0 z-40 bg-background">
      <div className="flex min-h-10 items-center justify-center gap-3 bg-brand-hover px-5 py-2 text-center text-xs leading-normal font-semibold text-brand-foreground max-md:min-h-15 max-md:flex-wrap max-md:gap-x-3 max-md:gap-y-1.5 max-md:text-caption [&_a]:whitespace-nowrap [&_a]:underline [&_strong]:font-mono [&_strong]:text-tiny [&_strong]:tracking-widest max-md:[&_strong]:text-micro">
        <strong>{t("marketing.announcementTag")}</strong>
        <span>{t("marketing.announcementBody")}</span>
        <Link href="/changelog">{t("marketing.announcementCta")} →</Link>
      </div>
      <div className="border-b border-border">
        <div data-slot="marketing-header-content" className="mx-auto flex min-h-19 w-full max-w-marketing items-center justify-between gap-3 px-(--page-gutter) py-4">
          <Link href="/" aria-label={t("common.homeLabel")} className="shrink-0">
            <Wordmark size="header" />
          </Link>
          <NavigationMenu className="hidden flex-none md:flex" aria-label={t("marketing.mainNavigation")}>
            <NavigationMenuList className="gap-0.5">
              {PRIMARY_LINKS.map((link) => (
                <NavigationMenuItem key={link.href}>
                  <NavigationMenuLink active={pathname === link.href} asChild className={cn(navigationMenuTriggerStyle(), triggerClassName)}>
                    <Link href={link.href}>{link.label}</Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>
              ))}
            </NavigationMenuList>
          </NavigationMenu>
          {signedIn ? (
            <div className="hidden shrink-0 items-center gap-3 text-compact md:flex">
              <Link href="/dashboard" className="rounded-full bg-primary px-4 py-2.25 font-bold text-primary-foreground shadow-brand">
                {t("marketing.openApp")}
              </Link>
            </div>
          ) : (
            <div className="hidden shrink-0 items-center gap-3.5 text-compact md:flex">
              <Link href="/sign-in" className="text-muted-foreground hover:text-foreground">
                {t("marketing.logInLabel")}
              </Link>
              <Link href="/sign-in?mode=signup" className="rounded-full bg-primary px-4 py-2.25 font-bold text-primary-foreground shadow-brand">
                {t("marketing.signUpLabel")}
              </Link>
            </div>
          )}
          <MobileNav signedIn={signedIn} />
        </div>
      </div>
    </header>
  )
}
