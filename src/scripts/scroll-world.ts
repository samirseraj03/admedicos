import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { beatForTime, scrollWorld, timeForProgress } from '../config/scroll-world';

type Connection = EventTarget & { saveData?: boolean; effectiveType?: string; downlink?: number };

/** Adaptación de scroll-world: un único vídeo, scroll nativo y cero reproducción. */
export function mountClinicWorld(root: HTMLElement) {
  const video = root.querySelector<HTMLVideoElement>('video')!;
  const poster = root.querySelector<HTMLImageElement>('.world-poster')!;
  const copies = [...root.querySelectorAll<HTMLElement>('[data-world-copy]')];
  const fill = root.querySelector<HTMLElement>('[data-world-progress]')!;
  const location = root.querySelector<HTMLElement>('[data-world-location]')!;
  const hint = root.querySelector<HTMLElement>('[data-world-hint]')!;
  const controls = root.querySelector<HTMLElement>('[data-world-load-control]')!;
  const loadButton = root.querySelector<HTMLButtonElement>('[data-world-load]')!;
  const status = root.querySelector<HTMLElement>('[data-world-status]')!;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const connection = (navigator as Navigator & { connection?: Connection }).connection;
  const listeners = new AbortController();
  const { signal } = listeners;
  let download: AbortController | undefined;
  let objectUrl = '';
  let trigger: ScrollTrigger | undefined;
  let progress = 0;
  let duration = 0;
  let raf = 0;
  let timeout = 0;
  let frameCallback = 0;
  let activeCopy = 0;
  let loading = false;
  let painted = false;
  let disposed = false;
  let generation = 0;
  let layoutWidth = innerWidth;
  let resizeTimer = 0;
  const coarse = matchMedia('(pointer: coarse)').matches;
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });
  video.muted = true;
  video.defaultMuted = true;
  video.playsInline = true;

  function showCopy(time: number) {
    const index = beatForTime(time);
    if (activeCopy === index) return;
    activeCopy = index;
    copies.forEach((copy, i) => {
      copy.classList.toggle('is-active', i === index);
      copy.inert = i !== index;
      copy.setAttribute('aria-hidden', String(i !== index));
    });
    location.textContent = `${String(index + 1).padStart(2, '0')} / 04 · ${scrollWorld.beats[index].label}`;
  }

  function framePainted(time: number) {
    if (disposed || root.dataset.mode !== 'cinematic' || video.readyState < 2) return;
    painted = true;
    root.classList.add('has-frame');
    // Un callback de composición puede llegar después de otra búsqueda.
    if (Math.abs(time - video.currentTime) < 2 / scrollWorld.fps) showCopy(time);
    clearTimeout(timeout);
    loading = false;
    controls.hidden = true;
  }

  function watchFrame() {
    if (!('requestVideoFrameCallback' in video) || frameCallback) return;
    frameCallback = video.requestVideoFrameCallback((_now, metadata) => {
      frameCallback = 0;
      framePainted(metadata.mediaTime);
    });
  }

  // No cola de seeks y ningún bucle rAF permanente. Siempre gana el último scroll.
  function seek() {
    raf = 0;
    if (disposed || document.hidden || !duration || video.readyState < 2 || video.seeking || root.dataset.mode !== 'cinematic') return;
    const target = timeForProgress(progress, duration);
    if (Math.abs(video.currentTime - target) <= 1 / (scrollWorld.fps * 2)) return;
    watchFrame();
    try { video.currentTime = target; } catch { fail(); }
  }

  function scheduleSeek() {
    if (!raf && !disposed) raf = requestAnimationFrame(seek);
  }

  function changeMode(mode: 'static' | 'cinematic') {
    const previousBottom = root.getBoundingClientRect().bottom + scrollY;
    const previousY = scrollY;
    root.dataset.mode = mode;
    // Si el visitante ya está más abajo, conservar su sección al cambiar fallback.
    if (previousY > previousBottom) {
      const newBottom = root.getBoundingClientRect().bottom + scrollY;
      window.scrollTo({ top: previousY + newBottom - previousBottom, behavior: 'instant' });
    }
  }

  function createTrigger() {
    trigger?.kill();
    trigger = ScrollTrigger.create({
      trigger: root,
      start: 'top top',
      end: () => `+=${root.offsetHeight - root.querySelector<HTMLElement>('.world-stage')!.offsetHeight}`,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        progress = self.progress;
        fill.style.transform = `scaleX(${progress})`;
        scheduleSeek();
      },
      onRefresh: (self) => {
        progress = self.progress;
        fill.style.transform = `scaleX(${progress})`;
        scheduleSeek();
      },
    });
  }

  function releaseMedia() {
    generation++;
    download?.abort();
    download = undefined;
    clearTimeout(timeout);
    cancelAnimationFrame(raf);
    raf = 0;
    if (frameCallback) video.cancelVideoFrameCallback(frameCallback);
    frameCallback = 0;
    video.pause();
    video.removeAttribute('src');
    video.load();
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = '';
    duration = 0;
    loading = false;
    painted = false;
    root.classList.remove('has-frame');
  }

  function staticMode(error = false) {
    trigger?.kill();
    trigger = undefined;
    changeMode('static');
    releaseMedia();
    root.classList.toggle('has-error', error);
    showCopy(0);
    hint.textContent = 'Un primer vistazo a nuestra clínica';
    controls.hidden = reduced.matches;
    loadButton.disabled = false;
    loadButton.textContent = error ? 'Volver a cargar el recorrido' : 'Activar recorrido al deslizar';
    status.textContent = error ? 'Puedes seguir conociendo la clínica en las fotografías.' : '';
    ScrollTrigger.refresh();
  }

  function fail() {
    if (disposed || root.dataset.mode !== 'cinematic') return;
    staticMode(true);
  }

  async function load() {
    if (loading || duration || reduced.matches || disposed) return;
    loading = true;
    const currentGeneration = ++generation;
    root.classList.remove('has-error');
    changeMode('cinematic');
    createTrigger();
    hint.textContent = 'Desliza para descubrir la clínica';
    controls.hidden = false;
    loadButton.disabled = true;
    loadButton.textContent = 'Preparando el recorrido…';
    status.textContent = '';
    download = new AbortController();
    timeout = window.setTimeout(fail, scrollWorld.loadTimeoutMs);
    try {
      // El blob permite buscar incluso si el servidor no admite HTTP Range.
      const response = await fetch(scrollWorld.source, { signal: download.signal });
      if (!response.ok) throw new Error(`Video HTTP ${response.status}`);
      const blob = await response.blob();
      if (disposed || currentGeneration !== generation) return;
      objectUrl = URL.createObjectURL(blob);
      watchFrame();
      video.src = objectUrl;
      video.preload = 'auto';
      video.load();
    } catch (error) {
      if (currentGeneration === generation && !(error instanceof DOMException && error.name === 'AbortError')) fail();
    }
  }

  video.addEventListener('loadedmetadata', () => {
    if (!Number.isFinite(video.duration) || video.duration <= 0) return fail();
    duration = video.duration;
    scheduleSeek();
  }, { signal });
  video.addEventListener('loadeddata', () => {
    video.pause();
    if (!('requestVideoFrameCallback' in video)) requestAnimationFrame(() => requestAnimationFrame(() => framePainted(video.currentTime)));
    scheduleSeek();
  }, { signal });
  video.addEventListener('seeked', () => {
    // seeked confirma la búsqueda resuelta; algunos motores omiten rVFC al estar pausados.
    showCopy(video.currentTime);
    if (!('requestVideoFrameCallback' in video)) requestAnimationFrame(() => framePainted(video.currentTime));
    scheduleSeek();
  }, { signal });
  video.addEventListener('error', fail, { signal });
  poster.addEventListener('error', () => { poster.hidden = true; }, { signal });
  loadButton.addEventListener('click', load, { signal });

  // Solo iOS y solo en respuesta a un gesto: desbloqueo del decodificador, no autoplay.
  const prime = () => {
    if (!isIOS || painted || !duration || root.dataset.mode !== 'cinematic') return;
    const target = timeForProgress(progress, duration);
    watchFrame();
    video.play().then(() => { video.pause(); video.currentTime = target; scheduleSeek(); }).catch(() => {});
  };
  root.addEventListener('pointerdown', prime, { passive: true, signal });
  document.addEventListener('visibilitychange', () => {
    video.pause();
    if (document.hidden) { cancelAnimationFrame(raf); raf = 0; }
    else scheduleSeek();
  }, { signal });
  window.addEventListener('resize', () => {
    if (coarse && innerWidth === layoutWidth) return;
    layoutWidth = innerWidth;
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => ScrollTrigger.refresh(), 180);
  }, { passive: true, signal });
  window.addEventListener('pageshow', () => { ScrollTrigger.refresh(); scheduleSeek(); }, { signal });
  reduced.addEventListener('change', () => {
    if (reduced.matches) staticMode();
    else controls.hidden = false;
  }, { signal });
  window.addEventListener('pagehide', (event) => {
    if (event.persisted) return;
    disposed = true;
    trigger?.kill();
    releaseMedia();
    clearTimeout(resizeTimer);
    listeners.abort();
  }, { signal });

  const constrained = connection?.saveData || ['slow-2g', '2g', '3g'].includes(connection?.effectiveType ?? '') || (connection?.downlink !== undefined && connection.downlink < 1.5);
  if (reduced.matches || constrained) staticMode();
  else void load();

  // Resolver después de fuentes/carga/restauración nativa, no durante el primer layout.
  // Evita que una recarga desde el modo de vídeo restaure un Y de la página más larga.
  if (window.location.hash) {
    let userScrolled = false;
    window.addEventListener('wheel', () => { userScrolled = true; }, { once: true, passive: true, signal });
    window.addEventListener('touchmove', () => { userScrolled = true; }, { once: true, passive: true, signal });
    window.addEventListener('keydown', (event) => {
      if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(event.key)) userScrolled = true;
    }, { signal });
    const alignHash = () => {
      void document.fonts.ready.then(() => requestAnimationFrame(() => requestAnimationFrame(() => {
        if (disposed || userScrolled) return;
        const target = document.getElementById(window.location.hash.slice(1));
        target?.scrollIntoView({ behavior: 'instant', block: 'start' });
      })));
    };
    if (document.readyState === 'complete') alignHash();
    else window.addEventListener('load', alignHash, { once: true, signal });
  }
}
