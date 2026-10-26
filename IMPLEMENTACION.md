# Diseñando Sonrisas — implementación

Fecha de comprobación: 26 de octubre de 2026.

## Alcance

Una landing con Inicio, Los doctores, Tu primera visita y Contacto. CTA principal a `#contacto` y llamada real a `tel:+34938613975`. No hay formularios, analítica, mapas incrustados ni servicios de terceros cargados automáticamente. Manrope latin se sirve desde el propio proyecto; Tailwind, GSAP y ScrollTrigger ya estaban instalados. Lenis se conserva como dependencia, pero no se activa: el scroll nativo mantiene la relación directa entre desplazamiento y vídeo, sin otra capa de interpolación.

`landing-page-design` guía tipografía, espaciado, cabecera flotante, CTA único y tagline por palabras. `scroll-world` se ha adaptado al único vídeo solicitado: no se ejecutó ninguna generación ni se copiaron el motor multiclips, las partículas o los gradientes de su ejemplo.

## Vídeo

- Original conservado: `public/gemini_generated_video_9b5e5ed3.mp4` (4.265.511 bytes).
- Original SHA-256: `7e6a972365af40f2f664535b6643f19170109459ee19a3697664e7fa4994a397`.
- Versión usada: `public/videos/clinica-recorrido.mp4` (3.790.763 bytes, aproximadamente un 11 % menor).
- Poster: `public/videos/clinica-poster.webp` (62.750 bytes), extraído del primer fotograma.
- 10 segundos, 240 fotogramas, 1280 × 720, 16:9, 24 fps. Sin recortes, interpolación, cambios de contenido ni reescalado.
- H.264, CRF 20, GOP 8, `faststart`, pista de audio eliminada. El original sí tenía audio AAC.
- Una sola instancia `<video>`, pausada, `muted`, `playsinline`, sin autoplay ni controles. Carga como blob para permitir búsquedas incluso en servidores sin HTTP Range.
- ScrollTrigger mide el progreso y un rAF solicita el último tiempo pendiente. No se acumulan seeks durante `video.seeking`; `seeked` actualiza el mensaje. El último tiempo se limita al último fotograma decodificable.
- En móvil se usa **el mismo vídeo horizontal con `object-fit: cover`**, como pide el briefing. Es un encuadre recortado, no una generación vertical nueva.

Reproducción de la conversión con FFmpeg:

```sh
ffmpeg -i public/gemini_generated_video_9b5e5ed3.mp4 -map 0:v:0 -an -c:v libx264 -preset slow -crf 20 -pix_fmt yuv420p -g 8 -keyint_min 8 -sc_threshold 0 -movflags +faststart public/videos/clinica-recorrido.mp4
```

El binario utilizado se descargó en una carpeta temporal; no se añadió FFmpeg a las dependencias de la web.

## Escenas verificadas

| Tiempo | Espacio visible | Texto |
| --- | --- | --- |
| 0–2,5 s | Fachada | Diseñando sonrisas desde 2006 |
| 2,5–4,9 s | Aproximación y entrada | Bienvenido a Diseñando Sonrisas |
| 4,9–8,2 s | Interior y recepción | El recorrido empieza aquí |
| 8,2–10 s | Zona de espera y acceso al interior | Conoce el espacio antes de venir |

El archivo no muestra un gabinete completo ni una parada clara en el despacho. No se han inventado esas escenas. El despacho aparece con su fotografía real en Tu primera visita.

Configuración central: `src/config/scroll-world.ts` (rutas, poster, respaldo, encuadres, scroll y tiempos). Lógica: `src/scripts/scroll-world.ts`. Datos y enlaces: `src/config/clinic.ts`.

## Fotografías

- Doctores: `raduan-v2.webp` y `abdul-v4.webp`.
- Primera visita: `TU-PRIMERA-VISITA-PAG-PRINCIPAL-scaled.webp`.
- Contacto y respaldo del vídeo: `DSC05834.webp`.
- Recorrido estático: `DSC05839.webp` y `DSC05844.webp`.
- Se usan las copias existentes en `src/assets/photos` con `<Picture>`, variantes AVIF/WebP, carga diferida y tamaños adaptativos. Los originales de `public/photos` se conservan.

## Fuentes oficiales contrastadas

- [Inicio](https://admedicos.com/): dirección, teléfono y correo de Granollers.
- [Dr. Raduan](https://admedicos.com/doctores/raduan/): nombre y licenciatura en Odontología por UIC en 2006; áreas de formación. Se omiten superlativos, cifras de casos y categorías comerciales.
- [Dr. Abdul](https://admedicos.com/doctores/abdul/): nombre, licenciatura desde 2005 y formación de máster en implantología.
- [Primera visita](https://admedicos.com/tu-primera-visita/): existe contenido y formulario oficial. La nueva landing conserva el flujo telefónico del briefing y no replica promesas, pruebas o duración.
- [Contacto](https://admedicos.com/contacto/): dirección, teléfono y correo utilizados.
- [Aviso legal](https://admedicos.com/aviso-legal/), [Protección de datos](https://admedicos.com/Proteccion-de-datos/), [Cookies](https://admedicos.com/politica-de-cookies/): enlaces reales comprobados. Las antiguas rutas locales provisionales redirigen a estas páginas, no publican políticas inventadas.

## Validación realizada

- Build de producción y cuatro tests con Node: mapeo temporal bidireccional, límites, tiempos de escenas y HTML final (un vídeo, cuatro secciones, CTA funcional y ausencia de formulario/placeholders).
- Navegador de escritorio: 0 → 4 → 2 → 6 → 9 s, pausa mantenida entre desplazamientos y mensaje correcto por espacio. El vídeo se libera al terminar y continúan las secciones.
- Navegación mediante los cuatro enlaces, salto directo a anclas y CTA de contacto. Se usa desplazamiento nativo inmediato en anclas para evitar interrupciones de scroll largo durante los recálculos de viewport.
- Revisión visual a 1280 × 720, 390 × 844 y 320 × 740, sin desbordamiento horizontal. Menú modal con Escape, foco inicial y retorno al botón.
- Ahorro de datos/conexión lenta: presentación estática y activación voluntaria comprobadas.
- Movimiento reducido: simulado en una ruta temporal de prueba; sin `src` de vídeo, sin descarga y con fotografías visibles.
- Error HTTP del vídeo simulado: foto de respaldo, galería estática, CTA y botón de reintento.
- Scripts bloqueados por CSP en otra ruta temporal: el contenido, las fotos y la navegación de respaldo siguen presentes.
- Las rutas temporales de QA se retiraron del proyecto después de las pruebas.
- Sin errores de consola en la página principal durante la revisión.
- [PENDIENTE] Comprobación física en iPhone/Safari y Android de gama baja. La revisión móvil fue de viewport, no de hardware real ni de CPU limitada.

## Pendientes antes de publicar

- [PENDIENTE] Validación editorial final por la clínica, incluida la mención «desde 2006» facilitada en el briefing.
- [PENDIENTE] Logo oficial. Se utiliza un wordmark tipográfico provisional y el favicon existente, sin presentar una marca nueva como definitiva.
- [PENDIENTE] URL de un sistema de reserva confirmado. De momento se solicita la cita por teléfono.
- [PENDIENTE] Horarios, enlace exacto de Maps y confirmación de WhatsApp. No se muestran datos o destinos supuestos.
- [PENDIENTE] Validar el alcance de las políticas oficiales para el despliegue final. Enlazar las existentes no sustituye su revisión; esta versión no añade cookies de analítica o publicidad.
- [PENDIENTE] Dominio de despliegue y canonical definitivo. La imagen social apunta al dominio oficial indicado, no a localhost.

No se ha publicado la web ni enviado solicitudes a la clínica.

## Comandos

```sh
npm run build
node --test tests/scroll-world.test.ts
npm run dev -- --background
```

Requiere Node >= 22.22. En este equipo se usó el Node 24 incluido en el entorno de Codex porque el ejecutable global tiene un error de biblioteca del sistema.
