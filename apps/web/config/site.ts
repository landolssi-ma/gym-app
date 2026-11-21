// The one place a product sets its identity: pages, emails, metadata and cookies read it from here.
export const site = {
  name: "Acme",
  // Absolute URLs are built from APP_ORIGIN; emails need a raster image (most clients drop SVG).
  logoPath: "/logo.png",
  supportEmail: "support@example.com",
  mailFrom: "Acme <hello@example.com>",
  // __Host- makes the browser refuse the cookie unless it is Secure, host-only and Path=/.
  cookiePrefix: "__Host-acme",
  // Email clients ignore CSS variables, so the email layout cannot read globals.css tokens.
  // Keep these in step with the brand colors in packages/ui globals.css.
  emailTheme: {
    background: "#F8F7F2",
    text: "#292D29",
    button: "#71866D",
    buttonText: "#F8F7F2",
    buttonBorder: "1px solid #71866D",
    font: 'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  },
} as const

export type Site = typeof site
