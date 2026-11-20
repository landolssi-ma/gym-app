import Link from "next/link"

import type { Article } from "@workspace/cms"
import { t } from "@workspace/i18n"

import { readingMinutes } from "@/lib/reading-minutes"
import { ArticleLayout } from "./article-layout"
export function BlogArticle({
  article,
  related,
}: {
  article: Article
  related: readonly Article[]
}) {
  return (
    <ArticleLayout
      title={article.title}
      description={article.intro}
      category={article.category}
      minutes={readingMinutes(article)}
      backHref="/blog"
      backLabel={t("blogPage.back")}
      image={article.image}
      imageCredit={article.imageCredit}
      sections={article.sections}
      sources={article.sources}
      related={
        <section className="mt-14">
          <h2 className="text-2xl font-bold">{t("blogPage.keepReading")}</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {related
              .filter((a) => a.slug !== article.slug)
              .slice(0, 2)
              .map((a) => (
                <Link
                  key={a.slug}
                  href={`/blog/${a.slug}`}
                  className="rounded-panel border border-border bg-background p-5 hover:border-border-strong"
                >
                  <p className="text-xs text-brand-hover">{a.category}</p>
                  <h3 className="mt-2 text-lg font-bold">{a.title} →</h3>
                </Link>
              ))}
          </div>
        </section>
      }
    />
  )
}
