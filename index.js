import { Plugin } from "@opencode/plugin"
import { Rpc } from "@opencode/plugin/rpc"

// The GUI part defines the same contract. Keep the two in sync: the id and
// method name are the wire format between the desktop window and this server.
const Usage = Rpc.define({
  id: "go-usage",
  methods: {
    get: {
      input: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
      output: {
        type: "object",
        additionalProperties: true,
      },
    },
  },
  events: {},
})

const USAGE_URL = "https://opencode.ai/inference/go/v1/usage"
const CACHE_MS = 15_000

// The API reports the percentage used. Normalize it to a shape the widget can
// render without knowing the upstream names.
function normalize(raw) {
  const usage = raw?.usage
  if (!usage || typeof usage !== "object") return undefined

  const one = (value) => {
    const percent = Number(value?.percent)

    return {
      status: typeof value?.status === "string" ? value.status : "ok",
      percent: Number.isFinite(percent) ? Math.min(100, Math.max(0, percent)) : 0,
      resetsAt: typeof value?.resetsAt === "string" ? value.resetsAt : undefined,
    }
  }

  return {
    rolling: one(usage.rolling),
    weekly: one(usage.weekly),
    monthly: one(usage.monthly),
  }
}

function errorMessage(error, status) {
  if (status === 401 || status === 403) return "OpenCode Go rejected the saved API key."
  if (status === 429) return "OpenCode Go is rate limiting usage checks."
  if (status && status >= 500) return `OpenCode Go returned ${status}.`
  if (error?.name === "TimeoutError") return "The usage request timed out."
  if (error?.name === "AbortError") return "The usage request was cancelled."

  return "Couldn't reach OpenCode Go."
}

export default Plugin.define({
  id: "go-usage",
  async setup(ctx) {
    let cached
    let cachedAt = 0

    const readUsage = async (signal) => {
      const connection = await ctx.integration.connection.active("opencode-go")

      if (!connection) {
        return { ok: false, code: "not_connected", error: "OpenCode Go is not connected." }
      }

      const credential = await ctx.integration.connection.resolve(connection)
      const key = credential?.type === "key" ? credential.key : credential?.access

      if (!key) {
        return { ok: false, code: "no_key", error: "The OpenCode Go credential has no API key." }
      }

      const timeout = AbortSignal.timeout(15_000)
      const combined = signal ? AbortSignal.any([signal, timeout]) : timeout

      let response
      try {
        response = await fetch(USAGE_URL, {
          headers: {
            authorization: `Bearer ${key}`,
            accept: "application/json",
            "user-agent": "opencode-go-usage/0.1",
          },
          signal: combined,
        })
      } catch (error) {
        return { ok: false, code: "network", error: errorMessage(error) }
      }

      if (!response.ok) {
        return {
          ok: false,
          code: response.status === 401 || response.status === 403 ? "auth" : "http",
          error: errorMessage(undefined, response.status),
          status: response.status,
        }
      }

      let body
      try {
        body = await response.json()
      } catch {
        return { ok: false, code: "invalid", error: "OpenCode Go returned an unreadable response." }
      }

      const usage = normalize(body)

      if (!usage) {
        return { ok: false, code: "invalid", error: "OpenCode Go returned no usage windows." }
      }

      return { ok: true, usage, fetchedAt: Date.now() }
    }

    const registration = await ctx.rpc.register(Usage, {
      get: async (_input, context) => {
        if (cached && Date.now() - cachedAt < CACHE_MS) return cached

        try {
          const result = await readUsage(context.signal)
          cached = result
          cachedAt = Date.now()

          if (!result.ok) console.warn(`[go-usage] ${result.error}`)

          return result
        } catch (error) {
          console.error("[go-usage] usage check failed", error)

          return { ok: false, code: "unknown", error: "Couldn't read OpenCode Go usage." }
        }
      },
    })

    return () => void registration.dispose()
  },
})
