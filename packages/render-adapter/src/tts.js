import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

/**
 * Converts raw linear PCM audio into a standard 44-byte RIFF WAV buffer.
 */
export function pcmToWav(pcmBuffer, sampleRate = 24000, numChannels = 1, bitsPerSample = 16) {
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = pcmBuffer.length;
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  // fmt subchunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  buffer.writeUInt16LE(1, 20);  // AudioFormat (1 for PCM)
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);

  // data subchunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  pcmBuffer.copy(buffer, 44);

  return buffer;
}

export const GEMINI_TTS_VOICES = [
  { id: 'Puck', name: 'Puck (Upbeat)', default: true },
  { id: 'Charon', name: 'Charon (Informative)' },
  { id: 'Kore', name: 'Kore (Firm)' },
  { id: 'Fenrir', name: 'Fenrir (Excitable)' },
  { id: 'Aoede', name: 'Aoede (Breezy)' }
];

export const GEMINI_TTS_MODEL = 'gemini-3.8-flash-tts';

export function isGeminiTtsAvailable() {
  const key = process.env.CONTENT_STUDIO_GEMINI;
  return Boolean(key && key.trim().length > 0);
}

/**
 * Synthesizes speech using the supported Gemini Flash TTS model.
 * Automatically reads process.env.CONTENT_STUDIO_GEMINI without logging the key.
 */
export async function synthesizeSpeechGemini({
  text,
  voice = 'Puck',
  model = GEMINI_TTS_MODEL,
  cacheDir = null,
  signal = null
}) {
  if (!text || !text.trim()) {
    throw new Error('TTS error: Speech text cannot be empty');
  }
  if (!GEMINI_TTS_VOICES.some(item => item.id === voice)) {
    throw new Error('Gemini TTS voice is not supported.');
  }

  const cleanText = text.trim();

  // Check file cache if cacheDir provided (allows offline reuse without API key)
  if (cacheDir && fs.existsSync(cacheDir)) {
    const legacyCacheKey = Buffer.from(`${model}_${voice}_${cleanText}`).toString('base64url').slice(0, 48);
    const stableCacheKey = createHash('sha256').update(`${model}\u0000${voice}\u0000${cleanText}`).digest('hex');
    const cachedWav = [legacyCacheKey, stableCacheKey].map(key => path.join(cacheDir, `tts_${key}.wav`)).find(file => fs.existsSync(file));
    if (cachedWav) {
      const wavBuffer = fs.readFileSync(cachedWav);
      const dataSize = Math.max(0, wavBuffer.length - 44);
      const durationSeconds = dataSize / (24000 * 2);
      return {
        wavBuffer,
        durationSeconds,
        sampleRate: 24000,
        fromCache: true
      };
    }
  }

  const apiKey = process.env.CONTENT_STUDIO_GEMINI?.trim();
  if (!apiKey) {
    throw new Error('Gemini TTS unavailable: Environment variable CONTENT_STUDIO_GEMINI is not set');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const payload = {
    contents: [
      {
        role: 'user',
        parts: [{ text: cleanText }]
      }
    ],
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: {
          voice
        }
      }
    }
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify(payload),
    signal: signal || AbortSignal.timeout(45000)
  });

  if (!res.ok) {
    throw new Error(`Gemini TTS request failed with HTTP ${res.status}. Check account access, quota, and local network status.`);
  }

  const data = await res.json();
  const candidate = data.candidates?.[0];
  const part = candidate?.content?.parts?.find(item => item?.inlineData?.data);
  const inlineData = part?.inlineData;

  if (!inlineData || !inlineData.data) {
    throw new Error('Gemini TTS returned no audio data');
  }

  const rawBuffer = Buffer.from(inlineData.data, 'base64');
  let wavBuffer;

  // Gemini 3.8 returns WAV for unary requests; retain compatibility with raw PCM responses.
  if (!rawBuffer.subarray(0, 4).equals(Buffer.from('RIFF'))) {
    wavBuffer = pcmToWav(rawBuffer, 24000, 1, 16);
  } else {
    wavBuffer = rawBuffer;
  }

  const dataSize = Math.max(0, wavBuffer.length - 44);
  const durationSeconds = Number((dataSize / (24000 * 2)).toFixed(2));

  // Write to cache if directory provided
  if (cacheDir && fs.existsSync(cacheDir)) {
    try {
      const cacheKey = createHash('sha256').update(`${model}\u0000${voice}\u0000${cleanText}`).digest('hex');
      const cachedWav = path.join(cacheDir, `tts_${cacheKey}.wav`);
      fs.writeFileSync(cachedWav, wavBuffer);
    } catch (_) {}
  }

  return {
    wavBuffer,
    durationSeconds,
    sampleRate: 24000,
    fromCache: false
  };
}
