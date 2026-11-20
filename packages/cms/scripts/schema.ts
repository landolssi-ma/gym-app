import type { CreateOp, Operation } from "../src/basehub"

// The BaseHub content model, as code. Each collection row's built-in `_title` holds the entry's
// display title (article title, legal document name, changelog title),
// so it isn't repeated as a field. apiNames are explicit so queries never depend on title casing.
type Field = Exclude<CreateOp, { type: "document" }>

const text = (apiName: string, isRequired = true): Field => ({ type: "text", title: apiName, apiName, isRequired })
const richText = (apiName: string, isRequired = true): Field => ({ type: "rich-text", title: apiName, apiName, isRequired })
const image = (apiName: string): Field => ({ type: "media", title: apiName, apiName, subTypes: ["image"], isRequired: true })
const list = (apiName: string, template: Field[]): Field => ({ type: "collection", title: apiName, apiName, template })

// A list of heading + body blocks; the row's `_title` is the heading.
const sections = list("sections", [text("anchor"), richText("body")])
const points = (apiName: string) => list(apiName, [text("body")])

const collection = (apiName: string, title: string, template: Field[]): Operation => ({
  type: "create",
  data: { type: "collection", title, apiName, transactionId: apiName, idempotency: { key: "apiName", value: apiName }, template },
})

export const COLLECTIONS: Operation[] = [
  collection("articles", "Articles", [
    text("slug"),
    text("description"),
    text("category"),
    image("image"),
    text("imageCreditLabel", false),
    text("imageCreditHref", false),
    text("intro"),
    sections,
    list("sources", [text("href")]),
  ]),
  collection("legalDocuments", "Legal Documents", [
    { type: "select", title: "kind", apiName: "kind", acceptedValues: ["terms", "privacy"], isRequired: true },
    sections,
  ]),
  collection("changelogEntries", "Changelog Entries", [
    { type: "date", title: "date", apiName: "date", isRequired: true },
    richText("body"),
  ]),
]
