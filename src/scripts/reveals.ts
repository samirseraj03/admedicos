import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

export function initReveals() {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const elements = [...document.querySelectorAll<HTMLElement>('[data-reveal]')];
  const tagline = document.querySelector<HTMLElement>('[data-tagline]');
  const words = [...(tagline?.querySelectorAll<HTMLElement>('[data-word]') ?? [])];
  let revealTrigger: ScrollTrigger | undefined;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.remove('reveal-pending');
      observer.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -24px 0px', threshold: 0.08 });

  function setup() {
    observer.disconnect();
    revealTrigger?.kill();
    if (reduced.matches) {
      elements.forEach((element) => element.classList.remove('reveal-pending'));
      tagline?.classList.remove('is-enhanced');
      return;
    }
    elements.forEach((element) => {
      if (element.getBoundingClientRect().top > innerHeight) element.classList.add('reveal-pending');
      observer.observe(element);
    });
    if (tagline) {
      gsap.registerPlugin(ScrollTrigger);
      tagline.classList.add('is-enhanced');
      revealTrigger = ScrollTrigger.create({
        trigger: tagline,
        start: 'top 85%',
        end: 'bottom 55%',
        onUpdate: (self) => words.forEach((word, i) => word.classList.toggle('is-lit', self.progress >= (i + 1) / words.length)),
      });
    }
  }
  setup();
  reduced.addEventListener('change', setup);
}
