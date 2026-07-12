import * as Comlink from 'comlink'
import type { RenderWorkerApi } from '../workers/render.worker'

// Single shared worker instance for the whole app.
const worker = new Worker(new URL('../workers/render.worker.ts', import.meta.url), { type: 'module' })
export const renderWorker = Comlink.wrap<RenderWorkerApi>(worker)
