// The printed card's measurements, server side (Emerald, Nov 9 2026).
// Twin of apps/web/src/lib/printSpec.ts — keep them in sync.
//
// Everything Ryan's print export measures comes from here. He gangs several
// cards onto one sheet from an InDesign template built at 600 DPI, and his
// placement is not final yet, so the export's job is to hand him every element
// at a known size in inches and let the template put it where it goes.

export const CARD_W_IN = 6
export const CARD_H_IN = 4
export const BLEED_IN = 0.125
export const PRESS_DPI = 600
export const MIN_DPI = 300

export const FULL_W_IN = CARD_W_IN + BLEED_IN * 2   // 6.25
export const FULL_H_IN = CARD_H_IN + BLEED_IN * 2   // 4.25

export function pxForDpi(dpi: number, inches: number): number {
  return Math.round(inches * dpi)
}

/** Full bled card at press resolution: 3750 x 2550. */
export const FULL_PX = {
  w: pxForDpi(PRESS_DPI, FULL_W_IN),
  h: pxForDpi(PRESS_DPI, FULL_H_IN),
}

/** The hard floor for any artwork: 1875 x 1275. */
export const MIN_PX = {
  w: pxForDpi(MIN_DPI, FULL_W_IN),
  h: pxForDpi(MIN_DPI, FULL_H_IN),
}

/**
 * The message block. Transparent PNG, fixed width, height follows the length
 * of the note. 2.75in wide sits inside the left half of a 6in card with room
 * either side; Ryan can scale it, and its exact size in inches rides along in
 * the data file so he can place it before the template is finished.
 */
export const MESSAGE_W_IN = 2.75
export const MESSAGE_MAX_H_IN = 3.5
export const MESSAGE_PX_W = pxForDpi(PRESS_DPI, MESSAGE_W_IN)       // 1650

/** The scan QR. 0.8in prints well above the size that stops scanning. */
export const QR_IN = 0.8
export const QR_PX = pxForDpi(PRESS_DPI, QR_IN)                      // 480

/**
 * What resolution a file actually lands at once it covers the card. The short
 * edge is what runs out first on a portrait photo, and it is the number that
 * decides sharp versus soft.
 */
export function dpiOnCard(width?: number | null, height?: number | null): number {
  if (!width || !height) return 0
  return Math.floor(Math.min(Math.max(width, height) / FULL_W_IN, Math.min(width, height) / FULL_H_IN))
}

export function isLowRes(width?: number | null, height?: number | null): boolean {
  return dpiOnCard(width, height) < PRESS_DPI
}

export function isTooSmall(width?: number | null, height?: number | null): boolean {
  return dpiOnCard(width, height) < MIN_DPI
}
