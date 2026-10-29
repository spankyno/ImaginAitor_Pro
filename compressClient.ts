import * as Comlink from 'comlink'
import type { CompressWorkerApi } from '../workers/compress.worker'
import type { CompressResult, CompressSettings } from './compress/types'
import type { EditOperation } from '../types/pipeline'

// El worker se crea la primera vez que se comprime algo (no al arrancar la app)
// y se destruye para cancelar: un WASM en ejecución no se puede interrumpir de
// otro modo. Solo hay un trabajo a la vez.
let worker: Worker | null = null
let remote: Comlink.Remote<CompressWorkerApi> | null = null
let rejectCurrent: ((reason: unknown) => void) | null = null

const abortError = () => new DOMException('Compresión cancelada', 'AbortError')
export const isAbortError = (e: unknown) => e instanceof DOMException && e.name === 'AbortError'

function ensureWorker() {
  if (!worker || !remote) {
    worker = new Worker(new URL('../workers/compress.worker.ts', import.meta.url), { type: 'module' })
    remote = Comlink.wrap<CompressWorkerApi>(worker)
  }
  return { worker, remote }
}

/** Cancela el trabajo en curso (si lo hay) destruyendo el worker; el siguiente trabajo crea uno nuevo. */
export function cancelCompression() {
  if (worker) { worker.terminate(); worker = null; remote = null }
  const reject = rejectCurrent
  rejectCurrent = null
  reject?.(abortError())
}

export function compressInWorker(
  source: ImageBitmap,
  ops: EditOperation[],
  settings: CompressSettings,
  sourceMime: string,
): Promise<CompressResult> {
  if (rejectCurrent) cancelCompression() // solo se cancela si realmente hay algo en vuelo; si no, se reutiliza el worker (WASM ya cargado)
  const { worker: w, remote: r } = ensureWorker()
  return new Promise<CompressResult>((resolve, reject) => {
    const finish = () => { if (rejectCurrent === reject) rejectCurrent = null }
    rejectCurrent = reject
    w.onerror = (e) => {
      e.preventDefault()
      finish()
      worker?.terminate(); worker = null; remote = null // el worker murió (p. ej. sin memoria): se recreará
      reject(new Error(e.message || 'worker error'))
    }
    r.compress(source, ops, settings, sourceMime).then(
      (res) => { finish(); resolve(res) },
      (err) => { finish(); reject(err) },
    )
  })
}
