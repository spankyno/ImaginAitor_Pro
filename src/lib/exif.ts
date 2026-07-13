import exifr from 'exifr'

/**
 * Reads the EXIF Orientation tag (1-8) from a file. Mobile photos are very
 * often stored "sideways" with the orientation flag telling viewers how to
 * rotate them. We read this once at import time and bake the correct
 * rotation into the pixels so the rest of the pipeline (and every export)
 * always works with a correctly-oriented bitmap.
 */
export async function readExifOrientation(file: File): Promise<number> {
  try {
    const orientation = await exifr.orientation(file)
    return orientation ?? 1
  } catch {
    return 1
  }
}

/**
 * Decodes a File into an ImageBitmap with EXIF orientation already applied,
 * so downstream code never has to think about it again.
 */
export async function bitmapFromFileRespectingExif(file: File): Promise<{ bitmap: ImageBitmap; width: number; height: number }> {
  const orientation = await readExifOrientation(file)
  // createImageBitmap supports the standard "imageOrientation: from-image"
  // in modern browsers, which is the most robust approach.
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
    return { bitmap, width: bitmap.width, height: bitmap.height }
  } catch {
    // Fallback: manual rotation based on the EXIF tag we read above.
    const raw = await createImageBitmap(file)
    bitmap = await applyOrientationManually(raw, orientation)
    return { bitmap, width: bitmap.width, height: bitmap.height }
  }
}

async function applyOrientationManually(bitmap: ImageBitmap, orientation: number): Promise<ImageBitmap> {
  if (orientation <= 1) return bitmap
  const swap = orientation >= 5
  const w = swap ? bitmap.height : bitmap.width
  const h = swap ? bitmap.width : bitmap.height
  const canvas = new OffscreenCanvas(w, h)
  const ctx = canvas.getContext('2d')!

  switch (orientation) {
    case 2: ctx.transform(-1, 0, 0, 1, w, 0); break
    case 3: ctx.transform(-1, 0, 0, -1, w, h); break
    case 4: ctx.transform(1, 0, 0, -1, 0, h); break
    case 5: ctx.transform(0, 1, 1, 0, 0, 0); break
    case 6: ctx.transform(0, 1, -1, 0, h, 0); break
    case 7: ctx.transform(0, -1, -1, 0, h, w); break
    case 8: ctx.transform(0, -1, 1, 0, 0, w); break
  }
  ctx.drawImage(bitmap, 0, 0)
  return canvas.transferToImageBitmap()
}

/** Loads an image from a remote URL (CORS permitting) into a File-like bitmap source. */
export async function loadImageFromUrl(url: string): Promise<File> {
  const res = await fetch(url, { mode: 'cors' })
  if (!res.ok) throw new Error('No se pudo cargar la imagen desde la URL')
  const blob = await res.blob()
  const name = url.split('/').pop()?.split('?')[0] || 'imagen-remota.png'
  return new File([blob], name, { type: blob.type || 'image/png' })
}
