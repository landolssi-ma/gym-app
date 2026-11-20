"use client"

import Link from "next/link"
import { useEffect, useState } from "react"

import { t } from "@workspace/i18n"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@workspace/ui/components/dialog"
import { MenuIcon, XIcon } from "@workspace/ui/components/icons"

import { Wordmark } from "@/components/wordmark"

import { PRIMARY_LINKS } from "./navigation-links"

export function MobileNav({ signedIn = false }: { signedIn?: boolean }) {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 768px)")
    const closeOnDesktop = () => desktop.matches && setOpen(false)
    desktop.addEventListener("change", closeOnDesktop)
    return () => desktop.removeEventListener("change", closeOnDesktop)
  }, [])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex size-10 items-center justify-center rounded-md border border-border bg-card md:hidden" aria-label={t("marketing.openMenuLabel")}>
        <MenuIcon className="size-5" aria-hidden />
      </DialogTrigger>
      <DialogContent className="inset-y-0 right-0 left-auto m-0 h-dvh w-full max-w-105 translate-y-0 gap-0 overflow-hidden rounded-none border-0 bg-background p-0 font-heading">
        <DialogTitle className="sr-only">{t("marketing.mobileMenuTitle")}</DialogTitle>
        <DialogDescription className="sr-only">{t("marketing.navDescription")}</DialogDescription>
        <div className="flex shrink-0 items-center justify-between border-b border-border bg-card px-4.5 py-4">
          <DialogClose asChild>
            <Link href="/" aria-label={t("common.homeLabel")}>
              <Wordmark size="header" />
            </Link>
          </DialogClose>
          <DialogClose className="inline-flex size-9.5 shrink-0 items-center justify-center rounded-md border border-border bg-card" aria-label={t("marketing.closeMenuLabel")}>
            <XIcon className="size-4" aria-hidden />
          </DialogClose>
        </div>
        <nav className="min-h-0 flex-1 overflow-y-auto px-3.5 pt-2 pb-3.5" aria-label={t("marketing.mobileMenuTitle")}>
          {PRIMARY_LINKS.map((link) => (
            <DialogClose key={link.href} asChild>
              <Link href={link.href} className="block border-b border-border px-1.5 py-4 text-lg leading-normal font-bold tracking-(--tracking-title)">
                {link.label}
              </Link>
            </DialogClose>
          ))}
        </nav>
        <div className="flex shrink-0 flex-col gap-2.5 border-t border-border bg-card p-4.5">
          {signedIn ? (
            <Link href="/dashboard" className="rounded-full bg-primary px-4 py-3 text-center font-bold text-primary-foreground shadow-brand">
              {t("marketing.openApp")}
            </Link>
          ) : (
            <>
              <Link href="/sign-in?mode=signup" className="rounded-full bg-primary px-4 py-3 text-center font-bold text-primary-foreground shadow-brand">
                {t("marketing.signUpLabel")}
              </Link>
              <Link href="/sign-in" className="rounded-full border border-border px-4 py-3 text-center font-semibold">
                {t("marketing.logInLabel")}
              </Link>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
