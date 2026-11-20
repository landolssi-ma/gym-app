import type { ContentSection } from "@workspace/cms"

// ~200 words per minute over the intro and every section's text.
export function readingMinutes(article: {
  intro: string
  sections: readonly ContentSection[]
}) {
  const words = [
    article.intro,
    ...article.sections.flatMap((s) => [
      s.heading,
      ...s.paragraphs,
      ...(s.bullets ?? []),
    ]),
  ]
    .join(" ")
    .trim()
    .split(/\s+/).length
  return Math.max(1, Math.ceil(words / 200))
}
