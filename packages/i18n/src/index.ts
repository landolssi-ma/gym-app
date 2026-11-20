import { createTranslator } from "use-intl/core"

import messages from "./en.json"

// No provider/context: the same t() runs in RSC, SSR, client and packages/mail. Keys are checked
// against en.json at compile time.
export const t = createTranslator({ locale: "en", messages })
export { messages }
export type Messages = typeof messages
