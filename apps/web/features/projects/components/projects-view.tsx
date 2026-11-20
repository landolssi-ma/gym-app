"use client"

import { useState } from "react"

import { t } from "@workspace/i18n"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Textarea } from "@workspace/ui/components/textarea"
import { useToast } from "@workspace/ui/hooks/use-toast"

import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog"
import { useMe } from "@/features/auth"
import { ApiError } from "@/lib/api-fetch"
import { errorMessage } from "@/lib/errors"

import { useProjectActions, useProjects } from "../hooks"
import type { Project } from "../services"

// A 402 has already opened the upgrade dialog (apiFetch); every other error gets a toast.
function useFail() {
  const { toast } = useToast()
  return (err: unknown) => {
    if (err instanceof ApiError && err.status === 402) return
    toast({ title: errorMessage(err instanceof ApiError ? err.message : undefined), variant: "destructive" })
  }
}

export function ProjectsView() {
  const { data } = useProjects()
  const { data: me } = useMe()
  const actions = useProjectActions()
  const fail = useFail()
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")

  async function create(e: React.FormEvent) {
    e.preventDefault()
    try {
      await actions.create.mutateAsync({ name: name.trim(), description: description.trim() })
      setName("")
      setDescription("")
    } catch (err) {
      fail(err)
    }
  }

  async function download() {
    try {
      const url = URL.createObjectURL(await actions.exportCsv.mutateAsync())
      const a = Object.assign(document.createElement("a"), { href: url, download: "projects.csv" })
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      fail(err)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("projects.newHeading")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-3" onSubmit={create}>
            <Label htmlFor="project-name">{t("projects.nameLabel")}</Label>
            <Input id="project-name" value={name} maxLength={120} onChange={(e) => setName(e.target.value)} />
            <Label htmlFor="project-description">{t("projects.descriptionLabel")}</Label>
            <Textarea id="project-description" value={description} maxLength={2000} onChange={(e) => setDescription(e.target.value)} />
            <Button type="submit" className="self-start" disabled={!name.trim() || actions.create.isPending}>
              {t("projects.create")}
            </Button>
          </form>
        </CardContent>
      </Card>
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-heading text-lg font-bold">{t("projects.listHeading", { count: data.projects.length })}</h2>
        {/* Shown to every plan: without `export` the API answers 402 and the upgrade dialog explains. */}
        <Button variant="outline" disabled={!data.projects.length || actions.exportCsv.isPending} onClick={download} title={me.features.includes("export") ? undefined : t("projects.exportUpgrade")}>
          {t("projects.export")}
        </Button>
      </div>
      {data.projects.length ? (
        <ul className="flex flex-col gap-3">
          {data.projects.map((p) => (
            <ProjectRow key={p.id} project={p} onError={fail} />
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">{t("projects.empty")}</p>
      )}
    </div>
  )
}

function ProjectRow({ project, onError }: { project: Project; onError: (err: unknown) => void }) {
  const actions = useProjectActions()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(project.name)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    try {
      await actions.update.mutateAsync({ id: project.id, name: name.trim() })
      setEditing(false)
    } catch (err) {
      onError(err)
    }
  }

  return (
    <li className="flex flex-wrap items-start justify-between gap-3 rounded-panel border border-border bg-card p-4">
      {editing ? (
        <form className="flex flex-1 gap-2" onSubmit={save}>
          <Input aria-label={t("projects.nameLabel")} value={name} maxLength={120} onChange={(e) => setName(e.target.value)} autoFocus />
          <Button type="submit" disabled={!name.trim() || actions.update.isPending}>
            {t("projects.save")}
          </Button>
          <Button type="button" variant="ghost" onClick={() => (setEditing(false), setName(project.name))}>
            {t("projects.cancel")}
          </Button>
        </form>
      ) : (
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{project.name}</p>
          {project.description && <p className="mt-1 text-sm text-muted-foreground">{project.description}</p>}
        </div>
      )}
      {!editing && (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            {t("projects.rename")}
          </Button>
          <ConfirmDeleteDialog
            trigger={t("projects.delete")}
            title={t("projects.deleteTitle")}
            body={t("projects.deleteBody", { name: project.name })}
            confirmLabel={t("projects.delete")}
            value={project.name}
            onConfirm={() => actions.remove.mutateAsync(project.id)}
          />
        </div>
      )}
    </li>
  )
}
