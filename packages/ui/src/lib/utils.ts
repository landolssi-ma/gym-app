import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

// Teach the merger the shared scales so a text color never removes a custom font size.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: [
        "display",
        "display-mobile",
        "section",
        "section-compact",
        "section-wide",
        "micro",
        "tiny",
        "caption",
        "note",
        "label",
        "compact",
        "body-sm",
        "copy-sm",
        "copy",
        "copy-lg",
        "subtitle",
        "index",
        "title-sm",
        "title",
        "title-lg",
        "heading-sm",
        "app-display",
        "stat",
      ],
      container: ["marketing", "hero", "reading", "app", "message"],
      shadow: ["hard", "hard-sm", "brand", "brand-lg", "float"],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
