import fs from 'node:fs';
import path from 'node:path';

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
  { id: 'Puck', name: 'Puck (Engaging, Clear)', gender: 'male', default: true },
  { id: 'Charon', name: 'Charon (Deep, Authoritative)', gender: 'male' },
  { id: 'Kore', name: 'Kore (Warm, Professional)', gender: 'female' },
  { id: 'Fenrir', name: 'Fenrir (Energetic, Dynamic)', gender: 'male' },
  { id: 'Aoede', name: 'Aoede (Smooth, Melodic)', gender: 'female' }
];

export function isGeminiTtsAvailable() {
  const key = process.env.CONTENT_STUDIO_GEMINI;
  return Boolean(key && key.trim().length > 0);
}

/**
 * Synthesizes speech using Gemini TTS (gemini-2.5-flash-preview-tts).
 * Automatically reads process.env.CONTENT_STUDIO_GEMINI without logging the key.
 */
export async function synthesizeSpeechGemini({
  text,
  voice = 'Puck',
  model = 'gemini-2.5-flash-preview-tts',
  cacheDir = null
}) {
  if (!text || !text.trim()) {
    throw new Error('TTS error: Speech text cannot be empty');
  }

  const apiKey = process.env.CONTENT_STUDIO_GEMINI;
  if (!apiKey) {
    throw new Error('Gemini TTS unavailable: Environment variable CONTENT_STUDIO_GEMINI is not set');
  }

  const cleanText = text.trim();

  // Check file cache if cacheDir provided
  if (cacheDir && fs.existsSync(cacheDir)) {
    const cacheKey = Buffer.from(`${model}_${voice}_${cleanText}`).toString('base64url').slice(0, 48);
    const cachedWav = path.join(cacheDir, `tts_${cacheKey}.wav`);
    if (fs.existsSync(cachedWav)) {
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

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const payload = {
    contents: [
      {
        parts: [{ text: cleanText }]
      }
    ],
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: voice
          }
        }
      }
    }
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errText = await res.text();
    // Sanitize any accidental API key echoes in error text
    const sanitized = errText.replace(/key=[a-zA-Z0-9_\-]+/g, 'key=[REDACTED]');
    throw new Error(`Gemini TTS API failed (${res.status}): ${sanitized}`);
  }

  const data = await res.json();
  const candidate = data.candidates?.[0];
  const part = candidate?.content?.parts?.[0];
  const inlineData = part?.inlineData;

  if (!inlineData || !inlineData.data) {
    throw new Error('Gemini TTS returned no audio data');
  }

  const rawBuffer = Buffer.from(inlineData.data, 'base64');
  let wavBuffer;

  // Gemini returns audio/L16;codec=pcm;rate=24000 (raw PCM)
  if (inlineData.mimeType?.includes('pcm') || !rawBuffer.subarray(0, 4).equals(Buffer.from('RIFF'))) {
    wavBuffer = pcmToWav(rawBuffer, 24000, 1, 16);
  } else {
    wavBuffer = rawBuffer;
  }

  const dataSize = Math.max(0, wavBuffer.length - 44);
  const durationSeconds = Number((dataSize / (24000 * 2)).toFixed(2));

  // Write to cache if directory provided
  if (cacheDir && fs.existsSync(cacheDir)) {
    try {
      const cacheKey = Buffer.from(`${model}_${voice}_${cleanText}`).toString('base64url').slice(0, 48);
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
