import { cloudflare } from "@cloudflare/vite-plugin"
import vinext from "vinext"
import { defineConfig, loadEnv } from "vite"

// Vinext's page handler can intercept root-relative client module URLs. Route those
// existing source files through Vite's file handler before app routing runs.
const appSourceModules = {
  name: "app-source-modules",
  enforce: "pre" as const,
  configureServer(server: import("vite").ViteDevServer) {
    server.middlewares.use((req, _res, next) => {
      const pathname = new URL(req.url || "/", "http://localhost").pathname
      if (
        /^\/(?:app|components|config|content|features|lib)\/.*\.(?:tsx?|jsx?|json)$/.test(
          pathname
        )
      ) {
        req.url = `/@fs${process.cwd()}${req.url}`
      }
      next()
    })
  },
}

// vinext auto-registers @vitejs/plugin-rsc; adding rsc() here breaks the build.
export default defineConfig(({ mode }) => ({
  plugins: [
    appSourceModules,
    vinext(),
    cloudflare({
      viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
    }),
  ],
  // The dev port follows APP_ORIGIN in .env; builds without a .env have no dev server.
  server: {
    port: Number(
      new URL(
        loadEnv(mode, process.cwd(), "").APP_ORIGIN || "http://localhost:5173"
      ).port
    ),
    strictPort: true,
  },
}))
