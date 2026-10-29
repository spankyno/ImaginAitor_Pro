export type AppErrorKind = 'too-large' | 'out-of-memory' | 'unsupported-format' | 'worker-error' | 'network' | 'unknown'

export interface ClassifiedError {
  kind: AppErrorKind
  title: string
  description: string
}

// Above this many megapixels we refuse to decode — most devices start
// paging / crashing the tab well before this on a 32-bit canvas backing store.
export const MAX_MEGAPIXELS = 120
export const WARN_MEGAPIXELS = 50

export function classifyError(err: unknown): ClassifiedError {
  const message = err instanceof Error ? err.message : String(err)
  const lower = message.toLowerCase()

  if (lower.includes('too large') || lower.includes('exceeds') || lower.includes('dimensions')) {
    return {
      kind: 'too-large',
      title: 'Imagen demasiado grande',
      description: 'Esta imagen supera el tamaño que el navegador puede procesar de forma fiable. Prueba a redimensionarla antes de subirla.',
    }
  }
  if (lower.includes('out of memory') || lower.includes('allocation') || err instanceof RangeError) {
    return {
      kind: 'out-of-memory',
      title: 'Memoria insuficiente',
      description: 'El navegador se quedó sin memoria al procesar la imagen. Cierra otras pestañas o prueba con una imagen más pequeña.',
    }
  }
  if (lower.includes('mimetype') || lower.includes('unsupported') || lower.includes('could not decode') || lower.includes('the source image cannot be decoded')) {
    return {
      kind: 'unsupported-format',
      title: 'Formato no soportado',
      description: 'Tu navegador no puede decodificar este archivo. Prueba a exportarlo como JPG, PNG o WebP primero.',
    }
  }
  if (lower.includes('fetch') || lower.includes('cors') || lower.includes('network')) {
    return {
      kind: 'network',
      title: 'No se pudo cargar la imagen',
      description: 'La URL no es accesible o el servidor bloquea la descarga (CORS).',
    }
  }
  if (lower.includes('worker') || lower.includes('terminated')) {
    return {
      kind: 'worker-error',
      title: 'Error interno de procesamiento',
      description: 'El proceso en segundo plano se interrumpió inesperadamente. Se reintentará automáticamente.',
    }
  }
  return {
    kind: 'unknown',
    title: 'Algo salió mal',
    description: message || 'Ha ocurrido un error inesperado.',
  }
}
