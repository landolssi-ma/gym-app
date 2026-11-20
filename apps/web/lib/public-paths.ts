// Public marketing paths, shared by proxy.ts (anonymous access) and app/sitemap.ts.
export const STATIC_PUBLIC_PATHS = ["/", "/pricing", "/privacy", "/terms", "/changelog", "/blog", "/help", "/contact"] as const

// CMS slug sections: any slug below these is public; unknown slugs 404 in the page itself.
export const CONTENT_PATH_PREFIXES = ["/blog/"] as const
