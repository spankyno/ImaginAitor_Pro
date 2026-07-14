import { Link } from 'react-router-dom'
import { Info, Mail, BookOpen, LayoutGrid } from 'lucide-react'

const EXTERNAL_LINKS = [
  { label: 'Contacto', href: 'https://aitor-blog-contacto.vercel.app/', icon: Mail },
  { label: 'Blog', href: 'https://aitorsanchez.pages.dev/', icon: BookOpen },
  { label: 'Más apps', href: 'https://aitorhub.vercel.app/', icon: LayoutGrid },
]

export function Footer({ variant = 'compact' }: { variant?: 'compact' | 'full' }) {
  const year = 2026

  if (variant === 'compact') {
    return (
      <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-border-subtle bg-bg-panel px-4 py-1.5 text-[11px] text-text-muted">
        <span>Aitor Sánchez Gutiérrez © {year} — Reservados todos los derechos</span>
        <nav aria-label="Enlaces del pie de página" className="flex items-center gap-3">
          <Link to="/acerca-de" className="hover:text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent rounded">
            Acerca de
          </Link>
          {EXTERNAL_LINKS.map(({ label, href }) => (
            <a key={label} href={href} target="_blank" rel="noopener noreferrer" className="hover:text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent rounded">
              {label}
            </a>
          ))}
        </nav>
      </footer>
    )
  }

  return (
    <footer className="border-t border-border-subtle bg-bg-panel px-6 py-10 text-sm text-text-muted">
      <div className="mx-auto flex max-w-4xl flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-text-primary font-semibold">ImaginAitor_Pro</p>
          <p className="mt-1 max-w-sm text-xs leading-relaxed">
            Editor de imágenes no destructivo, 100% en el navegador. Creado y mantenido por Aitor Sánchez Gutiérrez.
          </p>
        </div>
        <nav aria-label="Enlaces del pie de página" className="flex flex-wrap gap-x-6 gap-y-2 text-xs">
          <Link to="/acerca-de" className="flex items-center gap-1.5 hover:text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent rounded">
            <Info size={14} /> Acerca de
          </Link>
          {EXTERNAL_LINKS.map(({ label, href, icon: Icon }) => (
            <a key={label} href={href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent rounded">
              <Icon size={14} /> {label}
            </a>
          ))}
        </nav>
      </div>
      <p className="mx-auto mt-8 max-w-4xl border-t border-border-subtle pt-4 text-[11px]">
        Aitor Sánchez Gutiérrez © {year} — Reservados todos los derechos
      </p>
    </footer>
  )
}
