// Every event the app sends, with its payload. Product code reacts to these with its own
// functions instead of editing starter routes; add a product's own events here too.
export type Events = {
  "user.created": { userId: string; email: string }
  "organization.created": { organizationId: string }
  "organization.deleted": { organizationId: string }
  "billing/subscription.changed": { organizationId: string; previousStatus: string | null; nextStatus: string }
}
export type EventName = keyof Events
