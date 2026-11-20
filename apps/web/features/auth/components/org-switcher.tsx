"use client"

import { useState } from "react"

import { t } from "@workspace/i18n"
import { Button } from "@workspace/ui/components/button"
import { Dialog, DialogContent, DialogFooter, DialogTitle } from "@workspace/ui/components/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@workspace/ui/components/dropdown-menu"
import { CheckIcon, ChevronDownIcon, PlusIcon } from "@workspace/ui/components/icons"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { cn } from "@workspace/ui/lib/utils"

import { errorMessage } from "@/lib/errors"

import { useCreateOrganization, useMe, useSwitchOrganization } from "../hooks"

export function OrgSwitcher() {
  const { data } = useMe()
  const { mutate } = useSwitchOrganization()
  const [creating, setCreating] = useState(false)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger aria-label={t("organization.switcherLabel")} className="flex items-center gap-2 rounded-md border-2 border-border bg-card px-2 py-1 text-sm font-bold shadow-hard-sm">
          {data.activeOrganization.name}
          <ChevronDownIcon className="size-4 shrink-0" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {data.organizations.map((org) => {
            const isActive = org.id === data.activeOrganization.id
            return (
              <DropdownMenuItem key={org.id} aria-current={isActive} onClick={() => !isActive && mutate(org.id)}>
                <CheckIcon className={cn("size-4 shrink-0", !isActive && "opacity-0")} />
                <span className={cn(isActive && "font-bold")}>{org.name}</span>
              </DropdownMenuItem>
            )
          })}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setCreating(true)}>
            <PlusIcon className="size-4 shrink-0" />
            {t("app.createWorkspace")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {creating && <CreateWorkspaceDialog onClose={() => setCreating(false)} />}
    </>
  )
}

function CreateWorkspaceDialog({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("")
  const create = useCreateOrganization()
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogTitle>{t("app.createWorkspaceTitle")}</DialogTitle>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (name.trim()) create.mutate(name.trim())
          }}
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="workspace-name">{t("app.workspaceNameLabel")}</Label>
            <Input id="workspace-name" autoFocus maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
            {create.isError && <p role="alert" className="text-sm font-medium text-destructive">{errorMessage(undefined)}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t("app.cancel")}
            </Button>
            <Button type="submit" disabled={!name.trim() || create.isPending}>
              {t("app.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
