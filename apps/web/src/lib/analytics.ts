// Usability breadcrumbs (Emerald's spec, Oct 2026). Our own, no third
// parties. Tracks screens, taps, funnel steps, feature touches, errors and
// slow screens, batched to POST /usage/events every few seconds.
//
// Prime directive: analytics must NEVER slow or break the app. Every path
// here swallows its own failures; events queue in memory and are simply
// dropped if the network is away.
import { api } from './api'

type Crumb = { name: string; screen?: string; target?: string; props?: Record<string, unknown>; at: string }

const SESSION_ID = `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
let queue: Crumb[] = []
let currentScreen = ''
let flushTimer: number | null = null

function crumb(name: string, target?: string, props?: Record<string, unknown>) {
  try {
    queue.push({ name, screen: currentScreen || undefined, target, props, at: new Date().toISOString() })
    if (queue.length > 400) queue = queue.slice(-200) // never grow unbounded
    scheduleFlush()
  } catch { /* breadcrumbs never break the app */ }
}

function scheduleFlush() {
  if (flushTimer != null) return
  flushTimer = window.setTimeout(flush, 4000)
}

async function flush() {
  flushTimer = null
  if (!queue.length) return
  const batch = queue.splice(0, 200)
  try {
    await api.post('/usage/events', { sessionId: SESSION_ID, events: batch })
  } catch { /* dropped crumbs are fine; the app comes first */ }
  if (queue.length) scheduleFlush()
}

// ─── Public API ─────────────────────────────────────────────────────────────

// Route changes: call with the new pathname. Also measures slow screens —
// if the next paint after a navigation lags, that's worth knowing.
export function trackScreen(path: string) {
  const prev = currentScreen
  currentScreen = path
  crumb('screen_view', path, prev ? { from: prev } : undefined)
  // paint check: if two frames take >1500ms to arrive, flag it
  const started = performance.now()
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const ms = Math.round(performance.now() - started)
    if (ms > 1500) crumb('slow_screen', path, { ms })
  }))
}

// Funnel steps: track('send', 'write') → target "send:write"
export function trackFunnel(funnel: string, step: string, props?: Record<string, unknown>) {
  crumb('funnel', `${funnel}:${step}`, props)
}

// Feature touches: first meaningful use of a named feature
export function trackFeature(key: string, props?: Record<string, unknown>) {
  crumb('feature', key, props)
}

// Errors the person actually saw (error banners, failed saves)
export function trackError(what: string, props?: Record<string, unknown>) {
  crumb('error', what, props)
}

// Global tap listener: every button/link press becomes a breadcrumb with its
// visible label — this is the generic "what did they tap right before it
// broke" trail, and rage-tap detection feeds off it server-side.
export function installTapTracking() {
  try {
    document.addEventListener('click', (e) => {
      try {
        const el = (e.target as HTMLElement)?.closest?.('button, a, [role="button"], [role="radio"], [role="tab"]') as HTMLElement | null
        if (!el) return
        const label = (el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60)
        if (label) crumb('tap', label)
      } catch { /* never */ }
    }, { capture: true, passive: true })
    document.addEventListener('visibilitychange', () => { if (document.hidden) void flush() })
  } catch { /* never */ }
}
