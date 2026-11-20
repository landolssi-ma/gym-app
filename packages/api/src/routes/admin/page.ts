// Backoffice lists page by an opaque cursor (a base64url offset). A missing, malformed or
// out-of-range cursor starts over at the first page instead of failing.
export const PAGE_SIZE = 50

export const encodeCursor = (offset: number) => Buffer.from(String(offset), "utf8").toString("base64url")

export function decodeCursor(cursor: string | undefined): number {
  const n = cursor ? Number(Buffer.from(cursor, "base64url").toString("utf8")) : 0
  return Number.isInteger(n) && n >= 0 ? n : 0
}

// Rows are fetched one past the page: whether that extra row exists is whether there is a next page.
export const pageOf = <T>(rows: T[], offset: number) => ({ items: rows.slice(0, PAGE_SIZE), nextCursor: rows.length > PAGE_SIZE ? encodeCursor(offset + PAGE_SIZE) : null })
