import fs from 'node:fs';
import path from 'node:path';

async function testTts() {
  const apiKey = process.env.CONTENT_STUDIO_GEMINI;
  if (!apiKey) {
    console.error('No API key in process.env.CONTENT_STUDIO_GEMINI');
    return;
  }

  const candidateModels = [
    'gemini-2.5-flash-preview-tts',
    'gemini-3.8-flash-tts',
    'gemini-3.1-flash-tts-preview'
  ];

  for (const model of candidateModels) {
    console.log(`\nTesting model: ${model}...`);
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const payload = {
        contents: [
          {
            parts: [
              {
                text: 'কাস্টমার মেসেজ সামলাতে হিমশিম খাচ্ছেন? সমাধান আছে।'
              }
            ]
          }
        ],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: 'Puck'
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

      console.log(`Status: HTTP ${res.status} ${res.statusText}`);
      if (!res.ok) {
        const err = await res.text();
        console.log(`Error body:`, err.slice(0, 300));
        continue;
      }

      const data = await res.json();
      const candidate = data.candidates?.[0];
      const part = candidate?.content?.parts?.[0];
      const inlineData = part?.inlineData;

      if (inlineData?.data) {
        const audioBuffer = Buffer.from(inlineData.data, 'base64');
        console.log(`✓ Audio received! MIME type: ${inlineData.mimeType}, Byte length: ${audioBuffer.length}`);
        const outDir = 'data/exports';
        fs.mkdirSync(outDir, { recursive: true });
        const outFile = path.join(outDir, `test-tts-bangla-${model.replace(/[^a-z0-9]/g, '_')}.wav`);
        fs.writeFileSync(outFile, audioBuffer);
        console.log(`Saved audio to ${outFile}`);
        return { success: true, model, outFile, bytes: audioBuffer.length, mimeType: inlineData.mimeType };
      } else {
        console.log('No inlineData found in response parts:', JSON.stringify(data).slice(0, 300));
      }
    } catch (err) {
      console.error(`Request exception for ${model}:`, err.message, 'Cause:', err.cause);
    }
  }
}

testTts().then(res => {
  console.log('\nFinal test result:', res);
});
