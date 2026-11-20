// What a file can be uploaded for. Add a purpose here; the API enforces it and the client reads it
// for the file input. Public files are served from the app origin at /media, so they are raster
// images only (never SVG or HTML, which could run script there).
const MB = 1024 * 1024
const IMAGES = ["image/png", "image/jpeg", "image/webp", "image/gif"]

export const FILE_PURPOSES = {
  avatar: { types: IMAGES, maxSize: 5 * MB, visibility: "public" },
  logo: { types: IMAGES, maxSize: 5 * MB, visibility: "public" },
  attachment: { types: [...IMAGES, "application/pdf", "text/plain", "text/csv"], maxSize: 10 * MB, visibility: "private" },
} as const satisfies Record<string, { types: readonly string[]; maxSize: number; visibility: "public" | "private" }>

export type FilePurpose = keyof typeof FILE_PURPOSES
