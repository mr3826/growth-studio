/**
 * generate-licensed-music.js
 * 
 * Generates an original, royalty-free, pleasant acoustic/ambient tech promo background track.
 * 100% locally synthesized with zero external downloads or copyrighted samples.
 * Format: 48,000 Hz, 16-bit PCM Stereo WAV.
 * Duration: 35 seconds.
 * Musical key: D Major / B minor (Dmaj9 -> Bm9 -> Gmaj7 -> Asus4/A).
 * Pacing: 116 BPM, ambient corporate/tech vibe with warm pads, acoustic plucks, rounded bass.
 */

import fs from 'node:fs';
import path from 'node:path';

const SAMPLE_RATE = 48000;
const CHANNELS = 2;
const BITS_PER_SAMPLE = 16;
const DURATION_SECONDS = 35;
const TOTAL_SAMPLES = SAMPLE_RATE * DURATION_SECONDS;
const BPM = 116;
const BEAT_SEC = 60 / BPM;
const BAR_SEC = BEAT_SEC * 4;

// Frequencies (Hz)
const NOTES = {
  G1: 49.00, A1: 55.00, B1: 61.74,
  D2: 73.42, E2: 82.41, Fs2: 92.50, G2: 98.00, A2: 110.00, B2: 123.47,
  Cs3: 138.59, D3: 146.83, E3: 164.81, Fs3: 185.00, G3: 196.00, A3: 220.00, B3: 246.94,
  Cs4: 277.18, D4: 293.66, E4: 329.63, Fs4: 369.99, G4: 392.00, A4: 440.00, B4: 493.88,
  Cs5: 554.37, D5: 587.33, E5: 659.25, Fs5: 739.99, A5: 880.00
};

// Chord progression: 4 bars repeated
const CHORDS = [
  // Bar 1: Dmaj9
  {
    bass: NOTES.D2,
    pad: [NOTES.D3, NOTES.A3, NOTES.Cs4, NOTES.Fs4],
    arpeggio: [NOTES.D4, NOTES.Fs4, NOTES.A4, NOTES.Cs5, NOTES.E5, NOTES.A4, NOTES.Fs4, NOTES.D4]
  },
  // Bar 2: Bm9
  {
    bass: NOTES.B1,
    pad: [NOTES.B2, NOTES.Fs3, NOTES.A3, NOTES.D4],
    arpeggio: [NOTES.B3, NOTES.D4, NOTES.Fs4, NOTES.A4, NOTES.Cs5, NOTES.A4, NOTES.Fs4, NOTES.D4]
  },
  // Bar 3: Gmaj7
  {
    bass: NOTES.G1,
    pad: [NOTES.G2, NOTES.D3, NOTES.Fs3, NOTES.B3],
    arpeggio: [NOTES.G3, NOTES.B3, NOTES.D4, NOTES.Fs4, NOTES.B4, NOTES.Fs4, NOTES.D4, NOTES.B3]
  },
  // Bar 4: Asus4 -> A
  {
    bass: NOTES.A1,
    pad: [NOTES.A2, NOTES.E3, NOTES.A3, NOTES.Cs4],
    arpeggio: [NOTES.A3, NOTES.Cs4, NOTES.E4, NOTES.A4, NOTES.D5, NOTES.Cs5, NOTES.A4, NOTES.E4]
  }
];

function generateTrack() {
  const leftBuf = new Float32Array(TOTAL_SAMPLES);
  const rightBuf = new Float32Array(TOTAL_SAMPLES);

  // Synthesize chord progression
  for (let sampleIdx = 0; sampleIdx < TOTAL_SAMPLES; sampleIdx++) {
    const t = sampleIdx / SAMPLE_RATE;
    const barIdx = Math.floor(t / BAR_SEC) % CHORDS.length;
    const chord = CHORDS[barIdx];
    const tInBar = t % BAR_SEC;

    // --- 1. Warm Bass (Root + gentle 2nd harmonic) ---
    const bassFreq = chord.bass;
    const bassEnv = Math.exp(-0.25 * (tInBar % (BEAT_SEC * 2))); // gentle pulse per half bar
    const bass = (Math.sin(2 * Math.PI * bassFreq * t) * 0.7 +
                  Math.sin(2 * Math.PI * bassFreq * 2 * t) * 0.25) * bassEnv * 0.16;

    // --- 2. Lush Synth Pad (detuned sines for chorus width) ---
    let padLeft = 0;
    let padRight = 0;
    for (const freq of chord.pad) {
      // Detune +/- 0.3 Hz for natural chorus
      padLeft += Math.sin(2 * Math.PI * (freq - 0.25) * t) + 0.3 * Math.sin(2 * Math.PI * (freq * 2) * t);
      padRight += Math.sin(2 * Math.PI * (freq + 0.25) * t) + 0.3 * Math.sin(2 * Math.PI * (freq * 2) * t);
    }
    const padGain = 0.045 / chord.pad.length;
    padLeft *= padGain;
    padRight *= padGain;

    // --- 3. Melodic Pluck / Bell Arpeggio ---
    const stepDuration = BEAT_SEC / 2; // 8th note steps
    const stepIdx = Math.floor(tInBar / stepDuration) % chord.arpeggio.length;
    const arpFreq = chord.arpeggio[stepIdx];
    const tInStep = tInBar % stepDuration;
    // Bell envelope: fast attack, exponential decay
    const arpEnv = Math.exp(-12.0 * tInStep);
    const arpTone = (Math.sin(2 * Math.PI * arpFreq * t) +
                     0.4 * Math.sin(2 * Math.PI * arpFreq * 2.005 * t) +
                     0.15 * Math.sin(2 * Math.PI * arpFreq * 3.01 * t)) * arpEnv * 0.09;
    // Alternating stereo pan for arpeggios
    const panLeft = stepIdx % 2 === 0 ? 0.8 : 0.3;
    const panRight = stepIdx % 2 === 0 ? 0.3 : 0.8;

    // --- 4. Soft Ambient Rhythm (subtle high-frequency tick on offbeats) ---
    const tInBeat = t % BEAT_SEC;
    let click = 0;
    if (tInBeat < 0.03) {
      const clickEnv = Math.exp(-120 * tInBeat);
      click = (Math.random() * 2 - 1) * clickEnv * 0.012;
    }

    // Combine layers
    let l = bass + padLeft + (arpTone * panLeft) + click;
    let r = bass + padRight + (arpTone * panRight) + click;

    // Master fade in / fade out
    let masterEnv = 1.0;
    if (t < 0.6) {
      masterEnv = t / 0.6;
    } else if (t > DURATION_SECONDS - 1.5) {
      masterEnv = Math.max(0, (DURATION_SECONDS - t) / 1.5);
    }

    leftBuf[sampleIdx] = l * masterEnv;
    rightBuf[sampleIdx] = r * masterEnv;
  }

  // Find peak amplitude for clean normalization
  let maxAmp = 0;
  for (let i = 0; i < TOTAL_SAMPLES; i++) {
    maxAmp = Math.max(maxAmp, Math.abs(leftBuf[i]), Math.abs(rightBuf[i]));
  }
  const targetPeak = 0.55; // -5.2 dBFS peak, sits around -22 LUFS integrated
  const normGain = maxAmp > 0 ? (targetPeak / maxAmp) : 1.0;

  // Convert to 16-bit interleaved PCM WAV
  const dataByteLength = TOTAL_SAMPLES * CHANNELS * 2;
  const wavBuffer = Buffer.alloc(44 + dataByteLength);

  // RIFF header
  wavBuffer.write('RIFF', 0);
  wavBuffer.writeUInt32LE(36 + dataByteLength, 4);
  wavBuffer.write('WAVE', 8);

  // fmt chunk
  wavBuffer.write('fmt ', 12);
  wavBuffer.writeUInt32LE(16, 16);
  wavBuffer.writeUInt16LE(1, 20); // PCM
  wavBuffer.writeUInt16LE(CHANNELS, 22);
  wavBuffer.writeUInt32LE(SAMPLE_RATE, 24);
  wavBuffer.writeUInt32LE(SAMPLE_RATE * CHANNELS * (BITS_PER_SAMPLE / 8), 28);
  wavBuffer.writeUInt16LE(CHANNELS * (BITS_PER_SAMPLE / 8), 32);
  wavBuffer.writeUInt16LE(BITS_PER_SAMPLE, 34);

  // data chunk
  wavBuffer.write('data', 36);
  wavBuffer.writeUInt32LE(dataByteLength, 40);

  let offset = 44;
  for (let i = 0; i < TOTAL_SAMPLES; i++) {
    const sampleL = Math.max(-1, Math.min(1, leftBuf[i] * normGain));
    const sampleR = Math.max(-1, Math.min(1, rightBuf[i] * normGain));
    const intL = sampleL < 0 ? Math.round(sampleL * 32768) : Math.round(sampleL * 32767);
    const intR = sampleR < 0 ? Math.round(sampleR * 32768) : Math.round(sampleR * 32767);
    wavBuffer.writeInt16LE(intL, offset);
    offset += 2;
    wavBuffer.writeInt16LE(intR, offset);
    offset += 2;
  }

  return wavBuffer;
}

export function generateAndSaveLicensedMusic(targetPath) {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  console.log(`[Music] Synthesizing 35s ambient tech promo track (48kHz Stereo) -> ${targetPath}`);
  const wav = generateTrack();
  fs.writeFileSync(targetPath, wav);
  console.log(`✓ Music track generated (${wav.length} bytes, 35.00s duration).`);
  return targetPath;
}

// If executed directly
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve('scripts/generate-licensed-music.js')) {
  const seedDest = path.resolve('data/projects/easymoderator-launch/assets/background-music.wav');
  generateAndSaveLicensedMusic(seedDest);
}
