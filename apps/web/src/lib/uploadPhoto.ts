import { api } from './api'

// Shrink the picked photo to postcard resolution and store it on the server.
// Returns a permanent URL that survives app restarts and that the print
// service can fetch. (A blob: URL dies with the session — learned the hard way.)
export async function uploadPhoto(file: File): Promise<string> {
  const dataUrl = await downscale(file, 1800, 0.85)
  const r = await api.post('/uploads', { dataUrl })
  return r.data.data.url as string
}

function downscale(file: File, maxSide: number, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)
    // Belt and suspenders: if neither onload nor onerror ever fires, don't
    // hang "Uploading…" forever.
    const timeout = setTimeout(() => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('timed out reading photo'))
    }, 15000)
    img.onload = () => {
      clearTimeout(timeout)
      URL.revokeObjectURL(objectUrl)
      // Wrapped — an uncaught throw in here would otherwise leave the
      // promise hanging forever (stuck "Uploading…" with no error shown).
      try {
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('canvas unavailable')
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', quality))
      } catch (e: any) {
        reject(new Error('could not process photo: ' + (e?.message ?? 'unknown')))
      }
    }
    img.onerror = () => {
      clearTimeout(timeout)
      URL.revokeObjectURL(objectUrl)
      reject(new Error(`unreadable photo (${file.type || 'unknown type'}) — it may be in a format this can't read yet`))
    }
    img.src = objectUrl
  })
}
