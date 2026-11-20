import type { ReactNode } from "react"

import { t } from "@workspace/i18n"

import { getSeo } from "@/lib/cms"

import { JsonLd } from "./json-ld"
import { MarketingFooter } from "./marketing-footer"
import { MarketingHeader } from "./marketing-header"

// Every public page wraps itself in this; organization and website structured data ride along.
export function MarketingShell({ children }: { children: ReactNode }) {
  const seo = getSeo()
  return (
    <div className="flex min-h-dvh flex-col overflow-x-clip bg-card font-heading text-foreground [&_a]:underline-offset-4 [&_p]:text-pretty">
      <JsonLd data={seo.buildOrganizationJsonLd()} />
      <JsonLd data={seo.buildWebsiteJsonLd()} />
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-primary focus:p-4 focus:text-primary-foreground">
        {t("marketing.skipToContent")}
      </a>
      <MarketingHeader />
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <MarketingFooter />
    </div>
  )
}
