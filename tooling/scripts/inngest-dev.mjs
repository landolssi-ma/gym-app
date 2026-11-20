// Started by `pnpm dev` next to the app: the Inngest dev server, pointed at the app's /api/inngest
// on APP_ORIGIN from apps/web/.env. Pinned, so every developer runs the same version.
import { spawn } from "node:child_process"
import { existsSync } from "node:fs"

const env = new URL("../../apps/web/.env", import.meta.url).pathname
if (existsSync(env)) process.loadEnvFile(env)
const origin = process.env.APP_ORIGIN ?? "http://localhost:5173" // eslint-disable-line turbo/no-undeclared-env-vars
const child = spawn("pnpm", ["dlx", "inngest-cli@1.51.0", "dev", "--no-discovery", "-u", `${origin}/api/inngest`], { stdio: "inherit" })
child.on("exit", (code) => process.exit(code ?? 0))
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal))
