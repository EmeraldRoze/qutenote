// The one place the printed card's measurements live (Emerald, Nov 9 2026).
//
// QuteNote prints in-house now: Ryan exports from an InDesign template built
// at 600 DPI and gangs several cards onto one sheet. Every number a screen
// needs to quote about print quality comes from here, so raising the card size
// or the press resolution is a one-line change instead of a hunt through copy
// strings. The API's twin is apps/api/src/lib/printSpec.ts — keep them in sync.

/** Finished card, inches. A 6x4 is what the USPS charges postcard rate for. */
export const CARD_W_IN = 6
export const CARD_H_IN = 4
/** Bleed on every edge, inches. */
export const BLEED_IN = 0.125
/** What Ryan's template is built at. */
export const PRESS_DPI = 600
/** The floor below which a file is refused outright. */
export const MIN_DPI = 300

export const FULL_W_IN = CARD_W_IN + BLEED_IN * 2   // 6.25
export const FULL_H_IN = CARD_H_IN + BLEED_IN * 2   // 4.25

/** Pixels needed to fill a full bled card at a given resolution. */
export function pxForDpi(dpi: number): { w: number; h: number } {
  return { w: Math.round(FULL_W_IN * dpi), h: Math.round(FULL_H_IN * dpi) }
}

export const IDEAL_PX = pxForDpi(PRESS_DPI)   // 3750 x 2550
export const MIN_PX = pxForDpi(MIN_DPI)       // 1875 x 1275

/**
 * The real resolution a file lands at once it covers the card, taking the
 * SHORT edge against the short edge of the card — that is the one that runs
 * out first on a portrait photo, and it is the number that decides whether a
 * print looks sharp or soft.
 */
export function dpiOnCard(width?: number | null, height?: number | null): number {
  if (!width || !height) return 0
  const longPx = Math.max(width, height)
  const shortPx = Math.min(width, height)
  return Math.floor(Math.min(longPx / FULL_W_IN, shortPx / FULL_H_IN))
}

/** Prints acceptably, but under the resolution the press is set up for. */
export function isLowRes(width?: number | null, height?: number | null): boolean {
  return dpiOnCard(width, height) < PRESS_DPI
}

/** Cannot be printed at all. */
export function isTooSmall(width?: number | null, height?: number | null): boolean {
  return dpiOnCard(width, height) < MIN_DPI
}
