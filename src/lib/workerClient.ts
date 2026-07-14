import * as Comlink from 'comlink'
import type { RenderWorkerApi } from '../workers/render.worker'

// Single shared worker instance for the whole app, with a minimal crash
// recovery mechanism: if the worker thread dies (e.g. an out-of-memory
// crash while decoding a huge image), we surface it to subscribers instead
// of silently leaving every future render() call hanging forever.
type CrashListener = (error: ErrorEvent) => void
const crashListeners = new Set<CrashListener>()

let worker: Worker
let renderWorker: Comlink.Remote<RenderWorkerApi>

function spawnWorker() {
  worker = new Worker(new URL('../workers/render.worker.ts', import.meta.url), { type: 'module' })
  worker.onerror = (e) => {
    e.preventDefault()
    crashListeners.forEach((l) => l(e))
    // Replace the dead worker so subsequent operations can recover.
    spawnWorker()
  }
  renderWorker = Comlink.wrap<RenderWorkerApi>(worker)
}
spawnWorker()

export function onWorkerCrash(listener: CrashListener) {
  crashListeners.add(listener)
  return () => crashListeners.delete(listener)
}

// Exported as a getter-like proxy object so callers always go through the
// current worker instance even after a crash/respawn.
export const getRenderWorker = () => renderWorker
