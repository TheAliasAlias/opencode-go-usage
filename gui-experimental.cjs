// OpenCode Go usage, shown at the bottom of the desktop sidebar.
//
// The window part is a plain CommonJS bundle: the host evaluates this file
// directly, so it builds its own DOM and needs no JSX or bundler.

const { Plugin, Slot, Style } = require("@opencode/plugin/gui")
const { Rpc } = require("@opencode/plugin/rpc")

// Keep in sync with index.js. This is the contract the server part registers.
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

const CONSOLE_URL = "https://opencode.ai/console/go"
const REFRESH_MS = 60_000
const MOUNT_MS = 1_000

const WINDOWS = [
  { key: "rolling", label: "5h", name: "5-hour" },
  { key: "weekly", label: "Week", name: "weekly" },
  { key: "monthly", label: "Month", name: "monthly" },
]

const css = `
[data-go-usage] {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 0;
  margin: 7px 0 2px;
  padding: 7px 8px 6px;
  border: 1px solid var(--v2-border-border-muted, rgba(127, 127, 127, 0.22));
  border-radius: 8px;
  background: var(--v2-background-bg-layer-01, rgba(127, 127, 127, 0.06));
  color: var(--v2-text-text-muted, #8a8a8a);
  font-family: inherit;
  font-size: 11px;
  line-height: 1.2;
  user-select: none;
  -webkit-user-select: none;
}
[data-go-usage] .gou-head {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  height: 16px;
  margin-bottom: 4px;
}
[data-go-usage] .gou-title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  padding: 0;
  border: 0;
  background: none;
  color: var(--v2-text-text-base, currentColor);
  font: inherit;
  font-size: 11px;
  font-weight: 560;
  text-align: start;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
}
[data-go-usage] .gou-title:hover {
  color: var(--v2-text-text-accent, #6aa9ff);
}
[data-go-usage] .gou-updated {
  flex: none;
  color: var(--v2-text-text-faint, #777);
  font-size: 9.5px;
  font-variant-numeric: tabular-nums;
}
[data-go-usage] .gou-mode {
  flex: none;
  height: 14px;
  padding: 0 4px;
  border: 1px solid var(--v2-border-border-muted, rgba(127, 127, 127, 0.22));
  border-radius: 4px;
  background: none;
  color: var(--v2-text-text-faint, #777);
  font: inherit;
  font-size: 9px;
  line-height: 12px;
  cursor: pointer;
}
[data-go-usage] .gou-mode:hover {
  background: var(--v2-background-bg-layer-03, rgba(127, 127, 127, 0.12));
  color: var(--v2-text-text-base, currentColor);
}
[data-go-usage] .gou-refresh {
  flex: none;
  display: grid;
  place-items: center;
  width: 16px;
  height: 16px;
  padding: 0;
  border: 0;
  border-radius: 4px;
  background: none;
  color: var(--v2-text-text-faint, #777);
  cursor: pointer;
}
[data-go-usage] .gou-refresh:hover {
  background: var(--v2-background-bg-layer-03, rgba(127, 127, 127, 0.12));
  color: var(--v2-text-text-base, currentColor);
}
[data-go-usage] .gou-refresh svg {
  display: block;
  width: 11px;
  height: 11px;
}
[data-go-usage][data-loading] .gou-refresh svg {
  animation: gou-spin 0.8s linear infinite;
}
[data-go-usage] .gou-row {
  display: flex;
  align-items: center;
  gap: 7px;
  height: 17px;
}
[data-go-usage] .gou-label {
  flex: none;
  width: 33px;
  color: var(--v2-text-text-muted, #8a8a8a);
  font-size: 10px;
  font-weight: 530;
  letter-spacing: 0.02em;
  line-height: 1.1;
}
[data-go-usage] .gou-track {
  position: relative;
  flex: 1;
  min-width: 24px;
  height: 4px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--v2-background-bg-layer-03, rgba(127, 127, 127, 0.16));
}
[data-go-usage] .gou-fill {
  position: absolute;
  inset: 0 auto 0 0;
  width: 0;
  border-radius: inherit;
  background: var(--v2-text-text-accent, #6aa9ff);
  transition: width 0.4s ease;
}
[data-go-usage] .gou-row[data-level="warn"] .gou-fill {
  background: #e0a020;
}
[data-go-usage] .gou-row[data-level="danger"] .gou-fill {
  background: #e5484d;
}
[data-go-usage] .gou-pct {
  flex: none;
  width: 32px;
  color: var(--v2-text-text-base, currentColor);
  font-size: 10px;
  font-weight: 560;
  text-align: end;
  font-variant-numeric: tabular-nums;
}
[data-go-usage] .gou-reset {
  flex: none;
  width: 40px;
  overflow: hidden;
  color: var(--v2-text-text-faint, #777);
  font-size: 9.5px;
  text-align: end;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
[data-go-usage] .gou-foot {
  margin-top: 3px;
  overflow: hidden;
  color: var(--v2-text-text-faint, #777);
  font-size: 9.5px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
[data-go-usage][data-status="error"] .gou-foot {
  color: #e5484d;
}
[data-go-usage][data-status="error"] .gou-pct {
  color: var(--v2-text-text-faint, #777);
}
[data-go-usage-anchor] {
  width: 220px;
  margin: 6px 8px 8px;
}
@media (prefers-reduced-motion: reduce) {
  [data-go-usage] .gou-fill {
    transition: none;
  }
  [data-go-usage][data-loading] .gou-refresh svg {
    animation: none;
  }
}
@keyframes gou-spin {
  to {
    transform: rotate(360deg);
  }
}
`

function text(parent, className, value) {
  const node = document.createElement("span")

  node.className = className
  if (value !== undefined) node.textContent = value
  parent.appendChild(node)

  return node
}

function formatUntil(iso) {
  const at = Date.parse(iso ?? "")

  if (!Number.isFinite(at)) return ""

  const diff = at - Date.now()

  if (diff <= 0) return "now"
  if (diff < 60 * 60 * 1000) return `${Math.max(1, Math.round(diff / 60_000))}m`
  if (diff < 24 * 60 * 60 * 1000) {
    const hours = Math.floor(diff / 3_600_000)
    const minutes = Math.round((diff % 3_600_000) / 60_000)

    return minutes ? `${hours}h ${minutes}m` : `${hours}h`
  }

  return `${Math.ceil(diff / 86_400_000)}d`
}

function formatExact(iso) {
  const at = Date.parse(iso ?? "")

  if (!Number.isFinite(at)) return "reset time unknown"

  try {
    return new Date(at).toLocaleString(undefined, {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return new Date(at).toISOString()
  }
}

const MODE_KEY = "opencode-go-usage:mode"

function formatPercent(value) {
  const percent = Math.max(0, Math.min(100, value))

  if (percent === 0) return "0%"
  if (percent < 1) return "<1%"

  return `${Math.round(percent)}%`
}

function makeWidget(ctx) {
  const root = document.createElement("section")

  root.setAttribute("data-go-usage", "")
  root.setAttribute("role", "status")
  root.setAttribute("aria-live", "polite")
  root.setAttribute("aria-label", "OpenCode Go usage")

  const head = document.createElement("div")

  head.className = "gou-head"
  root.appendChild(head)

  const title = document.createElement("button")

  title.type = "button"
  title.className = "gou-title"
  title.textContent = "OpenCode Go"
  title.title = "Open the OpenCode Go console"
  title.addEventListener("click", () => {
    try {
      ctx.system.openExternal(CONSOLE_URL)
    } catch {
      window.open(CONSOLE_URL, "_blank", "noopener")
    }
  })
  head.appendChild(title)

  const updated = text(head, "gou-updated", "…")

  let mode = "left"
  try {
    if (localStorage.getItem(MODE_KEY) === "used") mode = "used"
  } catch {}

  const modeButton = document.createElement("button")

  modeButton.type = "button"
  modeButton.className = "gou-mode"

  const labelMode = () => {
    modeButton.textContent = mode
    modeButton.title = mode === "left" ? "Showing remaining quota (click for used)" : "Showing used quota (click for remaining)"
    modeButton.setAttribute("aria-label", modeButton.title)
  }

  labelMode()
  head.appendChild(modeButton)

  const refresh = document.createElement("button")

  refresh.type = "button"
  refresh.className = "gou-refresh"
  refresh.title = "Refresh usage"
  refresh.setAttribute("aria-label", "Refresh OpenCode Go usage")
  refresh.innerHTML =
    '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M21 12a9 9 0 1 1-2.64-6.36L21 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M21 3v5h-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  head.appendChild(refresh)

  const rows = new Map()

  for (const window of WINDOWS) {
    const row = document.createElement("div")

    row.className = "gou-row"
    root.appendChild(row)

    const label = text(row, "gou-label", window.label)
    const track = document.createElement("span")
    const fill = document.createElement("span")

    track.className = "gou-track"
    fill.className = "gou-fill"
    track.appendChild(fill)
    row.appendChild(track)

    const percent = text(row, "gou-pct", "—")
    const reset = text(row, "gou-reset", "")

    label.title = `${window.name[0].toUpperCase()}${window.name.slice(1)} limit`
    rows.set(window.key, { row, fill, percent, reset, name: window.name })
  }

  const foot = text(root, "gou-foot", "Loading usage…")
  let last = undefined

  const paintTimes = () => {
    if (!last?.ok) return

    for (const window of WINDOWS) {
      const item = rows.get(window.key)
      const value = last.usage?.[window.key]

      item.reset.textContent = formatUntil(value?.resetsAt)
    }
  }

  const paint = () => {
    if (!last) return

    if (!last.ok || !last.usage) {
      root.dataset.status = "error"

      for (const item of rows.values()) {
        item.row.dataset.level = "off"
        item.fill.style.width = "0%"
        item.percent.textContent = "—"
        item.reset.textContent = ""
        item.row.title = last.error ?? "OpenCode Go usage is unavailable"
      }

      foot.textContent = last.error ?? "OpenCode Go usage is unavailable"
      foot.title = foot.textContent

      return
    }

    root.dataset.status = "ok"

    for (const window of WINDOWS) {
      const item = rows.get(window.key)
      const value = last.usage[window.key] ?? { percent: 0, status: "ok" }
      const used = Math.max(0, Math.min(100, Number(value.percent) || 0))
      const left = 100 - used
      const shown = mode === "used" ? used : left
      const level = value.status !== "ok" || left === 0 ? "danger" : left <= 10 ? "warn" : "ok"
      const name = `${item.name[0].toUpperCase()}${item.name.slice(1)} limit`

      item.row.dataset.level = level
      item.fill.style.width = `${shown}%`
      item.percent.textContent = formatPercent(shown)
      item.reset.textContent = formatUntil(value.resetsAt)
      item.row.title =
        `${name}: ${formatPercent(used)} used · ${formatPercent(left)} left` +
        (value.resetsAt ? ` · resets ${formatExact(value.resetsAt)}` : "")
    }

    const tight = WINDOWS.filter((window) => {
      const value = last.usage[window.key]
      const left = 100 - (value?.percent ?? 0)

      return value?.status !== "ok" || left <= 10
    })

    if (tight.length > 0) {
      foot.textContent = tight
        .map((window) => `${window.name} ${formatPercent(100 - (last.usage[window.key]?.percent ?? 0))} left`)
        .join(" · ")
    } else {
      foot.textContent = `${mode === "used" ? "Used" : "Remaining"} allowance · click title for console`
    }

    foot.title = foot.textContent
    paintTimes()
  }

  const render = (result) => {
    last = result

    if (!result?.ok || !result.usage) {
      updated.textContent = ""
    } else {
      updated.textContent = "now"
      updated.title = `Updated ${new Date(result.fetchedAt ?? Date.now()).toLocaleTimeString()}`
    }

    paint()
  }

  modeButton.addEventListener("click", () => {
    mode = mode === "left" ? "used" : "left"
    try {
      localStorage.setItem(MODE_KEY, mode)
    } catch {}
    labelMode()
    paint()
  })

  return { root, refresh, render, paintTimes }
}

module.exports = Plugin.define({
  setup(ctx) {
    if (typeof document === "undefined") return

    ctx.add(Style, css)

    const widget = makeWidget(ctx)
    const root = widget.root
    let anchor
    let inFlight = false
    let disposed = false
    let lastRefresh = 0

    ctx.add(Slot, {
      at: "window.bottom",
      order: 5,
      render: () => {
        anchor = document.createElement("div")
        anchor.setAttribute("data-go-usage-anchor", "")

        return anchor
      },
    })

    const attach = () => {
      if (disposed) return

      const mount = document.querySelector('[data-slot="vertical-tabs-mount"]')

      if (mount) {
        const footer = mount.querySelector('[data-slot="vertical-tabs-footer"]')

        if (root.parentElement !== mount || (footer && root.nextElementSibling !== footer)) {
          mount.insertBefore(root, footer ?? null)
        }

        return
      }

      if (anchor && root.parentElement !== anchor) anchor.appendChild(root)
    }

    const refresh = async () => {
      if (disposed || inFlight) return

      inFlight = true
      lastRefresh = Date.now()
      root.dataset.loading = ""

      try {
        const result = await ctx.client.rpc(Usage).get({})

        if (!disposed) widget.render(result)
      } catch {
        if (!disposed) {
          widget.render({
            ok: false,
            error: "Can't reach the OpenCode server.",
          })
        }
      } finally {
        inFlight = false
        if (!disposed) delete root.dataset.loading
      }
    }

    const tick = () => {
      if (disposed) return

      widget.paintTimes()

      if (root.dataset.status === "ok" && lastRefresh && Date.now() - lastRefresh < REFRESH_MS) {
        const seconds = Math.max(0, Math.round((Date.now() - lastRefresh) / 1000))
        const label = seconds < 10 ? "now" : seconds < 60 ? `${seconds}s` : `${Math.round(seconds / 60)}m`
        const updated = root.querySelector(".gou-updated")

        if (updated && updated.textContent !== label) updated.textContent = label
      }
    }

    const onRefresh = () => void refresh()
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh()
    }

    widget.refresh.addEventListener("click", onRefresh)
    window.addEventListener("focus", onRefresh)
    document.addEventListener("visibilitychange", onVisible)

    attach()
    void refresh()

    const mountTimer = setInterval(attach, MOUNT_MS)
    const refreshTimer = setInterval(() => void refresh(), REFRESH_MS)
    const tickTimer = setInterval(tick, 10_000)

    return () => {
      disposed = true
      clearInterval(mountTimer)
      clearInterval(refreshTimer)
      clearInterval(tickTimer)
      widget.refresh.removeEventListener("click", onRefresh)
      window.removeEventListener("focus", onRefresh)
      document.removeEventListener("visibilitychange", onVisible)
      root.remove()
    }
  },
})
