import { api } from '../api'
import { compileFont, type GlyphStrokes } from './compileFont'

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let binary = ''
  const chunk = 0x8000 // avoid call-stack limits on String.fromCharCode with huge arrays
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

export async function fetchHandwritingProgress(): Promise<{ glyphs: GlyphStrokes; hasFont: boolean }> {
  const r = await api.get('/handwriting')
  return { glyphs: r.data.data.glyphs ?? {}, hasFont: !!r.data.data.hasFont }
}

// Merge newly captured letters into the full set, compile a font, and save it.
// Returns the full merged glyph set so the caller's local state stays in sync.
export async function saveHandwritingProgress(
  existing: GlyphStrokes,
  freshlyCaptured: GlyphStrokes,
  fontName: string,
): Promise<GlyphStrokes> {
  const merged = { ...existing, ...freshlyCaptured }
  const fontBuffer = compileFont(fontName, merged)
  const fontData = arrayBufferToBase64(fontBuffer)
  await api.put('/handwriting', { glyphs: merged, fontData })
  return merged
}

// Fetches the compiled font's raw bytes through the normal authenticated API
// client (never as a plain URL — that would mean putting the auth token in
// a query string). The CSS Font Loading API accepts raw bytes directly.
export async function fetchHandwritingFontBuffer(): Promise<ArrayBuffer | null> {
  try {
    const r = await api.get('/handwriting/font', { responseType: 'arraybuffer' })
    return r.data as ArrayBuffer
  } catch {
    return null
  }
}
