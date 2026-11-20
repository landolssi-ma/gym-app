import { t } from "@workspace/i18n"
import {
  AlignLeftIcon,
  CopyIcon,
  EyeIcon,
  ShieldCheckIcon,
  SmartphoneIcon,
  StoreIcon,
} from "@workspace/ui/components/icons"

import { MarketingCta, SectionHeading } from "../section-heading"

const ITEMS = [
  {
    title: t("marketing.trustGrid1Title"),
    body: t("marketing.trustGrid1Body"),
    Icon: AlignLeftIcon,
  },
  {
    title: t("marketing.trustGrid2Title"),
    body: t("marketing.trustGrid2Body"),
    Icon: EyeIcon,
  },
  {
    title: t("marketing.trustGrid3Title"),
    body: t("marketing.trustGrid3Body"),
    Icon: StoreIcon,
  },
  {
    title: t("marketing.trustGrid4Title"),
    body: t("marketing.trustGrid4Body"),
    Icon: ShieldCheckIcon,
  },
  {
    title: t("marketing.control5Title"),
    body: t("marketing.control5Body"),
    Icon: SmartphoneIcon,
  },
  {
    title: t("marketing.control6Title"),
    body: t("marketing.control6Body"),
    Icon: CopyIcon,
  },
]

export function TrustGrid() {
  return (
    <section
      className="pt-(--section-space) [--section-swatch:var(--butter)]"
      id="features"
    >
      <div className="mx-auto w-full max-w-marketing px-(--page-gutter)">
        <SectionHeading
          eyebrow={t("marketing.controlEyebrow")}
          title={t("marketing.trustGridHeading")}
        >
          {t("marketing.controlBody")}
        </SectionHeading>
        <div className="mt-11 grid grid-cols-3 gap-4.5 max-content:grid-cols-2 max-compact:grid-cols-1">
          {ITEMS.map(({ title, body, Icon }) => (
            <article
              className="reveal-on-scroll rounded-2xl border border-border p-6 nth-2:[&>span]:bg-sky nth-3:[&>span]:bg-blush nth-4:[&>span]:bg-butter nth-5:[&>span]:bg-secondary"
              key={title}
            >
              <span className="inline-flex size-9.5 items-center justify-center rounded-badge border-(length:--border-width-fine) border-forest bg-pop shadow-[2px_2px_0_var(--forest)]">
                <Icon className="size-4" aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-lg leading-(--leading-label)">
                {title}
              </h3>
              <p className="mt-2 text-sm leading-(--leading-copy) text-muted-foreground">
                {body}
              </p>
            </article>
          ))}
        </div>
        <MarketingCta hint={t("marketing.controlCtaHint")}>
          {t("marketing.controlCta")}
        </MarketingCta>
      </div>
    </section>
  )
}
