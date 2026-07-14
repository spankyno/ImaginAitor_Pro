import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft, Crop, Maximize2, RotateCw, SlidersHorizontal, Sparkles,
  Type, Shapes, ScanEye, Layers, ShieldCheck, Gauge, GitBranch,
} from 'lucide-react'
import { Footer } from '../components/Layout/Footer'

const TOOLS = [
  { icon: Crop, title: 'Recorte', desc: 'Libre o con presets de ratio (1:1, 4:3, 16:9, 9:16, 5:4) y rotación del recorte.' },
  { icon: Maximize2, title: 'Redimensionado', desc: 'Por píxeles exactos, porcentaje o "encajar en", con downscale progresivo de alta calidad.' },
  { icon: RotateCw, title: 'Rotar y voltear', desc: '90° / 180° / 270° y volteo horizontal o vertical.' },
  { icon: SlidersHorizontal, title: 'Ajustes', desc: 'Brillo, contraste, saturación, exposición, temperatura, nitidez y desenfoque.' },
  { icon: Sparkles, title: 'Filtros', desc: 'B&N, sepia, vintage, frío, cálido, fade, vívido y noir, con intensidad ajustable.' },
  { icon: Type, title: 'Texto', desc: 'Fuente, tamaño, color, alineación, rotación, sombra, negrita y cursiva.' },
  { icon: Shapes, title: 'Formas', desc: 'Rectángulo, elipse, flecha y marcador, con relleno y grosor configurables.' },
  { icon: ScanEye, title: 'Pixelar / Difuminar', desc: 'Oculta datos sensibles en capturas: matrículas, correos, nombres…' },
  { icon: Layers, title: 'Historial no destructivo', desc: 'Activa, desactiva, reordena o elimina cualquier paso sin perder calidad.' },
]

const STACK = [
  'React', 'TypeScript', 'Vite', 'Tailwind CSS v4', 'Zustand', 'React Router',
  'Web Workers', 'OffscreenCanvas', 'Comlink', 'react-window', 'EXIF (exifr)',
]

const PRINCIPLES = [
  { icon: ShieldCheck, title: 'Privacidad primero', desc: 'Tus imágenes nunca salen de tu navegador. No hay backend, no hay subidas, no hay servidores intermedios.' },
  { icon: GitBranch, title: 'No destructivo', desc: 'La imagen original nunca se toca. Cada edición es un paso reversible en una pila que puedes reordenar o desactivar.' },
  { icon: Gauge, title: 'Rendimiento primero', desc: 'Todo el procesamiento pesado corre en Web Workers, así que la interfaz nunca se congela, ni con imágenes de 50 megapíxeles.' },
]

export default function AboutPage() {
  useEffect(() => { document.title = 'Acerca de — ImaginAitor_Pro' }, [])

  return (
    <div className="min-h-screen bg-bg-base text-text-primary" style={{ fontFamily: 'var(--font-body)' }}>
      {/* ── Hero ─────────────────────────────────────────────── */}
      <header className="relative overflow-hidden border-b border-border-subtle px-6 pb-20 pt-14">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          style={{
            background: 'radial-gradient(60% 50% at 15% 0%, color-mix(in srgb, var(--color-accent) 28%, transparent), transparent 70%), radial-gradient(45% 40% at 100% 20%, color-mix(in srgb, var(--color-accent) 16%, transparent), transparent 70%)',
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.05] mix-blend-overlay"
          style={{
            backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
            animation: 'grain-shift 8s ease-in-out infinite',
          }}
        />

        <div className="relative mx-auto max-w-3xl">
          <Link
            to="/"
            className="reveal mb-10 inline-flex items-center gap-2 rounded-full border border-border-subtle px-3 py-1.5 text-xs text-text-muted transition-colors hover:border-accent/60 hover:text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
          >
            <ArrowLeft size={14} /> Volver al editor
          </Link>

          <p className="reveal text-xs uppercase tracking-[0.25em] text-accent" style={{ fontFamily: 'var(--font-mono)', animationDelay: '60ms' }}>
            Proyecto independiente · Acerca de
          </p>
          <h1
            className="reveal mt-4 text-5xl leading-[1.05] text-text-primary sm:text-6xl"
            style={{ fontFamily: 'var(--font-display)', fontWeight: 500, animationDelay: '120ms' }}
          >
            Un editor de imágenes que se queda <em style={{ fontStyle: 'italic', color: 'var(--color-accent)' }}>en tu navegador</em>.
          </h1>
          <p className="reveal mt-6 max-w-xl text-base leading-relaxed text-text-muted" style={{ animationDelay: '200ms' }}>
            ImaginAitor_Pro es un editor de imágenes <strong className="text-text-primary">no destructivo</strong> pensado
            para capturas de pantalla, fotos de móvil y procesamiento por lotes. Recorta, ajusta, filtra y exporta con
            calidad profesional — sin subir un solo píxel a ningún servidor.
          </p>
        </div>
      </header>

      {/* ── Principios ───────────────────────────────────────── */}
      <section className="mx-auto max-w-3xl px-6 py-16">
        <div className="grid gap-6 sm:grid-cols-3">
          {PRINCIPLES.map(({ icon: Icon, title, desc }, i) => (
            <div key={title} className="reveal rounded-2xl border border-border-subtle bg-bg-panel p-5" style={{ animationDelay: `${i * 80}ms` }}>
              <Icon size={20} className="text-accent" />
              <h3 className="mt-3 text-sm font-semibold text-text-primary">{title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-text-muted">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Herramientas ─────────────────────────────────────── */}
      <section className="border-t border-border-subtle px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <p className="text-xs uppercase tracking-[0.25em] text-accent" style={{ fontFamily: 'var(--font-mono)' }}>Herramientas</p>
          <h2 className="mt-3 text-3xl" style={{ fontFamily: 'var(--font-display)', fontWeight: 500 }}>Todo lo que necesitas, en un solo lienzo</h2>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {TOOLS.map(({ icon: Icon, title, desc }, i) => (
              <div
                key={title}
                className="reveal group rounded-xl border border-border-subtle bg-bg-panel-2 p-4 transition-colors hover:border-accent/50"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15 text-accent transition-transform group-hover:scale-110">
                  <Icon size={16} />
                </div>
                <h3 className="mt-3 text-sm font-semibold text-text-primary">{title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-text-muted">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stack ────────────────────────────────────────────── */}
      <section className="border-t border-border-subtle px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <p className="text-xs uppercase tracking-[0.25em] text-accent" style={{ fontFamily: 'var(--font-mono)' }}>Stack tecnológico</p>
          <h2 className="mt-3 text-3xl" style={{ fontFamily: 'var(--font-display)', fontWeight: 500 }}>Construido para ser rápido de verdad</h2>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-text-muted">
            Todo el procesamiento de imagen corre en <strong className="text-text-primary">Web Workers</strong> sobre{' '}
            <strong className="text-text-primary">OffscreenCanvas</strong>, así que arrastrar un slider o mover el zoom
            nunca bloquea la interfaz, incluso con imágenes de 50 megapíxeles.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {STACK.map((tech, i) => (
              <span
                key={tech}
                className="reveal rounded-full border border-border-subtle bg-bg-panel px-3 py-1.5 text-xs text-text-muted"
                style={{ fontFamily: 'var(--font-mono)', animationDelay: `${i * 30}ms` }}
              >
                {tech}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Autor ────────────────────────────────────────────── */}
      <section className="border-t border-border-subtle px-6 py-16">
        <div className="reveal mx-auto max-w-3xl rounded-2xl border border-border-subtle bg-bg-panel p-8">
          <p className="text-xs uppercase tracking-[0.25em] text-accent" style={{ fontFamily: 'var(--font-mono)' }}>Autor</p>
          <h2 className="mt-3 text-2xl" style={{ fontFamily: 'var(--font-display)', fontWeight: 500 }}>Aitor Sánchez Gutiérrez</h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-text-muted">
            ImaginAitor_Pro forma parte de un conjunto de herramientas y proyectos web independientes centrados en
            privacidad, rendimiento y buen diseño. Puedes ver el resto en{' '}
            <a href="https://aitorhub.vercel.app/" target="_blank" rel="noopener noreferrer" className="text-accent underline underline-offset-2 hover:text-accent-hover">
              Aitor Hub
            </a>{' '}
            o leer más en el{' '}
            <a href="https://aitorsanchez.pages.dev/" target="_blank" rel="noopener noreferrer" className="text-accent underline underline-offset-2 hover:text-accent-hover">
              blog
            </a>.
          </p>
        </div>
      </section>

      <Footer variant="full" />
    </div>
  )
}
