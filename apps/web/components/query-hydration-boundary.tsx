"use client"

// A Server Component importing HydrationBoundary
// straight from "@tanstack/react-query" gets it as a separate RSC client
// reference (keyed by that package file's path), which Vite resolves through
// the raw /@fs/ passthrough -- a different module instance than the one
// providers.tsx's QueryClientProvider gets via the prebundled .vite/deps
// copy, so useQueryClient() inside it can never see our Context. Re-exporting
// through this first-party "use client" file makes the client reference key
// off our own app source, routing its bare specifier through the same
// prebundled instance providers.tsx uses.
export { HydrationBoundary } from "@tanstack/react-query"
