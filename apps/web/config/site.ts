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
    background: "#FFFFFF",
    text: "#121212",
    button: "#FFD23F",
    buttonText: "#121212",
    buttonBorder: "2px solid #121212",
    font: 'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  },
} as const

export type Site = typeof site
