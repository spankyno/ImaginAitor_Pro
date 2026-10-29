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
- **`src/lib/compress/`** + **`src/workers/compress.worker.ts`** + **`src/store/useCompressStore.ts`** + **`Panels/CompressPanel.tsx`** — Herramienta **Comprimir** (ver sección propia más abajo).
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

## Comprimir

Pestaña "Comprimir" del sidebar. No es una `EditOperation` (no transforma píxeles del pipeline: es la **codificación final**), así que lee el pipeline ya existente y lo codifica en su propio worker.

| Formato | Herramienta (WASM, vía `@jsquash/*`) | Sin pérdida | Con pérdida |
| --- | --- | --- | --- |
| PNG | oxipng | ✔ (niveles 1/2/4) | paleta ≤256 colores (`quantize.ts`, propia) + oxipng |
| JPEG | mozjpeg | ✘ (no existe al recodificar píxeles) | calidad, 4:4:4, progresivo, trellis |
| WebP | libwebp | ✔ | calidad, method |
| AVIF | libavif | ✔ (4:4:4) | calidad, speed |
| JPEG XL | libjxl | ✔ | calidad, effort |

- **Formato de salida**: "Mismo que el original" (según el MIME del archivo subido; GIF/BMP/otros → PNG) o cualquiera de los cinco.
- **Arquitectura**: `lib/compress/types.ts` (puro) → `codecs.ts` (RGBA → bytes; cada códec se importa dinámicamente, solo se descarga el `.wasm` del formato usado) → `workers/compress.worker.ts` (reutiliza `renderPipeline`) → `lib/compressClient.ts` (worker bajo demanda; **cancelar = `terminate()`**, la única forma de interrumpir WASM) → `useCompressStore` (ajustes persistidos en `localStorage`, debounce, descarga y lote ZIP con `fflate`).
- **Lienzo**: con la pestaña activa, el lienzo muestra el resultado comprimido (zoom/pan existentes) y "Comparar" contrasta contra el render sin comprimir. Al salir de la pestaña se cancelan trabajos y se liberan los blobs.
- Imágenes > 6 MP no se recomprimen solas en cada cambio (botón "Comprimir ahora").
- **Por qué no pngquant / zopflipng / cjxl / ImageMagick / Sharp**: la app es 100 % cliente (sin backend). Sharp y los binarios CLI necesitan Node/SO; ImageMagick-WASM pesa ~15 MB; `libimagequant` (pngquant) es GPL-3; jSquash empaqueta los mismos códecs de Squoosh en WASM con licencia Apache-2.0. `zopflipng` no está disponible en jSquash.
- **Multihilo**: los códecs eligen su variante multihilo solo si hay `SharedArrayBuffer` (requiere COOP/COEP, que rompería Google Fonts y el tracker). Sin esas cabeceras usan automáticamente la variante de un hilo.

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

## Edición interactiva sobre el lienzo

- **Recorte**: asas arrastrables (8 handles + mover) sobre la imagen original, con grid de regla de tercios. Vive en `components/Canvas/overlays/CropOverlay.tsx`, construido sobre el `DraggableRect` genérico.
- **Pixelado**: arrastra directamente sobre el lienzo para crear la zona a ocultar; una vez creada, se redimensiona/mueve con el mismo `DraggableRect`.
- **Texto y formas**: totalmente interactivos vía **Konva** (`overlays/KonvaLayerEditor.tsx`) — arrastrar, redimensionar/rotar con asas (Transformer), selección múltiple con Shift+clic, eliminar con Supr/Backspace. Konva se carga con `React.lazy` (chunk `vendor-konva`, ~97KB gzip) solo cuando se abre la pestaña Texto o Formas — el resto de la app no paga ese coste.
- Los sliders de cada panel siguen ahí como método alternativo/preciso: ambos caminos escriben en el mismo `EditOperation`, así que siempre están sincronizados.
- `hooks/useFitSize.ts` calcula el tamaño "contain" exacto en píxeles (en vez de `object-fit` implícito), lo que permite mapear coordenadas de puntero a espacio normalizado [0,1] de forma correcta a cualquier nivel de zoom/pan.
- `hooks/useBaseLayerPreview.ts` renderiza una vista sin texto/formas horneados mientras esas herramientas están activas, para que Konva sea la única representación visual de esas capas (evita el "doble dibujo").

## Miniaturas en streaming

Las miniaturas del filmstrip corren en su **propio Web Worker** (`workers/thumbnail.worker.ts`) con una cola FIFO de baja concurrencia (`lib/thumbnailQueue.ts`, pool de 2), totalmente desacoplado del worker de renderizado principal. Al importar un lote grande (p. ej. 300 imágenes), las miniaturas se generan en paralelo y van apareciendo progresivamente, y solo la imagen que realmente se activa dispara un render de previsualización a resolución completa (carga perezosa vía `setActive`).

## Extensiones naturales (siguiente iteración)

- Multi-select con arrastre de marco (marquee selection) en el editor Konva, además del Shift+clic actual.
- Snapping/alineación (a bordes, centro, otras capas) al arrastrar texto o formas.
- Feature-detection de soporte AVIF en el navegador antes de ofrecerlo como opción de exportación.
- Prerenderizado de `/acerca-de` en build time si se necesita que las tarjetas Open Graph de esa ruta concreta difieran de las de `/`.
