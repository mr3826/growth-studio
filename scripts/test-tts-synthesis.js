import fs from 'node:fs';
import path from 'node:path';
import { resolveStoragePaths } from '../packages/contracts/src/index.js';
import { GEMINI_TTS_MODEL, pcmToWav } from '../packages/render-adapter/src/index.js';

async function testTts() {
  const apiKey = process.env.CONTENT_STUDIO_GEMINI;
  if (!apiKey?.trim()) {
    console.error('CONTENT_STUDIO_GEMINI is not configured.');
    process.exitCode = 2;
    return;
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_TTS_MODEL}:generateContent`;
  const payload = {
    contents: [{ role: 'user', parts: [{ text: 'আপনার পণ্যের বৈশিষ্ট্যগুলো দেখে নিন।' }] }],
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: { voiceConfig: { voice: 'Puck' } }
    }
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(45000)
    });
    if (!res.ok) {
      console.error(`Gemini TTS failed with HTTP ${res.status}. Check provider access, quota, and network.`);
      process.exitCode = 1;
      return;
    }

    const data = await res.json();
    const inlineData = data.candidates?.[0]?.content?.parts?.find(part => part?.inlineData?.data)?.inlineData;
    if (!inlineData?.data) {
      console.error('Gemini TTS returned no audio.');
      process.exitCode = 1;
      return;
    }

    const audio = Buffer.from(inlineData.data, 'base64');
    const wav = audio.subarray(0, 4).toString() === 'RIFF' ? audio : pcmToWav(audio);
    const outputDir = resolveStoragePaths().exports;
    fs.mkdirSync(outputDir, { recursive: true });
    const outFile = path.join(outputDir, `test-tts-bangla-${GEMINI_TTS_MODEL}.wav`);
    fs.writeFileSync(outFile, wav);
    console.log(`Gemini TTS audio saved: ${outFile} (${wav.length} bytes, ${inlineData.mimeType || 'audio/wav'}).`);
  } catch {
    console.error('Gemini TTS request failed. Check provider access and local network status.');
    process.exitCode = 1;
  }
}

testTts();
