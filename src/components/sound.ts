// Short, quiet interface sounds. They only ever play in answer to a click or
// key press, and the Sound button in the header turns them off (remembered
// in this browser). Sounds were made in code with the earshot sound bank.

export type SoundName = 'pop' | 'click' | 'switch' | 'tick' | 'ding';

const VOLUME = 0.35;
const STORAGE_KEY = 'sound';
const buffers = new Map<SoundName, Promise<AudioBuffer | null>>();
let context: AudioContext | undefined;
let enabled = readSetting();

function readSetting(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== 'off';
  } catch {
    return true; // storage blocked: sound stays on for this visit
  }
}

export const soundOn = () => enabled;

export function setSoundOn(on: boolean) {
  enabled = on;
  try {
    localStorage.setItem(STORAGE_KEY, on ? 'on' : 'off');
  } catch (error) {
    console.warn('Sound setting could not be saved; it applies to this visit only', error);
  }
}

/** The shared audio context, woken up if the browser paused it. Null when sound is off or unsupported. */
export function audioContext(): AudioContext | null {
  if (!enabled) return null;
  try {
    context = context ?? new AudioContext();
    if (context.state === 'suspended') void context.resume();
    return context;
  } catch (error) {
    console.warn('Sound is not available in this browser', error);
    return null;
  }
}

// Sound files sit next to the favicon at the site root, which works on the
// live site and in the preview copy alike.
function soundUrl(name: SoundName) {
  const icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  return new URL(`sounds/${name}.wav`, icon?.href ?? document.baseURI).href;
}

function load(audio: AudioContext, name: SoundName) {
  let buffer = buffers.get(name);
  if (!buffer) {
    buffer = fetch(soundUrl(name))
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.arrayBuffer();
      })
      .then((data) => audio.decodeAudioData(data))
      .catch((error) => {
        console.warn(`The ${name} sound could not load`, error);
        return null;
      });
    buffers.set(name, buffer);
  }
  return buffer;
}

export async function play(name: SoundName, volume = 1) {
  const audio = audioContext();
  if (!audio) return;
  const buffer = await load(audio, name);
  if (!buffer) return;
  const source = audio.createBufferSource(), gain = audio.createGain();
  source.buffer = buffer;
  gain.gain.value = VOLUME * volume;
  source.connect(gain).connect(audio.destination);
  source.start();
}
