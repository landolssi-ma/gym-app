"use client"
import Image from "next/image"
import Link from "next/link"
import { useState } from "react"

import type { Article } from "@workspace/cms"
import { t } from "@workspace/i18n"
import { cn } from "@workspace/ui/lib/utils"

import { readingMinutes } from "@/lib/reading-minutes"

// Topics are the categories the posts use, each with the next tone in turn.
const TONES = ["bg-brand-soft text-brand-hover", "bg-sky/30 text-forest", "bg-secondary text-foreground", "bg-blush/35 text-forest", "bg-pop/35 text-forest"]
export function BlogDirectory({
  articles: all,
}: {
  articles: readonly Article[]
}) {
  const [topic, setTopic] = useState<string | null>(null)
  const articles = all.filter((a) => topic === null || a.category === topic)
  const topics = [...new Set(all.map((a) => a.category))].map((name, i) => ({ name, tone: TONES[i % TONES.length] }))
  return (
    <>
      <div className="mt-10">
        <p className="mb-4 font-mono text-caption tracking-widest text-muted-foreground uppercase">
          {t("blogPage.browseByTopic")}
        </p>
        <div className="flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={() => setTopic(null)}
            aria-pressed={topic === null}
            className={cn(
              "rounded-full px-4 py-2.5 text-compact font-semibold",
              topic === null
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            )}
          >
            {t("blogPage.allArticles")}
          </button>
          {topics.map((topicItem) => (
            <button
              key={topicItem.name}
              type="button"
              onClick={() => setTopic(topicItem.name)}
              aria-pressed={topic === topicItem.name}
              className={cn(
                "rounded-full px-4 py-2.5 text-compact font-semibold transition-shadow",
                topicItem.tone,
                topic === topicItem.name && "ring-2 ring-foreground ring-offset-2"
              )}
            >
              {topicItem.name}
            </button>
          ))}
        </div>
      </div>
      <section id="latest" className="mt-12 scroll-mt-40">
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="font-mono text-caption font-medium tracking-widest text-muted-foreground uppercase">
            {t("blogPage.latest")}
          </h2>
          <span role="status" className="text-xs text-muted-foreground">
            {t("blogPage.count", { count: articles.length })}
          </span>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((a) => (
            <Link
              data-article-card
              key={a.slug}
              href={`/blog/${a.slug}`}
              className="group reveal-on-scroll overflow-hidden rounded-panel border border-border bg-card transition-colors hover:border-border-strong"
            >
              <div className="aspect-video overflow-hidden bg-secondary">
                <Image
                  unoptimized
                  src={a.image.src}
                  alt={a.image.alt}
                  width={a.image.width}
                  height={a.image.height}
                  className="h-full w-full object-cover object-top transition-transform duration-300 group-hover:scale-103 motion-reduce:transform-none"
                />
              </div>
              <div className="p-5">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="rounded-full bg-brand-soft px-2.5 py-1 text-tiny font-semibold text-brand-hover uppercase">
                    {a.category}
                  </span>
                  <span>{t("blogPage.minutes", { count: readingMinutes(a) })}</span>
                </div>
                <h3 className="mt-3 text-base leading-(--leading-quote) font-bold">
                  {a.title}
                </h3>
                <p className="mt-3 text-sm leading-(--leading-body) text-muted-foreground">
                  {a.description}
                </p>
                <span className="mt-5 block text-xs text-muted-foreground">
                  {t("blogPage.read")} →
                </span>
              </div>
            </Link>
          ))}
        </div>
        {!articles.length && (
          <div className="rounded-panel border border-border bg-background p-8">
            <h3 className="text-xl">{t("blogPage.empty")}</h3>
          </div>
        )}
      </section>
    </>
  )
}
