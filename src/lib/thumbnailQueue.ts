import * as Comlink from 'comlink'
import type { ThumbnailWorkerApi } from '../workers/thumbnail.worker'

// A small pool (not just one) so two thumbnails can decode/encode in
// parallel, but capped low so a 300-image batch import doesn't fight the
// main thread or the render worker for CPU. Requests are queued FIFO and
// streamed back one at a time via the returned promise as each completes —
// exactly what lets the filmstrip fill in progressively instead of
// blocking on the whole batch.
const POOL_SIZE = 2

const workers: Comlink.Remote<ThumbnailWorkerApi>[] = Array.from({ length: POOL_SIZE }, () => {
  const w = new Worker(new URL('../workers/thumbnail.worker.ts', import.meta.url), { type: 'module' })
  return Comlink.wrap<ThumbnailWorkerApi>(w)
})

interface Job {
  bitmap: ImageBitmap
  resolve: (blob: Blob) => void
  reject: (e: unknown) => void
}

const queue: Job[] = []
const busy: boolean[] = new Array(POOL_SIZE).fill(false)

function pump() {
  for (let i = 0; i < POOL_SIZE; i++) {
    if (busy[i] || queue.length === 0) continue
    const job = queue.shift()!
    busy[i] = true
    workers[i]
      .makeThumbnail(job.bitmap)
      .then(job.resolve)
      .catch(job.reject)
      .finally(() => { busy[i] = false; pump() })
  }
}

export function requestThumbnail(bitmap: ImageBitmap): Promise<Blob> {
  return new Promise((resolve, reject) => {
    queue.push({ bitmap, resolve, reject })
    pump()
  })
}

export function pendingThumbnailCount() {
  return queue.length + busy.filter(Boolean).length
}
