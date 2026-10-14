import http from 'node:http';

async function discoverGeminiModels() {
  const apiKey = process.env.CONTENT_STUDIO_GEMINI;
  if (!apiKey) {
    console.log('CONTENT_STUDIO_GEMINI: NOT CONFIGURED');
    return;
  }
  console.log('CONTENT_STUDIO_GEMINI: CONFIGURED (length: ' + apiKey.length + ')');

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) {
      console.log(`Models discovery failed: HTTP ${res.status} ${res.statusText}`);
      const errText = await res.text();
      console.log('Error details:', errText.slice(0, 300));
      return;
    }
    const data = await res.json();
    const models = data.models || [];
    console.log(`Found ${models.length} total models.`);
    const ttsModels = models.filter(m => m.name.includes('tts') || (m.supportedGenerationMethods || []).includes('generateAudio') || (m.description || '').toLowerCase().includes('speech'));
    console.log('TTS/Audio relevant models:');
    for (const m of ttsModels) {
      console.log(` - ${m.name}: ${m.displayName || ''} (methods: ${(m.supportedGenerationMethods || []).join(', ')})`);
    }

    // Also check standard flash models
    const flashModels = models.filter(m => m.name.includes('flash'));
    console.log(`Found ${flashModels.length} Flash models:`);
    for (const m of flashModels.slice(0, 10)) {
      console.log(` - ${m.name}`);
    }
  } catch (err) {
    console.error('Discovery error:', err.message);
  }
}

discoverGeminiModels();
