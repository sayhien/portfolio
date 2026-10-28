// Small animated UI scenes ("spot illustrations"): a framed picture of a bit of
// interface, drawn in soft fills and outlines with short real labels, so it
// explains its point at a glance. Every scene sits on a 120 by 68 grid and is
// shown by Vignette.astro, which holds the shared look and the motion.
//
// Look classes
//   uv-panel  card fill with a quiet outline     uv-well  page fill with a quiet outline
//   uv-soft   mint tint with a mint outline      uv-solid mint fill
//   uv-dash   dashed connector line              uv-tan   the old site's tan colour
//   uv-note   small grey label   uv-key  bold mint label   uv-ink  bold label in text colour
//   uv-on     bold label on mint                 uv-red / uv-amber / uv-blue  bold coloured labels
//   uv-pill-good / -warn / -bad / -info          soft pill fills for status chips
// Motion classes (they loop only while on screen; with reduced motion each
// scene rests in its first state, which still reads)
//   uv-later  hidden at rest, shown by its motion
//   uv-in1 to uv-in4   appear one after another, then all fade together
//   uv-cycle  states that take turns; give each one --k (0, 1, 2), and --of if fewer than three take turns
//   uv-dot    travels its offset-path; stagger with --k
//   uv-grow   bar fills from the left      uv-done  pops in near the end
//   uv-rise   bar grows from the bottom; stagger with --k
//   uv-scan   highlight that steps along a row
//   uv-shrink bar that gets shorter        uv-blink soft pulse
//   uv-cursor pointer moves in and clicks  uv-left / uv-right / uv-merge  two things become one
//   uv-wobble gentle tilt                  uv-spin  clock hand
//   uv-press  button pressed               uv-open  card opens downwards
//   uv-scan-y highlight that steps down rows (--dy)   uv-turn  highlight that takes turns (--k)
//   uv-ping   ring that spreads out        uv-nudge arrow that nudges right
//   uv-hit    lights up when the pointer clicks (pair with uv-cursor; aim it with --cx and --cy)

export type VignetteName =
  // ESG reporting module: key requirements
  | 'frameworks' | 'dataSync' | 'assignTasks' | 'trackProgress' | 'teamChat'
  // Four Leaves: problems found
  | 'buriedOrder' | 'twoLooks' | 'noOrigin' | 'brokenLocation' | 'pointsMaths'
  | 'plainSignUp' | 'applyFar' | 'manyFonts' | 'lowContrast'
  // Four Leaves: measures
  | 'cakeOrders' | 'dropOff' | 'newMembers' | 'orderTime'
  // Swipe remittance app: goals
  | 'raiseCompletion' | 'cutCosts' | 'restoreTrust'
  // AI chatbot: problems on competitor pages
  | 'dilutedFocus' | 'technicalGap' | 'passiveProof' | 'weakProof' | 'integrationWorry' | 'samePage'
  // AI chatbot: page sections (each drawn like its block in the page sketch)
  | 'heroSection' | 'peerVideos' | 'featureCards' | 'useCaseTable' | 'demoSandbox' | 'integrations' | 'securityBadges' | 'talkToSales'
  // AI chatbot: success measures
  | 'sandboxRate' | 'storyClicks' | 'timeOnPage' | 'bounceRate';

type Tone = 'good' | 'warn' | 'bad' | 'info';
const labelFor: Record<Tone, string> = { good: 'key', warn: 'amber', bad: 'red', info: 'blue' };
/** A status chip. `motion` is a motion class; `style` sets --k (its turn) or --of (how many take turns). */
const pill = (x: number, y: number, w: number, tone: Tone, text: string, motion = '', style = '') =>
  `<g class="${motion}"${style ? ` style="${style}"` : ''}><rect x="${x}" y="${y}" width="${w}" height="16" rx="8" class="uv-pill-${tone}"/><text x="${x + w / 2}" y="${y + 11}" text-anchor="middle" class="uv-${labelFor[tone]} uv-chip">${text}</text></g>`;

export const vignettes: Record<VignetteName, string> = {
  frameworks: `
    <g class="uv-left"><rect class="uv-well" x="10" y="16" width="40" height="36" rx="5"/><text x="30" y="38" text-anchor="middle" class="uv-blue">GRI</text></g>
    <g class="uv-right"><rect class="uv-well" x="70" y="16" width="40" height="36" rx="5"/><text x="90" y="38" text-anchor="middle" class="uv-key">IFRS</text></g>
    <g class="uv-merge uv-later"><rect class="uv-soft" x="34" y="12" width="52" height="44" rx="6"/><text class="uv-key" x="60" y="31" text-anchor="middle">One</text><text class="uv-key" x="60" y="44" text-anchor="middle">template</text></g>`,
  dataSync: `
    <rect class="uv-panel" x="6" y="6" width="30" height="14" rx="4"/><text class="uv-note" x="21" y="16" text-anchor="middle">HR</text>
    <rect class="uv-panel" x="6" y="27" width="30" height="14" rx="4"/><text class="uv-note" x="21" y="37" text-anchor="middle">FIN</text>
    <rect class="uv-panel" x="6" y="48" width="30" height="14" rx="4"/><text class="uv-note" x="21" y="58" text-anchor="middle">SCM</text>
    <path class="uv-dash" d="M36 13C60 13 60 34 84 34M36 34h48M36 55C60 55 60 34 84 34"/>
    <rect x="84" y="22" width="30" height="24" rx="5" class="uv-solid"/><text x="99" y="37" text-anchor="middle" class="uv-on">ESG</text>
    <circle r="3" class="uv-solid uv-dot uv-later" style="offset-path: path('M36 13C60 13 60 34 84 34')"/>
    <circle r="3" class="uv-solid uv-dot uv-later" style="--k:1; offset-path: path('M36 34h48')"/>
    <circle r="3" class="uv-solid uv-dot uv-later" style="--k:2; offset-path: path('M36 55C60 55 60 34 84 34')"/>`,
  assignTasks: `
    <circle class="uv-panel" cx="22" cy="24" r="9"/><path class="uv-panel" d="M8 52a14 14 0 0 1 28 0Z"/>
    ${pill(44, 26, 66, 'info', 'Assigned', 'uv-cycle')}
    ${pill(44, 26, 66, 'warn', 'In review', 'uv-cycle uv-later', '--k:1')}
    ${pill(44, 26, 66, 'good', 'Approved', 'uv-cycle uv-later', '--k:2')}`,
  trackProgress: `
    <rect class="uv-panel" x="10" y="28" width="100" height="12" rx="6"/>
    <rect class="uv-solid uv-grow" x="10" y="28" width="100" height="12" rx="6"/>
    <g class="uv-done uv-later"><circle cx="100" cy="14" r="9" class="uv-solid"/><path class="uv-tick" d="m96 14 3 3 5-6"/></g>
    <text class="uv-note" x="10" y="56">Disclosures completed</text>`,
  teamChat: `
    <rect class="uv-panel uv-in1" x="8" y="6" width="58" height="16" rx="7"/>
    <rect class="uv-soft uv-in2" x="52" y="26" width="60" height="16" rx="7"/>
    <rect class="uv-panel uv-in3" x="8" y="46" width="44" height="16" rx="7"/>`,

  buriedOrder: `
    <rect class="uv-well" x="4" y="6" width="112" height="20" rx="6"/>
    <rect class="uv-panel" x="10" y="12" width="12" height="8" rx="4"/><rect class="uv-panel" x="27" y="12" width="12" height="8" rx="4"/>
    <rect class="uv-panel" x="44" y="12" width="12" height="8" rx="4"/><rect class="uv-panel" x="61" y="12" width="12" height="8" rx="4"/>
    <rect class="uv-panel" x="78" y="12" width="12" height="8" rx="4"/><rect class="uv-panel" x="95" y="12" width="12" height="8" rx="4"/>
    <rect class="uv-soft uv-scan" x="10" y="12" width="12" height="8" rx="4" style="--dx:85px"/>
    <text class="uv-note" x="60" y="40" text-anchor="middle">Which link orders a cake?</text>
    ${pill(30, 47, 60, 'bad', 'No clear button', 'uv-done uv-later')}`,
  twoLooks: `
    <g class="uv-wobble"><rect class="uv-well" x="6" y="6" width="46" height="44" rx="5"/><rect class="uv-solid" x="10" y="10" width="38" height="6" rx="2"/>
      <text x="29" y="36" text-anchor="middle" class="uv-ink" style="font-size:13px">Aa</text></g>
    <text x="60" y="33" text-anchor="middle" class="uv-amber" style="font-size:14px">&#8800;</text>
    <g class="uv-wobble" style="--k:1"><rect class="uv-well" x="68" y="6" width="46" height="44" rx="5"/><rect class="uv-tan" x="72" y="10" width="38" height="6" rx="2"/>
      <text x="91" y="36" text-anchor="middle" class="uv-ink" style="font-size:13px; font-family: Georgia, serif; font-style: italic">Aa</text></g>
    <text class="uv-note" x="29" y="62" text-anchor="middle">Main site</text><text class="uv-note" x="91" y="62" text-anchor="middle">Shop</text>`,
  noOrigin: `
    <rect class="uv-panel" x="10" y="38" width="40" height="20" rx="3"/><rect class="uv-panel" x="17" y="24" width="26" height="14" rx="3"/>
    <circle cx="24" cy="22" r="3.4" class="uv-berry"/><circle cx="36" cy="22" r="3.4" class="uv-berry"/>
    <path class="uv-dash" d="M10 48h40"/>
    ${pill(54, 6, 62, 'info', 'Strawberries?', 'uv-in1')}
    ${pill(54, 26, 62, 'info', 'Cream?', 'uv-in2')}
    ${pill(54, 46, 62, 'info', 'Flour?', 'uv-in3')}`,
  brokenLocation: `
    <rect class="uv-well" x="6" y="6" width="62" height="46" rx="5"/>
    <rect class="uv-panel" x="12" y="13" width="44" height="5" rx="2"/><rect class="uv-panel" x="12" y="22" width="34" height="5" rx="2"/>
    <text x="12" y="42" class="uv-blue" style="font-size:8px; text-decoration: underline">Find location</text>
    ${pill(74, 34, 42, 'bad', 'Broken', 'uv-done uv-later')}
    <path class="uv-pointer uv-cursor" d="M0 0v11l3-2.4 2.2 4.8 2.3-1-2.2-4.8 3.9-.4Z"/>`,
  pointsMaths: `
    ${pill(2, 6, 54, 'info', '$2 = 1 pt', 'uv-in1')}
    ${pill(60, 6, 58, 'info', '60 pts = $5', 'uv-in2')}
    <path class="uv-dash" d="M29 24v8M89 24v8M29 32h60M60 32v6"/>
    ${pill(24, 40, 72, 'warn', 'Worth how much?', 'uv-in3')}`,
  plainSignUp: `
    <rect class="uv-well" x="6" y="10" width="76" height="18" rx="6"/><text class="uv-note" x="13" y="22">Email</text>
    <path class="uv-caret uv-blink" d="M36 14v10"/>
    <rect class="uv-solid" x="86" y="10" width="28" height="18" rx="6"/><text x="100" y="22" text-anchor="middle" class="uv-on">Join</text>
    ${pill(24, 40, 72, 'warn', 'What do I get?', 'uv-done uv-later')}`,
  applyFar: `
    <rect class="uv-well" x="6" y="4" width="54" height="60" rx="5"/>
    <rect class="uv-soft" x="11" y="9" width="44" height="12" rx="3"/><text class="uv-key" x="33" y="18" text-anchor="middle" style="font-size:8px">Baker role</text>
    <rect class="uv-panel" x="11" y="26" width="44" height="4" rx="2"/><rect class="uv-panel" x="11" y="34" width="36" height="4" rx="2"/><rect class="uv-panel" x="11" y="42" width="40" height="4" rx="2"/>
    <rect class="uv-solid" x="11" y="51" width="44" height="9" rx="4.5"/><text x="33" y="58" text-anchor="middle" class="uv-on" style="font-size:7px">Apply</text>
    <path class="uv-dash" d="M60 15c22 0 22 40 0 40"/>
    <circle r="3" class="uv-solid uv-dot uv-later" style="offset-path: path('M60 15c22 0 22 40 0 40')"/>
    <text class="uv-note" x="83" y="33">Long way</text><text class="uv-note" x="83" y="43">to apply</text>`,
  manyFonts: `
    <text x="16" y="24" class="uv-ink uv-in1" style="font-size:15px; font-family: Georgia, serif">Aa</text>
    <text x="46" y="24" class="uv-ink uv-in2" style="font-size:15px; font-family: var(--mono)">Aa</text>
    <text x="76" y="24" class="uv-ink uv-in3" style="font-size:15px; font-family: cursive">Aa</text>
    <text x="16" y="46" class="uv-ink uv-in1" style="font-size:15px; font-style: italic; font-weight: 300">Aa</text>
    <text x="46" y="46" class="uv-ink uv-in2" style="font-size:15px; font-family: 'Times New Roman', serif; font-weight: 700">Aa</text>
    <text x="76" y="46" class="uv-ink uv-in3" style="font-size:15px; font-weight: 800; letter-spacing: -1px">Aa</text>
    ${pill(70, 50, 44, 'warn', '10 fonts', 'uv-done uv-later')}`,
  lowContrast: `
    <rect class="uv-tan" x="8" y="6" width="48" height="18" rx="9"/><text x="32" y="18" text-anchor="middle" style="font: 600 9px var(--sans); fill: #fff">Cakes</text>
    <text x="66" y="19" class="uv-red">3.2 : 1</text>
    <rect class="uv-panel" x="8" y="34" width="104" height="8" rx="4"/>
    <rect class="uv-bad uv-grow" x="8" y="34" width="74" height="8" rx="4"/>
    <path class="uv-goal" d="M110 30v16"/>
    <text class="uv-note" x="112" y="58" text-anchor="end">Needs 4.5 : 1</text>`,

  cakeOrders: `
    <text class="uv-note" x="8" y="12">Cake orders a week</text>
    <path class="uv-axis" d="M8 58h104"/>
    <rect class="uv-soft uv-rise" x="22" y="44" width="14" height="14" rx="2"/>
    <rect class="uv-soft uv-rise" style="--k:1" x="44" y="36" width="14" height="22" rx="2"/>
    <rect class="uv-soft uv-rise" style="--k:2" x="66" y="28" width="14" height="30" rx="2"/>
    <rect class="uv-solid uv-rise" style="--k:3" x="88" y="18" width="14" height="40" rx="2"/>`,
  dropOff: `
    <rect class="uv-panel" x="8" y="6" width="100" height="14" rx="4"/><text class="uv-note" x="14" y="16">Cake page</text>
    <rect class="uv-panel" x="8" y="26" width="70" height="14" rx="4"/><text class="uv-note" x="14" y="36">Checkout</text>
    <rect class="uv-solid" x="8" y="46" width="44" height="14" rx="4"/><text class="uv-on" x="14" y="56">Paid</text>
    <circle r="3" class="uv-warn-dot uv-dot uv-later" style="offset-path: path('M78 33h30')"/>
    <text class="uv-amber" x="88" y="56">Left</text>`,
  newMembers: `
    <circle class="uv-panel" cx="22" cy="22" r="9"/><path class="uv-panel" d="M8 52a14 14 0 0 1 28 0Z"/>
    <circle class="uv-solid" cx="31" cy="44" r="7"/><path class="uv-tick" d="M31 40.5v7M27.5 44h7"/>
    ${pill(46, 26, 66, 'good', '+1 member', 'uv-cycle')}
    ${pill(46, 26, 66, 'good', '+2 members', 'uv-cycle uv-later', '--k:1')}
    ${pill(46, 26, 66, 'good', '+3 members', 'uv-cycle uv-later', '--k:2')}`,
  orderTime: `
    <circle class="uv-well" cx="24" cy="36" r="18"/><path class="uv-axis" d="M20 14h8M24 14v4"/>
    <path class="uv-hand uv-spin" d="M24 36V24"/><circle class="uv-solid" cx="24" cy="36" r="2"/>
    <text class="uv-note" x="47" y="22">First page to paid</text>
    <rect class="uv-panel" x="52" y="30" width="60" height="10" rx="5"/>
    <rect class="uv-solid uv-shrink" x="52" y="30" width="60" height="10" rx="5"/>
    <text class="uv-key" x="52" y="56" style="font-size:8px">Shorter is better</text>`,

  raiseCompletion: `
    <path class="uv-axis" d="M20 24h80"/>
    <circle class="uv-panel" cx="20" cy="24" r="8"/><circle class="uv-panel" cx="60" cy="24" r="8"/><circle class="uv-panel" cx="100" cy="24" r="8"/>
    <circle class="uv-solid uv-in1" cx="20" cy="24" r="8"/><circle class="uv-solid uv-in2" cx="60" cy="24" r="8"/><circle class="uv-solid uv-in3" cx="100" cy="24" r="8"/>
    <text class="uv-note" x="20" y="46" text-anchor="middle">Amount</text><text class="uv-note" x="60" y="46" text-anchor="middle">Details</text><text class="uv-note" x="100" y="46" text-anchor="middle">Send</text>
    ${pill(36, 50, 48, 'good', 'Sent', 'uv-done uv-later')}`,
  cutCosts: `
    <text class="uv-note" x="8" y="14">Support calls</text>
    <rect class="uv-panel" x="8" y="22" width="104" height="12" rx="6"/>
    <rect class="uv-bad uv-shrink" x="8" y="22" width="104" height="12" rx="6"/>
    ${pill(8, 44, 64, 'good', 'Lower cost', 'uv-done uv-later')}`,
  restoreTrust: `
    <path class="uv-soft" d="M24 8l16 5.5V28c0 10-7 17-16 22-9-5-16-12-16-22V13.5Z"/>
    <path class="uv-check" d="M17 29l5 5 9-11"/>
    ${pill(50, 26, 64, 'warn', 'Unsure', 'uv-cycle', '--of:2')}
    ${pill(50, 26, 64, 'good', 'Safe to send', 'uv-cycle uv-later', '--k:1; --of:2')}`,
  dilutedFocus: `
    <rect class="uv-panel" x="6" y="8" width="30" height="14" rx="7"/><text class="uv-note" x="21" y="18" text-anchor="middle">Vision</text>
    <rect class="uv-panel" x="42" y="8" width="36" height="14" rx="7"/><text class="uv-note" x="60" y="18" text-anchor="middle">AI cloud</text>
    <rect class="uv-panel" x="84" y="8" width="30" height="14" rx="7"/><text class="uv-note" x="99" y="18" text-anchor="middle">Data</text>
    <rect class="uv-panel" x="18" y="27" width="36" height="14" rx="7"/><text class="uv-note" x="36" y="37" text-anchor="middle">Search</text>
    <g class="uv-blink-soft"><rect class="uv-soft" x="62" y="27" width="40" height="14" rx="7"/><text class="uv-key uv-small" x="82" y="37" text-anchor="middle">Chatbot</text></g>
    ${pill(22, 48, 76, 'warn', 'Is this their focus?', 'uv-done uv-later')}`,
  technicalGap: `
    <circle class="uv-panel" cx="20" cy="22" r="8"/><path class="uv-panel" d="M8 50a12 12 0 0 1 24 0Z"/>
    <text class="uv-amber uv-blink-soft" x="32" y="16" style="font-size:14px">?</text>
    ${pill(46, 6, 40, 'info', 'RAG', 'uv-in1')}
    ${pill(70, 26, 40, 'info', 'NLP', 'uv-in2')}
    ${pill(48, 46, 62, 'info', 'Code snippet', 'uv-in3')}`,
  passiveProof: `
    <rect class="uv-well" x="6" y="6" width="70" height="46" rx="5"/>
    <rect class="uv-panel" x="12" y="12" width="40" height="5" rx="2"/>
    <circle class="uv-panel" cx="41" cy="33" r="10"/><path class="uv-solid" d="M38 28l8 5-8 5Z"/>
    ${pill(80, 22, 36, 'warn', 'Static', 'uv-done uv-later')}
    <text class="uv-note" x="6" y="63">Look, but cannot try</text>
    <path class="uv-pointer uv-cursor" style="--cx:44px; --cy:36px" d="M0 0v11l3-2.4 2.2 4.8 2.3-1-2.2-4.8 3.9-.4Z"/>`,
  weakProof: `
    <text class="uv-note" x="8" y="13">Trusted by</text>
    <circle class="uv-panel" cx="20" cy="28" r="9"/><circle class="uv-panel" cx="46" cy="28" r="9"/><circle class="uv-panel" cx="72" cy="28" r="9"/><circle class="uv-panel" cx="98" cy="28" r="9"/>
    ${pill(26, 46, 68, 'warn', 'No real results', 'uv-done uv-later')}`,
  integrationWorry: `
    <rect class="uv-panel" x="6" y="16" width="34" height="26" rx="5"/><text class="uv-note" x="23" y="27" text-anchor="middle">Your</text><text class="uv-note" x="23" y="36" text-anchor="middle">tools</text>
    <path class="uv-dash" d="M40 29h40"/>
    <rect class="uv-soft" x="80" y="16" width="34" height="26" rx="5"/><text class="uv-key uv-small" x="97" y="32" text-anchor="middle">Chatbot</text>
    <g class="uv-blink-soft"><circle class="uv-pill-warn" cx="60" cy="29" r="9"/><text class="uv-amber" x="60" y="33" text-anchor="middle">?</text></g>
    <text class="uv-note" x="60" y="60" text-anchor="middle">Will it fit our setup?</text>`,
  samePage: `
    <circle class="uv-panel" cx="12" cy="12" r="5"/><text class="uv-note" x="21" y="15">Dev</text>
    <circle class="uv-panel" cx="12" cy="33" r="5"/><text class="uv-note" x="21" y="36">Ops</text>
    <circle class="uv-panel" cx="12" cy="54" r="5"/><text class="uv-note" x="21" y="57">Buyer</text>
    <path class="uv-dash" d="M46 12C62 12 62 33 78 33M46 33h32M46 54C62 54 62 33 78 33"/>
    <circle r="3" class="uv-solid uv-dot uv-later" style="offset-path: path('M46 12C62 12 62 33 78 33')"/>
    <circle r="3" class="uv-solid uv-dot uv-later" style="--k:1; offset-path: path('M46 33h32')"/>
    <circle r="3" class="uv-solid uv-dot uv-later" style="--k:2; offset-path: path('M46 54C62 54 62 33 78 33')"/>
    <rect class="uv-well" x="80" y="10" width="34" height="46" rx="4"/>
    <rect class="uv-panel" x="85" y="16" width="24" height="4" rx="2"/><rect class="uv-panel" x="85" y="24" width="24" height="4" rx="2"/><rect class="uv-panel" x="85" y="32" width="18" height="4" rx="2"/>
    <text class="uv-note" x="97" y="65" text-anchor="middle">One page</text>`,

  heroSection: `
    <rect class="uv-well" x="4" y="4" width="112" height="60" rx="5"/>
    <rect class="uv-panel" x="12" y="14" width="56" height="7" rx="3"/><rect class="uv-panel" x="12" y="25" width="42" height="5" rx="2.5"/>
    <g class="uv-press"><rect class="uv-solid" x="12" y="38" width="40" height="13" rx="6.5"/><text class="uv-on" x="32" y="47" text-anchor="middle">Try it</text></g>
    <circle class="uv-soft" cx="92" cy="34" r="14"/>
    <circle class="uv-solid uv-in1" cx="86" cy="34" r="2"/><circle class="uv-solid uv-in2" cx="92" cy="34" r="2"/><circle class="uv-solid uv-in3" cx="98" cy="34" r="2"/>`,
  peerVideos: `
    <rect class="uv-panel" x="6" y="8" width="32" height="26" rx="3"/><rect class="uv-panel" x="44" y="8" width="32" height="26" rx="3"/><rect class="uv-panel" x="82" y="8" width="32" height="26" rx="3"/>
    <path class="uv-solid uv-turn" d="M19 16l8 5-8 5Z"/><path class="uv-solid uv-turn" style="--k:1" d="M57 16l8 5-8 5Z"/><path class="uv-solid uv-turn" style="--k:2" d="M95 16l8 5-8 5Z"/>
    ${pill(30, 46, 60, 'good', 'Real numbers', 'uv-done uv-later')}`,
  featureCards: `
    <rect class="uv-panel" x="8" y="8" width="32" height="14" rx="3"/><rect class="uv-panel" x="44" y="8" width="32" height="14" rx="3"/><rect class="uv-panel" x="80" y="8" width="32" height="14" rx="3"/>
    <rect class="uv-panel" x="8" y="26" width="32" height="14" rx="3"/><rect class="uv-panel" x="44" y="26" width="32" height="14" rx="3"/><rect class="uv-panel" x="80" y="26" width="32" height="14" rx="3"/>
    <g class="uv-open"><rect class="uv-soft" x="44" y="8" width="32" height="40" rx="3"/><rect class="uv-solid" x="49" y="13" width="18" height="3" rx="1.5"/>
      <rect class="uv-panel" x="49" y="24" width="22" height="3" rx="1.5"/><rect class="uv-panel" x="49" y="31" width="22" height="3" rx="1.5"/><rect class="uv-panel" x="49" y="38" width="14" height="3" rx="1.5"/></g>
    <text class="uv-note" x="60" y="62" text-anchor="middle">Technical details open on tap</text>`,
  useCaseTable: `
    <rect class="uv-well" x="6" y="6" width="108" height="50" rx="4"/><rect class="uv-panel" x="6" y="6" width="108" height="11" rx="4"/>
    <path class="uv-axis" d="M40 17v39M6 30h108M6 43h108"/>
    <rect class="uv-soft uv-scan-y" x="6" y="17" width="108" height="13" style="--dy:26px"/>
    <text class="uv-note" x="11" y="26">Retail</text><text class="uv-note" x="11" y="39">Banking</text><text class="uv-note" x="11" y="52">Travel</text>
    <rect class="uv-panel" x="46" y="21" width="52" height="4" rx="2"/><rect class="uv-panel" x="46" y="34" width="44" height="4" rx="2"/><rect class="uv-panel" x="46" y="47" width="50" height="4" rx="2"/>`,
  demoSandbox: `
    <rect class="uv-well" x="4" y="4" width="112" height="60" rx="5"/>
    <g class="uv-in1"><rect class="uv-soft" x="44" y="10" width="68" height="13" rx="5"/><text class="uv-key uv-small" x="78" y="19" text-anchor="middle">Track my order</text></g>
    <rect class="uv-panel uv-in2" x="10" y="29" width="58" height="4" rx="2"/>
    <rect class="uv-well" x="10" y="44" width="30" height="12" rx="6"/><rect class="uv-well" x="45" y="44" width="30" height="12" rx="6"/><rect class="uv-well" x="80" y="44" width="30" height="12" rx="6"/>
    <rect class="uv-soft uv-turn" x="10" y="44" width="30" height="12" rx="6"/><rect class="uv-soft uv-turn" style="--k:1" x="45" y="44" width="30" height="12" rx="6"/><rect class="uv-soft uv-turn" style="--k:2" x="80" y="44" width="30" height="12" rx="6"/>
    <text class="uv-note" x="25" y="53" text-anchor="middle">Retail</text><text class="uv-note" x="60" y="53" text-anchor="middle">Bank</text><text class="uv-note" x="95" y="53" text-anchor="middle">Travel</text>`,
  integrations: `
    <circle class="uv-panel" cx="16" cy="14" r="8"/><circle class="uv-panel" cx="38" cy="14" r="8"/><circle class="uv-panel" cx="60" cy="14" r="8"/><circle class="uv-panel" cx="82" cy="14" r="8"/><circle class="uv-panel" cx="104" cy="14" r="8"/>
    <path class="uv-dash" d="M16 22L52 44M38 22L56 44M60 22V44M82 22L64 44M104 22L68 44"/>
    <circle r="2.6" class="uv-solid uv-dot uv-later" style="offset-path: path('M16 22L52 44')"/>
    <circle r="2.6" class="uv-solid uv-dot uv-later" style="--k:1; offset-path: path('M60 22V44')"/>
    <circle r="2.6" class="uv-solid uv-dot uv-later" style="--k:2; offset-path: path('M104 22L68 44')"/>
    <rect class="uv-solid" x="38" y="44" width="44" height="16" rx="5"/><text class="uv-on" x="60" y="55" text-anchor="middle">Chatbot</text>`,
  securityBadges: `
    <path class="uv-panel" d="M22 8l12 4v10c0 8-5 13-12 16-7-3-12-8-12-16V12Z"/><path class="uv-check uv-in1" d="M17 22l3.5 3.5 7-8"/><path class="uv-panel" d="M60 8l12 4v10c0 8-5 13-12 16-7-3-12-8-12-16V12Z"/><path class="uv-check uv-in2" d="M55 22l3.5 3.5 7-8"/><path class="uv-panel" d="M98 8l12 4v10c0 8-5 13-12 16-7-3-12-8-12-16V12Z"/><path class="uv-check uv-in3" d="M93 22l3.5 3.5 7-8"/>
    <text class="uv-note" x="60" y="60" text-anchor="middle">Certified and open to check</text>`,
  talkToSales: `
    <rect class="uv-soft uv-ping" x="22" y="22" width="76" height="24" rx="12"/>
    <rect class="uv-solid" x="22" y="22" width="76" height="24" rx="12"/>
    <text class="uv-on" x="49" y="37" text-anchor="middle" style="font-size:9px">Talk to sales</text>
    <path class="uv-arrow uv-nudge" d="M83 34h7M86.5 30.5l3.5 3.5-3.5 3.5"/>`,

  sandboxRate: `
    <text class="uv-note" x="8" y="14">Visitors who try the bot</text>
    <rect class="uv-panel" x="8" y="22" width="104" height="10" rx="5"/>
    <rect class="uv-solid uv-grow" x="8" y="22" width="41.6" height="10" rx="5"/>
    <path class="uv-goal" d="M49.6 18v18"/>
    ${pill(8, 44, 60, 'good', 'Target 40%')}`,
  storyClicks: `
    <rect class="uv-panel" x="8" y="4" width="32" height="26" rx="3"/><rect class="uv-panel" x="44" y="4" width="32" height="26" rx="3"/><rect class="uv-panel" x="80" y="4" width="32" height="26" rx="3"/>
    <rect class="uv-soft uv-hit uv-later" x="44" y="4" width="32" height="26" rx="3"/>
    <path class="uv-solid" d="M20 12l7 4.5-7 4.5Z"/><path class="uv-solid" d="M56 12l7 4.5-7 4.5Z"/><path class="uv-solid" d="M92 12l7 4.5-7 4.5Z"/>
    <text class="uv-note" x="8" y="42">Clicks on stories</text>
    ${pill(8, 48, 56, 'good', 'Target 25%')}
    <path class="uv-pointer uv-cursor" style="--cx:62px; --cy:22px" d="M0 0v11l3-2.4 2.2 4.8 2.3-1-2.2-4.8 3.9-.4Z"/>`,
  timeOnPage: `
    <circle class="uv-well" cx="24" cy="36" r="17"/><path class="uv-axis" d="M20 14h8M24 14v5"/>
    <path class="uv-hand uv-spin" d="M24 36V24"/><circle class="uv-solid" cx="24" cy="36" r="2"/>
    <text class="uv-note" x="50" y="20">Time on page</text>
    ${pill(50, 28, 62, 'warn', 'Now 1:30', 'uv-cycle', '--of:2')}
    ${pill(50, 28, 62, 'good', 'Goal 2:30', 'uv-cycle uv-later', '--k:1; --of:2')}`,
  bounceRate: `
    <text class="uv-note" x="8" y="14">Leave after one page</text>
    <rect class="uv-panel" x="8" y="22" width="104" height="10" rx="5"/>
    <rect class="uv-bad uv-shrink" x="8" y="22" width="57.2" height="10" rx="5" style="--to:0.64"/>
    ${pill(8, 44, 60, 'warn', 'Now 55%', 'uv-cycle', '--of:2')}
    ${pill(8, 44, 60, 'good', 'Goal 35%', 'uv-cycle uv-later', '--k:1; --of:2')}`,
};
