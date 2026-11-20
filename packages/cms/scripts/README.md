# CMS scripts

One-off BaseHub scripts. They use the Admin Token; the running site only ever uses the Read Token.

## Env (`apps/web/.env`)

- `CMS_ADMIN_API_KEY`: BaseHub Admin Token (basehub.com → repo → Connect).
- `CMS_API_KEY`: BaseHub Read Token, only needed to regenerate types.

## Commands (from the repo root)

1. Create or update the collections (articles, legal documents, changelog entries) (idempotent by `apiName`):
   `pnpm --filter @workspace/cms cms:setup` (`-- --dry-run` prints the operations).
2. Regenerate the typed client after any schema change:
   `cd packages/cms && BASEHUB_TOKEN=<read token> pnpm exec basehub generate --output .basehub`
Content is edited in BaseHub. With no entries, the blog and changelog show their empty state; a missing legal document returns 404.

## BaseHub Mutation API quirks

- The admin client sends raw requests with `x-basehub-draft: true`. The SDK client resolved a stale ref and returned block ids that no longer exist, and creates under those ids fail with no message.
- `autoCommit`, or a commit op in the same transaction as creates, fails with no message: the commit is its own transaction. Rows are sent one per transaction so a failure names the row.
