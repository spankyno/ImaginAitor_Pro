import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'

interface Props { children: ReactNode }
interface State { error: Error | null }

/**
 * The infinite-render crash we hit while building the Konva layer editor
 * (React error #185) had no visible symptom other than "the image
 * disappeared" — no message, no way to recover short of a manual reload.
 * This boundary is the general-purpose fix for that class of problem: any
 * uncaught render error anywhere in the tree now shows an explicit,
 * actionable message instead of leaving a blank canvas with only a
 * minified error code in the console.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ImaginAitor_Pro crashed:', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex h-screen w-screen flex-col items-center justify-center gap-4 bg-bg-base px-6 text-center text-text-primary">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/15 text-red-400">
            <AlertTriangle size={22} />
          </div>
          <div>
            <p className="text-base font-semibold">Algo se ha roto inesperadamente</p>
            <p className="mt-1.5 max-w-sm text-sm text-text-muted">
              La edición en curso puede haberse perdido, pero tus imágenes originales nunca se modifican, así que puedes volver a empezar sin riesgo.
            </p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Recargar ImaginAitor_Pro
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
