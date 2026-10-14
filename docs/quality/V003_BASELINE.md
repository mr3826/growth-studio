# Growth Studio V0.03 — Baseline Quality & Architecture Audit

**Date:** 2026-10-15  
**Active Work Branch:** `feat/growth-studio-v003-openai-creative-director`  
**Remote Baseline SHA:** `8ee7c19b099392a379f5a002414c3d4bbf079964` (`origin/main`)  
**Mission:** Transform Growth Studio into an AI-assisted, template-based promotional video generator for any software, mobile app, SaaS product, service, or brand using OpenAI Structured Outputs for creative direction, preserving Gemini TTS, deterministic Chromium + FFmpeg rendering, and offline cached operation.

---

## 1. Environment & Hardware Inventory

| Component | Detected Value | Status / Operational Note |
| :--- | :--- | :--- |
| **Operating System** | Windows 10/11 Enterprise (64-bit) | Local development workstation (pwsh shell) |
| **Node.js Runtime** | `v25.6.1` | Native local execution with ESM & npm workspaces |
| **FFmpeg** | `9.0-full_build-www.gyan.dev` | Audio filters: `volumedetect`, `silencedetect`, `sidechaincompress`, `amix`, `loudnorm` |
| **ffprobe** | Present in PATH | Codec, stream, bitrate, and duration verification |
| **Headless Chrome** | `155.0.8037.0` | `C:\Program Files\Google\Chrome\Application\chrome.exe` |
| **Storage: Drive C:** | **3.96 GB free** | **CRITICAL HEADROOM RESTRICTION** — Zero raw frames or heavy caches permitted on C:. |
| **Storage: Drive D:** | **151.95 GB free** | Code repository workspace: `D:\hexabyte_technologies\growth-studio` |
| **Storage: Drive E:** | **387.92 GB free** | **PRIMARY STORAGE TARGET** (`E:\GrowthStudio`): projects, renders, audio cache, exports |
| **OpenAI Creative Key** | `process.env.CONTENT_STUDIO_KEY` | **CONFIGURED & VALIDATED** — Key resolved server-side only; validated with OpenAI Models API (133 models available including `gpt-6-astra`, `gpt-4o`, `gpt-4o-mini`, `gpt-5.6-sol`, `gpt-5.6-luna`). Secrets strictly shielded from Git, frontend bundle, and logs. |
| **Gemini Narration Key**| `process.env.CONTENT_STUDIO_GEMINI` | **CONFIGURED & VALIDATED** — Verified HTTP 200 on Google GenAI API endpoint. |

---

## 2. Working Tree & Branch Verification

- Clean working tree verified at baseline with `git status --short`.
- Remote `main` at `8ee7c19b099392a379f5a002414c3d4bbf079964` matched local `main`.
- Local feature branch `feat/growth-studio-v003-openai-creative-director` created cleanly from up-to-date `main`.
- Absolute rule enforced: Local commits only. No push, no PR, no merge, no deployment without separate explicit authorization.

---

## 3. Baseline Automated Test Suite Execution Receipts

All 5 existing test suites passed with exit code 0 (`npm test`):

| Test Suite | File | Exit Code | Duration | Key Results Verified |
| :--- | :--- | :---: | :---: | :--- |
| **Audio Pipeline** | `tests/audio.test.js` | **0** | 10,848 ms | Provider status (5 voices), TTS preview WAV (104 KB), per-scene TTS generation (5.13s), volume detection (-19.6 dB), fit-scenes duration adjustment, and offline cache hit without API key. |
| **Browser Work-Tree UI** | `tests/browser.test.js` | **0** | 6,845 ms | Puppeteer headless navigation through all 7 work-tree stages, Bengali headline editing, storage badge display, and verification screenshot (`data/exports/growth-studio-ui-verified.png`). |
| **End-to-End Export Suite** | `tests/e2e.test.js` | **0** | 505,106 ms | Complete lifecycle test with 3 full MP4 renders: Portrait (1080×1920 @ 30 FPS), Landscape (1920×1080 @ 30 FPS), and Reference 4:5 (1080×1350 @ 25 FPS). All 8 criteria passed. |
| **Render Adapter** | `tests/render.test.js` | **0** | 12,233 ms | Direct-pipe MP4 frame compilation (1080×1920 @ 30 FPS, 45 frames), ffprobe stream verification, clean `AbortController` cancellation, and process tree termination (`taskkill /T /F`). |
| **Server & Negative Gates** | `tests/server.test.js` | **0** | 829 ms | Health & storage volume check, 3 template archetypes, 4 starters, project creation, 4:5 preview composition, 400 schema validation rejection, 404 non-existent project, 404 path traversal blocking, 404 cancel non-existent render. |

**Summary:** 5 passed, 0 failed, duration: ~535s.

---

## 4. Acoustic & Video Baseline Probing

Existing release deliverables on `E:\GrowthStudio\exports\` independently probed:

### 4.1 Narrated 16:9 Video (`test-c-easymoderator-16x9-story-ducked.mp4`)
- **Dimensions:** 1920×1080 (16:9)
- **Frame Rate:** 30 FPS
- **Duration:** 29.70 seconds
- **Video Codec:** `h264` (High Profile)
- **Audio Codec:** `aac` (LC, 96 kHz, mono)
- **Mean Volume:** **-16.5 dB** (Audible commercial range)
- **Max Volume:** **-1.5 dB** (No digital clipping)
- **Silence Check:** Zero silence intervals > 0.5s during active program; voice Ducking (-12 dB) working seamlessly.

### 4.2 Offline Re-export Video (`test-f-offline-reopen-reexport.mp4`)
- **Dimensions:** 1920×1080 (16:9)
- **Frame Rate:** 30 FPS
- **Duration:** 29.70 seconds
- **Video Codec:** `h264`
- **Audio Codec:** `aac`
- **Mean Volume:** **-16.5 dB**
- **Max Volume:** **-1.4 dB**
- **Audio Integrity:** Cached voiceover assets reused without external network access.

---

## 5. Design System & Brand Kit Audit

1. **EasyModerator Bold & Future-Facing Kit**:
   - Approved source: `Kinetic_Studio_Offline_Architecture_and_Input_Kit/easymoderator-promo-example.json` and `data/projects/easymoderator-launch/`
   - Primary: `#7460D9` (Vibrant Violet)
   - Background: `#17223B` (Midnight Dark)
   - Text: `#FFFFFF` (Crisp White)
   - Accent: `#F4C35E` (Sunlight Gold / Amber)
   - Typography: `Inter` (Latin), `Noto Sans Bengali` (Bangla)
   - Corner radius: `16px`
   - Assets: `assets/logo.png` (26.6 KB), `assets/inbox-demo.png` (48.2 KB), `assets/background-music.wav` (1.32 MB)
2. **Brand Isolation Principle**:
   - EasyModerator is a selectable saved preset, never a forced default.
   - Any brand (e.g. `AutoTasker`, `PaySmart`, `CloudPulse`, `FlowPay`, `দোকানবট`) can configure completely independent palettes, fonts, taglines, and assets.
   - Template selection must never overwrite a user's customized brand kit.

---

## 6. Phase Architecture Plan (Waves B through F)

- **Wave B — OpenAI Provider & Safety Architecture**:
  - Integrate official `openai` SDK server-side on Fastify.
  - Implement `CreativeProvider` interface with `OpenAiCreativeProvider`.
  - Enforce Responses API with strict JSON Schema Structured Outputs (`json_schema`).
  - Runtime model accessibility detection (defaults: `gpt-6.1-sol` / `gpt-6-luna` / `gpt-6-astra` with graceful fallback to account-supported models like `gpt-4o` / `gpt-4o-mini`).
  - `AiUsageRecorder` for token counts, estimated spend receipts, per-project budget caps ($1.00 default), and rate-limit/timeout handling.
  - Zero client-side key exposure.
- **Wave C — Creative Workflow & Product Truth**:
  - Implement Product Truth Profile (`verified_live`, `approved_demo`, `planned`, `unknown`) with evidence gating.
  - Creative brief schema & 3 distinct concept generation (angles: Problem→Solution, Outcome/Story, Product Proof).
  - Storyboard compiler: map structured concepts to supported templates (`bold_kinetic`, `guided_product_story`, `app_showcase`), allowed scene kinds, and existing motion presets.
  - Selective scene rewrite: regenerate selected scene without modifying locked/approved scenes.
  - Revision history and provenance tracking.
- **Wave D — Action-First Web Interface & Brand Polish**:
  - Enhance 7-stage work tree with explicit NEXT ACTION indicators, brief input, concept comparison cards, scene-by-scene approval toggles, and scene regeneration buttons.
  - Storyboard review suggestions with diff proposal.
  - Full keyboard accessibility and mobile/laptop responsiveness.
- **Wave E — Audio & Voice Synchronization**:
  - Connect user-approved narration scripts to existing Gemini TTS (`gemini-2.5-flash-preview-tts`) and offline local audio import.
  - Dynamic duration fitting with voiceover lead-in/tail padding.
  - Offline cache stability: re-rendering unchanged scenes never triggers TTS or AI calls.
- **Wave F — Real Video Matrix & Verification**:
  - Generate full video matrix A–F with `ffprobe`, `volumedetect`, and keyframe inspection.
  - Security audit: verify zero secrets in bundle, Git, logs, or exports.
  - Deliver final documented release acceptance report.
