import { useEffect, useState } from 'react'
import { fetchHandwritingFontBuffer } from './api'

export const HANDWRITING_FONT_FAMILY = 'QuteNoteHandwriting'

// Loads the person's compiled handwriting font (if they have one) and
// registers it with the browser so `fontFamily: HANDWRITING_FONT_FAMILY`
// just works anywhere on the page.
let currentFace: FontFace | null = null

export function useHandwritingFontFace(buffer?: ArrayBuffer | null, reloadKey?: unknown): { ready: boolean } {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const buf = buffer !== undefined ? buffer : await fetchHandwritingFontBuffer()
      if (!buf || cancelled) {
        if (!cancelled) setReady(false)
        return
      }
      try {
        const face = new FontFace(HANDWRITING_FONT_FAMILY, buf)
        await face.load()
        if (cancelled) return
        // replace, don't stack — a rewrite should show immediately
        if (currentFace) document.fonts.delete(currentFace)
        document.fonts.add(face)
        currentFace = face
        setReady(true)
      } catch {
        if (!cancelled) setReady(false)
      }
    }
    load()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buffer, reloadKey])

  return { ready }
}
