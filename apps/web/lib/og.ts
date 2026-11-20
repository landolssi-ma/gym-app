import { renderOgImage, type OgImageInput } from "@workspace/seo/og"

import { site } from "@/config/site"

// Shared by every public route's opengraph-image.tsx: the product name is always the tag.
export const ogImage = (input: Omit<OgImageInput, "tag">) => renderOgImage({ ...input, tag: site.name })
