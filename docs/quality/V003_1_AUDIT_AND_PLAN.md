# Growth Studio V0.03.1 — EasyModerator BD Motion Promo MVP
## Phase 0: Independent Review, Audit, and Technical Plan

**Repository:** `mr3826/growth-studio`  
**Base Commit (Verified):** `c99cbe5d4b7fe865ac8fbdd9fb4428caa2bf181d`  
**Active Feature Branch:** `feat/growth-studio-v003-1-easymoderator-bd-motion-promo`  
**Storage Root:** `E:\GrowthStudio` (Verified, ~387 GB free)  
**Governance:** PUSH=NO, PR=NO, MERGE=NO  

---

## 1. Persona Audits & Challenges

### A. CTO Persona Review
*Challenge architectural complexity; protect stable components; guarantee reliability, performance, testability, and failure recovery.*

1. **Architecture Complexity Gate**: 
   - We strictly reject adding any new rendering engines (Remotion, WebCodecs in Node, cloud rendering SaaS) or heavy external databases (Redis, Postgres).
   - The existing Chromium frame generation + FFmpeg stdin pipe is deterministic, local, and already proven across 4:5, 9:16, and 16:9 at 25/30 FPS.
2. **Defect Analysis: Unsaved UI State Dropped**:
   - *Problem*: In `ExportStep.tsx` and `ExportModal.tsx`, clicking "Export" triggers `queueRender` without awaiting `saveProject`. The server reads `project.json` directly from disk. A user editing a title, scene copy, brand token, or narration script within 1.2s of export (the debounce window) will export the previous disk state.
   - *Fix*: `queueRender` will send the current in-memory project payload to the server (`POST /api/projects/:id/renders`), which synchronously validates schema and writes to disk before enqueueing.
3. **Defect Analysis: Server Restart Destroys Export History**:
   - *Problem*: `renderJobs` is an in-memory `Map()`. Restarting the server wipes out all job IDs; `/api/renders/:jobId` returns 404, `/api/renders/:jobId/file` fails, and the user cannot reopen or download their rendered videos.
   - *Fix*: Implement an on-disk manifest `storagePaths.exports/exports-manifest.json`. When a render finishes, write its metadata, duration, file size, target, and path to disk. On server boot, hydrate completed jobs from this manifest. Expose `GET /api/projects/:id/exports` and `GET /api/exports`.
4. **Defect Analysis: Blind Overwrites & Concurrency**:
   - *Problem*: Output files are named `${fileStem}-${targetId}.mp4`. Queueing multiple exports of the same target concurrently leads to FFmpeg file locks or corrupted output. Re-exporting also clobbers the previous output without history.
   - *Fix*: Prevent duplicate active jobs on the same project/target (return 409 conflict). Archive or timestamp previous exports in manifest.
5. **Defect Analysis: Incomplete Verification**:
   - *Problem*: Current validation uses `probeMedia` (ffprobe) to check width/height/codec, but does not verify full file decode. Truncated or corrupt frame streams can pass basic header probing.
   - *Fix*: Add full decode validation: `ffmpeg -v error -i <outputPath> -f null -` to verify 100% playable stream.

---

### B. BazarLens — Bangladesh Growth Auditor
*Evaluate content through Bangladesh merchant behavior, trust, relevance, and clarity.*

1. **Target Merchant Profile**:
   - Bangladeshi Facebook/Instagram F-commerce merchants and small online shop owners.
   - Common merchant friction points:
     - Inbox overload: 100-500+ daily repetitive queries ("price koto?", "delivery charge koto?", "available kina?").
     - Delayed replies leading to lost sales to competing pages.
     - Manual order taking from chat messages into spreadsheets or notebooks.
     - Cash-on-delivery (COD) coordination with couriers (Pathao, Steadfast, RedX).
2. **Truthful Factual Boundary**:
   - **Approved Claims**: EasyModerator automates Facebook Messenger DMs, handles instant FAQ replies, captures orders directly from conversation, and tracks delivery status.
   - **Prohibited Claims (BANNED)**: "100% sales guarantee", "Replace all human employees", "Zero return rate", "Save 40 hours every single week guaranteed", synthetic unverified customer reviews.
3. **Bangla-First Copy & Natural Tone**:
   - Natural conversational Bangla with familiar terms: "মেসেজ", "অর্ডার", "ফেসবুক শপ", "ডেলিভারি", "কাস্টমার".
   - Clear hook in first 3 seconds:
     - "মেসেজ সামলাতেই কি আপনার দিনের অর্ধেক সময় চলে যায়?"
     - "কাস্টমারের মেসেজের দ্রুত উত্তর দিন, সহজে অর্ডার কনফার্ম করুন EasyModerator দিয়ে।"
     - "মেসেজ থেকে সরাসরি অর্ডার আর ক্যাশ অন ডেলিভারি ট্র্যাকিং—সব এক জায়গায়।"
   - Single focused message per video.

---

### C. Creative Production Reviewer
*Visual hierarchy, motion pacing, composition, legibility, and sound synchronization.*

1. **Visual Language (Reference Alignment)**:
   - **Reference A (Connected-System Motion)**:
     - Midnight `#17223B` technological backdrop.
     - Connected cards and boxes showing progression: Message → Order → Courier → Delivery.
     - Subtle progressive lines (`stroke-dashoffset` animation).
     - Violet `#7460D9` and Sunlight `#F4C35E` restrained accents.
   - **Reference B (Bengali Motion Infographic)**:
     - Large, ultra-legible Bengali headlines (Hind Siliguri font).
     - One educational idea per scene (3.5s to 5.0s pacing).
     - Word/phrase highlight sweeps (Sunlight `#F4C35E` pill or underline).
     - Clean comparison cards: Before (manual inbox chaos) vs After (EasyModerator automated speed).
2. **Motion Primitives**:
   - Staggered headline reveal.
   - Card slide-up with subtle scale (0.95 -> 1.0).
   - Animated connector lines with directional arrow pulses.
   - Screenshot zoom/pan (subtle Ken Burns 1.0 -> 1.05 focus).
   - Brand CTA outro with button pulse.
3. **Audio Pacing & Sync**:
   - Narration script must fit scene duration comfortably without rushing.
   - Automatic music ducking (-14 dB to -18 dB under speech).
   - Intelligible Bangla voice (Gemini TTS `Puck` / `Charon` or local imported audio).

---

## 2. Major Improvement Matrix

| Feature / Area | Existing Implementation | Actual Limitation | Proposed Minimal Fix | User Benefit | Est. Complexity | Acceptance Test |
|---|---|---|---|---|---|---|
| **Export Save Sync** | Reads `project.json` on disk directly in `/api/projects/:id/renders` | In-flight unsaved UI changes omitted from export | Client passes project in render request; server validates & saves first | All latest edits guaranteed in MP4 | Low | Edit text, immediately export; verify new text appears in video |
| **Export History Persistence** | In-memory `renderJobs` Map | Server restart loses all export download links and history | File-backed `exports-manifest.json` loaded at server boot | Exports remain accessible across restarts | Medium | Render MP4, restart server process, query `/api/projects/:id/exports` and download |
| **Full MP4 Decode Verification** | ffprobe header probe only | Truncated/corrupt frame data can pass basic metadata check | Run `ffmpeg -v error -i <file> -f null -` | Guarantee 100% playable output file | Low | Probe corrupt video vs valid video; verify decode check catches corrupt |
| **Prevent Duplicate / Overwrites** | Unchecked concurrent render, static filename | Concurrent renders collide or overwrite silently | Active job lock per project/target + timestamped export history | No lost or corrupted exports | Medium | Trigger duplicate render; verify 409 and clean status |
| **5-Step Action-First UX** | 7-step nav with multiple separate modals | Friction and cognitive overload | Streamlined 5 steps: Project → Style → Content → Brand/Audio → Export | Fast, intuitive non-designer flow | Medium | E2E browser walkthrough completing project to export in 5 steps |
| **Connected-System Motion Primitives** | Static layout, simple opacity transitions | Missing visual momentum from reference videos | Add connected cards, SVG animated lines, highlight sweep, screenshot focus | Premium motion video quality | Medium | Frame-by-frame inspection showing active lines and card animations |
| **EasyModerator Brand System** | Provisional hardcoded colors in some templates | Inconsistent styling across templates | Authoritative Bold & Future-Facing tokens applied everywhere | Consistent, professional identity | Low | Verify `#17223B`, `#7460D9`, `#F4C35E`, SVG logo rendered accurately |
| **Bangla Text & Narration Audio** | Audio volume probe only | No check for missing voice when voice mode selected | Enforce non-silent audio track; automatic scene duration padding | Audible, perfectly synchronized voice | Low | Audio level test verifies mean volume > -30 dB and no silence |

---

## 3. Step-by-Step Implementation Plan

### Phase 1: Finish MP4 Export Workflow (P0)
1. **Server-Side Render Engine Hardening**:
   - Add `exports-manifest.json` persistence helper in `packages/contracts` or `apps/local-server`.
   - Update `buildServer()` in `apps/local-server/src/index.js` to hydrate `renderJobs` from disk.
   - Update `POST /api/projects/:id/renders` to accept `{ targetId, project }`, save project synchronously, and prevent duplicate active jobs.
   - Add `GET /api/projects/:id/exports` to list all completed exports.
   - Add full decode validation (`ffmpeg -v error -i <path> -f null -`) in `probeMedia` / `executeRenderJob`.
2. **Client-Side Export Hardening**:
   - In `ExportStep.tsx` and `ExportModal.tsx`, save project before queueing, pass project payload to API.
   - Display real output path, filename, size, and accurate progress states (`preparing`, `rendering`, `encoding`, `verifying`, `completed`, `failed`, `cancelled`).
   - Add Export History section with direct Play and Download buttons.
3. **Phase 1 Exit Gate**:
   - Render a real 20-35s EasyModerator video in 9:16 and 16:9.
   - Verify complete decode, audio presence, restart the server, verify persistent accessibility.

### Phase 2: Action-First UX Simplification (P1)
1. Consolidate WorkTree to 5 intuitive steps:
   - Step 1: Create Project / Select Template
   - Step 2: Choose Video Style (Motion Recipe)
   - Step 3: Write Content (Headlines, Bullets, Narration, CTA)
   - Step 4: Brand & Audio (EasyModerator tokens, Screenshots, Voiceover, Music)
   - Step 5: Preview & Export (Full Player, Preflight, Export Queue, History)
2. Retain advanced controls under clean collapsible drawers.

### Phase 3 & 4: Motion Design & Brand Primitives (P1)
1. Implement motion primitives in `packages/template-engine`:
   - Connected cards and SVG workflow lines (`stroke-dashoffset`).
   - Headline staggered reveal with highlight sweep.
   - Controlled screenshot focus / Ken Burns effect.
   - Outro CTA emphasis.
2. Deliver Treatment A (Problem → Solution) and Treatment B (Feature Explainer).
3. Apply authoritative EasyModerator design tokens and bundled SVG logo.

### Phase 5 & 6: Bangladesh Content & Audio Quality (P1)
1. Create authentic, fact-checked Bangladesh merchant templates and demo content.
2. Integrate voice preview, narration auto-fit duration, and music ducking.

### Phase 7 & 8: Production Verification & Three Export Videos
1. Produce Video A (Problem → Solution, 9:16, 1080x1920, ~30s).
2. Produce Video B (Landscape reflow, 16:9, 1920x1080, ~30s).
3. Produce Video C (Feature Explainer with screenshots, 9:16, ~25s).
4. Run full test suite, client build, and browser E2E.
5. Independent reviewer sign-offs (CTO, BazarLens, Creative Production).
