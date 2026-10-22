// Ten alien greetings for the saucer on the home page. Each one is a short
// line of text (shown in a speech bubble and read by screen readers) and a
// made-up alien voice, synthesised in the browser so there are no sound files.
// Sound only ever plays after the visitor clicks or taps the saucer.

type Voice = 'chirp' | 'warble' | 'robot' | 'bubble';
export type Greeting = { text: string; base: number; notes: number[]; voice: Voice };

/** Notes are semitones above the base pitch, one per syllable. */
export const GREETINGS: Greeting[] = [
  { text: 'Hello, Earthling! Nine years of design? Impressive.', base: 330, notes: [0, 5, -2, 3, 9, 7, 12], voice: 'chirp' },
  { text: 'We scanned this site. Every pixel has a reason.', base: 260, notes: [0, 4, 7, 4, 9, 12, 7], voice: 'warble' },
  { text: 'Beep boop! Research first, pixels second. Smart human.', base: 220, notes: [12, 0, 7, 0, 12, 7, 5, 12], voice: 'robot' },
  { text: 'We hear you turn dense data into calm screens.', base: 196, notes: [0, 3, 5, 3, 7, 5, -2], voice: 'bubble' },
  { text: 'Take me to your designer. He listens to users.', base: 294, notes: [0, 2, 4, 2, 7, 5, 12], voice: 'warble' },
  { text: 'Accessible, tested and consistent. We approve!', base: 349, notes: [7, 0, 4, 9, 14, 12], voice: 'chirp' },
  { text: 'On our planet we love a good design system too.', base: 247, notes: [0, 4, 2, 7, 5, 9, 12, 7], voice: 'robot' },
  { text: 'Mission report: strong user experience skills detected.', base: 233, notes: [0, 7, 12, 7, 3, 10, 5, 0], voice: 'bubble' },
  { text: 'We crossed three galaxies for work this clear.', base: 311, notes: [5, 0, 9, 4, 12, 7, 14], voice: 'chirp' },
  { text: 'Enterprise apps, made simple? Our mothership is taking notes.', base: 262, notes: [12, 7, 4, 0, 7, 19, 12, 16], voice: 'warble' },
];

const SYLLABLE_S = 0.15, GAP_S = 0.035, LOUDNESS = 0.16;
const TIMBRE: Record<Voice, { wave: OscillatorType; vibrato: number; depth: number; ring: number; glide: number }> = {
  chirp: { wave: 'sine', vibrato: 7, depth: 12, ring: 0, glide: 1.35 },
  warble: { wave: 'triangle', vibrato: 11, depth: 38, ring: 0, glide: 1.1 },
  robot: { wave: 'square', vibrato: 0, depth: 0, ring: 68, glide: 1 },
  bubble: { wave: 'sine', vibrato: 5, depth: 20, ring: 31, glide: 0.72 },
};

let audio: AudioContext | undefined;
let bus: AudioNode | undefined;

/** One shared output: a soft space echo, then a limiter so nothing ever gets loud. */
function output(ctx: AudioContext): AudioNode {
  if (bus) return bus;
  const input = ctx.createGain(), echo = ctx.createDelay(1), feedback = ctx.createGain(), limiter = ctx.createDynamicsCompressor();
  echo.delayTime.value = 0.19;
  feedback.gain.value = 0.28;
  input.connect(limiter);
  input.connect(echo).connect(feedback).connect(echo);
  feedback.connect(limiter);
  limiter.connect(ctx.destination);
  bus = input;
  return bus;
}

/** One alien syllable: a pitch that slides, a little wobble, and for some voices a metallic ring. */
function syllable(ctx: AudioContext, out: AudioNode, at: number, pitch: number, voice: Voice) {
  const tone = TIMBRE[voice];
  const osc = ctx.createOscillator(), shape = ctx.createBiquadFilter(), amp = ctx.createGain();
  osc.type = tone.wave;
  osc.frequency.setValueAtTime(pitch, at);
  osc.frequency.exponentialRampToValueAtTime(pitch * tone.glide, at + SYLLABLE_S);
  shape.type = 'bandpass';
  shape.Q.value = 3;
  shape.frequency.setValueAtTime(pitch * 2.2, at);
  shape.frequency.linearRampToValueAtTime(pitch * 3.4, at + SYLLABLE_S);
  amp.gain.setValueAtTime(0.0001, at);
  amp.gain.exponentialRampToValueAtTime(LOUDNESS, at + 0.025);
  amp.gain.exponentialRampToValueAtTime(0.0001, at + SYLLABLE_S);
  osc.connect(shape).connect(amp).connect(out);
  const extras = [osc];
  if (tone.vibrato) extras.push(modulate(ctx, osc.frequency, tone.vibrato, tone.depth));
  if (tone.ring) extras.push(modulate(ctx, amp.gain, tone.ring, LOUDNESS * 0.8));
  extras.forEach((node) => { node.start(at); node.stop(at + SYLLABLE_S + 0.05); });
}

function modulate(ctx: AudioContext, param: AudioParam, rate: number, depth: number): OscillatorNode {
  const lfo = ctx.createOscillator(), size = ctx.createGain();
  lfo.frequency.value = rate;
  size.gain.value = depth;
  lfo.connect(size).connect(param);
  return lfo;
}

/** Say a greeting out loud. Returns how long it lasts in seconds. */
export function sayGreeting(greeting: Greeting): number {
  try {
    audio = audio ?? new AudioContext();
    if (audio.state === 'suspended') void audio.resume();
    const out = output(audio), start = audio.currentTime + 0.03;
    greeting.notes.forEach((note, index) => {
      const pitch = greeting.base * 2 ** (note / 12);
      syllable(audio!, out, start + index * (SYLLABLE_S + GAP_S), pitch, greeting.voice);
    });
  } catch (error) {
    console.warn('The alien could not make a sound in this browser', error);
  }
  return greeting.notes.length * (SYLLABLE_S + GAP_S) + 0.4;
}

/** Greetings in a shuffled order that never repeats until all ten have played. */
export function greetingDeck() {
  let deck: Greeting[] = [];
  return () => {
    if (!deck.length) deck = [...GREETINGS].sort(() => Math.random() - 0.5);
    return deck.pop()!;
  };
}
