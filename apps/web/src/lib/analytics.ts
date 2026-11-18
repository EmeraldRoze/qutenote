// Usability breadcrumbs (Emerald's spec, Oct 2026). Our own, no third
// parties. Tracks screens, taps, funnel steps, feature touches, dismissals,
// errors and slow screens, batched to POST /usage/events every few seconds.
//
// TWO PRIME DIRECTIVES.
//
// 1. BREADCRUMBS MUST NEVER SLOW OR BREAK THE APP. Every path here swallows
//    its own failures. Events queue in memory and are simply dropped if the
//    network is away. Nothing in this file is ever awaited by a screen.
//
// 2. NOTHING THAT NAMES A PERSON EVER LEAVES THE PHONE. Her ruling, carried
//    over from Dreambound (Nov 18 2026): the dashboard may show that someone
//    opened a profile, picked a recipient or tapped a QT, never WHICH person.
//    QuteNote leaks names in two ways Dreambound did not, and both are
//    handled here, on the way OUT, so a leak needs a bug in THIS FILE rather
//    than a forgotten filter in any one dashboard query:
//      - the path /profile/<their handle> (257 of 2,079 screen records on
//        Nov 18 were exactly this);
//      - button labels, because a QT row, a recipient row and a search
//        result are all buttons whose visible text is a person's name.
import { api } from './api'
import { safePath } from './safePath'

type Crumb = { name: string; screen?: string; target?: string; props?: Record<string, unknown>; at: string }

const SESSION_ID = `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
let queue: Crumb[] = []
let currentScreen = ''
let flushTimer: number | null = null

// ─── Keeping names out of it ────────────────────────────────────────────────
//
// safePath lives in its own import-free file so it can actually be tested:
// see lib/safePath.ts. A privacy rule that cannot be run in a test is a
// privacy rule nobody checks.

// ─── The queue ──────────────────────────────────────────────────────────────

// The same thing happening over and over is worth knowing ONCE. A repeated
// identical crumb inside this window is dropped. This is not tidiness: on
// Dreambound a loop produced 786 identical error crumbs in nine seconds, and
// a dashboard whose panels can be buried by any future loop is not worth
// reading. The rows are hers to pay for, too.
//
// TAPS ARE EXEMPT: five taps on one button IS the signal, and rage-tap
// detection on the server feeds off exactly that.
const REPEAT_WINDOW_MS = 4000
let lastKey = ''
let lastKeyAt = 0

function crumb(name: string, target?: string, props?: Record<string, unknown>) {
  try {
    if (name !== 'tap') {
      const key = `${name}|${target ?? ''}`
      const now = Date.now()
      if (key === lastKey && now - lastKeyAt < REPEAT_WINDOW_MS) return
      lastKey = key
      lastKeyAt = now
    }
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

/** Send what is queued right now, without waiting for the timer. */
export function flushNow() {
  void flush()
}

// ─── Public API ─────────────────────────────────────────────────────────────

// Route changes: call with the new pathname. Also measures slow screens: if
// the next paint after a navigation lags, that is worth knowing.
let lastScreenAt = 0
export function trackScreen(path: string) {
  const safe = safePath(path)
  // One navigation must only ever leave one crumb. React can run this effect
  // twice for the same screen (dev builds especially), and a doubled crumb
  // doubles every number on the analytics dashboard.
  const now = Date.now()
  if (safe === currentScreen && now - lastScreenAt < 1000) return
  lastScreenAt = now
  const prev = currentScreen
  currentScreen = safe
  crumb('screen_view', safe, prev ? { from: prev } : undefined)
  // paint check: if two frames take >1500ms to arrive, flag it
  const started = performance.now()
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const ms = Math.round(performance.now() - started)
    if (ms > 1500) crumb('slow_screen', safe, { ms })
  }))
}

// Funnel steps: trackFunnel('send', 'write') → target "send:write"
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

// Opened something and backed out of it without finishing. Not an error and
// not a success, and invisible until it is given a name of its own, because
// backing out of a sheet is handled as a silent no-op everywhere. On
// Dreambound this immediately caught a tester opening the Apple and Google
// sign-in sheets seven times and leaving without an account. QuteNote has
// the same two sheets on the same screen.
export function trackDismissed(what: string, props?: Record<string, unknown>) {
  crumb('dismissed', what, props)
}

// ─── The tap trail ──────────────────────────────────────────────────────────
//
// Every button and link press becomes a breadcrumb carrying its visible
// label: the generic "what did they press right before they gave up" trail,
// which rage-tap detection on the server feeds off.
//
// THE LABEL IS WHERE QUTENOTE LEAKS. A QT row, a recipient row, a search
// result and a contact match are all buttons whose visible text is a real
// person's name. Two nets:
//
//   1. data-crumb-private on a container — the real defence. Anything inside
//      reports as "a button in the QT list" instead of the name it shows.
//      data-crumb on the button itself names it outright.
//   2. A length backstop, because net 1 depends on me having found every
//      container and this app renders people's names in more places than I
//      can promise to have seen. A QuteNote button says "MAIL IT" or "SYNC
//      CONTACTS"; nothing legitimate runs to nine words. Anything that long
//      is almost certainly someone's prose or several names, so its SHAPE is
//      recorded and its content is not.
function labelFor(el: HTMLElement): string {
  const own = el.getAttribute('data-crumb')
  if (own) return own.slice(0, 60)

  const privateBox = el.closest('[data-crumb-private]') as HTMLElement | null
  if (privateBox) {
    const boxName = privateBox.getAttribute('data-crumb-private') || 'private area'
    return `button in ${boxName}`.slice(0, 60)
  }

  const text = (el.getAttribute('aria-label') || el.textContent || '')
    .trim().replace(/\s+/g, ' ').slice(0, 60)

  const words = text.split(' ').filter(Boolean)
  if (words.length > 8) return `long text (${words.length} words)`

  return text
}

let tapTrackingInstalled = false
export function installTapTracking() {
  // Install once per page load. A second listener would log every tap twice
  // and make honest tapping look like rage tapping.
  if (tapTrackingInstalled) return
  tapTrackingInstalled = true
  try {
    document.addEventListener('click', (e) => {
      try {
        const el = (e.target as HTMLElement)?.closest?.('button, a, [role="button"], [role="radio"], [role="tab"]') as HTMLElement | null
        if (!el) return
        const label = labelFor(el)
        if (label) crumb('tap', label)
      } catch { /* never */ }
    }, { capture: true, passive: true })
    document.addEventListener('visibilitychange', () => { if (document.hidden) void flush() })
  } catch { /* never */ }
}
