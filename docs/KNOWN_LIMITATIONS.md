# Growth Studio V0.02 — Known Limitations, Architectural Scope & Operational Guardrails

This document provides an honest, transparent assessment of Growth Studio V0.02's technical capabilities, operational boundaries, and design decisions.

---

## 1. Scope Boundaries: V0.01 vs V0.02 vs Future Roadmap

| Feature Area | V0.01 Baseline | V0.02 Implementation (Current) | Future Scope (V0.03+) |
| :--- | :--- | :--- | :--- |
| **Audio Pipeline** | Single background track or fallback silent `anullsrc`. | **Multi-track audio pipeline**: per-scene voice narration, background music looping, sidechain ducking (-12 dB), and loudness normalization (-16 LUFS, -1.5 dBTP). Explicit `silent` mode supported. | Automated multi-speaker dialogue mixing and beat-synchronized motion transitions. |
| **Voice Narration** | Prerecorded local files only (`.wav`, `.mp3`, `.m4a`). | **Gemini TTS integration** (`gemini-2.5-flash-preview-tts`) with Bangla, English, and mixed language narration, 5 voice personas (`Puck`, `Charon`, `Kore`, `Fenrir`, `Aoede`), local audio caching, offline replay, and local file import. | Custom fine-tuned voice cloning and prosody pitch adjustments. |
| **Acoustic Quality Gates** | Codec presence check only (silent AAC passed). | **Acoustic volume detection** (`ffmpeg volumedetect` and `silencedetect`). Silent output triggers an export-blocking error unless project explicitly declares `silent` mode. | Interactive graphical waveform editor and spectral analyzer in browser. |
| **Brand Identity** | Reference cream/lime palette hardcoded in some templates. | **Reusable brand kits** with selectable **EasyModerator Bold & Future-Facing** preset (`#17223B`, `#7460D9`, `#F4C35E`, `#FFFFFF`), clean generic defaults, and zero cross-brand contamination. | Brand asset vectorizer and typography font file uploader. |
| **Templates** | 3 structural archetypes: `guided_product_story`, `bold_kinetic`, `app_showcase`. | Enhanced visual polish across all 3 archetypes: glowing highlight sweeps, device mockups, radar callout pins, and Commerce Signal motifs. | User-authored custom template builder DSL. |
| **Offline Architecture** | 100% offline rendering loop. | **Offline-first with selective online TTS**: all editing, preview, cached narration playback, and MP4 rendering operate 100% offline. Only explicit TTS generation accesses the Gemini API. | Multi-machine distributed render cluster. |
| **Storage Architecture** | Windows `E:\GrowthStudio` resolver (388+ GB headroom). | Full E: drive integration for projects, renders, TTS audio caches, keyframes, and exported MP4s. C: drive protected with 2.0 GB headroom gate. | Cloud project sync and object storage export. |

---

## 2. Gemini TTS Architectural Details & Limitations

1. **API Key Security (`CONTENT_STUDIO_GEMINI`)**:
   - The Gemini API key is read strictly from `process.env.CONTENT_STUDIO_GEMINI` inside the Fastify server (`apps/local-server`).
   - The key is **never** sent to the client, exposed in bundle builds, logged to console, written to project JSONs, or committed to Git.
   - Endpoint `GET /api/narration/provider-status` returns only boolean readiness and available voice personas.

2. **Audio Format & RIFF Header Construction**:
   - The Gemini Speech Generation API returns raw 16-bit linear PCM audio at 24,000 Hz (`audio/L16;codec=pcm;rate=24000`).
   - Standard browser audio elements and FFmpeg require a valid container. `packages/render-adapter/src/tts.js` automatically prepends a 44-byte standard RIFF WAV header (`WAVEfmt` PCM format 1, 1 channel, 24000 Hz sample rate, 48000 byte rate, 16 bits per sample).
   - Generated WAV files are permanently cached to disk (`E:\GrowthStudio\renders\tts_cache\` and project `assets/`), allowing complete offline editing and re-export without re-querying the API.

3. **Quota & Rate Limits**:
   - The Gemini API free tier enforces per-minute and per-day rate limits. If a 429 (Resource Exhausted) or 403 (Permission Denied) occurs, Growth Studio captures the error gracefully and displays actionable guidance without crashing.
   - If offline or unconfigured, the user can seamlessly import locally recorded `.wav` or `.mp3` files or render in explicit `silent` mode.

---

## 3. FFmpeg Multi-Track Filtergraph Requirements

1. **Stream Splitting with `asplit`**:
   - When using FFmpeg's `sidechaincompress` filter for music ducking, the voice stream cannot be fed simultaneously into both `sidechaincompress` (as the detector input) and `amix` (as the speech mix input) without splitting.
   - Growth Studio constructs an `asplit=2[vm_sc][vm_mix]` node in the filtergraph, routing `[vm_sc]` to the sidechain trigger and `[vm_mix]` to the main acoustic mix.

2. **Subprocess Stream Error Handling**:
   - Direct-pipe video rendering passes raw RGBA frames from Chromium into FFmpeg's `stdin`. Growth Studio registers `ffmpeg.stdin.on('error', ...)` handlers to prevent unhandled `EPIPE` / `write EOF` exceptions if FFmpeg closes the pipe upon encountering filter syntax errors.

---

## 4. Operational Best Practices

1. **Bangla & Multilingual Narration**:
   - Enter narration scripts per scene in standard Unicode UTF-8. For brand names with non-standard phonetic spellings, enter the Bengali phonetic approximation (e.g. `পে-স্মার্ট` for PaySmart).
2. **Audio Sync & Padding**:
   - Use the **Fit Scenes to Voice** button in the Audio Studio or Storyboard to ensure scene durations accommodate speech length plus a natural 0.8s - 1.0s breathing gap.
3. **Volume Ducking**:
   - Standard default background music volume is set to `0.22` with `12 dB` sidechain attenuation during active speech segments, ensuring clear vocal intelligibility.
