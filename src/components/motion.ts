// Shared motion helpers for animated case study pieces.
// Motion respects three things: the visitor's reduced motion setting,
// the page wide pause button, and whether the piece is on screen.

export const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const isPaused = () => document.documentElement.dataset.motion === 'paused';

/** Restart a CSS animation class on an element. */
export function restartClass(element: Element, className = 'play') {
  element.classList.remove(className);
  void (element as HTMLElement).offsetWidth;
  element.classList.add(className);
}

/** Run once the first time the element scrolls into view. */
export function onFirstView(element: Element, callback: () => void, threshold = 0.3) {
  if (prefersReducedMotion() || !('IntersectionObserver' in window)) return;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        callback();
        observer.unobserve(entry.target);
      }
    });
  }, { threshold });
  observer.observe(element);
}

/**
 * Track whether an element is on screen, adding `is-live` while it is.
 * Looping CSS animations use `.is-live` so nothing runs off screen.
 */
export function trackVisibility(element: HTMLElement) {
  const state = { visible: false };
  if (!('IntersectionObserver' in window)) {
    state.visible = true;
    element.classList.add('is-live');
    return state;
  }
  new IntersectionObserver(([entry]) => {
    state.visible = entry.isIntersecting;
    element.classList.toggle('is-live', entry.isIntersecting);
  }, { rootMargin: '100px' }).observe(element);
  return state;
}

/** Wait that only counts down while visible and not paused. */
export async function sleepWhileActive(ms: number, state: { visible: boolean }) {
  let remaining = ms;
  while (remaining > 0) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    if (state.visible && !isPaused()) remaining -= 100;
  }
}
