import { describe, expect, test } from "vitest"

const img = (src: string) => ({ src, alt: "alt", width: 1440, height: 810 })

import {
  ArticleSchema,
  ChangelogEntrySchema,
  ContentSectionSchema,
  LegalDocumentSchema,
  SourceSchema,
} from "../src/schemas"

const section = { id: "hook", heading: "Hook", paragraphs: ["p1"] }

describe("ContentSectionSchema / SourceSchema", () => {
  test("valid section parses", () => {
    expect(ContentSectionSchema.parse(section)).toEqual(section)
  })
  test("missing heading throws", () => {
    expect(() => ContentSectionSchema.parse({ id: "hook", paragraphs: ["p1"] })).toThrow()
  })
  test("valid source parses", () => {
    expect(SourceSchema.parse({ label: "l", href: "/h" })).toEqual({ label: "l", href: "/h" })
  })
  test("missing href throws", () => {
    expect(() => SourceSchema.parse({ label: "l" })).toThrow()
  })
})

describe("ArticleSchema", () => {
  const article = {
    slug: "a", title: "T", description: "D", category: "C", image: img("/i.jpg"),
    intro: "intro", sections: [section], sources: [],
  }
  test("valid article parses", () => {
    expect(ArticleSchema.parse(article)).toEqual(article)
  })
  test("missing slug throws", () => {
    expect(() => ArticleSchema.parse({ ...article, slug: undefined })).toThrow()
  })
})

describe("LegalDocumentSchema", () => {
  const doc = { kind: "terms", sections: [section] }
  test("valid legal document parses", () => {
    expect(LegalDocumentSchema.parse(doc)).toEqual(doc)
  })
  test("unrecognized kind throws", () => {
    expect(() => LegalDocumentSchema.parse({ ...doc, kind: "refunds" })).toThrow()
  })
})

describe("ChangelogEntrySchema", () => {
  const entry = { date: "2026-01-01", title: "T", body: ["p1"] }
  test("valid changelog entry parses", () => {
    expect(ChangelogEntrySchema.parse(entry)).toEqual(entry)
  })
  test("missing date throws", () => {
    expect(() => ChangelogEntrySchema.parse({ ...entry, date: undefined })).toThrow()
  })
})
