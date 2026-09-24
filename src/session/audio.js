export const BPM = 66;
let synth = null;
let carrier = null;
let muted = false;
let chamber = false;
let epoch = 0;
let base = { cross: 0.25, cutoff: 900 };
let surge = false;
let climax = 0;
let bursting = false;
let burstTimers = [];
const Tone = () => window.Tone;
export async function startAudio() {
  try {
    if (!Tone()) return false;
    await Tone().start();
    if (!synth) synth = new (Tone().PolySynth)(Tone().Synth, { oscillator: { type: 'sine' }, envelope: { attack: 0.01, decay: 0.15, sustain: 0, release: 0.5 }, volume: -20 }).toDestination();
    return true;
  } catch { return false; }
}
export function muteAudio(value) {
  if (value === muted) return;
  muted = value;
  if (muted) synth?.releaseAll();
  carrier?.gain.gain.rampTo(muted || !chamber ? 0 : 1, 0.2);
}
export function sound(kind) {
  if (!synth || muted) return;
  const notes = { accept: ['G4', 'B4', 'D5'], select: ['D5'], retry: ['G3'], pulse: ['G5'], install: ['G3', 'B3', 'D4', 'G4', 'B4'], confirm: ['D4', 'A4', 'D5'] };
  const length = { accept: '8n', select: '32n', retry: '32n', pulse: '16n', install: '2n', confirm: '4n' };
  try { synth.triggerAttackRelease(notes[kind], length[kind]); } catch { /* Audio is optional. */ }
}
function buildCarrier() {
  const T = Tone();
  const gain = new T.Gain(0).toDestination();
  const filter = new T.Filter(base.cutoff, 'lowpass').connect(gain);
  const panLeft = new T.Panner(-1).connect(filter);
  const panRight = new T.Panner(1).connect(filter);
  const left = new T.Oscillator(200, 'sine');
  const right = new T.Oscillator(206, 'sine');
  left.volume.value = -27; right.volume.value = -27;
  const direct = [new T.Gain(1).connect(panLeft), new T.Gain(1).connect(panRight)];
  const cross = [new T.Gain(0).connect(panRight), new T.Gain(0).connect(panLeft)];
  left.connect(direct[0]); left.connect(cross[0]);
  right.connect(direct[1]); right.connect(cross[1]);
  left.start(); right.start();
  const pulse = new T.MembraneSynth({ pitchDecay: 0.08, octaves: 4, envelope: { attack: 0.005, decay: 0.5, sustain: 0, release: 0.6 }, volume: -16 }).connect(filter);
  const impact = new T.MembraneSynth({ pitchDecay: 0.2, octaves: 6, envelope: { attack: 0.002, decay: 0.9, sustain: 0, release: 0.8 }, volume: -8 }).connect(gain);
  const transport = T.getTransport ? T.getTransport() : T.Transport;
  transport.bpm.value = BPM;
  transport.scheduleRepeat(time => pulse.triggerAttackRelease('C1', '8n', time), '4n');
  return { gain, filter, transport, direct, cross, pulse, impact };
}
function applyCross(amount, seconds) {
  const angle = Math.min(1, Math.max(0, amount)) * Math.PI / 4;
  carrier.direct.forEach(node => node.gain.rampTo(Math.cos(angle), seconds));
  carrier.cross.forEach(node => node.gain.rampTo(Math.sin(angle), seconds));
}
function applyBase(seconds) {
  applyCross(climax > 0 ? Math.max(base.cross, climax) : base.cross + (surge ? 0.25 : 0), seconds);
  carrier.filter.frequency.rampTo(climax > 0 ? base.cutoff + climax * 5200 : base.cutoff * (surge ? 1.6 : 1), seconds);
  carrier.pulse.volume.rampTo(-16 + 8 * climax, seconds);
}
export function setChamber(on) {
  if (on === chamber) return;
  chamber = on;
  if (!synth) return;
  try {
    if (on) {
      if (!carrier) carrier = buildCarrier();
      applyBase(0.1);
      carrier.transport.start();
      epoch = performance.now();
      carrier.gain.gain.rampTo(muted ? 0 : 1, 4);
    } else if (carrier) {
      carrier.gain.gain.rampTo(0, 3);
      setTimeout(() => { if (!chamber) carrier.transport.stop(); }, 3200);
    }
  } catch { /* Audio is optional. */ }
}
export function setIntensity(meter) {
  base = { cross: 0.25 + 0.45 * meter, cutoff: 900 + 2600 * meter };
  if (carrier && !bursting) applyBase(0.6);
}
export function setSurge(on) {
  if (on === surge) return;
  surge = on;
  if (carrier && !bursting) applyBase(on ? 0.15 : 0.5);
}
export function setClimax(progress) {
  const next = Math.min(1, Math.max(0, progress));
  if (Math.abs(next - climax) < 0.02 && (next === 0) === (climax === 0)) return;
  climax = next;
  if (carrier && !bursting) applyBase(0.5);
}
export function setBurst(on, ms = 3600) {
  if (on === bursting || !carrier) return;
  bursting = on;
  burstTimers.forEach(clearTimeout); burstTimers = [];
  const later = (fn, delay) => burstTimers.push(setTimeout(fn, delay));
  const level = () => (muted || !chamber ? 0 : 1);
  try {
    if (on) {
      carrier.gain.gain.rampTo(level() * 0.5, 0.22);
      later(() => carrier.gain.gain.rampTo(0, 0.04), 230);
      later(() => {
        if (level()) carrier.impact.triggerAttackRelease('C1', '2n');
        carrier.gain.gain.rampTo(level(), 0.08);
        applyCross(0.85, 0.12);
        carrier.filter.frequency.rampTo(3200, 0.6);
      }, 300);
      later(() => { applyCross(1, 0.8); carrier.filter.frequency.rampTo(5200, 1.2); }, 900);
      later(() => { carrier.filter.frequency.rampTo(7000, 0.4); carrier.pulse.volume.rampTo(-10, 0.3); }, Math.max(1000, ms - 650));
    } else {
      carrier.gain.gain.rampTo(level(), 0.3);
      carrier.pulse.volume.rampTo(-16, 0.5);
      applyBase(0.25);
      sound('confirm');
    }
  } catch { /* Audio is optional. */ }
}
export const beatPhase = now => (((now - epoch) / 1000) * BPM / 60) % 1;
