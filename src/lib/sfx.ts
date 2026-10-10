let ctx: AudioContext | null = null;
export let muted = false;
export const setMuted = (m: boolean) => (muted = m);

function ac() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC =
      window.AudioContext ??
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    ctx = AC ? new AC() : null;
  }
  const c = ctx;
  if (!c) return null;
  if (c.state === "suspended") void c.resume();
  return c;
}

function tone(
  freq: number,
  dur: number,
  type: OscillatorType = "sine",
  vol = 0.15,
  delay = 0,
  slide?: number,
) {
  const a = ac();
  if (!a || muted) return;
  const t0 = a.currentTime + delay;
  const o = a.createOscillator(),
    g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(slide, t0 + dur);
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  o.connect(g).connect(a.destination);
  o.start(t0);
  o.stop(t0 + dur);
}

function noise(dur: number, vol = 0.3) {
  const a = ac();
  if (!a || muted) return;
  const buf = a.createBuffer(1, a.sampleRate * dur, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length) ** 2;
  const s = a.createBufferSource(),
    g = a.createGain(),
    f = a.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.value = 900;
  s.buffer = buf;
  g.gain.value = vol;
  s.connect(f).connect(g).connect(a.destination);
  s.start();
}

export const sfx = {
  click: () => tone(660, 0.08, "triangle", 0.12),
  swipe: () => tone(300, 0.15, "sine", 0.12, 0, 700),
  bad: () => tone(220, 0.18, "square", 0.06, 0, 150),
  pop: (combo: number) => {
    const f = 520 * Math.pow(1.12, Math.min(combo, 8));
    tone(f, 0.12, "triangle", 0.14);
    tone(f * 1.5, 0.1, "sine", 0.08, 0.04);
  },
  boom: () => {
    noise(0.6, 0.45);
    tone(120, 0.5, "sine", 0.3, 0, 40);
  },
  line: () => tone(900, 0.3, "sawtooth", 0.06, 0, 200),
  win: () =>
    [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, 0.3, "triangle", 0.15, i * 0.13)),
  unlock: () => {
    [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.25, "triangle", 0.12, i * 0.09));
  },
  portal: () => {
    tone(110, 2.4, "sine", 0.25, 0, 440);
    [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.6, "triangle", 0.1, 1 + i * 0.18));
  },
  lose: () => [440, 370, 311].forEach((f, i) => tone(f, 0.35, "triangle", 0.12, i * 0.2)),
};
