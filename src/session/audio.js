let synth = null;
let muted = false;
export async function startAudio() {
  try {
    if (!window.Tone) return false;
    await window.Tone.start();
    if (!synth) synth = new window.Tone.PolySynth(window.Tone.Synth, { oscillator: { type: 'sine' }, envelope: { attack: 0.01, decay: 0.15, sustain: 0, release: 0.5 }, volume: -20 }).toDestination();
    return true;
  } catch { return false; }
}
export function muteAudio(value) { muted = value; if (muted) synth?.releaseAll(); }
export function sound(kind) {
  if (!synth || muted) return;
  try { synth.triggerAttackRelease(kind === 'accept' ? ['G4','B4','D5'] : kind === 'select' ? ['D5'] : ['G3'], kind === 'accept' ? '8n' : '32n'); } catch { /* Audio is optional. */ }
}
