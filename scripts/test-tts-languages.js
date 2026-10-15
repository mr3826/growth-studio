import fs from 'node:fs';
import path from 'node:path';
import { resolveStoragePaths } from '../packages/contracts/src/index.js';
import { GEMINI_TTS_MODEL, pcmToWav } from '../packages/render-adapter/src/index.js';

async function testEnglishAndMixed() {
  const apiKey = process.env.CONTENT_STUDIO_GEMINI;
  if (!apiKey?.trim()) {
    console.error('CONTENT_STUDIO_GEMINI is not configured.');
    process.exitCode = 2;
    return;
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_TTS_MODEL}:generateContent`;
  const prompts = [
    { id: 'en', text: 'Explore the product and learn how it fits your workflow.' },
    { id: 'mixed', text: 'পণ্যটি দেখুন এবং আপনার কাজের সঙ্গে কীভাবে মানায় জেনে নিন। Explore at your own pace.' }
  ];
  const outputDir = resolveStoragePaths().exports;
  fs.mkdirSync(outputDir, { recursive: true });

  for (const prompt of prompts) {
    const payload = {
      contents: [{ role: 'user', parts: [{ text: prompt.text }] }],
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
        console.error(`Gemini TTS ${prompt.id} sample failed with HTTP ${res.status}.`);
        process.exitCode = 1;
        return;
      }
      const data = await res.json();
      const inlineData = data.candidates?.[0]?.content?.parts?.find(part => part?.inlineData?.data)?.inlineData;
      if (!inlineData?.data) {
        console.error(`Gemini TTS returned no ${prompt.id} audio.`);
        process.exitCode = 1;
        return;
      }
      const audio = Buffer.from(inlineData.data, 'base64');
      const wav = audio.subarray(0, 4).toString() === 'RIFF' ? audio : pcmToWav(audio);
      const outPath = path.join(outputDir, `test-tts-${prompt.id}-${GEMINI_TTS_MODEL}.wav`);
      fs.writeFileSync(outPath, wav);
      console.log(`Gemini TTS ${prompt.id} sample saved: ${outPath} (${wav.length} bytes).`);
    } catch {
      console.error(`Gemini TTS ${prompt.id} sample failed. Check provider access and local network status.`);
      process.exitCode = 1;
      return;
    }
  }
}

testEnglishAndMixed();
