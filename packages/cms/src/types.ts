// This package's own public content types, independent of the provider's generated types.

export type Source = { label: string; href: string }

// A CMS-hosted image with its intrinsic size (for width/height attributes).
export type Image = { src: string; alt: string; width: number; height: number }

// A rich text field mapped down to heading/paragraphs/bullets: plain strings, never raw provider HTML.
export type ContentSection = {
  id: string
  heading: string
  paragraphs: readonly string[]
  bullets?: readonly string[]
}

export type Article = {
  slug: string
  title: string
  description: string
  category: string
  image: Image
  imageCredit?: Source
  intro: string
  sections: readonly ContentSection[]
  sources: readonly Source[]
}

export type LegalDocumentKind = "terms" | "privacy"
export type LegalDocument = {
  kind: LegalDocumentKind
  sections: readonly ContentSection[]
}

export type ChangelogEntry = {
  date: string // ISO 8601 date
  title: string
  body: readonly string[]
}
