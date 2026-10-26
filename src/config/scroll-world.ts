/** Un único vídeo continuo. Los tiempos son segundos del archivo, no clips. */
export const scrollWorld = {
  source: '/videos/clinica-recorrido.mp4',
  original: '/gemini_generated_video_9b5e5ed3.mp4',
  poster: '/videos/clinica-poster.webp',
  fallback: '/photos/DSC05834.webp',
  // Se conserva 1280 × 720, 24 fps. La duración SIEMPRE se lee del vídeo.
  fps: 24,
  scrollScreens: { desktop: 5, mobile: 4 },
  framing: { desktop: '50% 50%', mobile: '52% 50%' },
  loadTimeoutMs: 18000,
  // Revisados visualmente a intervalos de 0,5 s. No aparece un gabinete completo.
  beats: [
    { start: 0, end: 2.5, label: 'La clínica', title: 'Diseñando sonrisas desde 2006' },
    { start: 2.5, end: 4.9, label: 'La entrada', title: 'Bienvenido a\nDiseñando Sonrisas' },
    { start: 4.9, end: 8.2, label: 'Recepción', title: 'El recorrido\nempieza aquí' },
    { start: 8.2, end: Infinity, label: 'La zona de espera', title: 'Conoce el espacio\nantes de venir' },
  ],
};

export function timeForProgress(progress: number, duration: number) {
  if (!Number.isFinite(duration) || duration <= 0) return 0;
  // duration exacta queda después del último fotograma decodificable.
  return Math.min(Math.max(0, Math.min(1, progress)) * duration, Math.max(0, duration - 1 / scrollWorld.fps));
}

export function beatForTime(time: number) {
  return Math.max(0, scrollWorld.beats.findIndex((beat) => time >= beat.start && time < beat.end));
}
