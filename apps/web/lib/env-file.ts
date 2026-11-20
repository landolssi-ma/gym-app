import { readFileSync, writeFileSync } from "node:fs"

// Replaces an existing `^KEY=...$` line in place, appends a new `KEY=value` line when absent.
// Every other line -- comments, blank lines, other keys whose values contain "=" or quotes --
// passes through byte-identical: the match is anchored to one line via the `m` flag.
export function upsertEnvVar(content: string, key: string, value: string): string {
  const linePattern = new RegExp(`^${key}=.*$`, "m")
  if (linePattern.test(content)) return content.replace(linePattern, `${key}=${value}`)
  const sep = content.length === 0 || content.endsWith("\n") ? "" : "\n"
  return `${content}${sep}${key}=${value}\n`
}

// Thin fs wrapper around upsertEnvVar. Calling it twice with the same updates leaves the file
// byte-identical after the first call.
export function upsertEnvFile(path: string, updates: Record<string, string>): void {
  let content = readFileSync(path, "utf8")
  for (const [key, value] of Object.entries(updates)) content = upsertEnvVar(content, key, value)
  writeFileSync(path, content)
}
