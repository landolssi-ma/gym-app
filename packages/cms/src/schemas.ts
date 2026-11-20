import { z } from "zod"

// Mirrors types.ts: every basehub.ts response is parsed through one of these before it reaches a
// caller, so malformed content fails loudly instead of rendering wrong.

export const SourceSchema = z.object({
  label: z.string(),
  href: z.string(),
})

export const ImageSchema = z.object({
  src: z.string(),
  alt: z.string(),
  width: z.number(),
  height: z.number(),
})

export const ContentSectionSchema = z.object({
  id: z.string(),
  heading: z.string(),
  paragraphs: z.array(z.string()),
  bullets: z.array(z.string()).optional(),
})

export const ArticleSchema = z.object({
  slug: z.string(),
  title: z.string(),
  description: z.string(),
  category: z.string(),
  image: ImageSchema,
  imageCredit: SourceSchema.optional(),
  intro: z.string(),
  sections: z.array(ContentSectionSchema),
  sources: z.array(SourceSchema),
})

export const LEGAL_DOCUMENT_KINDS = ["terms", "privacy"] as const

export const LegalDocumentSchema = z.object({
  kind: z.enum(LEGAL_DOCUMENT_KINDS),
  sections: z.array(ContentSectionSchema),
})

export const ChangelogEntrySchema = z.object({
  date: z.string(),
  title: z.string(),
  body: z.array(z.string()),
})
