# CODEX GOAL — Growth Studio V0.01: Reference-Aligned Offline Product Video Studio

> **Use this as ONE execution instruction in Codex.** Save it in `docs/CODEX_GOAL_V0.01.md` in the cloned repository, or attach it to the Codex thread. This is a goal/specification, not a claim that the tasks have been implemented.
>
> **Repository (authoritative):** https://github.com/mr3826/growth-studio  
> **Remote `main` inspected:** `e1e1ee4089f788ede3fbfd81c006b7c07f40b19a` (2026-10-14).  
> **Other existing branch:** `feature/kinetic-studio-v0.01`, at the same SHA when inspected.  
> **Important:** inspect fresh refs and actual code before writing; the remote may have changed.

## GOAL / EXPECTED OUTCOME

As lead implementation engineer, complete **Growth Studio V0.01** as a **reliable, Windows-first, offline local web application** that creates *real, polished, template-based kinetic promotional videos* for **any product, app, SaaS business, service, startup or brand**.

A nontechnical user must be able to:

1. Start Growth Studio on their own Windows PC.
2. Click **Create video** (or reopen an existing project).
3. Choose among at least **three materially different working templates**, including a **reference-inspired Guided Product Story** composition.
4. Fill in a concise template-specific form; add brand, logo, screenshots and optional audio from local disk.
5. Follow a clearly visible **action-first work tree** to edit scenes and motion, preview and correct the video.
6. Export **genuinely rendered** H.264 MP4 in **9:16 / 1080×1920**, **16:9 / 1920×1080** (30 fps), and **4:5 / 1080×1350** (25 fps) for the reference-style format; verify each file and open it locally.
7. Close the app, start it again, reopen the project with its assets intact, edit and re-export **without internet**.
8. Configure data and large temporary render files to the **E: drive if E: is available and has sufficient free space**; do not fill C: unnecessarily.

**V0.01 PASS is not a UI mockup, example MP4, compile-only test, README claim, or automated test that bypasses the real browser/export workflow.** Complete the work; do not stop at planning. If an essential criterion is blocked, return CONDITIONAL/BLOCKED with evidence and remaining work; do not declare PASS.

## CRITICAL CREATIVE ACCEPTANCE: USER-SUPPLIED REFERENCE VIDEO

**NEW, HIGHER-PRIORITY CREATIVE REQUIREMENT:** Read the adjacent `Growth_Studio_Reference_Video_Analysis.md` and, if supplied on the local machine, inspect the private original `WhatsApp Video 2026-10-09 at 9.53.33 AM.mp4` **before designing the templates and UI**. The reference is a 641.45-second Bengali promotional product walkthrough with bright editorial background, near-black large type, lime-highlight accents, layered phone/dashboard UI animation and a continuous audio track (speech content has not been transcribed). Its source is **368×464 at 25 fps**, an approximately **4:5 aspect ratio**. It is **not** a 15-second typography-only montage.

**Goal = original videos of comparable *type and production grammar***, not a close copy of the competitor's brand or exact scenes. Users supply their own text, logos, screenshots, product clips and sound. Generic templates must handle both a mobile app and an unrelated SaaS product, without hardcoded brand names or unsupported software capabilities.

For V0.01 the reference-inspired **Guided Product Story / Problem→Solution** template is the **hero acceptance target**. Bold Kinetic and App Showcase remain necessary distinct templates. Quality must be assessed on **real finished frames/motion** and whether the form-driven storyboard can express the reference's layered text, UI screenshots, callouts and multiple chapters. Include the new reference analysis in the audit and tests. **Do not commit, redistribute or embed the uploaded video in source code.**

## 0. BASELINE: VERIFY AND PRESERVE WHAT EXISTS

The current remote repo is not empty. It already includes:

- `apps/web` — React/Vite UI; `App.tsx` currently uses separate editing tabs (`Quick Create`, `Brand & Palette`, `Scenes & Motion`, `Assets Manager`, `Audio & Music`, `Export Settings`).
- `apps/local-server` — Fastify API; server configured for loopback `127.0.0.1:4317`.
- `packages/contracts` — project schema, generic blank-project function **and an EasyModerator-specific preset**.
- `packages/template-engine` — a manifest registry and a single `templates/bold_kinetic` template, plus browser composition compiler.
- `packages/render-adapter` — Puppeteer/Chromium frame capture streamed into FFmpeg; `ffprobe` output probing.
- `tests/server.test.js`, `tests/render.test.js`, `tests/browser.test.js`, `tests/e2e.test.js` — test *source files*, not proof that they pass on the target PC.
- `Kinetic_Studio_Offline_Architecture_and_Input_Kit/` — the four original architecture/schema/example reference files.

Known implementation risks to verify and resolve rather than assume fixed:

- New-install `App.tsx` creates an **EasyModerator** sample when there are no projects; this must become a neutral, action-first starter experience.
- Server data paths are rooted at `repo/data`; renderer uses `os.tmpdir()` (often C:); neither meets configurable E:-drive storage behavior.
- `DELETE /api/renders/:jobId` changes the job status but does not clearly abort Chromium/FFmpeg; implement actual cancellation and cleanup.
- `fastifyCors` currently accepts `origin: true`; SSE emits `Access-Control-Allow-Origin: *`. Treat local loopback API exposure, cross-origin access, path safety and untrusted inputs as security issues to audit and harden.
- `GET /api/health` reports FFmpeg/ffprobe flags as true without actually probing executables.
- The `ui_demo` renderer still includes EasyModerator-specific mockup placeholder strings; remove product bias from core templates.
- The template registry lists manifests, but inspect whether templates actually execute distinct renderer implementations (currently only Bold Kinetic manifest was found).
- Tests reference EasyModerator examples, specific text and prior UI selectors; update tests to verify a generic workflow rather than merely passing after superficial changes.

**First actions:** `git status`, inspect branches/HEAD, clone/fetch, confirm actual scripts/dependencies, run baseline build/tests/render where possible, and record what passes/fails. Read the four original reference files under `Kinetic_Studio_Offline_Architecture_and_Input_Kit/` and align schema evolution rather than losing old data. Write `docs/BASELINE_AUDIT.md` with verified evidence and exact failures. Preserve the currently working renderer until the revised one has exported real MP4s.

## 1. GIT / SAFETY RULES

- Use the **existing** `mr3826/growth-studio` repository. **Do not create a second repo** or move this into EasyModerator's production monorepo.
- Never implement directly on `main`. Check the existing feature branch for unmerged work; create a new unique branch, e.g. `feat/growth-studio-v001-completion`, from the verified baseline, preserving any work that is genuinely needed.
- Save incremental local Git commits after each verified phase. Never destroy a user's uncommitted files, force-push, wipe history, delete unrelated files or overwrite media.
- Do not push, open a PR, merge, release or deploy without explicit user authorization. No external service should be contacted at runtime; one-time npm/package installation can use network when the user permits it.
- Do not commit project media, rendered MP4s, large caches, API keys, local user data, sample secrets, personal screenshots, or OS-specific absolute paths.
- Apply only relevant read-only skills from `https://github.com/Jeffallan/claude-skills`: `spec-miner`, `architecture-designer`, `typescript-pro`, `react-expert`, `api-designer`, `test-master`, `playwright-expert`, `secure-code-guardian`, `security-reviewer`, `code-reviewer`, plus Windows/DevOps guidance where applicable. Read their `SKILL.md` files; project facts take priority over generic advice.

## 2. DESIGN RULE: ACTION-FIRST WORK-TREE UI

**Replace the edit-tab-first information architecture with a task-guided workspace.** Make the next important merchant/creator action obvious. No vanity dashboard, metric widgets, administrative settings maze, or dead-end navigation.

### First screen: Project Home

Primary action: **`+ Create video`**. Secondary actions: `Open project`, `Continue editing`, `Browse templates`, `Recent exports`. Display saved projects with name, brand, template, format, last edit and next action. Empty state should invite creation; never automatically inject a branded sample.

### Creation/work tree (left pane)

```text
Growth Studio                               [Save] [Preview] [Export]

  1. Create / open project             [complete / active / blocked]
     ├─ Video purpose, project name, expected length
     └─ Brand or product name
  2. Choose template
     ├─ Bold Kinetic
     ├─ Guided Product Story (Problem → Solution)
     └─ App / Product Showcase
  3. Write your message
     ├─ Hook / headline
     ├─ Key message / benefits
     ├─ Guided storyboard / chapters
     ├─ Scenes
     │  ├─ 01 — Hook
     │  ├─ 02 — Problem / Feature
     │  ├─ 03 — Solution / Reveal
     │  └─ 04 — CTA
     └─ CTA text / link
  4. Set brand and media
     ├─ Brand colors / font / logo
     ├─ Local screenshots / images / UI recordings
     └─ Optional music / prerecorded voice / sound effects
  5. Customize scenes and motion
     ├─ Order / timing / transitions
     ├─ Word animation / emphasis / callout movement
     ├─ Align media beats to audio cues
     └─ 4:5 / portrait / landscape reflow
  6. Preview and validate
     ├─ Play / pause / scrub / frame seek
     ├─ Safe-area + text/asset warnings
     └─ Preflight / fix problems
  7. Export and finish
     ├─ Targets / filename / location
     ├─ Render progress / cancel / retry
     └─ Open file / open folder / export history
```

Every node is clickable and meaningful; show `complete`, `current`, `incomplete`, `blocked` states using text/icons as well as color. The central content shows the selected action and one primary next-step button. The **center preview remains visible** when useful; a **right property inspector** appears only while a scene, text, image or animation is selected. Keep scene order/timeline compact; do not create a professional nonlinear video editor in V0.01. Enable Back/Next/Save, autosave state, restore last location, unsaved warning, keyboard/focus accessibility and responsive layout at 1366px desktop and ~390px narrow viewport. Do not hide required controls behind impossible-to-discover inspector panels.

### Functional acceptance for action-first UX

- Start with a blank workspace; create project without ever seeing EasyModerator branding.
- Navigate tree nonlinearly, complete a step, return to a previous step and retain data.
- Click a validation error to jump directly to the relevant action/input.
- User can finish the happy path without hand-writing JSON or knowing the underlying renderer.
- Every exposed control updates canonical project data and the final rendered pixels/audio, not merely local React state.

## 3. DYNAMIC TEMPLATES: DATA, NOT COPIED SCREENS

**Minimum three templates with materially different visual behavior**:

1. **Bold Kinetic** — enhance existing text-first template: word stagger, highlights, typography movement, brand reveal and strong CTA.
2. **Guided Product Story (Problem → Solution)** — the **reference-inspired HERO template**: repeatable multi-chapter sequences comprising hook, problem/cost contrast, branded reveal, 1–N features, narrated screenshot/device demos, browser/dashboard spotlights, interludes, benefits and CTA. Supports 30–90s short edit **and >10-minute feature walkthrough**. Distinct bright editorial visual direction and rhythm from Bold Kinetic.
3. **App / Product Showcase** — uses one or more real imported screenshots in browser/phone frames with real pan/zoom/focus/callout motions, text overlays and CTA. No fabricated product screenshots as defaults; use neutral labeled demo artwork.

Each template must work in the two original output formats; the hero template must additionally work in the **4:5 reference format** with layout reflow and appropriate platform-safe margins. Do not call a changed brand color a new template. Each template must have preview, edit, save, re-open, export and tests. Do not add a fourth template until all three pass.

### Manifest-driven template contract

Implement a versioned manifest registry with fields such as: `id`, `version`, `name`, `category`, `description`, `thumbnail`, `defaultScenes`, `supportedSceneKinds`, `targetPresets`, `requiredAssets`, `requiredInputs`, `optionalInputs`, `motionPresets`, `layoutConstraints`, `fieldDefinitions` (`key`, `label`, `type`, `default`, `required`, `min/max`, `helper`, `options`, `visibility`, `bindingPath`), `validation`, `migration`. Compile only whitelisted template IDs. The UI generates template-specific forms, including conditional fields, from the manifest; adding a fourth template should not require rewriting the main app form. A template version is pinned in saved projects and migrations are explicit.

Provide preview/sample cards (local images or video loops); disable invalid templates with a specific explanation. Template switching should show a content-mapping preview and preserve compatible user data; do not silently delete existing scene assets.

## 4. INPUTS: QUICK CREATE + ADVANCED INSPECTOR

Single versioned, schema-validated project model and a field-to-render binding map. Split fields into:

**Quick Create (roughly 8–12 fields):** project/video name, template, product/brand name, target audience/purpose, main hook, core value/benefit, CTA label/link, video duration preset (short / walkthrough / long-form), desired aspect ratio(s) including 4:5, optional logo/screenshots, theme preset. Optional fields have useful defaults; template-specific required fields are clear.

**Advanced, per template / scene / export:**

- Project: id, version, product category, language (`en`, `bn`, `mixed`), target platforms, objective, audience, brand selection, project notes.
- Brand: name/tagline, logo placement, palette (background/primary/accent/text), font family/weight, typography scale, safe area, roundness, theme.
- Story: opening hook, problem, solution, product reveal, **repeatable chapters and storyboard beats**, feature walkthrough steps, proof/benefit lines, claims disclaimer, CTA label/link, scene order/type, word highlights, scene-level copy.
- Motion: enter/hold/exit, word/letter stagger, easing, timing, duration, transition, position, scale/opacity, highlight sweep, caption bar, UI focus rectangle, animated callout, camera pan/zoom and background; all supported by real render code. Preserve Bangla grapheme shaping when animating characters.
- Visuals: logos and screenshots/images, optional locally imported screen-recording clip, drag/drop/select, reference id, crop/contain/fill, focus area and sequence, device frame, zoom/pan, callout/annotation overlay and responsive layer positioning.
- Audio: optional local MP3/WAV **prerecorded narration**, music and effects, separate tracks/volume, fade, clip in/out, manual timecode/cue mapping per scene; playback preview and final audio must sync. **No offline automatic speech recognition required**; allow manual transcript/timecodes.
- Output: portrait/landscape/**4:5** target(s), dimensions/**25 or 30 fps**, H.264/AAC settings, quality preset, filename, output folder, run progress, completion/error metadata, recent renders.
- Asset compliance: license/source note for imported third-party material, fonts available locally, unsupported formats explicitly rejected.

**No dead controls.** If an effect isn't implemented, hide or disable it with an explanation; do not include decorative knobs that do not change exported pixels. Export and import projects using a portable project archive (JSON + copied asset files) as well as in-place saves. Migration for existing schema `1.0` and EasyModerator sample JSON must preserve legacy projects without imposing that branding on new projects.

## 4A. REFERENCE-STYLE STORYBOARD, LAYERS & QUALITY — MUST IMPLEMENT

Do not interpret the reference as simply a cream background and highlighted words. A working original, reference-inspired video requires **storytelling + cinematic scene grammar + rendered UI animations + aligned audio**. The user must be able to create these using forms, not custom code.

**A. Scene archetypes (configurable within the three templates):** `brand_open`, `kinetic_hook`, `pain_or_cost`, `chapter_title`, `screenshot_stack`, `device_demo`, `browser_focus`, `split_text_media`, `benefit_callout`, `metric_punchline`, `product_reveal`, `cta_outro`. Each archetype has a tested default composition and a defined set of user inputs and real motion controls. A long video should combine these archetypes in a repeated chapter/storyboard structure, without copy-pasting bespoke video code.

**B. Per-chapter inputs:** chapter title, purpose, planned duration, spoken script (optional), opening sentence, product-feature claim, named asset(s), scene count, scene sequence, transition style and CTA relevance. Chapters must be reorderable, duplicable and removable. Project can have many chapters and scenes; changing one chapter must not destroy other content.

**C. Per-scene object fields:** scene type, headline/subheadline/eyebrow, text highlight substrings, supporting caption, language/font choice, background/accent style, image/video asset ids, aspect-aware crop/focal point, device shell (`phone`, `browser`, `none`), transform keyframes (position/scale/opacity), annotation/callout text and target location, underline/highlight effect, enter/hold/exit timing, optional sound/audio cue, scene duration, transition and per-aspect layout overrides. Use simple visual forms and predefined motion recipes; do not build a universal Premiere timeline.

**D. Named motion recipes:** `word_stagger`, `line_reveal`, `highlight_sweep`, `number_punch`, `device_float_in`, `screen_focus_zoom`, `cursor_focus`, `callout_pop`, `horizontal_split`, `stack_spread`, `chapter_wipe`, `cta_build`. Expose only implemented recipes; support intensity/duration/easing and preview parity. Preserve Bengali conjunct glyphs: animate words or grapheme-safe clusters; do not split raw UTF-16 code units.

**E. Editorial style presets:** an original `Light Editorial / Lime Accent` style is required, inspired by the reference's warm off-white, near-black text, energetic lime emphasis, subtle texture, small line and shadow motifs. Support brand override. Do not hardcode a competitor logo, colors or exact script in the template. Other existing styles remain available.

**F. Format and duration:** implement a genuine **4:5 (1080×1350) / 25-fps** target for this video style, in addition to current 9:16 and 16:9 / 30-fps targets. Eliminate the present hard 120s preflight limit. Support a configurable long-form range sufficient for **at least 12 minutes (720 seconds)** when hardware capacity/preflight permit. Do not silently constrain projects to 30 seconds. Compute projected frame count, memory/disk/render estimate, audio duration requirements and safe cancellation before proceeding. Streaming/chunked processing preferred over storing thousands of PNGs. Test long-form restart/cancel behavior.

**G. Preview UX:** show storyboard thumbnails and chapter tree; selecting a scene reveals its data and motion recipe while keeping a seekable preview. Add `play current scene`, `play chapter`, full preview and exact seek. For imported narration, allow playback and manually entered cue/timecode markers. Supply thumbnail, device mockup and callout alignment controls as accessible actions, without requiring code or advanced keyframe expertise.

**H. Input completeness:** the selected template must explain missing inputs (e.g. screenshot required for UI demonstration, narration omitted, logo optional), show a progress/requirements checklist, and provide sensible original generic defaults. Provide a `New Blank App`, `New Blank SaaS`, and `Import an Existing Project` route; no product-specific defaults on first run.

**I. Render-quality rubric:** independent review of exported reference-style samples must score (1) scene hierarchy, (2) type readability, (3) Bengali font/rendering correctness, (4) purposeful motion, (5) screenshot legibility, (6) aspect reflow, (7) audio cue sync where provided, (8) consistency, (9) CTA clarity, (10) template independence. Score each criterion 0 (fail), 1 (revise), 2 (pass), aiming for >=17/20 overall and **zero critical failures** in text readability, Bengali shaping, source correctness or aspect fit. Use screenshot/timecode observations with explicit PASS/REVISE/BLOCKED evidence, not ungrounded approval alone. Check beginning, interludes, and ending, not only first/last frames.

**J. Mandatory showcase outputs:**
- A **45–90 second** original product story with *at least 8 visual scenes*, **at least 2 chapter types**, **at least 2 actual user-imported screenshots**, phone and browser mockups, animated highlighted Bangla text, a camera zoom/focus, an interlude, branded CTA, and prerecorded audio or clearly annotated missing-audio behavior. Export at **4:5 / 1080×1350 / 25 fps** and compare its visual grammar to the reference.
- A **reference-length stress demonstration at least 10 minutes 42 seconds** in the same target, using multiple chapters/scene repetitions with *meaningful, non-identical content*, not a static loop or freeze frame. Run `ffprobe`, inspect distributed frame samples and validate sound if audio was supplied. Record render time, peak/temp disk use, E:-drive behavior and cancellation/restart results. If the available machine cannot complete this, do not claim long-form parity or overall PASS; provide specific hardware/resource evidence and a viable remediation plan.

### Scope distinction

These are **rendering/authoring capabilities**, not permission to copy the reference material. Preserve three usable templates: `Bold Kinetic`, `Guided Product Story / Problem→Solution`, `App/Product Showcase`. Use the reference-inspired example as the V0.01 visual benchmark **without** adding unbounded new templates, visual effects marketplaces, AI/TTS or cloud dependencies.

## 5. DISK / OFFLINE / WINDOWS-FIRST STORAGE — PREFER E: WHEN NEEDED

**Before heavy installation or rendering**, run a read-only storage preflight on the actual Windows machine:

- Inspect filesystem type, free/available bytes and write permission for current code location, `%LOCALAPPDATA%`, OS temp directory, `C:\` and `E:\` (only if E: exists).
- Estimate source+dependencies+browser/FFmpeg provisioning, imported media, output MP4s, **720-second/25-fps long-form temp/encoder workspace**, in-flight temporary files and safety reserve. Display the estimate and location choices. Do **not** invent actual free-space numbers.
- When `E:` is present, writable, and has sufficient available capacity, **prefer E: for heavy project assets, render cache/temp and exports**; store small configuration on C: only if reasonable. If the source workspace itself is too large for C:, recommend or migrate it to E: **only after safe copy, path verification and user consent**.
- Suggested configurable layout:

```text
E:\GrowthStudio\
  projects\<projectId>\project.json
  projects\<projectId>\assets\...
  renders\<jobId>\...      (temporary; cleaned after job)
  exports\...
  cache\...
  logs\...

%LOCALAPPDATA%\GrowthStudio\config.json  (small settings only)
```

- Introduce a **central storage-path resolver** controlled by user configuration (`GROWTH_STUDIO_DATA_DIR` or persisted settings), not hardcoded repo-relative paths. Resolve imported media, previews, projects, audio, jobs and export destinations through that one service.
- **Explicitly pass the selected render temp directory** to the rendering worker; `os.tmpdir()` / default C: temp is not acceptable once E: is selected. If dependency caches are huge, support documented provisioning to E:, without forcing the OS global TEMP setting.
- Before each render, check writable directory and estimated output/temp free space with conservative reserve (for example keep at least 5 GiB free where feasible and at least 2× predicted working space; allow documented machine-specific calibration). Fail preflight with a clear explanation instead of exhausting a disk.
- Support spaces, Unicode filenames, Windows separators, cross-drive paths, case-insensitive collisions, a temporarily missing E: drive, access-denied errors and filename uniqueness. Do not automatically erase or migrate existing user files. Move existing assets only through safe copy → checksum/verify → switch configuration → optional cleanup with consent.
- Temp cleanup on completion, failure, cancellation and restart recovery. Exports are never deleted during cleanup; cleanup operations are limited to owned render-temp paths and have dry-run/safety checks.
- Offline after initial installation: no CDN, remote fonts, network image links, telemetry/update calls, AI APIs or cloud storage on normal launch / preview / render / save. Confirm in a disconnected network test.

## 6. LOCAL BACKEND / RENDER SYSTEM

Preserve the existing React/Fastify structure and one reliable deterministic renderer. **Do not require HyperFrames purely for technology alignment** if the present Chromium+FFmpeg composition already meets functional and frame-accurate needs. Evaluate HyperFrames as an adapter only if it removes demonstrable limitations and can operate offline; record the choice in an ADR. Avoid a second parallel render engine.

**Required backend work:**

- Harden project and asset CRUD, template manifest APIs, scene updates, preflight and export jobs; derive work-tree step statuses from validated project data.
- Store projects via atomic writes, recoverable backups/snapshots, stable ids and versioned migrations. Avoid autosave races and overlapping requests corrupting projects. Ensure imported project identity matches the path/id written on disk.
- Use typed shared contracts or generated types where feasible; strict validation at API boundaries. Reject unknown template/motion choices rather than silently falling back to another render target.
- Implement an explicit job state machine: `queued → validating → rendering → verifying → completed`; supported terminal states `failed`, `cancelled`. One render at a time by default on local machine. Persist enough metadata to show finished exports and to mark interrupted jobs correctly on restart.
- Implement **real cancel**: cancellation signal must stop frame generation, terminate FFmpeg/Chromium child process trees as needed on Windows, close pipes/browser, release files and remove temporary files; `cancelled` must never later become `completed`.
- Preflight must check schema, template, asset references, target support (including **4:5**), font availability, **duration up to at least 720s when resources permit**, output permissions, executable availability, and disk capacity. Health endpoints must actually execute lightweight Chrome/FFmpeg/ffprobe discovery, not report fixed `true` flags.
- Browser preview and MP4 must use the same composition/timeline logic. Scrubbing, pauses, stagger, fades and screen geometry must correspond to exported frames. Asset URLs must resolve correctly from both the local preview origin and render environment.
- Verify final output with `ffprobe` (codec, dimensions, fps, nonzero frames, expected duration, actual audio if selected), plus extracted keyframe inspection to catch black/blank scenes, clipping and wrong logos. Filename collision policy must default to safe unique names, not silent overwrite.
- Progress displayed in UI with cancel/retry/open-folder and error detail; no fake success state. Write user-readable local diagnostics (without personal media contents).

## 7. SECURITY / PRIVACY / LICENSE

Treat the offline browser process as an exposed API surface, not as fully trusted merely because it is on the user's PC:

- Bind to `127.0.0.1`, deny unnecessary cross-origin requests (no wildcard CORS), and protect state-changing endpoints against malicious web pages and DNS-rebinding/Host abuse with appropriate Origin/Host checks and local session secret or equivalent.
- Validate route ids, filenames, extensions, MIME signatures and asset content; constrain all paths to the configured data root using canonical path containment checks, considering Windows path tricks and symlinks. Block traversal, absolute path references in project JSON, `file://` leaks to arbitrary disk locations and unsafe executable uploads.
- Escape user-provided text in composed HTML and attributes. Never evaluate manifest/user JSON as JavaScript or allow remote page navigation in the render browser.
- Do not use `--no-sandbox` outside environments where it is strictly needed and justified. Disable outbound browser requests in offline mode; use local resource allowlist.
- Limit media sizes, project JSON size, duration/fps/resolution and render concurrency. Verify FFmpeg/Chromium invocation is via argument arrays without user-controlled shell interpolation.
- Preserve user's file privacy; no login required for loopback-only single-user usage. Verify third-party template, font, image and music license compatibility, documenting bundled licenses.
- Add explicit negative/security tests for the above.

## 8. IMPLEMENTATION PHASES / TO-DO CHECKLIST

Execute in order. Commit and test after each functioning increment. Update `docs/WORK_LOG.md` with proof and pending defects; do not stop after a phase plan.

### Phase A — Inspect, test, decide (baseline gate)

- [ ] Clone/fetch repo, check refs/status and start a unique feature branch.
- [ ] Read four specification files, **reference-video analysis and local original video if available**, and inspect actual code, dependency lockfile and entry points.
- [ ] Run install, typecheck/build, API tests, browser tests, preflight and sample portrait/landscape renders; record stdout/stderr, platform, OS and SHA.
- [ ] Create `docs/BASELINE_AUDIT.md` and architecture decisions for renderer, storage location, template registry and project compatibility.
- [ ] Check Windows C:/E: space, Chrome/Edge, Node, FFmpeg, ffprobe, local fonts; pick storage path conditionally.

### Phase B — Make installation and local runtime dependable

- [ ] Fix `npm install` / lockfile consistency, import paths, startup entry point, frontend builds, dependencies and dev/prod scripts.
- [ ] Add Windows-friendly start and diagnostic commands (`.cmd`/PowerShell if useful); browser opens local URL.
- [ ] Implement central storage resolver, project migration and large temp/assets/exports placement on E: when appropriate.
- [ ] Remove product-specific first-run flow; verify a blank project persists and reloads.
- [ ] Eliminate any runtime network dependency (after allowed initial provisioning).

### Phase C — Action-first UI and state integrity

- [ ] Implement project home with Create / Open / Continue / Browse Templates / Exports.
- [ ] Implement guided clickable work-tree, statuses, Back/Next, progress and context-sensitive inspector.
- [ ] Implement autosave + explicit Save + conflict/error handling; preserve work after restart.
- [ ] Implement validation-to-field navigation, template gallery, responsive preview and accessible keyboard controls.
- [ ] Cover UI with browser E2E tests at desktop and narrow widths.

### Phase D — Dynamic input/schema/template engine

- [ ] Pin/manifests, dynamic conditional field form, defaults, validation, template-switch mapping, version migration.
- [ ] Preserve legacy JSON imports; remove EasyModerator-specific defaults/placeholders from core.
- [ ] Complete **Bold Kinetic** with actual working controls and both aspect ratios.
- [ ] Complete **Guided Product Story / Problem → Solution** as the reference-inspired hero composition; implement chapter storyboards, 4:5, long-form and 12 named scene archetypes.
- [ ] Complete **App / Product Showcase** with imported screenshots, device framing and actual focus/zoom behavior.
- [ ] Add neutral branded sample project for two different product categories, e.g. SaaS dashboard and mobile app, plus one original reference-style **45–90s Bangla demo storyboard**.
- [ ] For every template, verify selected field changes pixels at planned frames and survive save/reopen/export.

### Phase E — Asset/audio and consistent preview

- [ ] Import, validate, list, preview, replace, remove and persist images, logo and local MP3/WAV.
- [ ] Fix preview/render media-path parity. Ensure real image composition and no broken screenshots.
- [ ] Add music playback, export audio mix and volume/fade controls only where properly supported.
- [ ] Verify English/Bangla glyph coverage, conjunct shaping, word highlights and wrapping with locally installed/bundled permitted fonts.
- [ ] Validate clipping, safe area, baseline audio and scene timing for portrait + landscape + 4:5; verify narration playback, cue placements, long-form timeline and export.

### Phase F — Production-worthy render job behavior

- [ ] Validate queue states, SSE/progress/error UI and output metadata.
- [ ] Implement true abort/cancel/retry and child-process cleanup on Windows.
- [ ] Support storage preflight (E: preferred when appropriate), disk-full failure, missing drive, filename collision and recovery after interrupted render.
- [ ] Encode and verify 1080×1920 / 1920×1080 MP4 at 30 fps and 1080×1350 MP4 at 25 fps, H.264; AAC when audio is present. Support 720s+ gated by disk/compute.
- [ ] Support configurable export folder, open folder, per-job output naming and local export history.

### Phase G — Security / code quality / negative cases

- [ ] Audit Origin/Host/CORS, path containment, MIME+size limits, HTML escaping, subprocess parameters, file permissions and browser network isolation.
- [ ] Add negative tests for traversal, malicious JSON/HTML, unsupported media, missing paths/fonts, corrupted projects, concurrent saves, job cancellation, insufficient disk and process restart.
- [ ] Perform independent code review and fix all critical/high-risk findings; document accepted residual low risks.

### Phase H — Offline and release verification

- [ ] Test normal launch, create, preview, import, save, reopen and export with network physically disconnected or blocked (not merely dev tools Offline toggled while app depends on internet).
- [ ] Run the complete hands-on UI workflow on **Windows**, using a fresh installation and a fresh project without developer fixtures.
- [ ] Render each of 3 templates to **both** portrait and landscape (**6 verified MP4s**), then **two additional 4:5 hero-template videos** (45–90s showcase and >=10m42s stress walkthrough): **8 verified MP4s** total. Include imported screenshots, Bengali highlighted text and an audio-supported case.
- [ ] `ffprobe` every output; inspect representative beginning/middle/end frames **plus time-distributed samples in the long-form export**, compare to browser preview and score the ten-item reference-style quality rubric. Confirm no blank scenes/clipped CTA or mismatched brand.
- [ ] Confirm E: storage (if available), temp cleanup, reopen after restart, failure and cancellation recovery.
- [ ] Run `npm run build`, type checks, unit/API/browser/E2E/security tests and review; record results and independent reviewer findings.
- [ ] Write `README.md` (accurate Windows setup, offline provisioning, start/export, troubleshooting), `docs/RELEASE_EVIDENCE.md` and `docs/KNOWN_LIMITATIONS.md`. Local evidence files should stay out of Git if large/sensitive.

## 9. ACCEPTANCE MATRIX (HARD GO/NO-GO)

| Gate | Required proof |
| --- | --- |
| A. Generic product | First-run blank project; two unrelated fake brands; no hardcoded EasyModerator strings in core UI/renderer |
| B. Templates | 3 distinct real compositions with manifest-controlled fields; hero Guided Product Story supports chapter/storyboard + screenshot/callout motion |
| C. Guided UX | Create → choose → content → brand/assets → motion → preview → export task-tree workflow usable with mouse/keyboard |
| D. Data integrity | Save, restart, reopen, import/export project archive, legacy JSON compatibility, assets present |
| E. Preview parity | At defined frame indices, preview matches exported layout/motion within documented tolerance |
| F. Export | **8 actual MP4s**: six at portrait/landscape 30 fps plus two 4:5 reference-style outputs at 25 fps (short and >=10m42s); ffprobe and quality-inspection evidence, audio verified on an audio case |
| G. Windows/storage | Cold-start Windows test; storage path chosen on actual machine; E: used for heavy files when available/suitable; no unbounded C: temp use |
| H. Job recovery | Cancel actually terminates work; retry succeeds; no orphan processes or leaked temp; interrupted job is not misreported done |
| I. Offline | No runtime network calls during launch/create/edit/preview/save/render/export after initial provisioning |
| J. Security | Path/origin validation tests; no critical/high security findings |
| K. Quality | Builds/tests pass, browser walkthrough proves nonmock functionality, **reference-style visual rubric passes**, and Bengali typography remains readable |

No PASS unless **every gate is proven**. If no E: drive exists on the test runner, report `E_DRIVE_NOT_AVAILABLE` and validate a configurable alternative large-volume path; do not claim E:-specific proof. If Windows hardware is unavailable, mark the Windows gate unverified and final status CONDITIONAL.

## 10. REQUIRED FINAL REPORT (MACHINE-READABLE + PLAIN ENGLISH)

Return a summary explaining what a nontechnical user can now do, then:

```text
REPOSITORY=mr3826/growth-studio
BASE_SHA=<observed remote baseline SHA>
BRANCH=<feature branch>
HEAD_SHA=<commit SHA>
WORKTREE_CLEAN=<YES/NO>
LOCAL_STORAGE_ROOT=<actual checked path>
E_DRIVE_AVAILABLE=<YES/NO/UNVERIFIED>
E_DRIVE_USED=<YES/NO/NOT_APPLICABLE>
FREE_SPACE_PRECHECK=<actual free/needed numbers or UNVERIFIED>
OFFLINE_RUNTIME=<PASS/FAIL/UNVERIFIED>
WINDOWS_E2E=<PASS/FAIL/UNVERIFIED>
GENERIC_FIRST_RUN=<PASS/FAIL>
ACTION_TREE_UX=<PASS/FAIL>
TEMPLATES_IMPLEMENTED=<names>
TEMPLATE_FORMAT_EXPORTS=<count passing of 8>
REFERENCE_STYLE_SHORT_4x5=<PASS/FAIL + file path>
REFERENCE_LENGTH_10M42_4x5=<PASS/FAIL/UNVERIFIED + file path, render time, peak disk>
BANGLA_TYPOGRAPHY=<PASS/FAIL/UNVERIFIED>
EDITORIAL_MOTION_RUBRIC=<PASS/REVISE/UNVERIFIED + evidence>
REAL_MP4_PROOF=<file paths + ffprobe summary>
AUDIO_IMPORT_EXPORT=<PASS/FAIL>
SAVE_REOPEN_ARCHIVE=<PASS/FAIL>
CANCEL_RETRY_RECOVERY=<PASS/FAIL>
SECURITY_REVIEW=<PASS/FAIL + findings>
BUILD_TESTS=<summary of commands and actual results>
KNOWN_BLOCKERS=<explicit>
PUSHED=<NO unless separately authorized>
PR=<NONE unless separately authorized>
FINAL_STATUS=<PASS/CONDITIONAL/BLOCKED>
```

Attach/link small screenshots or logs as appropriate; keep large MP4s on the local user's machine and show exact export locations. Explain startup command(s), user journey and any required one-time provisioning. **Never claim a feature works solely because its component or test file exists.**

## 11. SCOPE CONTROL

Do not add OpenAI/Gemini integrations, paid services, user accounts, remote repositories for media, cloud rendering, online publishing, AI asset creation, template marketplaces, subscriptions, complex cloud job queues, Docker as runtime requirement, unrelated brand redesigns, or six unfinished templates. Prefer completing and polishing the existing stack to introducing new dependencies. When a user-facing capability conflicts with verified core correctness, prioritize actual video creation and reliable export first.

**START IMPLEMENTING NOW: reference analysis → baseline audit → safe branch → build hero Guided Product Story and two complementary templates → real Windows/offline 4:5 / 9:16 / 16:9 renders → independent visual and functional verification.**
