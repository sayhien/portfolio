// Small animated scenes that explain each table row at a glance. Every scene
// is drawn on a 48 by 48 grid with the classes below, and moves through the
// animations in RowArt.astro. With reduced motion each scene rests in a state
// that still reads clearly.
//   d  quiet line      f  soft mint fill      s  solid mint

export type RowArtName =
  | 'diluted' | 'jargon' | 'passive' | 'logos' | 'integration' | 'onesize'
  | 'hero' | 'proof' | 'capabilities' | 'usecases' | 'sandbox' | 'hub' | 'security' | 'cta'
  | 'sandboxRate' | 'testimonialClicks' | 'engagement' | 'bounce';

export const rowArt: Record<RowArtName, string> = {
  // Problems found in competitor pages
  diluted: `
    <g class="a-orbit"><rect class="d" x="5" y="21" width="6" height="6" rx="1.5"/><path class="d" d="M38 7l4.5 8h-9z"/><circle class="d" cx="40" cy="37" r="3.5"/></g>
    <path class="f" d="M15 16h18a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H25l-5 4v-4h-5a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2Z"/>
    <circle class="s a-dot" cx="19" cy="22.5" r="1.2"/><circle class="s a-dot" style="--i:1" cx="24" cy="22.5" r="1.2"/><circle class="s a-dot" style="--i:2" cx="29" cy="22.5" r="1.2"/>`,
  jargon: `
    <path d="M10 15l-6 8 6 8M18 15l6 8-6 8" transform="translate(0 1)"/>
    <path class="d" d="M28 9v30" stroke-dasharray="2 3"/>
    <circle cx="39" cy="19" r="4"/><path d="M32 35a7 7 0 0 1 14 0"/>
    <circle class="s a-packet" cx="14" cy="24" r="1.8"/><circle class="s a-packet" style="--i:1" cx="14" cy="24" r="1.8"/>`,
  passive: `
    <rect x="5" y="7" width="38" height="26" rx="3"/>
    <path class="f" d="M20 14l10 6-10 6Z"/>
    <path class="d" d="M10 39h28"/><path class="a-progress" d="M10 39h28" pathLength="1"/>
    <path class="d" d="M24 33v3"/>`,
  logos: `
    <circle class="d a-blink" cx="10" cy="12" r="4.5"/><circle class="d a-blink" style="--i:1" cx="24" cy="12" r="4.5"/><circle class="d a-blink" style="--i:2" cx="38" cy="12" r="4.5"/>
    <path class="f" d="M12 22h24a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H12a2 2 0 0 1-2-2V24a2 2 0 0 1 2-2Z"/>
    <path class="a-bob" d="M20.5 28.5a3.5 3.5 0 1 1 4.6 3.3c-.9.4-1.1 1-1.1 2M24 38h.01"/>`,
  integration: `
    <rect x="4" y="18" width="12" height="12" rx="2.5"/><rect x="32" y="18" width="12" height="12" rx="2.5"/>
    <path class="d a-flow" d="M17 24h14" stroke-dasharray="2 3"/>
    <path class="a-bob" d="M21.6 8.5a2.6 2.6 0 1 1 3.1 2.5c-.7.3-.9.8-.9 1.5M24 16h.01"/>`,
  onesize: `
    <rect x="15" y="5" width="20" height="38" rx="2.5"/>
    <path class="d" d="M20 13h10M20 20h10M20 27h10M20 34h10"/>
    <rect class="f a-scan" x="17.5" y="10" width="15" height="6" rx="1.5"/>
    <circle class="d" cx="6" cy="14" r="2.6"/><circle class="d" cx="6" cy="24" r="2.6"/><circle class="d" cx="6" cy="34" r="2.6"/>
    <path class="d" d="M10 14h3M10 24h3M10 34h3"/>`,
  // Sections of the proposed page
  hero: `
    <rect x="4" y="6" width="40" height="36" rx="3"/><path class="d" d="M4 13h40"/>
    <path d="M10 21h17M10 26h11"/><rect class="f a-press" x="10" y="32" width="11" height="5" rx="2.5"/>
    <circle class="a-bob" cx="35" cy="28" r="5"/><path class="s" d="M33 28h.01M35 28h.01M37 28h.01" stroke-width="2"/>`,
  proof: `
    <rect x="3" y="11" width="12" height="17" rx="2"/><rect x="18" y="11" width="12" height="17" rx="2"/><rect x="33" y="11" width="12" height="17" rx="2"/>
    <path class="s a-lit" d="M7.5 16.5l4.5 3-4.5 3Z"/><path class="s a-lit" style="--i:1" d="M22.5 16.5l4.5 3-4.5 3Z"/><path class="s a-lit" style="--i:2" d="M37.5 16.5l4.5 3-4.5 3Z"/>
    <path class="d" d="M3 34h12M18 34h12M33 34h12M3 39h7M18 39h7M33 39h7"/>
    <path class="a-tag" d="M20 5h8"/>`,
  capabilities: `
    <rect x="6" y="5" width="36" height="8" rx="2"/>
    <rect x="6" y="16" width="36" height="8" rx="2"/>
    <g class="a-open"><rect class="f" x="6" y="24" width="36" height="11" rx="2"/><path d="M11 29h20M11 32h13"/></g>
    <rect class="a-shift" x="6" y="38" width="36" height="6" rx="2"/>`,
  usecases: `
    <rect x="5" y="7" width="38" height="34" rx="2.5"/>
    <path class="d" d="M5 16h38M5 25h38M5 33h38M19 7v34"/>
    <rect class="f a-rows" x="5" y="16" width="38" height="9"/>`,
  sandbox: `
    <rect x="5" y="5" width="38" height="38" rx="3"/>
    <rect class="f a-msg" x="17" y="11" width="21" height="8" rx="3"/><path class="d" d="M10 24h18"/>
    <rect class="d a-chip" x="9" y="33" width="8" height="5" rx="2.5"/><rect class="d a-chip" style="--i:1" x="20" y="33" width="8" height="5" rx="2.5"/><rect class="d a-chip" style="--i:2" x="31" y="33" width="8" height="5" rx="2.5"/>`,
  hub: `
    <path class="d a-flow" d="M24 24 24 8M24 24l14.3-4.6M24 24l8.9 12.1M24 24 15.1 36.1M24 24 9.7 19.4" stroke-dasharray="2 3"/>
    <circle class="f" cx="24" cy="24" r="5"/>
    <circle cx="24" cy="7" r="3"/><circle cx="39.2" cy="18.9" r="3"/><circle cx="33.5" cy="37" r="3"/><circle cx="14.5" cy="37" r="3"/><circle cx="8.8" cy="18.9" r="3"/>`,
  security: `
    <path class="f a-glow" d="M24 4l16 5.5V22c0 9.5-6.5 16-16 20.5C14.5 38 8 31.500 8 22V9.5Z"/>
    <path class="a-check" d="M16.500 23l5.500 5.500 10-12" pathLength="1"/>
    <path class="d a-spin" d="M24 1.500v2.500" />`,
  cta: `
    <rect class="a-ping" x="7" y="16" width="34" height="16" rx="8"/>
    <rect class="a-ping" style="--i:1" x="7" y="16" width="34" height="16" rx="8"/>
    <rect class="f" x="7" y="16" width="34" height="16" rx="8"/>
    <path class="a-nudge" d="M16 24h14M26 19l5 5-5 5"/>`,
  // Measures of success
  sandboxRate: `
    <circle class="d" cx="24" cy="24" r="16"/>
    <path class="a-ring" d="M24 8a16 16 0 1 1 0 32 16 16 0 1 1 0-32" pathLength="1"/>
    <path class="f" d="M17 19h14a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-8l-4 3v-3h-2a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2Z"/>`,
  testimonialClicks: `
    <rect class="d" x="4" y="9" width="12" height="20" rx="2"/><rect class="a-card" x="18" y="9" width="12" height="20" rx="2"/><rect class="d" x="32" y="9" width="12" height="20" rx="2"/>
    <path class="d" d="M7 15h6M7 19h6M35 15h6M35 19h6"/>
    <circle class="a-click" cx="24" cy="22" r="3"/>
    <path class="s a-cursor" d="M0 0v10l2.800-2.300 2 4.500 2.200-1-2-4.400 3.700-.4Z" transform="translate(30 36)"/>`,
  engagement: `
    <circle cx="24" cy="24" r="17"/>
    <path class="d" d="M24 9v3M39 24h-3M24 39v-3M9 24h3"/>
    <path class="a-hand" d="M24 24V12"/><circle class="s" cx="24" cy="24" r="1.600"/>`,
  bounce: `
    <path class="d" d="M5 42h24"/>
    <rect class="f a-bar" x="8" y="12" width="8" height="30" rx="1.500"/><rect class="f a-bar" style="--i:1" x="19" y="12" width="8" height="30" rx="1.500"/>
    <path class="a-exit" d="M32 24h11M39 19l5 5-5 5"/>`,
};
