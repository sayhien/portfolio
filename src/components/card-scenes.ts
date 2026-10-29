// Spot illustrations for the design library's Component Criteria rail. Each one
// tells the story of one criterion or test with the DocDoc card: a card of
// label and value rows, with a tick selector or an ellipsis menu at its top
// right, and default, hover and press states. Same 120 by 68 grid and look as
// vignettes.ts. These scenes move with timed SVG animation (SMIL), so steps
// such as stretch, reset and swap the icon stay in step with each other.
// Vignette.astro pauses them off screen, and with reduced motion holds each
// one at its `rest` moment, a frame that still tells the story.

export type CardSceneName =
  | 'angularFit' | 'audienceFaces' | 'deviceWiden' | 'layoutParts' | 'familiarPatterns' | 'ctoApproval'
  | 'scalableRows' | 'tableToCards' | 'ratioStretch' | 'tapToOpen' | 'leftAlignedText'
  | 'widthStretch' | 'stableIcons' | 'cardStates' | 'contextFit' | 'latestLibrary' | 'styleLinks'
  | 'dynamicHeight' | 'layerToggles' | 'hiddenSpace' | 'layerNames'
  // Options to choose from (shown on the lab page only)
  | 'audienceFlat' | 'audienceDots' | 'audienceAvatars' | 'ctoFlat' | 'ctoDots' | 'ctoAvatar' | 'dynamicHug';

type Value = number | string;
type Track = { t: number[]; dur: number };
const EASE = '0.4 0 0.2 1';
// Changes are quick and settle softly, then hold: snappier than easing across the whole gap.
const SNAP = '0.2 0.9 0.25 1', HOLD = '0 0 1 1', SNAP_SECONDS = 0.45;
const PACE = 0.8; // every loop runs at 80% of its written length
const round = (v: Value) => (typeof v === 'number' ? Math.round(v * 100) / 100 : v);

/** Turn key values into quick changes followed by holds. */
function snappy(values: Value[], track: Track) {
  const keys: Value[] = [values[0]], times: number[] = [track.t[0]], splines: string[] = [];
  for (let i = 0; i < values.length - 1; i++) {
    const from = track.t[i], to = track.t[i + 1];
    if (values[i] !== values[i + 1]) {
      const settle = Math.min(to, from + Math.min((to - from) * 0.9, SNAP_SECONDS / (track.dur * PACE)));
      keys.push(values[i + 1]); times.push(settle); splines.push(SNAP);
      if (settle < to) { keys.push(values[i + 1]); times.push(to); splines.push(HOLD); }
    } else { keys.push(values[i + 1]); times.push(to); splines.push(HOLD); }
  }
  return { keys: keys.map(round).join(';'), times: times.map((t) => Math.round(t * 10000) / 10000).join(';'), splines: splines.join(';') };
}
const timing = (values: Value[], track: Track) => {
  const { keys, times, splines } = snappy(values, track);
  return `values="${keys}" keyTimes="${times}" dur="${Math.round(track.dur * PACE * 100) / 100}s" repeatCount="indefinite" calcMode="spline" keySplines="${splines}"`;
};
/** One animated attribute. Nothing is written if the value never changes. */
function animate(attr: string, values: Value[], track: Track) {
  if (values.every((v) => v === values[0])) return '';
  return `<animate attributeName="${attr}" ${timing(values, track)}/>`;
}
/** An animated translate on a group. */
function shift(values: string[], track: Track) {
  if (values.every((v) => v === values[0])) return '';
  return `<animateTransform attributeName="transform" type="translate" ${timing(values, track)}/>`;
}
/** An element whose array attributes change over the track; the first value is also its resting value. */
function el(tag: string, attrs: Record<string, Value | Value[]>, track?: Track, inner = '') {
  let plain = '', motion = '';
  Object.entries(attrs).forEach(([key, value]) => {
    if (Array.isArray(value)) { plain += ` ${key}="${round(value[0])}"`; if (track) motion += animate(key, value, track); }
    else plain += ` ${key}="${round(value)}"`;
  });
  return `<${tag}${plain}>${motion}${inner}</${tag}>`;
}
/** Fade an element in at `start` (0 to 1 of the loop) and out near the end. */
const fadeIn = (start: number, dur: number, end = 0.92): [Value[], Track] => [[0, 0, 1, 1, 0], { t: [0, start, Math.min(start + 0.06, end - 0.01), end, 1], dur }];
const over = <T>(track: Track, pick: (k: number) => T) => track.t.map((_, k) => pick(k));
const at = <T>(v: T | T[], k: number): T => (Array.isArray(v) ? v[Math.min(k, v.length - 1)] : v);

/** A small status chip with a label, optionally fading in. */
function chip(x: number, y: number, w: number, text: string, tone: 'good' | 'warn' | 'info' | 'plain', opacity?: [Value[], Track]) {
  const fill = tone === 'plain' ? 'uv-panel' : `uv-pill-${tone === 'good' ? 'good' : tone}`;
  const ink = { good: 'uv-key', warn: 'uv-amber', info: 'uv-blue', plain: 'uv-ink' }[tone];
  const body = `<rect x="${x}" y="${y}" width="${w}" height="10" rx="5" class="uv-chip-base"/><rect x="${x}" y="${y}" width="${w}" height="10" rx="5" class="${fill}"/><text x="${x + w / 2}" y="${y + 7}" text-anchor="middle" class="${ink} uv-tiny">${text}</text>`;
  return opacity ? el('g', { opacity: opacity[0] }, opacity[1], body) : `<g>${body}</g>`;
}

// ---- the card --------------------------------------------------------------
const PITCH = 5.5; // distance between rows
const cardHeight = (rows: number) => rows * PITCH + 6.5;
/** Column positions inside a card: labels and values keep a 0.7 to 1 width ratio. */
function columns(x: number, w: number) {
  const inner = w - 14, labelW = (inner * 0.7) / 1.7, valueW = inner - labelW;
  return { labelX: x + 5, labelW, valueX: x + 9 + labelW, valueW };
}
type CardSpec = {
  x: Value | number[]; y: number | number[]; w: number | number[]; rows: number | number[]; max: number;
  track?: Track; badge?: 'tick' | 'menu'; badgeOn?: number[]; hover?: number[]; press?: number[]; selected?: number[];
  /** Draw only the badge, to lay a second badge over a card already drawn. */
  badgeOnly?: boolean;
};
/** The DocDoc card. Any field given as an array changes over the track, one value per key time. */
function card(spec: CardSpec) {
  const track = spec.track ?? { t: [0, 1], dur: 1 };
  const frames = track.t.length;
  const X = over(track, (k) => Number(at(spec.x, k))), Y = over(track, (k) => at(spec.y, k)), W = over(track, (k) => at(spec.w, k));
  const R = over(track, (k) => at(spec.rows, k)), H = R.map(cardHeight);
  const cols = X.map((x, k) => columns(x, W[k]));
  let out = spec.badgeOnly ? '' : el('rect', { class: 'uv-card', x: X, y: Y, width: W, height: H, rx: 2.5 }, track);
  if (spec.hover) out += el('rect', { class: 'uv-hover', x: X, y: Y, width: W, height: H, rx: 2.5, opacity: spec.hover }, track);
  if (spec.press) out += el('rect', { class: 'uv-press-fill', x: X, y: Y, width: W, height: H, rx: 2.5, opacity: spec.press }, track);
  if (spec.selected) out += el('rect', { class: 'uv-selected', x: X, y: Y, width: W, height: H, rx: 2.5, opacity: spec.selected }, track);
  for (let i = 0; i < (spec.badgeOnly ? 0 : spec.max); i++) {
    const rowY = Y.map((y) => y + 4.6 + i * PITCH);
    const shown = R.map((r) => (r > i ? 1 : 0));
    out += el('rect', { class: 'uv-cbar-l', x: cols.map((c) => c.labelX), y: rowY, width: cols.map((c) => c.labelW * 0.8), height: 2, rx: 1, opacity: shown }, track);
    out += el('rect', { class: 'uv-cbar-v', x: cols.map((c) => c.valueX), y: rowY, width: cols.map((c) => c.valueW * (0.55 + ((i * 37) % 30) / 100)), height: 2, rx: 1, opacity: shown }, track);
  }
  const corner = X.map((x, k) => `${x + W[k] - 0.5} ${Y[k] + 0.5}`);
  if (spec.badge) {
    const on = spec.badgeOn ?? Array(frames).fill(1);
    const art = spec.badge === 'tick'
      ? '<circle r="3.2" class="uv-solid"/><path class="uv-tick-sm" d="M-1.5 0.1l1 1 2-2.2"/>'
      : '<g transform="translate(-3.5 3.5)"><circle cy="-2" r="0.75" class="uv-solid"/><circle r="0.75" class="uv-solid"/><circle cy="2" r="0.75" class="uv-solid"/></g>';
    out += `<g transform="translate(${corner[0]})">${shift(corner, track)}${el('g', { opacity: on }, track, art)}</g>`;
  }
  return out;
}
/** A card whose top right icon swaps between the tick selector and the ellipsis menu. */
function badges(spec: CardSpec, tickOn: number[], menuOn: number[]) {
  return card({ ...spec, badge: 'tick', badgeOn: tickOn }) + card({ ...spec, badge: 'menu', badgeOn: menuOn, badgeOnly: true });
}

// ---- people ----------------------------------------------------------------
/** A friendly head and shoulders that smiles, blinks and bobs. */
function face(cx: number, cy: number, r: number, skin: string, hair: string, delay: number) {
  const smile = (wide: boolean) => wide
    ? `M${cx - r * 0.38} ${cy + r * 0.32} Q${cx} ${cy + r * 0.78} ${cx + r * 0.38} ${cy + r * 0.32}`
    : `M${cx - r * 0.3} ${cy + r * 0.45} Q${cx} ${cy + r * 0.5} ${cx + r * 0.3} ${cy + r * 0.45}`;
  const mood: Track = { t: [0, 0.3, 0.45, 0.85, 1], dur: 4 };
  const blink: Track = { t: [0, 0.62, 0.65, 0.68, 1], dur: 4 };
  const eye = (ex: number) => el('ellipse', { cx: ex, cy: cy + r * 0.02, rx: r * 0.09, ry: [r * 0.12, r * 0.12, r * 0.015, r * 0.12, r * 0.12], class: 'uv-eye' }, blink);
  const body = `
    <path class="uv-shirt" d="M${cx - r * 1.35} ${cy + r * 2.05} Q${cx - r * 1.3} ${cy + r * 1.05} ${cx} ${cy + r * 1.05} Q${cx + r * 1.3} ${cy + r * 1.05} ${cx + r * 1.35} ${cy + r * 2.05}Z"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="${skin}"/>
    <path fill="${hair}" d="M${cx - r * 1.02} ${cy - r * 0.05} A${r * 1.02} ${r * 1.02} 0 0 1 ${cx + r * 1.02} ${cy - r * 0.05} Q${cx + r * 0.35} ${cy - r * 0.62} ${cx - r * 0.2} ${cy - r * 0.42} Q${cx - r * 0.7} ${cy - r * 0.3} ${cx - r * 1.02} ${cy - r * 0.05}Z"/>
    ${eye(cx - r * 0.36)}${eye(cx + r * 0.36)}
    ${el('circle', { cx: cx - r * 0.6, cy: cy + r * 0.38, r: r * 0.16, class: 'uv-blush', opacity: [0, 0, 0.6, 0.6, 0] }, mood)}
    ${el('circle', { cx: cx + r * 0.6, cy: cy + r * 0.38, r: r * 0.16, class: 'uv-blush', opacity: [0, 0, 0.6, 0.6, 0] }, mood)}
    ${el('path', { class: 'uv-mouth', d: [smile(false), smile(false), smile(true), smile(true), smile(false)] }, mood)}`;
  return `<g><animateTransform attributeName="transform" type="translate" values="0 0;0 -1.2;0 0" dur="2.4s" begin="${delay}s" repeatCount="indefinite" calcMode="spline" keySplines="${EASE};${EASE}"/>${body}</g>`;
}


// ---- people, in three styles to choose from ---------------------------------
type PersonStyle = 'flat' | 'dots' | 'avatar';
type Gesture = 'wave' | 'thumb';
let clipCount = 0;
/** A pseudo random number from a seed, so dot drawings come out the same every build. */
const seeded = (n: number) => { const x = Math.sin(n * 91.7) * 43758.5453; return x - Math.floor(x); };
/** Dots scattered inside a shape test, like pencil stippling. */
function stipple(count: number, box: [number, number, number, number], inside: (x: number, y: number) => boolean, fill: string, seed: number, size = 0.55) {
  let out = '', made = 0;
  for (let i = 0; made < count && i < count * 6; i++) {
    const x = box[0] + seeded(seed + i * 2.1) * box[2], y = box[1] + seeded(seed + i * 3.7 + 11) * box[3];
    if (!inside(x, y)) continue;
    out += `<circle cx="${round(x)}" cy="${round(y)}" r="${size}" fill="${fill}"/>`; made++;
  }
  return out;
}
/** Eyes that blink and a smile, shared by every style. */
function features(cx: number, cy: number, r: number, dur: number) {
  const blink: Track = { t: [0, 0.6, 0.63, 0.66, 1], dur };
  const eye = (ex: number) => `<ellipse cx="${ex}" cy="${cy}" rx="${r * 0.09}" ry="${r * 0.12}" class="uv-eye"><animate attributeName="ry" values="${r * 0.12};${r * 0.12};${r * 0.015};${r * 0.12};${r * 0.12}" keyTimes="${blink.t.join(';')}" dur="${dur}s" repeatCount="indefinite"/></ellipse>`;
  return eye(cx - r * 0.36) + eye(cx + r * 0.36) +
    `<path class="uv-mouth-soft" d="M${cx - r * 0.36} ${cy + r * 0.34} Q${cx} ${cy + r * 0.72} ${cx + r * 0.36} ${cy + r * 0.34}"/>` +
    `<circle cx="${cx - r * 0.6}" cy="${cy + r * 0.36}" r="${r * 0.15}" class="uv-blush" opacity="0.45"/><circle cx="${cx + r * 0.6}" cy="${cy + r * 0.36}" r="${r * 0.15}" class="uv-blush" opacity="0.45"/>`;
}
/** A small hand: waving open palm, or a thumbs up. */
function hand(x: number, y: number, r: number, skin: string, gesture: Gesture) {
  if (gesture === 'wave') return `<circle cx="${x}" cy="${y}" r="${r * 0.3}" fill="${skin}"/>` + [-0.2, -0.07, 0.06, 0.19].map((dx) => `<rect x="${x + dx * r - r * 0.05}" y="${y - r * 0.52}" width="${r * 0.1}" height="${r * 0.32}" rx="${r * 0.05}" fill="${skin}"/>`).join('');
  return `<rect x="${x - r * 0.3}" y="${y - r * 0.22}" width="${r * 0.6}" height="${r * 0.5}" rx="${r * 0.14}" fill="${skin}"/><rect x="${x - r * 0.3}" y="${y - r * 0.62}" width="${r * 0.2}" height="${r * 0.48}" rx="${r * 0.1}" fill="${skin}"/>`;
}
/** One person. `delay` staggers the waves so a group does not move as one. */
function person(style: PersonStyle, cx: number, cy: number, r: number, skin: string, hair: string, gesture: Gesture, delay = 0) {
  const dur = 3.2;
  const sx = cx + r * 0.95, sy = cy + r * 1.55; // the right shoulder
  const waveAngles = gesture === 'wave' ? `22 ${sx} ${sy};42 ${sx} ${sy};26 ${sx} ${sy};42 ${sx} ${sy};22 ${sx} ${sy};22 ${sx} ${sy}` : `0 ${sx} ${sy};0 ${sx} ${sy}`;
  const wave = `<animateTransform attributeName="transform" type="rotate" values="${waveAngles}" keyTimes="${gesture === 'wave' ? '0;0.12;0.24;0.36;0.48;1' : '0;1'}" dur="${dur}s" begin="${delay}s" repeatCount="indefinite"/>`;
  const restAngle = `rotate(22 ${sx} ${sy})`;
  const thumbPop = `<animateTransform attributeName="transform" type="translate" values="0 4;0 4;0 -1;0 0;0 0;0 4" keyTimes="0;0.2;0.3;0.36;0.9;1" dur="${dur}s" repeatCount="indefinite" calcMode="spline" keySplines="${HOLD};${SNAP};${SNAP};${HOLD};${SNAP}"/>`;
  const shirt = `M${cx - r * 1.3} ${cy + r * 2.1} Q${cx - r * 1.25} ${cy + r * 1.05} ${cx} ${cy + r * 1.05} Q${cx + r * 1.25} ${cy + r * 1.05} ${cx + r * 1.3} ${cy + r * 2.1}Z`;
  const hairCap = `M${cx - r * 1.02} ${cy - r * 0.05} A${r * 1.02} ${r * 1.02} 0 0 1 ${cx + r * 1.02} ${cy - r * 0.05} Q${cx + r * 0.35} ${cy - r * 0.62} ${cx - r * 0.2} ${cy - r * 0.42} Q${cx - r * 0.7} ${cy - r * 0.3} ${cx - r * 1.02} ${cy - r * 0.05}Z`;
  const arm = gesture === 'wave'
    ? `<g transform="${restAngle}">${wave}<rect x="${sx - r * 0.19}" y="${sy - r * 1.05}" width="${r * 0.38}" height="${r * 1.1}" rx="${r * 0.19}" class="uv-cloth"/>${hand(sx, sy - r * 1.1, r, skin, 'wave')}</g>`
    : `<g>${thumbPop}${hand(cx + r * 0.7, cy + r * 1.62, r, skin, 'thumb')}</g>`;

  if (style === 'flat') {
    return `<path d="${shirt}" class="uv-cloth"/>${gesture === 'wave' ? arm : ''}<circle cx="${cx}" cy="${cy}" r="${r}" fill="${skin}"/><path fill="${hair}" d="${hairCap}"/>${features(cx, cy, r, dur)}${gesture === 'thumb' ? arm : ''}`;
  }
  if (style === 'dots') {
    const seed = cx * 7 + cy;
    const inHead = (x: number, y: number) => (x - cx) ** 2 + (y - cy) ** 2 < r * r;
    const inHair = (x: number, y: number) => inHead(x, y) && y < cy - r * 0.35 + Math.abs(x - cx) * 0.25;
    const inShirt = (x: number, y: number) => y > cy + r * 1.1 && y < cy + r * 2.1 && Math.abs(x - cx) < r * 1.25 * Math.min(1, (y - cy - r * 1.0) / (r * 0.5) + 0.35);
    const dots = stipple(Math.round(r * r * 1.6), [cx - r * 1.3, cy + r, r * 2.6, r * 1.1], inShirt, 'var(--accent)', seed, 0.5) +
      stipple(Math.round(r * r * 2.2), [cx - r, cy - r, r * 2, r * 2], (x, y) => inHead(x, y) && !inHair(x, y), skin, seed + 3) +
      stipple(Math.round(r * r * 0.9), [cx - r, cy - r, r * 2, r], inHair, hair === '#1d1612' ? '#5b4a40' : hair, seed + 5);
    const dotHand = gesture === 'wave'
      ? `<g transform="${restAngle}">${wave}${stipple(Math.round(r * 4), [sx - r * 0.19, sy - r * 1.05, r * 0.38, r * 1.1], () => true, 'var(--accent)', seed + 9, 0.5)}${stipple(Math.round(r * 3), [sx - r * 0.35, sy - r * 1.5, r * 0.7, r * 0.7], (x, y) => (x - sx) ** 2 + (y - sy + r * 1.2) ** 2 < (r * 0.33) ** 2, skin, seed + 11)}</g>`
      : arm;
    return dots + dotHand + features(cx, cy, r, dur);
  }
  // avatar: a round profile picture, with the hand popping out at its edge
  const id = `uvc-avatar-${++clipCount}`;
  const frame = r * 1.55;
  const inside = `<path d="${shirt}" class="uv-cloth"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="${skin}"/><path fill="${hair}" d="${hairCap}"/>${features(cx, cy, r, dur)}`;
  const popHand = gesture === 'wave'
    ? `<g transform="translate(${cx + frame * 0.98} ${cy + r * 0.45 - frame * 0.3})"><g><animateTransform attributeName="transform" type="rotate" values="-12;18;-6;18;-12;-12" keyTimes="0;0.12;0.24;0.36;0.48;1" dur="${dur}s" begin="${delay}s" repeatCount="indefinite"/>${hand(0, 0, r * 0.9, skin, 'wave')}</g></g>`
    : `<g transform="translate(${cx + frame * 0.78} ${cy + frame * 0.62})"><circle r="${r * 0.42}" class="uv-solid"/><g>${thumbPop}${hand(0, r * 0.12, r * 0.62, skin, 'thumb')}</g></g>`;
  return `<clipPath id="${id}"><circle cx="${cx}" cy="${cy + r * 0.45}" r="${frame}"/></clipPath><circle cx="${cx}" cy="${cy + r * 0.45}" r="${frame}" class="uv-avatar-ring"/><g clip-path="url(#${id})">${inside}</g>${popHand}`;
}

// ---- layouts ---------------------------------------------------------------
/** A product screen: side drawer, top bar, two columns of cards and two buttons at the bottom right. */
function layoutScreen(focusCard: boolean) {
  const dur = 6;
  const piece = (start: number, from: string, body: string) => {
    const [op, tr] = fadeIn(start, dur);
    return `<g>${shift([from, from, '0 0', '0 0', from], tr)}${el('g', { opacity: op }, tr, body)}</g>`;
  };
  let out = '<rect class="uv-well" x="4" y="4" width="112" height="60" rx="4"/>';
  out += piece(0.04, '-10 0', '<rect class="uv-panel" x="4" y="4" width="24" height="60" rx="4"/><rect class="uv-cbar-l" x="8" y="10" width="12" height="2" rx="1"/><rect class="uv-cbar-v" x="8" y="17" width="15" height="2" rx="1"/><rect class="uv-cbar-v" x="8" y="22" width="13" height="2" rx="1"/><rect class="uv-soft" x="6" y="26" width="20" height="5" rx="1.5"/><rect class="uv-cbar-v" x="8" y="34" width="14" height="2" rx="1"/>');
  out += piece(0.12, '0 -6', '<rect class="uv-panel" x="28" y="4" width="88" height="8"/><rect class="uv-cbar-l" x="32" y="7" width="18" height="2" rx="1"/><circle class="uv-soft" cx="110" cy="8" r="2.4"/>');
  const slots = [[32, 15], [74, 15], [32, 34], [74, 34]];
  slots.forEach(([x, y], i) => {
    const mine = focusCard && i === 2;
    const box = `<rect class="${mine ? 'uv-card uv-mine' : 'uv-card'}" x="${x}" y="${y}" width="38" height="14" rx="2"/>` +
      [0, 1].map((r) => `<rect class="uv-cbar-l" x="${x + 4}" y="${y + 4 + r * 5}" width="9" height="2" rx="1"/><rect class="uv-cbar-v" x="${x + 17}" y="${y + 4 + r * 5}" width="14" height="2" rx="1"/>`).join('') +
      (mine ? `<g transform="translate(${x + 37.5} ${y + 0.5})"><circle r="2.6" class="uv-solid"/><path class="uv-tick-sm" d="M-1.2 0.1l0.8 0.8 1.6-1.8"/></g>` : '');
    out += piece(mine ? 0.5 : 0.22 + i * 0.07, mine ? '0 -12' : '0 6', box);
  });
  out += piece(0.6, '0 4', '<rect class="uv-well" x="80" y="53" width="15" height="6" rx="3"/><rect class="uv-solid" x="98" y="53" width="15" height="6" rx="3"/>');
  return out;
}

/** A design library box with a title, linked to a card by a line with travelling dots. */
const libraryLink = (fromX: number, toX: number, y: number) =>
  `<path class="uv-dash" d="M${fromX} ${y}H${toX}"/><circle r="2" class="uv-solid uv-dot uv-later" style="offset-path: path('M${fromX} ${y}H${toX}')"/>`;

// ---- the scenes -----------------------------------------------------------
const scenes: Record<CardSceneName, string> = {} as Record<CardSceneName, string>;
export const cardSceneRest: Record<CardSceneName, number> = {} as Record<CardSceneName, number>;

// Stage 1: set the criteria
{
  const tr: Track = { t: [0, 0.12, 0.3, 0.45, 0.88, 1], dur: 5 };
  const logo = '<circle r="13" class="uv-angular"/>' +
    '<path fill="#fff" d="M0 -9.5L-8 8.5H-4.6L-2.9 4.4H0V1.4H-1.7L0 -2.7Z"/><path fill="#d6d6d6" d="M0 -9.5L8 8.5H4.6L2.9 4.4H0V1.4H1.7L0 -2.7Z"/>';
  scenes.angularFit = `<g transform="translate(24 30)">${el('g', { opacity: [0, 1, 1, 1, 1, 0] }, tr, logo)}</g>` +
    el('path', { class: 'uv-dash', d: 'M38 30H50', opacity: [0, 0, 1, 1, 1, 0] }, tr) +
    card({ x: 52, y: 10, w: 62, rows: 7, max: 7, track: tr, selected: [0, 0, 0, 1, 1, 0], badge: 'tick', badgeOn: [0, 0, 0, 1, 1, 0] }) +
    `<text class="uv-note" x="60" y="64" text-anchor="middle">Fits the Angular design system</text>`;
  cardSceneRest.angularFit = 3;

  scenes.audienceFaces = face(28, 28, 9, '#e8b48f', '#3b2a20', 0) + face(92, 28, 9, '#8d5a3b', '#1d1612', 0.8) + face(60, 24, 11, '#f3cfb3', '#6b4a2f', 0.4) +
    '<text class="uv-note" x="60" y="64" text-anchor="middle">Healthcare users</text>';
  cardSceneRest.audienceFaces = 2.4;

  {
    const t: Track = { t: [0, 0.14, 0.34, 0.5, 0.86, 1], dur: 7 };
    const DW = [26, 26, 100, 100, 100, 26];
    const DX = DW.map((w) => 60 - w / 2);
    const wideOnly = [0, 0, 0, 1, 1, 0];
    const cardX = [51, 51, 35, 35, 35, 51], cardW = [18, 18, 34, 34, 34, 18];
    scenes.deviceWiden = el('rect', { class: 'uv-device', x: DX, y: 3, width: DW, height: 48, rx: [4, 4, 3, 3, 3, 4] }, t) +
      el('rect', { class: 'uv-cbar-v', x: DX.map((x, k) => x + DW[k] / 2 - 3), y: 6.5, width: 6, height: 1.4, rx: 0.7, opacity: [1, 1, 0, 0, 0, 1] }, t) +
      el('g', { opacity: [0, 0, 1, 1, 1, 0] }, t, '<rect class="uv-device" x="56" y="51" width="8" height="4"/><rect class="uv-device" x="48" y="55" width="24" height="2" rx="1"/>') +
      el('g', { opacity: wideOnly }, t, '<rect class="uv-panel" x="13" y="6" width="18" height="42" rx="2"/><rect class="uv-cbar-v" x="16" y="12" width="11" height="2" rx="1"/><rect class="uv-soft" x="15" y="17" width="14" height="4" rx="1.5"/><rect class="uv-cbar-v" x="16" y="25" width="10" height="2" rx="1"/><rect class="uv-panel" x="33" y="6" width="74" height="5"/>') +
      card({ x: cardX, y: [10, 10, 14, 14, 14, 10], w: cardW, rows: 2, max: 2, track: t }) +
      card({ x: cardX, y: [31, 31, 33, 33, 33, 31], w: cardW, rows: 2, max: 2, track: t }) +
      el('g', { opacity: wideOnly }, t, card({ x: 72, y: 14, w: 34, rows: 2, max: 2 }) + card({ x: 72, y: 33, w: 34, rows: 2, max: 2 })) +
      el('text', { class: 'uv-note', x: 60, y: 65, 'text-anchor': 'middle', opacity: [1, 1, 0, 0, 0, 1] }, t, 'Mobile') +
      el('text', { class: 'uv-note', x: 60, y: 65, 'text-anchor': 'middle', opacity: [0, 0, 1, 1, 1, 0] }, t, 'Desktop: two columns');
    cardSceneRest.deviceWiden = 5;
  }

  scenes.layoutParts = layoutScreen(false);
  cardSceneRest.layoutParts = 4.5;

  {
    const dur = 6;
    const pills = ['Amazon', 'eBay', 'Shopee'].map((name, i) => chip(4, 10 + i * 18, 40, `${name} ?`, 'info', fadeIn(0.05 + i * 0.12, dur))).join('');
    const links = [0, 1, 2].map((i) => { const [op, tr] = fadeIn(0.4, dur); return el('path', { class: 'uv-dash', d: `M44 ${15 + i * 18}C54 ${15 + i * 18} 54 32 62 32`, opacity: op }, tr); }).join('');
    let rows = '';
    const c = columns(62, 54);
    for (let i = 0; i < 6; i++) {
      const [op, tr] = fadeIn(0.5 + i * 0.05, dur);
      rows += el('g', { opacity: op }, tr, `<rect class="uv-cbar-l" x="${c.labelX}" y="${15 + i * PITCH}" width="${c.labelW * 0.8}" height="2" rx="1"/><rect class="uv-cbar-v" x="${c.valueX}" y="${15 + i * PITCH}" width="${c.valueW * 0.7}" height="2" rx="1"/>`);
    }
    const [tickOp, tickTr] = fadeIn(0.84, dur);
    scenes.familiarPatterns = pills + links + `<rect class="uv-card" x="62" y="10" width="54" height="${cardHeight(6)}" rx="2.5"/>` + rows +
      el('g', { opacity: tickOp }, tickTr, '<g transform="translate(115.5 10.5)"><circle r="3.2" class="uv-solid"/><path class="uv-tick-sm" d="M-1.5 0.1l1 1 2-2.2"/></g>') +
      '<text class="uv-note" x="60" y="66" text-anchor="middle">Patterns people already know</text>';
    cardSceneRest.familiarPatterns = 5.3;
  }

  {
    const mood: Track = { t: [0, 0.25, 0.4, 0.88, 1], dur: 5 };
    const cx = 42, cy = 30, r = 17;
    const blink: Track = { t: [0, 0.6, 0.63, 0.66, 1], dur: 5 };
    const eye = (ex: number) => el('ellipse', { cx: ex, cy: cy - 1, rx: 1.5, ry: [1.8, 1.8, 0.2, 1.8, 1.8], class: 'uv-eye' }, blink);
    const mouth = (wide: boolean) => wide ? `M${cx - 6.5} ${cy + 5.5} Q${cx} ${cy + 13} ${cx + 6.5} ${cy + 5.5}Z` : `M${cx - 5} ${cy + 7} Q${cx} ${cy + 9} ${cx + 5} ${cy + 7}Z`;
    scenes.ctoApproval = `
      <path class="uv-shirt" d="M${cx - 22} 68 Q${cx - 21} ${cy + 18} ${cx} ${cy + 18} Q${cx + 21} ${cy + 18} ${cx + 22} 68Z"/>
      <path d="M${cx - 5} ${cy + 18} L${cx} ${cy + 26} L${cx + 5} ${cy + 18}" style="fill:var(--surface);stroke:none"/>
      <ellipse cx="${cx - r}" cy="${cy + 1}" rx="2.6" ry="3.6" fill="#ecc0a0"/><ellipse cx="${cx + r}" cy="${cy + 1}" rx="2.6" ry="3.6" fill="#ecc0a0"/>
      <ellipse cx="${cx}" cy="${cy}" rx="${r}" ry="${r * 1.08}" fill="#f3cfb3"/>
      <path fill="#7a5233" d="M${cx - 17.5} ${cy - 2} C${cx - 18} ${cy - 22} ${cx + 16} ${cy - 24} ${cx + 17.5} ${cy - 4} C${cx + 12} ${cy - 12} ${cx - 2} ${cy - 15} ${cx - 9} ${cy - 10} C${cx - 13} ${cy - 8} ${cx - 15} ${cy - 5} ${cx - 17.5} ${cy - 2}Z"/>
      ${el('path', { class: 'uv-brow', d: [`M${cx - 9} ${cy - 6}q3 -1.5 6 0`, `M${cx - 9} ${cy - 6}q3 -1.5 6 0`, `M${cx - 9} ${cy - 7.5}q3 -2 6 0`, `M${cx - 9} ${cy - 7.5}q3 -2 6 0`, `M${cx - 9} ${cy - 6}q3 -1.5 6 0`] }, mood)}
      ${el('path', { class: 'uv-brow', d: [`M${cx + 3} ${cy - 6}q3 -1.5 6 0`, `M${cx + 3} ${cy - 6}q3 -1.5 6 0`, `M${cx + 3} ${cy - 7.5}q3 -2 6 0`, `M${cx + 3} ${cy - 7.5}q3 -2 6 0`, `M${cx + 3} ${cy - 6}q3 -1.5 6 0`] }, mood)}
      ${eye(cx - 6)}${eye(cx + 6)}
      <path class="uv-nose" d="M${cx} ${cy}q-1.6 3.5 0.6 4"/>
      ${el('circle', { cx: cx - 10, cy: cy + 5, r: 2.6, class: 'uv-blush', opacity: [0.2, 0.2, 0.6, 0.6, 0.2] }, mood)}
      ${el('circle', { cx: cx + 10, cy: cy + 5, r: 2.6, class: 'uv-blush', opacity: [0.2, 0.2, 0.6, 0.6, 0.2] }, mood)}
      ${el('path', { class: 'uv-smile', d: [mouth(false), mouth(false), mouth(true), mouth(true), mouth(false)] }, mood)}
      ${el('path', { class: 'uv-teeth', d: [`M${cx - 4} ${cy + 7.2}h8v0z`, `M${cx - 4} ${cy + 7.2}h8v0z`, `M${cx - 5} ${cy + 6.2}h10v2.2h-10z`, `M${cx - 5} ${cy + 6.2}h10v2.2h-10z`, `M${cx - 4} ${cy + 7.2}h8v0z`] }, mood)}
      <g transform="translate(84 62)">${shift(['84 72', '84 72', '84 44', '84 44', '84 72'], mood)}
        <g><animateTransform attributeName="transform" type="rotate" values="-14;-14;0;6;0;0;-14" keyTimes="0;0.25;0.4;0.5;0.6;0.88;1" dur="5s" repeatCount="indefinite"/>
          <rect class="uv-shirt" x="-7" y="10" width="14" height="10" rx="2"/>
          <rect x="-8" y="-2" width="16" height="13" rx="4" fill="#f3cfb3"/>
          <rect x="-6" y="-16" width="6" height="16" rx="3" fill="#f3cfb3"/>
          <path d="M-3 1h9M-3 4.5h9M-3 8h9" style="fill:none;stroke:#d8a888;stroke-width:0.8;stroke-linecap:round"/></g></g>
      ${chip(76, 6, 40, 'Approved', 'good', fadeIn(0.45, 5, 0.88))}`;
    cardSceneRest.ctoApproval = 3;
  }
}

// Stage 2: apply them to the card
{
  const t: Track = { t: [0, 0.12, 0.24, 0.36, 0.48, 0.6, 0.72, 0.84, 1], dur: 8 };
  const rows = [1, 2, 3, 4, 5, 5, 3, 1, 1];
  let panel = '<rect class="uv-well" x="70" y="4" width="46" height="60" rx="4"/><text class="uv-note" x="75" y="13">Rows</text>';
  for (let i = 0; i < 5; i++) {
    const on = rows.map((r) => (r > i ? 1 : 0));
    const y = 19 + i * 9;
    panel += `<rect class="uv-cbar-v" x="75" y="${y + 1}" width="16" height="2" rx="1"/>` +
      el('rect', { x: 100, y, width: 10, height: 5, rx: 2.5, class: 'uv-toggle-on', opacity: on }, t) +
      `<rect x="100" y="${y}" width="10" height="5" rx="2.5" class="uv-toggle"/>` +
      el('circle', { cx: on.map((v) => (v ? 107.5 : 102.5)), cy: y + 2.5, r: 1.8, class: 'uv-knob' }, t);
  }
  scenes.scalableRows = card({ x: 6, y: 8, w: 56, rows, max: 5, track: t }) + panel;
  cardSceneRest.scalableRows = 4.2;
}
{
  const t: Track = { t: [0, 0.3, 0.42, 0.8, 0.92, 1], dur: 6 };
  let table = '<rect class="uv-panel" x="47" y="10" width="26" height="5"/>';
  for (let i = 0; i < 7; i++) table += `<path class="uv-axis" d="M47 ${20 + i * 6}h26"/><rect class="uv-cbar-v" x="48" y="${16.5 + i * 6}" width="6" height="1.6"/><rect class="uv-cbar-v" x="56" y="${16.5 + i * 6}" width="7" height="1.6"/><rect class="uv-cbar-v" x="65" y="${16.5 + i * 6}" width="6" height="1.6"/>`;
  let cards = '';
  for (let i = 0; i < 3; i++) cards += card({ x: 47, y: 9 + i * 23, w: 26, rows: 2, max: 2 });
  cards = `<clipPath id="uvc-phone"><rect x="45" y="6" width="30" height="56" rx="3"/></clipPath><g clip-path="url(#uvc-phone)">${cards}</g>`;
  scenes.tableToCards = '<rect class="uv-device" x="43" y="4" width="34" height="60" rx="5"/>' +
    el('g', { opacity: [1, 1, 0, 0, 1, 1] }, t, table) + el('g', { opacity: [0, 0, 1, 1, 0, 0] }, t, cards) +
    el('g', { opacity: [1, 1, 0, 0, 1, 1] }, t, chip(4, 29, 32, 'Table', 'warn')) +
    el('g', { opacity: [0, 0, 1, 1, 0, 0] }, t, chip(84, 29, 32, 'Cards', 'good'));
  cardSceneRest.tableToCards = 3.6;
}
{
  const t: Track = { t: [0, 0.15, 0.55, 0.8, 1], dur: 6 };
  const W = [36, 36, 104, 104, 36], X = W.map((w) => 60 - w / 2);
  const C = X.map((x, k) => columns(x, W[k]));
  const bracket = (from: number[], width: number[]) => from.map((f, k) => `M${f} 18v-3h${width[k]}v3`);
  scenes.ratioStretch = card({ x: X, y: 22, w: W, rows: 5, max: 5, track: t }) +
    el('path', { class: 'uv-goal-thin', d: bracket(C.map((c) => c.labelX), C.map((c) => c.labelW)) }, t) +
    el('path', { class: 'uv-goal-thin', d: bracket(C.map((c) => c.valueX), C.map((c) => c.valueW)) }, t) +
    el('text', { class: 'uv-key uv-tiny', x: C.map((c) => c.labelX + c.labelW / 2), y: 12, 'text-anchor': 'middle' }, t, '0.7') +
    el('text', { class: 'uv-key uv-tiny', x: C.map((c) => c.valueX + c.valueW / 2), y: 12, 'text-anchor': 'middle' }, t, '1');
  cardSceneRest.ratioStretch = 4;
}
{
  const t: Track = { t: [0, 0.18, 0.28, 0.34, 0.5, 0.85, 0.95, 1], dur: 7 };
  const list = card({ x: 26, y: 10, w: 68, rows: 4, max: 4, track: t, press: [0, 0, 0, 1, 0, 0, 0, 0] }) + card({ x: 26, y: 44, w: 68, rows: 3, max: 3 });
  let detail = '<rect class="uv-well" x="20" y="4" width="80" height="60"/><path class="uv-hand" d="M28 12h-4m0 0l2-2m-2 2l2 2"/><rect class="uv-cbar-l" x="32" y="11" width="30" height="2.4" rx="1.2"/>';
  detail += card({ x: 26, y: 20, w: 68, rows: 7, max: 7 });
  scenes.tapToOpen = '<clipPath id="uvc-tap"><rect x="20" y="4" width="80" height="60" rx="4"/></clipPath><rect class="uv-device" x="20" y="4" width="80" height="60" rx="4"/>' +
    `<g clip-path="url(#uvc-tap)"><g>${shift(['0 0', '0 0', '0 0', '0 0', '-80 0', '-80 0', '0 0', '0 0'], t)}${list}</g>` +
    `<g>${shift(['80 0', '80 0', '80 0', '80 0', '0 0', '0 0', '80 0', '80 0'], t)}${detail}</g></g>` +
    `<g>${shift(['104 60', '62 24', '62 24', '62 24', '62 24', '104 60', '104 60', '104 60'], t)}${el('g', { opacity: [0, 1, 1, 1, 0, 0, 0, 0] }, t, '<path class="uv-pointer" d="M0 0v11l3-2.4 2.2 4.8 2.3-1-2.2-4.8 3.9-.4Z"/>')}</g>`;
  cardSceneRest.tapToOpen = 5;
}
{
  const dur = 7;
  const rows: [string, string][] = [['Charge identifier', 'CH10000001'], ['Charge amount', '500.00'], ['Charge is taxed', 'Yes'], ['Tax amount', '12.88'], ['Total amount', '512.88']];
  let body = '<rect class="uv-card" x="8" y="6" width="104" height="48" rx="2.5"/>';
  const [guideOp, guideTr] = fadeIn(0.05, dur);
  body += el('path', { class: 'uv-guide', d: 'M14 9v42M64 9v42', opacity: guideOp }, guideTr);
  rows.forEach(([label, value], i) => {
    const start = 0.12 + i * 0.12;
    const tr: Track = { t: [0, start, start + 0.1, 0.92, 1], dur };
    body += `<clipPath id="uvc-type-${i}">${el('rect', { x: 12, y: 9 + i * 8.6, width: [0, 0, 96, 96, 0], height: 7 }, tr)}</clipPath>` +
      `<g clip-path="url(#uvc-type-${i})"><text class="uv-ctext-l" x="14" y="${14 + i * 8.6}">${label}</text><text class="uv-ctext-v" x="64" y="${14 + i * 8.6}">${value}</text></g>`;
  });
  scenes.leftAlignedText = body + '<text class="uv-note" x="60" y="64" text-anchor="middle">Left aligned, easy to scan</text>';
  cardSceneRest.leftAlignedText = 6;
}

// Stage 3: test before release
{
  const t: Track = { t: [0, 0.15, 0.55, 0.8, 1], dur: 5 };
  const W = [30, 30, 104, 104, 30], X = W.map((w) => 60 - w / 2);
  scenes.widthStretch = card({ x: X, y: 12, w: W, rows: 5, max: 5, track: t }) +
    el('path', { class: 'uv-goal-thin', d: X.map((x, k) => `M${x} 6h${W[k]}M${x + 3} 3.5l-3 2.5 3 2.5M${x + W[k] - 3} 3.5l3 2.5-3 2.5`) }, t) +
    el('g', { opacity: [1, 1, 0, 0, 1] }, t, chip(44, 52, 32, 'Mobile', 'plain')) +
    el('g', { opacity: [0, 0, 1, 1, 0] }, t, chip(42, 52, 36, 'Desktop', 'good'));
  cardSceneRest.widthStretch = 3.5;
}
{
  const t: Track = { t: [0, 0.08, 0.38, 0.46, 0.5, 0.58, 0.88, 0.96, 1], dur: 8 };
  const W = [34, 34, 104, 104, 34, 34, 104, 104, 34], X = W.map((w) => 60 - w / 2);
  const tick = [1, 1, 1, 1, 0, 0, 0, 0, 1], menu = tick.map((v) => 1 - v);
  scenes.stableIcons = badges({ x: X, y: 10, w: W, rows: 6, max: 6, track: t }, tick, menu) +
    el('g', { opacity: tick }, t, chip(40, 52, 40, 'Selector', 'good')) +
    el('g', { opacity: menu }, t, chip(40, 52, 40, 'Ellipsis', 'good'));
  cardSceneRest.stableIcons = 2.8;
}
{
  const t: Track = { t: [0, 0.22, 0.3, 0.5, 0.56, 0.78, 0.86, 1], dur: 6 };
  const hover = [0, 0, 1, 1, 0, 0, 0, 0], press = [0, 0, 0, 0, 1, 1, 0, 0], idle = [1, 1, 0, 0, 0, 0, 1, 1];
  const tab = (x: number, w: number, text: string, on: number[]) => `<rect class="uv-panel" x="${x}" y="54" width="${w}" height="10" rx="5"/>` + el('rect', { class: 'uv-pill-good', x, y: 54, width: w, height: 10, rx: 5, opacity: on }, t) + `<text class="uv-ink uv-tiny" x="${x + w / 2}" y="61" text-anchor="middle">${text}</text>`;
  scenes.cardStates = card({ x: 30, y: 4, w: 60, rows: 7, max: 7, track: t, hover, press, badge: 'menu' }) +
    tab(10, 28, 'Default', idle) + tab(46, 28, 'Hover', hover) + tab(82, 28, 'Press', press) +
    `<g>${shift(['112 50', '70 30', '70 30', '70 30', '70 30', '70 30', '112 50', '112 50'], t)}${el('g', { opacity: [0, 1, 1, 1, 1, 1, 0, 0] }, t, '<path class="uv-pointer" d="M0 0v11l3-2.4 2.2 4.8 2.3-1-2.2-4.8 3.9-.4Z"/>')}</g>`;
  cardSceneRest.cardStates = 2.4;
}
scenes.contextFit = layoutScreen(true);
cardSceneRest.contextFit = 4.5;
{
  const t: Track = { t: [0, 0.35, 0.45, 0.9, 1], dur: 6 };
  scenes.latestLibrary = card({ x: 6, y: 10, w: 44, rows: 6, max: 6 }) + libraryLink(50, 74, 30) +
    '<rect class="uv-well" x="74" y="12" width="40" height="36" rx="4"/><text class="uv-ink uv-tiny" x="94" y="22" text-anchor="middle">Library</text>' +
    el('g', { opacity: [1, 1, 0, 0, 1] }, t, chip(80, 28, 28, 'v1.8', 'warn')) +
    el('g', { opacity: [0, 0, 1, 1, 0] }, t, chip(78, 28, 32, 'Updated', 'good') + '<g transform="translate(113 12.5)"><circle r="3.2" class="uv-solid"/><path class="uv-tick-sm" d="M-1.5 0.1l1 1 2-2.2"/></g>') +
    '<text class="uv-note" x="60" y="62" text-anchor="middle">Linked to the latest library</text>';
  cardSceneRest.latestLibrary = 4;
}
{
  const dur = 6;
  const lift: Track = { t: [0, 0.1, 0.16, 0.92, 1], dur };
  scenes.styleLinks = card({ x: 6, y: 10, w: 44, rows: 6, max: 6 }) + libraryLink(50, 72, 30) +
    `<g>${shift(['0 19', '0 19', '0 0', '0 0', '0 19'], lift)}<rect class="uv-well" x="72" y="4" width="44" height="14" rx="4"/><text class="uv-ink uv-tiny" x="94" y="13" text-anchor="middle">Style guide</text></g>` +
    ['Colours', 'Icons', 'Fonts'].map((name, i) => chip(76, 24 + i * 13, 40, `${name} ✓`, 'good', fadeIn(0.2 + i * 0.16, dur))).join('');
  cardSceneRest.styleLinks = 4.8;
}
{
  const t: Track = { t: [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.88, 1], dur: 8 };
  const rowsShown = [4, 4, 4, 6, 6, 3, 3, 4], wrap = [0, 0, 1, 1, 1, 0, 0, 0];
  const x = 30, w = 60, y = 6, c = columns(x, w);
  let out = el('rect', { class: 'uv-card', x, y, width: w, height: rowsShown.map((r, k) => cardHeight(r) + wrap[k] * 3.5), rx: 2.5 }, t);
  for (let i = 0; i < 6; i++) {
    const rowY = wrap.map((wr) => y + 4.6 + i * PITCH + (i > 1 ? wr * 3.5 : 0));
    const shown = rowsShown.map((r) => (r > i ? 1 : 0));
    out += el('rect', { class: 'uv-cbar-l', x: c.labelX, y: rowY, width: c.labelW * 0.8, height: 2, rx: 1, opacity: shown }, t);
    out += el('rect', { class: 'uv-cbar-v', x: c.valueX, y: rowY, width: i === 1 ? wrap.map((wr) => (wr ? c.valueW : c.valueW * 0.5)) : c.valueW * 0.65, height: 2, rx: 1, opacity: shown }, t);
    if (i === 1) out += el('rect', { class: 'uv-cbar-v', x: c.valueX, y: y + 4.6 + PITCH + 3.5, width: c.valueW * 0.6, height: 2, rx: 1, opacity: wrap }, t);
  }
  const h = rowsShown.map((r, k) => cardHeight(r) + wrap[k] * 3.5);
  out += el('path', { class: 'uv-goal-thin', d: h.map((hh) => `M96 ${y}v${hh}M94 ${y}h4M94 ${y + hh}h4`) }, t);
  scenes.dynamicHeight = out + '<text class="uv-note" x="60" y="64" text-anchor="middle">Height follows the content</text>';
  cardSceneRest.dynamicHeight = 3.8;
}
{
  const t: Track = { t: [0, 0.15, 0.3, 0.45, 0.6, 0.85, 1], dur: 7 };
  const rows = [6, 6, 5, 4, 3, 3, 6];
  let panel = '<rect class="uv-well" x="4" y="4" width="36" height="60" rx="4"/>';
  for (let i = 0; i < 6; i++) {
    const on = rows.map((r) => (r > i ? 1 : 0));
    const y = 11 + i * 9;
    panel += `<rect class="uv-cbar-v" x="8" y="${y - 1}" width="14" height="2" rx="1"/>` +
      el('g', { opacity: on }, t, `<path class="uv-eye-line" d="M27 ${y}q4 -3.5 8 0q-4 3.5 -8 0Z"/><circle class="uv-solid" cx="31" cy="${y}" r="1"/>`) +
      el('g', { opacity: on.map((v) => 1 - v) }, t, `<path class="uv-eye-line dim" d="M27 ${y}q4 3 8 0M28 ${y + 1.5}l-1 1.5M34 ${y + 1.5}l1 1.5"/>`);
  }
  scenes.layerToggles = panel + card({ x: 48, y: 8, w: 66, rows, max: 6, track: t });
  cardSceneRest.layerToggles = 3.6;
}
{
  const t: Track = { t: [0, 0.2, 0.45, 0.8, 1], dur: 6 };
  const top = [5, 5, 2, 2, 5];
  scenes.hiddenSpace = card({ x: 30, y: 4, w: 60, rows: top, max: 5, track: t, badge: 'menu' }) +
    card({ x: 30, y: top.map((r) => 4 + cardHeight(r) + 6), w: 60, rows: 3, max: 3, track: t, badge: 'menu' });
  cardSceneRest.hiddenSpace = 3.6;
}
{
  const dur = 7;
  const groups: [string, string[]][] = [['Type', ['Select', 'Ellipsis']], ['State', ['Default', 'Hover', 'Press']], ['Device', ['Mobile', 'Desktop']]];
  scenes.layerNames = groups.map(([key, children], g) => {
    const y = 12 + g * 21;
    const [op, tr] = fadeIn(0.06 + g * 0.22, dur);
    // each chip is sized to its label, with a small gap between chips
    let x = 32;
    const placed = children.map((name) => { const w = name.length * 3.4 + 9, at = x; x += w + 5; return { name, at, w }; });
    const kids = `<path class="uv-dash" d="M24 ${y}H${placed[placed.length - 1].at}"/>` + placed.map(({ name, at, w }, i) => chip(at, y - 5, w, name, i === 0 ? 'good' : 'plain')).join('');
    return el('g', { opacity: op }, tr, `<text class="uv-ink" x="4" y="${y + 3}" style="font-size:8px">${key}</text>${kids}`);
  }).join('');
  cardSceneRest.layerNames = 6;
}


// Options to choose from (lab page only)
{
  const crowd = (style: PersonStyle) => {
    const y = style === 'avatar' ? 22 : 26;
    return person(style, 26, y + 2, 8, '#e8b48f', '#3b2a20', 'wave', 0) + person(style, 94, y + 2, 8, '#8d5a3b', '#1d1612', 'wave', 0.9) + person(style, 60, y - 2, 10, '#f3cfb3', '#6b4a2f', 'wave', 0.45) +
      '<text class="uv-note" x="60" y="66" text-anchor="middle">Healthcare users</text>';
  };
  scenes.audienceFlat = crowd('flat');
  scenes.audienceDots = crowd('dots');
  scenes.audienceAvatars = crowd('avatar');
  const boss = (style: PersonStyle) => person(style, 46, style === 'avatar' ? 24 : 26, 13, '#f3cfb3', '#7a5233', 'thumb') + chip(78, 28, 38, 'Approved', 'good', fadeIn(0.3, 4, 0.9));
  scenes.ctoFlat = boss('flat');
  scenes.ctoDots = boss('dots');
  scenes.ctoAvatar = boss('avatar');
  ['audienceFlat', 'audienceDots', 'audienceAvatars', 'ctoFlat', 'ctoDots', 'ctoAvatar'].forEach((name) => { cardSceneRest[name as CardSceneName] = 1.2; });

  // Dynamic sizing, take two: a Figma style selection that hugs the card and shows its height
  const t: Track = { t: [0, 0.16, 0.32, 0.5, 0.66, 0.84, 1], dur: 7 };
  const rows = [3, 3, 5, 5, 2, 2, 3];
  const H = rows.map(cardHeight), x = 34, w = 52, y = 8;
  scenes.dynamicHug = card({ x, y, w, rows, max: 5, track: t }) +
    el('rect', { class: 'uv-hug', x: x - 1.5, y: y - 1.5, width: w + 3, height: H.map((h) => h + 3) }, t) +
    [[x - 1.5, 0], [x + w + 1.5, 0]].map(([hx]) => [0, 1].map((bottom) => el('rect', { class: 'uv-hug-handle', x: hx - 1.3, y: bottom ? H.map((h) => y + h + 1.5 - 1.3) : y - 1.5 - 1.3, width: 2.6, height: 2.6 }, t)).join('')).join('') +
    `<g>${shift(H.map((h) => `0 ${y + h + 5}`), t)}<rect class="uv-hug" x="44" y="0" width="32" height="9" rx="2" style="fill:var(--accent);stroke:none"/>` +
    rows.map((r, k) => el('text', { class: 'uv-on uv-tiny', x: 60, y: 6.5, 'text-anchor': 'middle', opacity: rows.map((_, j) => (j === k ? 1 : 0)) }, t, `Hug ${Math.round(cardHeight(r) * 4)}`)).join('') + '</g>';
  cardSceneRest.dynamicHug = 3;
}

Object.keys(cardSceneRest).forEach((name) => { cardSceneRest[name as CardSceneName] *= PACE; });

export const cardScenes = scenes;
