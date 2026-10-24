// On long pages the header tucks away while the reader scrolls down and slides
// back in, as a slimmer bar, as soon as they scroll up. Near the top of the page
// it is simply the normal header. The page can ask the header to stay hidden for
// a moment (for example while the side menu glides to a section) by dispatching
// a `header:hold` event on window.

const TOP_ZONE_PX = 140; // within this distance of the top, the normal header shows
const MIN_STEP_PX = 6; // ignore tiny scroll jitters
const HOLD_EVENT = 'header:hold';

export function startHeaderReveal(header: HTMLElement, slot: HTMLElement) {
  let lastY = window.scrollY, holdUntil = 0, queued = false;

  /** Keep the header's space in the page, so the page never jumps when the header floats. */
  const reserveSpace = () => {
    if (!header.classList.contains('is-floating')) slot.style.minHeight = `${header.offsetHeight}px`;
  };

  const setShown = (shown: boolean) => {
    header.classList.toggle('is-shown', shown);
    document.documentElement.style.setProperty('--nav-offset', shown ? `${header.offsetHeight}px` : '0px');
  };

  const update = () => {
    queued = false;
    const y = window.scrollY, step = y - lastY;
    if (y < TOP_ZONE_PX) {
      header.classList.remove('is-floating');
      setShown(false);
      lastY = y;
      return;
    }
    header.classList.add('is-floating');
    if (Math.abs(step) < MIN_STEP_PX) return;
    setShown(step < 0 && performance.now() > holdUntil);
    lastY = y;
  };

  reserveSpace();
  new ResizeObserver(reserveSpace).observe(header);
  window.addEventListener('scroll', () => {
    if (!queued) { queued = true; requestAnimationFrame(update); }
  }, { passive: true });
  window.addEventListener(HOLD_EVENT, (event) => {
    const ms = (event as CustomEvent<number>).detail ?? 1500;
    holdUntil = performance.now() + ms;
    setShown(false);
  });
  // Keyboard users tabbing into the hidden header bring it back into view.
  header.addEventListener('focusin', () => { if (header.classList.contains('is-floating')) setShown(true); });
  update();
}
