# ImaginAitor_Pro

Editor de imágenes no destructivo, 100% en el navegador, construido con React + Vite + TypeScript + Tailwind v4 + Zustand.

## Arrancar

```bash
npm install
npm run dev
```

## Build de producción

```bash
npm run build
npm run preview
```

## Arquitectura

- **`src/types/pipeline.ts`** — Modelo de datos: cada edición es un objeto `EditOperation` serializable (`crop`, `resize`, `rotate`, `flip`, `adjust`, `filter`, `text`, `shape`, `pixelate`).
- **`src/lib/renderPipeline.ts`** — El motor: recibe el `ImageBitmap` original **intacto** + la lista de operaciones habilitadas, y las reaplica en orden sobre un `OffscreenCanvas` desde cero. Nunca se muta la imagen original — por eso activar/desactivar/reordenar/borrar un paso en el panel "Capas" es instantáneo y sin pérdida.
- **`src/workers/render.worker.ts`** — Envuelve `renderPipeline` con Comlink y corre en un Web Worker, así el hilo principal (sliders, drag, UI) nunca se bloquea, incluso con imágenes de 50MP.
- **`src/store/useEditorStore.ts`** — Estado global (Zustand): documentos multi-imagen, pila de operaciones por documento, historial undo/redo, disparo de re-render tras cada cambio.
- **`src/components/Panels/*`** — Un panel por herramienta (Crop, Resize, Transform, Adjust, Filters, Text, Shapes, Pixelate) + Historial (capas).
- **`src/components/Export/ExportDialog.tsx`** — Exporta vía el mismo worker (`exportBlob`), con selector de formato/calidad/escala y comparación de peso antes/después. Recuerda el último formato/calidad usado en `localStorage`.
- **`src/lib/exif.ts`** — Lee y aplica la orientación EXIF al importar (crítico para fotos de móvil), con fallback manual por si `createImageBitmap({imageOrientation:'from-image'})` no está soportado.

## Funcionalidades implementadas (MVP)

- Subida drag&drop, multi-archivo, pegar desde portapapeles (Ctrl+V), carga desde URL.
- Recorte (presets de ratio + región manual + rotación del recorte).
- Redimensionado: exacto, porcentaje, "encajar en" — con downscale progresivo de alta calidad.
- Rotar 90/180/270 + volteo H/V.
- Ajustes: brillo, contraste, saturación, exposición, temperatura, nitidez (kernel de convolución), desenfoque.
- 8 filtros preestablecidos con control de intensidad.
- Texto (fuente, tamaño, color, alineación, rotación, sombra, negrita/cursiva).
- Formas (rectángulo, elipse, flecha, marcador).
- Pixelar/difuminar zona (clave para capturas de pantalla).
- Historial no destructivo: activar/desactivar, reordenar (drag), eliminar cualquier paso.
- Comparación antes/después con slider.
- Procesamiento por lotes: aplica el pipeline completo de la imagen activa a todas las demás.
- Exportación PNG/JPEG/WebP/AVIF con control de calidad y escala, mostrando peso original vs exportado.
- Atajos Ctrl+Z / Ctrl+Shift+Z.
- Orientación EXIF automática.

## Rutas

- `/` — editor.
- `/acerca-de` — página "Acerca de" (proyecto, herramientas, stack, autor).

El fallback de Cloudflare Pages para el enrutado cliente vive en `public/_redirects` (`/* /index.html 200`), imprescindible para que `/acerca-de` funcione en recarga directa o enlace compartido.

## SEO

- `index.html`: `<html lang="es">`, título orientado a palabras clave, metadescripción, `<meta name="author">`, `google-site-verification`, Open Graph, Twitter Card y JSON-LD (`SoftwareApplication` + `Person` + `WebSite`).
- **Importante**: coloca tu `og-image.png` (1200×630 recomendado) en `public/og-image.png` — el HTML ya referencia esa ruta pero el archivo no viaja en este export.
- `public/robots.txt` y `public/sitemap.xml` con las dos rutas actuales.
- `public/manifest.webmanifest` básico.

## Footer

`components/Layout/Footer.tsx` tiene dos variantes: `compact` (barra fina bajo el editor) y `full` (usada en `/acerca-de`). Copyright, enlace interno a "Acerca de" vía React Router, y enlaces externos a Contacto/Blog/Más apps.

## Extensiones naturales (siguiente iteración)

- Recorte interactivo con asas arrastrables directamente sobre el canvas (hoy el recorte se ajusta por sliders — la lógica del motor ya soporta cualquier región, solo falta la interacción de arrastre).
- Selección de zona de pixelado/formas/texto arrastrando sobre el lienzo en vez de sliders.
- Integración de `fabric.js`/`konva.js` si se quiere edición de capas de texto/formas totalmente interactiva (arrastrar, redimensionar con asas, múltiples capas seleccionables a la vez).
- Streaming de miniaturas por lotes con su propio Web Worker en cola.
