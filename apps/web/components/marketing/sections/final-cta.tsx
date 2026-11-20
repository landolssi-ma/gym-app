import { Button } from "@workspace/ui/components/button"
import Link from "next/link"

import { t } from "@workspace/i18n"

export function FinalCta() {
  return (
    <section
      className="pt-(--section-space) pt-20 pb-22.5 max-md:py-15"
      id="get-started"
    >
      <div className="mx-auto w-full max-w-marketing px-(--page-gutter)">
        <div
          className="relative reveal-on-scroll overflow-hidden rounded-3xl border-2 border-border-strong bg-secondary px-7 py-16 text-center before:absolute before:top-8.5 before:left-10 before:size-10.5 before:rounded-full before:border before:border-forest before:bg-pop before:content-[''] after:absolute after:right-11 after:bottom-8.5 after:size-8.5 after:rotate-12 after:rounded-decor after:border after:border-forest after:bg-blush after:content-[''] max-md:px-5 max-md:pt-16 max-md:pb-11 max-md:before:top-5 max-md:before:left-5 max-md:before:size-7.5"
        >
          <div
            className="mb-6 flex justify-center text-brand"
            aria-hidden="true"
          >
            <svg width="52" height="52" viewBox="0 0 48 48" fill="none">
              <circle
                cx="24"
                cy="24"
                r="18"
                stroke="currentColor"
                strokeWidth="3"
              />
              <path
                d="M16 15v11a8 8 0 0 0 16 0V15M22 15v11a2 2 0 0 0 4 0v-5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <h2 className="m-0 text-section-wide leading-(--leading-heading) tracking-(--tracking-heading) text-balance">
            {t("marketing.finalCtaHeading")}
            <br />
            {t("marketing.finalCtaSecondLine")}
          </h2>
          <p className="mx-auto mt-4 max-w-125 text-subtitle leading-normal text-muted-foreground">
            {t("marketing.finalCtaSubhead")}
          </p>
          <Button
            variant="marketing"
            size="marketing"
            className="mt-7.5"
            asChild
          >
            <Link href="/sign-in?mode=signup">{t("marketing.heroCta")} →</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
