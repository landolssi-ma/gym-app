# Add an email

All emails share one layout (logo, body, at most one button, footer) in
`packages/mail/src/layout.ts`. A new email only decides its words and its one link.

## 1. Write the strings

Add them under `mail` in `packages/i18n/src/en.json`. `{product}` is the product name from
`apps/web/config/site.ts`:

```json
"exportReadySubject": "Your {product} export is ready",
"exportReadyBody": "The export of {count} projects is ready to download for 24 hours.",
"exportReadyButton": "Download export"
```

## 2. Add the template

Add an entry to `templates` in `packages/mail/src/templates.ts`. Its first argument is the data the
caller passes; the second is the product name:

```ts
exportReady: ({ count, url }: { count: number; url: string }, product: string): EmailParts => ({
  subject: t("mail.exportReadySubject", { product }),
  paragraphs: [t("mail.exportReadyBody", { count })],
  button: { label: t("mail.exportReadyButton"), url },
}),
```

Every link must be an absolute URL on `APP_ORIGIN`; `send` refuses anything else.

## 3. Send it

From a route or a job, after the write it describes is committed:

```ts
await c.var.deps.mail.send("exportReady", email, { count, url: `${c.var.deps.config.appOrigin}/exports/${id}` })
```

`send` throws on a provider error. If the user is waiting for the email (a code, a link), let the
error reach them so they can retry; otherwise catch it and log it so the request still succeeds.

## 4. Test it

Add the template's sample data to `samples` in `packages/mail/tests/index.test.ts`. The shared
tests then check its subject, both bodies, the layout, and that every link is on the app origin.
Add a test of your own for anything specific to it.

## 5. See it locally

With `RESEND_API_KEY` empty, `pnpm dev` logs each email (recipient, subject, links, codes) instead
of sending it.
