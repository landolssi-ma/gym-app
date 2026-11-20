import { notFound } from "next/navigation"

import { t } from "@workspace/i18n"

import { BlogArticle } from "@/components/marketing/content/blog-article"
import { JsonLd } from "@/components/marketing/json-ld"
import { getCms, getSeo } from "@/lib/cms"
import { publicMetadata } from "@/lib/public-metadata"

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props) {
  const a = await getCms().getArticleBySlug((await params).slug)
  if (!a) notFound()
  return publicMetadata(`/blog/${a.slug}`, a.title, a.description, true)
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params
  const [article, articles] = await Promise.all([getCms().getArticleBySlug(slug), getCms().getArticles()])
  if (!article) notFound()
  const path = `/blog/${article.slug}`
  const seo = getSeo()
  return (
    <>
      <JsonLd data={seo.buildBlogPostingJsonLd({ path, title: article.title, description: article.description, image: article.image.src })} />
      <JsonLd
        data={seo.buildBreadcrumbListJsonLd([
          { name: t("marketing.homeCrumb"), path: "/" },
          { name: t("blogPage.heading"), path: "/blog" },
          { name: article.title, path },
        ])}
      />
      <BlogArticle article={article} related={articles} />
    </>
  )
}
