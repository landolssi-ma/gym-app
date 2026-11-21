# Export legacy workspace data

The new schema no longer stores workspaces or subscriptions. Before applying it to a deployment
that still uses the old schema, export the local database and store the archive securely outside the
repository.

1. Point `DATABASE_URL` in `apps/web/.env` at a local copy of the old database. The export command
   refuses remote database hosts.
2. Run `pnpm db:export-workspaces`. It writes a dated JSON file under `exports/` containing
   organizations, memberships, invitations, subscriptions, usage, projects, files and audit logs.
3. Check that the archive contains every expected table and record, then back it up securely. The
   archive contains account and product data; do not commit it or share it publicly.
4. Only after verifying the archive, apply the new baseline migration to the target database.
