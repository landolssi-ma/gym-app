// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({ apiFetch: vi.fn(), toast: vi.fn() }))
vi.mock("@/lib/api-fetch", async (orig) => ({ ...(await orig<object>()), apiFetch: mocks.apiFetch }))
vi.mock("@workspace/ui/hooks/use-toast", () => ({ useToast: () => ({ toast: mocks.toast }) }))

import { t } from "@workspace/i18n"

import { meKeys } from "@/features/auth"
import { ImageUpload } from "@/features/files"

import { flush, mount } from "../../helpers/dom"

let m: ReturnType<typeof mount>
let client: QueryClient
const put = vi.fn(async () => new Response(null, { status: 200 }))
beforeEach(() => {
  m = mount()
  client = new QueryClient()
  vi.clearAllMocks()
  vi.stubGlobal("fetch", put)
})
afterEach(async () => {
  await m.unmount()
  vi.unstubAllGlobals()
})

const render = (purpose: "avatar" | "logo" = "avatar") =>
  m.render(
    <QueryClientProvider client={client}>
      <ImageUpload purpose={purpose} name="Ada" image={null} />
    </QueryClientProvider>,
  )

async function choose(file: File) {
  const input = m.container.querySelector<HTMLInputElement>('input[type="file"]')!
  Object.defineProperty(input, "files", { value: [file], configurable: true })
  input.dispatchEvent(new Event("change", { bubbles: true }))
  for (let i = 0; i < 5; i++) await flush()
}

const calls = () => mocks.apiFetch.mock.calls.map(([url, init]) => `${(init as RequestInit | undefined)?.method ?? "GET"} ${new URL(String(url), "http://x").pathname}`)

describe("ImageUpload", () => {
  it("offers images only", async () => {
    await render()
    expect(m.container.querySelector("input")?.getAttribute("accept")).toBe("image/png,image/jpeg,image/webp,image/gif")
  })

  it("declares the file, PUTs it straight to storage with its type, completes it and refreshes the user", async () => {
    mocks.apiFetch.mockImplementation(async (url: string) =>
      String(url).endsWith("/complete") ? Response.json({ id: "f1", url: "https://app.test/media/k" }) : Response.json({ id: "f1", uploadUrl: "https://bucket.test/public/k?sig" }, { status: 201 }),
    )
    const invalidate = vi.spyOn(client, "invalidateQueries")
    await render()
    await choose(new File(["png"], "me.png", { type: "image/png" }))
    expect(calls()).toEqual(["POST /api/files", "POST /api/files/f1/complete"])
    expect(JSON.parse(String((mocks.apiFetch.mock.calls[0]![1] as RequestInit).body))).toEqual({ name: "me.png", contentType: "image/png", size: 3, purpose: "avatar" })
    expect(put).toHaveBeenCalledWith("https://bucket.test/public/k?sig", expect.objectContaining({ method: "PUT", headers: { "content-type": "image/png" } }))
    expect(invalidate).toHaveBeenCalledWith({ queryKey: meKeys.all })
    expect(mocks.toast).toHaveBeenCalledWith({ title: t("files.saved") })
  })

  it("a non-image avatar is refused by the server and shows why; nothing is uploaded", async () => {
    mocks.apiFetch.mockImplementation(async () => Response.json({ error: "invalid_file" }, { status: 400 }))
    await render()
    await choose(new File(["%PDF"], "cv.pdf", { type: "application/pdf" }))
    expect(put).not.toHaveBeenCalled()
    expect(calls()).toEqual(["POST /api/files"])
    expect(mocks.toast).toHaveBeenCalledWith({ title: t("errors.invalid_file"), variant: "destructive" })
  })

  it("a failed PUT to storage never completes the upload", async () => {
    mocks.apiFetch.mockImplementation(async () => Response.json({ id: "f1", uploadUrl: "https://bucket.test/public/k?sig" }, { status: 201 }))
    put.mockResolvedValueOnce(new Response(null, { status: 403 }))
    await render()
    await choose(new File(["png"], "me.png", { type: "image/png" }))
    expect(calls()).toEqual(["POST /api/files"])
    expect(mocks.toast).toHaveBeenCalledWith({ title: t("errors.upload_failed"), variant: "destructive" })
  })
})
