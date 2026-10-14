# CODEX GOAL — Growth Studio V0.02: Audible, Brand-Accurate Product Videos

**Repository:** `mr3826/growth-studio`  
**Reference branch audited (GitHub, read-only):** `feat/growth-studio-v001-completion` @ `e92207fb6b6cd274c32a3bc67f82d5c7201a6bce`  
**Main branch at audit:** `e1e1ee4089f788ede3fbfd81c006b7c07f40b19a`  
**Status:** PROPOSED GOAL; not yet implemented.  
**Mission:** Repair the no-sound video output, add Gemini-powered Bangla/English narration as an optional preparation step, enforce EasyModerator's **Bold & Future-Facing** brand kit without breaking generic projects, and raise the visual/storytelling quality of the existing template-based renderer. Preserve a usable offline local workflow.

## Evidence and constraints: read before touching code

**The user's actual exported videos (private local reference, do not commit):**
- `dukanbot-story-8-landscape.mp4`: 1920×1080; 30 fps; 46.667 s; H.264 and AAC.
- `dukanbot-story-8-portrait.mp4`: 1080×1920; 30 fps; 46.667 s; H.264 and AAC.
- BOTH files have continuous silent audio; measured by `ffmpeg` volumedetect at approximately **−91 dB** mean/max and silencedetect from ~0 to ~46.65 seconds. AAC track existence is NOT proof of audible content.
- Actual portrait frame fills its native 1080×1920 canvas; apparent black sidebars in some montage thumbnails are review layout padding, not export defects.
- Visuals resemble a different cream/lime **DukanBot** reference aesthetic and NOT the current EasyModerator brand kit. Use them as defect references, not hardcoded product defaults.

**Source inspection:**
- `packages/contracts/src/index.js`: starter presets repeatedly initialize `audio.muteAll: true` and a DukanBot sample with lime highlights.
- `apps/local-server/src/index.js`: render job audio selection checks `!project.audio?.muteAll && project.audio?.musicAssetId`; no full separate narration track selection.
- `packages/render-adapter/src/index.js`: only one optional audio path and fallback `anullsrc`; true narration+music mixer not implemented.
- `apps/web/src/components/TemplateStep.tsx`: template selection may override brand colors with reference cream/lime values.
- Existing action-first UI, 3 template manifests, responsive exports, save/reopen, Windows E: storage resolver, and frame renderer are real work to PRESERVE and REGRESSION-TEST, not rewrite unnecessarily.
- `docs/RELEASE_EVIDENCE.md` claims acceptance PASS but does not demonstrate audible audio. Fix release criteria and evidence.
- GitHub branch above is ahead of `main`. DO NOT accidentally replace the latest work with stale `main`.

**Official Gemini references (verify at implementation):**
- https://ai.google.dev/gemini-api/docs/speech-generation
- https://ai.google.dev/gemini-api/docs/pricing
- `gemini-2.5-flash-preview-tts` currently documents an API free tier subject to limits, availability, and account eligibility. Bangla support is documented. The model may change: confirm against the available model list at runtime. Do not promise unlimited or permanently free generation.

## Operating principles / non-negotiables

1. **Growth Studio stays generic**: any SaaS/mobile app/product can define and save an independent brand kit. EasyModerator is a shipped, selectable *preset* and quality-validation sample, not the whole app's forced brand.
2. **Offline-first, selectively online**: after installation, all project loading, editing, playback of cached assets, mixing, preview and MP4 rendering work fully offline. Only explicitly invoked Gemini speech/script generation uses the network; import-recorded-voice alternative always works offline.
3. **No secrets in browser or Git**: read `CONTENT_STUDIO_GEMINI` from local server process environment only. Never echo/log/store its value, add it to the frontend bundle, or commit `.env` files. Do not overwrite it or ask the user to paste it into UI.
4. **User approves scripts and claims** before sending narration text to Gemini. Do not send screenshots, private customer data, or entire project without explicit opt-in. Gemini free tier may have different data-handling terms than paid tier: document clearly.
5. **Audio isn't optional in the successful audio-enabled test**: silence due to missing voice/music or failed synthesis must be a visible export-blocking error, not silently fall back to `anullsrc` while UI says "Narration added".
6. **Prove actual output**: real sound playback, decoded audio analysis, calibrated mix, waveform screenshots, and frame/video inspection required. No mock-success UI or source-only validation.
7. **No remote mutations unless authorized**: create a new local branch based on latest verified intended branch and commit locally after milestones; do not push, create PR, merge, deploy, or alter `main` without permission.

## Desired user journey (preserve action-first work tree)

`Create project → Select template → Write storyboard → Choose brand kit → Add/Generate voiceover → Add music/SFX → Tune scene-to-voice sync → Preview (video + audio) → Preflight → Render → Listen/watch → Export → Reopen`.

The main Studio UI should show the NEXT meaningful action and blocked/completed states, not scatter audio settings across unrelated tabs. **Audio & Narration** is a dedicated action inside/after Brand & Media with useful visible state, per-scene controls and global mix control. Advanced audio controls are progressively disclosed. A project that intentionally requests Silent Video is still valid, but its silent status must be visible in the UI and in its manifest.

## P0 — Wave A: establish baseline & repair silent exports

- [ ] Run `git status`, inspect exact local refs, compare feature branch vs `main`, and create a **new local work branch** off the most complete verified baseline.
- [ ] Inventory installed Node, FFmpeg/ffprobe, Chromium, audio codecs, and actual free C:/D:/E: capacity. Respect and preserve current `E:\GrowthStudio` configuration when valid. Never delete user assets or move large folders without permission.
- [ ] Run existing tests and render at least one current project. Repeat `ffprobe`, `volumedetect`, `silencedetect` on video outputs. Store a sanitized baseline report without keys or private media.
- [ ] Diagnose why default projects and DukanBot exports are silent. Make audio state explicit: `silent`, `imported_voice`, `generated_voice`, `music_only`, `voice_and_music`.
- [ ] Add a preflight warning for intentionally silent projects and an **error** when selected required narration/music is missing, unreadable, empty or silent.
- [ ] Replace magic "AAC present=audio passed" test assertions with measured audio content tests and manual listening evidence. Silent AAC `anullsrc` is valid only in explicit Silent Video mode.
- [ ] Ensure import of WAV, MP3 and M4A voice files is functional via local UI and server, with format validation and duration probing. Distinguish voiceover from music by metadata and selectable role, not filename guessing.
- [ ] Fix audio UX save/reopen: selected tracks and volume, placement and mute flags must persist, use safe local file references, and appear in Preview and Export.

**Wave A gate:** with a locally imported voice WAV, render a 10–20s test MP4 and demonstrate actual speech is audible at expected timeline placement and survives save/reopen.

## P0 — Wave B: optional Gemini TTS + narration workflow

- [ ] Implement `NarrationProvider` abstraction with `GeminiTtsProvider` plus `ImportedAudioProvider`, allowing future provider substitutions. No OpenAI requirement.
- [ ] Read `process.env.CONTENT_STUDIO_GEMINI` on the **Fastify server only**. Endpoint `GET /api/narration/provider-status` may return `configured: boolean`, provider, confirmed model and quota/error *class*, never a token fragment or raw provider response containing the key.
- [ ] Use maintained official `@google/genai` server SDK. Target a supported Flash TTS model **confirmed through model capability and quota discovery**; initial preferred candidate `gemini-2.5-flash-preview-tts` if accessible on the user's free tier. Don't treat content-only Flash models as speech synthesis.
- [ ] Only call Gemini after user clicks **Generate Voice**; offer a local-only import path and a text-only preview when disconnected.
- [ ] Inputs: language (`bn`, `en`, `mixed`), narration text per scene, preferred voice, speaking speed/pacing/style, emotion/instruction text, pause before/after, regeneration scope (one scene/all scenes), and pronunciation dictionary for brand names. Expose available options based on API-supported capabilities rather than inventing them.
- [ ] Bangla-first voice QA: test authentic Bangla copy, English product names, Bengali+English mixed phrases. Validate actual voice quality with listening, not only codec checks. Do not assume region/accent selection is supported; `bn-IN` may be API language code but Bangladeshi pronunciation still needs user listening approval.
- [ ] For long stories, generate **per-scene bounded chunks**, never one 10-minute monolithic request. Normalize audio, add user-controllable crossfade/gaps, keep stable scene IDs, and store local generated WAV files with provenance (`model`, timestamp, text/script hash, voice, duration, source) and no sensitive provider metadata.
- [ ] Always verify generated bytes as real playable audio. If API returns empty/invalid audio, rate-limit/403/429/timeout or quota exceeded: show actionable error with retry/backoff; retain previously generated clips; do NOT silently mark output complete or charge repeatedly through unbounded retries.
- [ ] UI allows listen to a scene before approval; regenerate ONLY affected scene and preserve approved clips for others. User must approve script before it goes to provider.
- [ ] Never require Gemini for ordinary offline editing/export. Cached narration and imported recordings remain fully functional if network later disappears.

**Wave B gate:** using `CONTENT_STUDIO_GEMINI` from the Windows process environment, successfully generate and locally save one Bangla clip and one English/mixed clip if provider/account access permits. Test 401/403/429/offline handling. If free tier or account cannot generate speech, mark Gemini integration **BLOCKED** rather than fake a result; imported narration must still pass.

## P0 — Wave C: real audio-mixing timeline

- [ ] Expand project contract/schema with **typed** `AudioClip` entries (`id`, `kind=voice|music|sfx`, `assetId`, `sceneId?`, `offsetMs`, `trimInMs`, `trimOutMs`, `volumeDb`, `fadeInMs`, `fadeOutMs`, `ducking`, `loop`, `enabled`). Include backward-compatible migration for V0.01 projects; preserve old metadata.
- [ ] Support global music bed, individual narration clips per scene, optional SFX on text hits/transitions, and silence mode.
- [ ] Use FFmpeg `atrim`, `adelay`, `afade`, `aloop`/safe repeats, `amix`, music ducking under voice, and loudness normalization. Ensure filter construction is deterministic, paths are escaped, and commands are parameterized arguments (not concatenated shell commands).
- [ ] Align per-scene narration audio with actual scene start time. Provide **Fit Scene to Voice** and explicit timeline offsets; prevent overlapping or truncated speech unless user overrides with a warning.
- [ ] Browser preview must play the same audio arrangement as final export (or clearly labeled accurate preview mix), including seek, pause/resume, and waveform/timeline markers. Avoid doubled playback while scrubbing.
- [ ] Normalize social-video audio to a reasonable listening target (starting target approx. −16 LUFS integrated, true peak ≤ −1 dBTP; allow documented exceptions) and detect clipping and prolonged unintended silence. Measure rather than rely on metadata.
- [ ] Add independent mute/solo/volume controls for voice/music/SFX. Export progress and cancellation must terminate audio subprocesses as well as video; respect E: temporary directories.
- [ ] If the user requests voice/music and measured output is silent or too low to hear, **FAIL** the export verification; keep error and reproduction notes.

**Wave C gate:** same video exported three ways: voice only; music only; narration + ducked music. All three verified with ffprobe, volumedetect/ebur128 or equivalent, and manual listening. Explicit Silent Video remains an intentional fourth valid mode.

## P1 — Wave D: brand-kit consistency and visual polish

- [ ] Search for the actual EasyModerator design-system document (`EasyModerator_Design_System_Bold_Future_Facing_v1.md`) and approved logo/fonts in the user-provided workspace. The brand design system, if available, **takes precedence** over any values in this handoff. If unavailable, use the supported provisional tokens below and clearly flag their provenance.
- [ ] Create `EasyModerator — Bold & Future-Facing` preset (NOT global app colors): provisional Midnight `#17223B`, primary Violet `#7460D9`, sunlight accent `#F4C35E`, White `#FFFFFF`; preserve approved logos and license-safe fonts; allow brand-specific dark/light variants.
- [ ] Remove automatic destructive palette changes when switching between templates. Template style is independent from brand kit; treat reference cream/lime as a **separate optional editorial look**, not an implicit default for EasyModerator.
- [ ] Introduce and test `BrandTokens` (palette, typography, logo clearspace/size, logo placement, shapes, backgrounds, motion personality, CTA treatment, contrast rules) consumed by all three templates.
- [ ] Avoid marketing-product confusion: every new generic project opens with generic content; only explicit "Use EasyModerator" selects approved brand/claim assets. DukanBot sample is clearly demarcated as sample and does not leak into other projects.
- [ ] Apply the 'Commerce Signal' message→reply→order→delivery-inspired motif only when the EasyModerator brand preset calls for it; never animate completed actions that the selected product cannot actually perform.
- [ ] Preserve source-reference capabilities: readable Bengali typography, chapter-based story, device mockups, callouts, highlighted words, camera paths and transitions. Give users per-template choices for background style and motion intensity without making every scene identical.
- [ ] Scene and layout audits at 16:9, 9:16, and 4:5; verify true canvas fill, safe zones, readable typography and visible meaningful UI details. Avoid mistaking letterboxed CONTACT SHEET thumbnails for defects in actual portrait MP4s.
- [ ] Provide explicit brand/style QA: sampled frames from beginning/middle/end of each target, visual parity between preview and export, consistent logo margins and fonts, no off-brand lime in EasyModerator preset.
- [ ] **Copy/claims guardrail:** detect quantitative promises (e.g., "10× sales") and unsupported guarantees; require explicit evidence/approval before final promotional export. Generic mockups must not claim to be real merchant data.

**Wave D gate:** one approved EasyModerator 30–60s story rendered as **16:9 and 9:16**, with audible, synchronized voice, brand tokens visibly correct, purposeful product demonstration, and zero unapproved claims; one separate generic-brand sample must show **different** branding without code changes.

## P1 — Wave E: quality, reliability, and truth-in-release checks

- [ ] Test negative scenarios: empty/corrupt uploads, damaged WAV, nonexistent asset paths, bad API key, exhausted quota, long scene, cancel during TTS, cancel during FFmpeg, import from unusual Windows paths, insufficient E: disk space, projects created under older schemas, offline reopening.
- [ ] Validate no key in frontend network responses, render logs, project JSON, user-facing screenshots, Git diffs, crash reports or zip exports; local server loopback binding and same-origin restrictions remain intact.
- [ ] Test a 45–60s multilingual narrated video, plus an optional long-form 10–12min rendering test with existing cached audio and E: storage if local hardware permits. Long form should stream audio/video rather than explode memory or disk usage.
- [ ] Validate the existing action-first 7-stage UI with browser E2E. The user can complete narration and export without hidden tab-hunting.
- [ ] Update docs/KNOWN_LIMITATIONS.md and docs/RELEASE_EVIDENCE.md. Remove claims of PASS based only on AAC codec presence; evidence must include acoustic measurements and listening checklist.
- [ ] Perform explicit independent architecture, frontend accessibility, render correctness, security and product-messaging review. Fix P0/P1 defects; classify all unresolved items with evidence.
- [ ] Preserve original exports and tests as regression fixtures where licensing permits. Store generated MP4s outside Git; commit only short safe test fixtures/hashes/metadata as needed. No access to secrets from GitHub.

## Mandatory actual output matrix

| Test | Output | Audio expected | Brand | Acceptance |
|---|---|---|---|---|
| A | 15s 16:9 H.264/AAC | Imported Bangla voice, audible | Neutral generic | Import/save/export PASS |
| B | 15s 9:16 H.264/AAC | Gemini-generated Bangla voice, audible when API permitted | Generic brand | TTS + cache PASS / genuine BLOCKED |
| C | 30–60s 16:9 H.264/AAC | Approved voice + low music, audible & ducked | EasyModerator Bold & Future-Facing | Visual + audio PASS |
| D | Same promo 9:16 H.264/AAC | Correctly aligned, audible | Same brand | Responsive / mix PASS |
| E | 20s 4:5 H.264/AAC | Explicit mute, *intentionally* silent | Different user-defined brand | Explicit Silent Video PASS |
| F | Reopen C while offline, change one caption, export again | Cached audio retained, still audible | EasyModerator | Offline regression PASS |

### Audio verification details

- `ffprobe`: audio stream+codecs+sample rate+duration, video stream+dimensions+fps.
- `ffmpeg -af volumedetect` and `silencedetect=noise=-55dB:d=0.5`: detect missing voice and unintended full-length silence. Keep baseline raw measurements for comparison.
- `ebur128` / `loudnorm` or equivalent: integrated LUFS and peaks where available.
- Listen to beginning, voice transitions, music ducking points and ending. Programmatic tests alone cannot judge Bangla pronunciation or music quality.
- Cross-check voice script against chosen scenes and exported frames. Assert every user-visible narrator scene has required clip or intentional silence declaration.

## Execution order and Git guardrails

1. **Read-only audit** code, active branch, local Windows machine, previous release evidence, reference videos and brand source of truth. Produce `docs/quality/Baseline.md`.
2. **Create local branch** `feat/growth-studio-v002-audio-brand-quality` from latest verified implementation branch (or an equivalent uniquely named local branch); preserve worktrees and dirty changes; never reset user work.
3. **Wave A** audio bugfix → live tested imported WAV render; commit.
4. **Wave B** optional Gemini provider integration + secret handling + per-scene audio caching → test; commit.
5. **Wave C** audio mixing and preview → quality gates; commit.
6. **Wave D** EasyModerator Brand Kit and cross-template polish → test; commit.
7. **Wave E** all E2E/media/security/negative tests, compare reference output, review, repair and final report; commit.
8. Do not push, create a pull request, merge, release or deploy without approval. Update scope if external limits block Gemini but keep V0.01 audio repair progressing.

**Skills to apply (read only relevant skill docs before coding):** https://github.com/Jeffallan/claude-skills — Spec Miner, Architecture Designer, TypeScript Pro, React Expert, API Designer, Test Master, Secure Code Guardian, Security Reviewer, Debugging Wizard, Code Reviewer, DevOps Engineer where packaging/offline install is involved. Do not vendor skills.

## Required final Codex report

```text
REPO=mr3826/growth-studio
BASE_SHA=<verified>
BRANCH=<local feature branch>
HEAD_SHA=<local commit>
STATUS=PASS | CONDITIONAL | BLOCKED
AUDIBLE_AUDIO=PASS | FAIL | BLOCKED
GEMINI_TTS=PASS | BLOCKED (reason)
CONTENT_STUDIO_GEMINI_PRESENT=YES | NO (never disclose value)
GEMINI_MODEL=<actually validated id>
IMPORT_NARRATION=PASS | FAIL
AUDIO_MIXING=PASS | FAIL
AUDIO_PREVIEW_PARITY=PASS | FAIL
EASYMODERATOR_BRAND=PASS | FAIL
GENERIC_BRAND_REUSABILITY=PASS | FAIL
OFFLINE_RENDER=PASS | FAIL
STORAGE_ROOT=<verified>
MP4_MATRIX=<file paths, dimensions, codecs, audio measurements>
TESTS=<actual commands and results>
BROWSER_E2E=<actual evidence>
MANUAL_LISTENING=<human-verified or NOT VERIFIED>
OPEN_BLOCKERS=<specific evidence>
PUSH=NO
PR=NO
MERGE=NO
```

**Do not declare PASS if exported audio is silent when voice/music is required, if brand is off-spec, if Gemini has been simulated instead of tested, or if voice/listening evidence is missing.** If Gemini cannot be accessed due to quota/free tier/model/account restrictions, report that component BLOCKED while validating all local imported-audio functionality independently.
