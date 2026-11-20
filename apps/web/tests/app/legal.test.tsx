import { describe, expect, it, vi } from "vitest"

import { CMS, cmsModule, emptyCms, fakeCms } from "../helpers/cms-fixture"

const mocks = vi.hoisted(() => ({ cms: null as unknown }))
vi.mock("@/lib/cms", () => ({ ...cmsModule(fakeCms), getCms: () => mocks.cms }))
vi.mock("next/navigation", () => ({ usePathname: () => "/" }))

import { t } from "@workspace/i18n"

import ChangelogPage from "../../app/changelog/page"
import PrivacyPage from "../../app/privacy/page"
import TermsPage from "../../app/terms/page"
import { site } from "../../config/site"
import { renderServer } from "../helpers/render-server"

const decode = (html: string) => html.replaceAll("&#x27;", "'").replaceAll("&quot;", '"').replaceAll("&amp;", "&")

describe("Privacy and terms", () => {
  it("render every CMS section with the support email", async () => {
    mocks.cms = fakeCms
    for (const [Page, kind] of [
      [PrivacyPage, "privacy"],
      [TermsPage, "terms"],
    ] as const) {
      const html = decode(await renderServer(<Page />))
      for (const s of CMS.legal.find((d) => d.kind === kind)!.sections) {
        expect(html).toContain(s.heading)
        for (const p of s.paragraphs) expect(html).toContain(p)
      }
      expect(html).toContain(`href="mailto:${site.supportEmail}"`)
      expect(html).not.toContain(t("legal.empty"))
    }
  })

  it("render with an empty state when the CMS has no document", async () => {
    mocks.cms = emptyCms
    for (const Page of [PrivacyPage, TermsPage]) expect(await renderServer(<Page />)).toContain(t("legal.empty"))
  })
})

describe("Changelog", () => {
  it("lists every entry, newest first as the CMS returns them", async () => {
    mocks.cms = fakeCms
    const html = await renderServer(<ChangelogPage />)
    const at = CMS.changelog.map((e) => html.indexOf(e.title))
    expect(at.every((i) => i > 0)).toBe(true)
    expect(at[0]).toBeLessThan(at[1]!)
    expect(html).toContain('dateTime="2026-11-02"')
  })

  it("shows the empty state when the CMS has no entries", async () => {
    mocks.cms = emptyCms
    expect(await renderServer(<ChangelogPage />)).toContain(t("changelogPage.empty"))
  })
})
