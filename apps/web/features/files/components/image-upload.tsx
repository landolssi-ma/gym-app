"use client"

import { useId, useRef } from "react"

import { FILE_PURPOSES } from "@workspace/api/files"
import { t } from "@workspace/i18n"
import { Button } from "@workspace/ui/components/button"
import { useToast } from "@workspace/ui/hooks/use-toast"

import { Avatar } from "@/components/shell/avatar"
import { ApiError } from "@/lib/api-fetch"
import { errorMessage } from "@/lib/errors"

import { useUpload } from "../hooks"

// The current image and a button that replaces it; the server deletes the old one.
export function ImageUpload({ purpose, name, image, disabled = false }: { purpose: "avatar" | "logo"; name: string; image: string | null; disabled?: boolean }) {
  const upload = useUpload(purpose)
  const { toast } = useToast()
  const input = useRef<HTMLInputElement>(null)
  const id = useId()
  const { types, maxSize } = FILE_PURPOSES[purpose]

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    try {
      await upload.mutateAsync(file)
      toast({ title: t("files.saved") })
    } catch (err) {
      toast({ title: errorMessage(err instanceof ApiError ? err.message : undefined), variant: "destructive" })
    }
  }

  return (
    <div className="flex items-center gap-4">
      <Avatar name={name} image={image} className={purpose === "logo" ? "size-16 rounded-lg text-lg" : "size-16 text-lg"} />
      <div className="flex flex-col items-start gap-1.5">
        <input ref={input} id={id} type="file" accept={types.join(",")} className="sr-only" onChange={onChange} disabled={disabled || upload.isPending} />
        <Button type="button" variant="outline" disabled={disabled || upload.isPending} onClick={() => input.current?.click()}>
          {t(upload.isPending ? "files.uploading" : "files.choose")}
        </Button>
        <label htmlFor={id} className="text-xs text-muted-foreground">
          {t("files.imageHint", { mb: maxSize / 1024 / 1024 })}
        </label>
      </div>
    </div>
  )
}
