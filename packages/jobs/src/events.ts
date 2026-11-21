// Every event the app sends, with its payload. Product code reacts to these with its own
// functions instead of editing starter routes; add a product's own events here too.
export type Events = {
  "user.created": { userId: string; email: string }
}
export type EventName = keyof Events
