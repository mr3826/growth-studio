import fs from 'node:fs';
import path from 'node:path';
import { pcmToWav } from './test-pcm-wav.js';

async function testEnglishAndMixed() {
  const apiKey = process.env.CONTENT_STUDIO_GEMINI;
  const model = 'gemini-2.5-flash-preview-tts';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const prompts = [
    { id: 'en', text: 'Welcome to EasyModerator. Automate your customer conversations in seconds.' },
    { id: 'mixed', text: 'EasyModerator দিয়ে আপনার Facebook ও WhatsApp মেসেজ হ্যান্ডেল করুন effortlessly.' }
  ];

  for (const p of prompts) {
    console.log(`Generating ${p.id}: "${p.text}"...`);
    const payload = {
      contents: [{ parts: [{ text: p.text }] }],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Puck' }
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
      console.error(`Failed ${p.id}: HTTP ${res.status}`);
      continue;
    }

    const data = await res.json();
    const rawBase64 = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (rawBase64) {
      const pcm = Buffer.from(rawBase64, 'base64');
      const wav = pcmToWav(pcm, 24000, 1, 16);
      const outPath = `data/exports/test-tts-${p.id}-standard.wav`;
      fs.writeFileSync(outPath, wav);
      console.log(`✓ Saved ${p.id} audio: ${outPath} (${wav.length} bytes)`);
    }
  }
}

testEnglishAndMixed();
