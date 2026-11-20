import type { Metadata } from "next"

import { t } from "@workspace/i18n"

import { MarketingShell } from "@/components/marketing/marketing-shell"
import { Faq } from "@/components/marketing/sections/faq"
import { FinalCta } from "@/components/marketing/sections/final-cta"
import { FounderQuote } from "@/components/marketing/sections/founder-quote"
import { Hero } from "@/components/marketing/sections/hero"
import { HowItWorks } from "@/components/marketing/sections/how-it-works"
import { StatsProof } from "@/components/marketing/sections/stats-proof"
import { ThreeStepProcess } from "@/components/marketing/sections/three-step-process"
import { TrustGrid } from "@/components/marketing/sections/trust-grid"
import { publicMetadata } from "@/lib/public-metadata"

export const metadata: Metadata = publicMetadata("/", t("marketing.metaTitle"), t("marketing.metaDescription"))

export default function HomePage() {
  return (
    <MarketingShell>
      <Hero />
      <StatsProof />
      <HowItWorks />
      <ThreeStepProcess />
      <TrustGrid />
      <FounderQuote />
      <Faq />
      <FinalCta />
    </MarketingShell>
  )
}
