"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"

import type { FilePurpose } from "@workspace/api/files"

import { meKeys } from "@/features/auth"
import { ApiError, apiFetch } from "@/lib/api-fetch"
import { apiClient } from "@/lib/hc-client"

import * as services from "./services"

const api = () => apiClient(apiFetch)

// Declare, PUT the bytes straight to storage, then complete. The PUT goes to the bucket, not the
// API, so it uses plain fetch (no x-org-id, no shared status handling).
export function useUpload(purpose: FilePurpose) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (file: File) => {
      const { id, uploadUrl } = await services.declareFile(api(), { name: file.name, contentType: file.type, size: file.size, purpose })
      const put = await fetch(uploadUrl, { method: "PUT", body: file, headers: { "content-type": file.type } }).catch(() => null)
      if (!put?.ok) throw new ApiError(put?.status ?? 0, "upload_failed")
      return services.completeFile(api(), id)
    },
    // Avatars and logos are read through useMe.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: meKeys.all }),
  })
}
