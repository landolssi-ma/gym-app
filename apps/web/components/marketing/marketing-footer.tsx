"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { t } from "@workspace/i18n"

import { Wordmark } from "@/components/wordmark"
import { site } from "@/config/site"

import { FOOTER_COLUMNS } from "./navigation-links"

export function MarketingFooter() {
  const pathname = usePathname()
  return (
    <footer className="border-t border-border px-6 pt-13.5 pb-6">
      <div className="mx-auto grid max-w-290 grid-cols-(--grid-footer) items-start gap-8 max-wide:grid-cols-4 max-md:grid-cols-2 max-stack:grid-cols-1 max-stack:gap-7">
        <div id="contact" className="scroll-mt-40 max-wide:col-span-full">
          <Wordmark size="header" />
          <p className="mt-3 max-w-60 text-body-sm leading-normal text-muted-foreground">{t("marketing.footerTagline")}</p>
          <a href={`mailto:${site.supportEmail}`} className="mt-4 inline-block text-sm break-all text-muted-foreground underline decoration-border underline-offset-4 hover:text-foreground">
            {site.supportEmail}
          </a>
        </div>
        {FOOTER_COLUMNS.map((column) => (
          <div key={column.title}>
            <h2 className="mb-3.5 font-mono text-caption leading-(--leading-natural) font-semibold tracking-widest uppercase">{column.title}</h2>
            <nav aria-label={column.title} className="flex flex-col gap-2.5">
              {column.links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={pathname === link.href ? "page" : undefined}
                  className="text-sm leading-normal text-muted-foreground hover:text-foreground hover:underline aria-[current=page]:font-semibold aria-[current=page]:text-foreground"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        ))}
      </div>
      <div className="mx-auto mt-11 flex max-w-290 justify-between gap-5 border-t border-border pt-5 text-xs leading-normal text-muted-foreground max-md:flex-col">
        <p>{t("marketing.footerCopyright", { year: new Date().getFullYear(), product: site.name })}</p>
        <Link href="/privacy">{t("marketing.navPrivacy")}</Link>
      </div>
    </footer>
  )
}
