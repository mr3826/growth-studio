# EasyModerator Kinetic Studio — Offline Local Web App

**Version:** Architecture and Input Contract v1.0  
**Purpose:** A local, completely offline, template-driven application that transforms a structured user brief, text, assets, and precise animation preferences into downloadable promotional MP4 videos.  
**Status:** Proposed implementation specification, not implemented software.

## 1. Product boundary and intended experience

**Primary UX:** Select template → fill the guided input form → import assets → preview → refine scene properties → export MP4 and save project. A person who cannot write code should be able to produce a complete kinetic promo. The computer may need internet to install the software and bundled dependencies once; video creation must not need internet afterward.

**V1 must:**
- Start as a single local web application, with a local server bound to `127.0.0.1` only.
- Bundle or pre-install every runtime dependency (Node, renderer, headless Chromium, FFmpeg, fonts, CSS, JS, and templates). No runtime CDN/network/API.
- Offer six finite, tested kinetic promotional templates, each with readable input definitions and variants.
- Provide a small Quick Create view and optional Advanced per-scene controls.
- Generate deterministic, seekable previews and local MP4s in 16:9 and 9:16, optionally square.
- Import logo/images/screenshots, optional music/voiceover, and save local projects/outputs.
- Preserve draft changes, show useful preflight errors, and support cancel/retry.
- Require zero online accounts and zero model API keys.

**V1 must not:** build a full nonlinear video editor, use cloud jobs, integrate production EasyModerator APIs, scrape a login-protected dashboard, generate new footage from prompts, synthesize speech through a remote API, or silently invent product claims.

**Important distinction:** Prompts/script notes can be stored as text, but offline generation is **template execution**, not AI interpretation. OpenAI can be an explicitly opt-in future extension that is disabled without internet; never make API calls on the default offline path.

## 2. Technology and justification

| Layer | Implementation | Constraints |
|---|---|---|
| Frontend | React, Vite, TypeScript | Static files served locally; no Next.js server needed |
| Component UI | Lightweight in-house components/CSS or locally installed UI kit | Forms, sidebar, timeline, asset picker |
| State/validation | React Hook Form and Zod, or equally simple typed forms | Same canonical contract used by UI and server |
| Backend | Node.js and Fastify | Loopback bind only; no login; manages files/render processes |
| Video engine | HyperFrames CLI / producer adapter | Offline Chrome/FFmpeg rendering, seekable HTML/GSAP compositions |
| Animations | CSS and GSAP with seekable timelines | Absolutely no `setTimeout()` / wall-clock-dependent visuals |
| Storage | Project JSON + relative asset paths + local export directory | No database for V1 |
| Files | Local import staging and atomic rename | Hash imported files; reject escaping paths |
| Optional logs | Append-only job events per project | Don't collect telemetry |

### Why HyperFrames

The HyperFrames open-source repository documents local HTML/CSS animation rendering and an Apache 2.0 license. Its CLI includes `preview`, `check`, and `render`; its composition system supports typed variable definitions and per-instance values. Its rendering engine seeks exact frames through headless Chromium and encodes with FFmpeg. This maps well to fields → validated variables → composition → MP4.

References:
- https://github.com/heygen-com/hyperframes
- https://hyperframes.heygen.com/concepts/compositions
- https://github.com/heygen-com/hyperframes/blob/main/docs/packages/cli.mdx

**Offline packaging caveat:** HyperFrames CLI's initial setup may attempt browser downloads, updates, optional telemetry, skill retrieval, or remote font/runtime use if scaffolding defaults are retained. Package locally, bundle browser assets, compile CSS rather than using CDN/browser Tailwind, and set `HYPERFRAMES_NO_UPDATE_CHECK=1`, `HYPERFRAMES_NO_TELEMETRY=1`, `HYPERFRAMES_SKIP_SKILLS=1`. Avoid commands that publish or use cloud rendering. Verify absence of outbound requests on an actually disconnected computer. Pin the tested HyperFrames release; don't rely on `npx ...@latest` during export.

## 3. User journey and screen architecture

1. **Local launcher:** Start application → health-check renderer/FFmpeg/browser/fonts → open `http://127.0.0.1:4317` (port configurable).
2. **Projects:** Create project, load existing project, clone project, archive project with assets.
3. **Template library:** Filter by 9:16/16:9, style, scene count, UI demos, and duration. Show a pre-rendered, bundled local thumbnail/preview. Select template and variant.
4. **Quick Create:** Enter project name, target formats, main headline, subheading, product/brand, CTA, plus optional logo and one screenshot. Use editable defaults for the rest.
5. **Brand and media:** Select brand kit or adjust palette/fonts; import screenshots, voiceover and music into the project.
6. **Scene editor:** Scenes appear as reorderable cards/timeline. Expand a scene to modify text, media, layout, text effects, animations, timings, overlays and sound cues.
7. **Responsive preview:** Switch between portrait/landscape; browser player supports frame seek, play/pause, scene loop, and timeline ruler. No need to render MP4 on every keystroke.
8. **Preflight:** Validate required fields, asset existence, font availability, text wrapping, portrait/landscape safe areas, duration, codec support, and rights warnings.
9. **Export:** Select targets, output naming, quality, CPU/GPU preference; submit local job. Show progress, cancellation, and final exported file(s).
10. **Reuse:** Save `.json` + assets, rename/export/duplicate and re-open without internet.

### Wireframe, conceptual

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ PROJECT: EasyModerator Launch    [Save] [Check]        [Export]             │
├─────────────────┬─────────────────────────────────────┬──────────────────────┤
│ Templates       │  PREVIEW  [9:16 ▾] [Play]           │ INPUT PANEL          │
│ Brand           │                                     │ Quick Create         │
│ Scenes          │  Video canvas                       │ Headline             │
│   01 Hook       │                                     │ Subheading           │
│   02 Problem    │                                     │ Highlight words      │
│   03 Reveal     │                                     │ Logo / media         │
│   04 Demo       │                                     │ CTA                  │
│   05 CTA        │                                     │ [Advanced ▾]         │
│ Assets          ├─────────────────────────────────────┤                      │
│ Audio           │ Scene timeline  ███ ███ █████ ██   │ Effect / Timing ...  │
│ Export          │ Timecode  00:06 / 00:30             │                      │
└─────────────────┴─────────────────────────────────────┴──────────────────────┘
```

## 4. Input design: progressive disclosure, not one 150-field page

- **Level A / Quick Create:** 8–12 fields; enough to generate a complete typographic video.
- **Level B / Brand and Scenes:** Content and per-scene controls; dynamic fields appear based on chosen template and media type.
- **Level C / Advanced:** Typography detail, motion curves, audio cues, camera, responsive overrides, and technical export.
- Every field has: `id`, label, type, help text, default, constraints, visibility condition, group, optional/required, and project JSON destination.
- The template manifest decides which fields are shown; the canonical project JSON keeps values for all relevant scenes.
- No asset or audio is required when using a pure typography template. Logo/real screenshot become required only for templates that declare these as mandatory.

### A. Project and campaign information

| Field | Type | Purpose | Required? |
|---|---|---|---|
| Project name | text | Save/export title | Yes |
| Campaign name | text | Internal organization | No |
| Product name | text | Promo identity | Yes (default brand) |
| Project ID | generated slug | Folder-safe reference | Auto |
| Language | EN / BN / mixed | Font/layout defaults | Yes |
| Project notes | multiline | Creative background | No |
| Version label | text | Revision identification | No |
| Template name, ID, variant and version | selection | Stable composition recipe | Yes |
| Creative objective | dropdown | Product launch, feature, awareness, conversion | Yes |
| Target audience | text | Guides manual copy | Yes in creative brief |
| Audience pain point | textarea | Optional script guidance | No |
| Core message | text | Single message of video | Yes |
| Secondary message | text | Supporting meaning | No |
| Platform | multiselect | Facebook, Reels, YouTube, website etc. | No |
| Tone | dropdown | Bold, premium, clean, trustworthy, energetic | Yes |
| Desired emotion | text | Manual creative note | No |
| Mandatory words and excluded phrases | chips | Content checking | No |
| Claim evidence/approval note | textarea | Prevent unverified marketing claims | Recommended |
| CTA label, destination, optional secondary CTA | text fields | Final action and destination | CTA template only |

### B. Brand kit and typography

| Field | Type | Purpose |
|---|---|---|
| Brand name and tagline | text | Titles and closing cards |
| Primary logo / square icon / alternate logo | file selectors | Logo intro, watermark, outro |
| Primary color | hex picker | Main accent |
| Secondary color | hex picker | Secondary brand accent |
| Accent color | hex picker | Highlight animation |
| Background color | hex picker | Base canvas |
| Main text color | hex picker | Readability |
| Style preset | dropdown | Bold Future, minimal, friendly commerce |
| Latin font family | dropdown installed fonts | Latin content |
| Bangla font family | dropdown installed fonts | Bengali content |
| Font file import | file | Locally licensed custom fonts |
| Text weight | 100–900 | Boldness |
| Scene font scale | 0.5–2 | Per-scene sizing |
| Line height, letter spacing, max lines | advanced numeric | Fit/wrapping |
| Text alignment | left/center/right | Scene layout |
| Corner radius | number | Panels/screenshots/buttons |
| Shadow/elevation preset | dropdown | Floating UI cards |
| Logo placement | intro/outro/both/always/none | Brand visibility |
| Optional watermark | boolean | Default off |
| Accessibility / reduce motion | checkbox | Lower-motion variant |
| Word emphasis list | chip inputs | Trigger highlights |

Use brand examples from the EasyModerator Bold & Future-Facing direction as editable presets, **not** as immutable brand truth. All font files and licenses must be included or imported locally. For Bengali use real shaping-capable Unicode fonts (for example, a properly licensed local Noto Sans Bengali install), not Latin-only fonts.

### C. Output canvas and platform

| Field | Type | Defaults/behavior |
|---|---|---|
| Output target(s) | multiselect | Portrait 1080×1920, landscape 1920×1080, square 1080×1080 |
| Custom width, height | integer | Optional expert mode; permitted ratio/bounds |
| Frame rate | 24 / 30 / 60 | 30 fps default |
| Intended platform | dropdown | Determines safe-margin suggestions |
| Safe margins | percent | Portrait 9%, landscape 7% illustrative defaults |
| Responsive mode | reflow/crop/letterbox | Reflow default; never silently crop key UI |
| Duration goal | seconds | Advisory; actual duration computed from scenes |
| Background fill | solid/gradient/media | Conditional appearance controls |
| Gradient stops, direction | colors/numbers | If gradient chosen |
| Quality preset | draft/standard/high | Render cost and bitrate |
| Render format | MP4/WebM/MOV | MP4 default |
| Video codec | H.264/H.265/VP9 | H.264 for MP4 default |
| Audio codec | AAC/Opus/PCM | AAC for MP4 default |
| Worker count | integer | Default 1 for predictable memory |
| GPU preference | boolean | Only use if local supported; fallback CPU |
| Output filename and folder | filename and local folder selector | Stable path, no collisions |
| Overwrite existing | boolean | Default no |
| Thumbnail, project archive, intermediates | checkboxes | Thumbnail+archive defaults on |

**Codec rule:** Validate format/codec compatibility (e.g. MP4/H.264/AAC) before starting a job rather than allowing arbitrary combinations and failing late.

### D. Per-scene: content and sequence

Repeated for each scene. The UI always includes Add, Duplicate, Disable, Delete, Reorder, and Reset-to-template-default controls.

| Field | Type | Purpose |
|---|---|---|
| Scene ID | generated | Stable timeline reference |
| Scene type | dropdown | Intro, kinetic headline, problem, solution, feature, UI demo, stat, testimonial, CTA, outro |
| Enabled | checkbox | Temporarily skip scene |
| Start | calculated | Driven by order and overlap |
| Duration | seconds | Scene's total timeline length |
| Eyebrow | text | Small kicker label |
| Headline | text | Primary kinetic text |
| Supporting line | text | Secondary claim |
| Body copy | textarea | Longer explanatory text |
| Bullet/feature phrases | repeatable strings | Feature-stack cards |
| Highlight words/phrases | chips | Accent styling/motion |
| Local CTA label and link text | text | CTA scene |
| Media asset(s) | multi-select | Screenshot, video, logo, photo |
| Media fit/focal position | contain/cover and x/y | Avoid accidental UI cropping |
| Layout | enum | Centered, split, stacked, full-bleed, device frame |
| Scene background and text color overrides | color | Optional per-scene changes |
| Overlay opacity | 0–1 | Improve contrast |
| Heading scale, alignment | number, dropdown | Per-scene typography |
| Caption text | text | Manual caption override |
| Scene notes | textarea | Internal direction, not rendered |

### E. Per-scene: kinetic motion

| Field | Type | Purpose |
|---|---|---|
| Entrance style | enum | Fade-up, type-on, masked reveal, slide, spring-pop, staggered words, split letters |
| Emphasis style | enum | Highlight, pulse, animated underline, word swap, tracking, count-up |
| Exit style | enum | Fade, wipe, zoom, slide |
| Easing | enum | Linear, ease-out, ease-in-out, spring, back-out |
| Intensity | 0–1 slider | Distance/rotation/amplitude preset |
| Animation delay | seconds | Relative to scene start |
| Stagger | milliseconds | Time between animated words/glyphs |
| Hold duration | seconds | Fully visible content time |
| Motion blur | toggle | Optional and more expensive |
| Transition to next | enum | Cut, crossfade, wipe, zoom, flash |
| Transition length | 0–2 seconds | Timeline overlap; visible in final duration |
| Device frame | enum | None, desktop, mobile, browser window |
| Cursor animation | boolean | Only in UI-demo scene |
| Cursor keyframe path | array of x/y/time | Deterministic fake mouse movement |
| Camera zoom/pan | numbers | Screenshot push/pull/focus |
| Aspect-specific layout overrides | nested scene settings | Portrait different from landscape |

**Validation:** Require `animation delay + entrance time + hold time + exit time` to fit the scene duration (or automatically reflow the preset), clamp extreme motion, and avoid hiding text before the viewer can read it. Each template owns its valid controls; do not expose irrelevant controls on every template.

### F. Imported media assets

| Field | Type | Purpose |
|---|---|---|
| Asset ID | generated string | Stable reference in scenes |
| Type | logo/image/video/music/voiceover/sfx/font | Decoding and validation |
| File | local picker | Copy to project; relative path stored |
| Asset preview | UI | Inspect resolution/duration |
| Alternative description | text | Organization |
| Fit/crop/focal point | selector/coordinates | Responsive image display |
| Imported media trim start/end | seconds | Optional clip control, advanced |
| Video clip playback rate | number | Optional, advanced |
| Background transparency | alpha supported / flag | Logo compositing |
| License/usage status | enum | Owner/licensed/public domain/unknown |
| Audio gain and start offset | numeric | Audio positioning |

V1 supported imports should be constrained to common image/audio/video/font formats known to work with installed decoder versions. Always probe real files. Unsupported codecs should yield an error, not a silently missing frame. Copy input files into the managed project, never link mutable temporary upload locations.

### G. Music, narration, captions and sound design

| Field | Type | Purpose |
|---|---|---|
| Music file | asset selector | Background music |
| Music volume | 0–1 slider | Balance |
| Music trim / start offset | seconds | Timing |
| Music fade-in/fade-out | seconds | Smooth ending |
| Voiceover file | asset selector | Optional recorded narration |
| Voiceover gain and offset | numeric | Sync against scenes |
| Auto-duck music under narration | checkbox | Simple mixing (if enabled) |
| Per-scene voiceover/FX asset | selector | Trigger at scene start |
| Per-scene music volume override | number | Local emphasis |
| Mute all | checkbox | Social silent-creative mode |
| Beat markers | list of timestamps | Optional manual beat sync in V1 |
| Caption enable | checkbox | Baked-in captions |
| Caption source | scene text / per-scene text / manual cues | Deterministic without speech AI |
| Manual captions | repeatable start/end/text | Exact synchronization |
| Caption position | top/center/bottom | Safe for platform UI |
| Caption font size and style | numbers/colors | Legibility |
| Max words per caption line | integer | Mobile comfort |
| Current-word emphasis | checkbox | Karaoke-style when cues exist |
| Caption background box | checkbox | Contrast |

**Scope honesty:** An imported voiceover is supported. AI narration or perfect audio-to-word alignment is **not** available without installing additional local tools/models. V1 should support manual cue timings and scene-text captions. Later optional local ASR can be added behind an interface.

### H. Compliance and product truth

| Field | Type | Purpose |
|---|---|---|
| Approved claims | list of strings | Avoid unsupported claims |
| Evidence/approval note | multiline | What proves a statement |
| Forbidden claims | list of strings | Catch hyperbolic copy |
| Assets cleared for commercial use | per-asset status | Remind before export |
| Demo/simulation disclaimer | text/toggle | Mark illustrative UI where needed |
| Real customer data removed | preflight checkbox | Privacy protection |
| Text clipping and safe area check | automatic test | Prevent invisible CTA |
| Accessible contrast warning | automatic test | Avoid unreadable type |

These are preflight warnings and validations, not legal verification or an AI fact-checker. The user is responsible for approving promotional claims and third-party media usage rights.

## 5. Dynamic template specification

Templates are **versioned compositions**, not unstructured prompts.

| Template ID | Visual concept | Required creative fields | Required assets |
|---|---|---|---|
| `bold_kinetic` | Giant words, staggered letters, kinetic headline, CTA | headline, CTA | None |
| `problem_solution` | Problem → transition → solution → CTA | pain, solution, CTA | None; logo optional |
| `ui_showcase` | Actual dashboard / app screenshot, cursor/camera | UI headline, benefit | At least one approved screenshot |
| `feature_stack` | Sequential benefits and animated icon/cards | 2–6 features, CTA | None |
| `social_hook` | Fast 3-second hook and punchy typography | hook, support, CTA | None |
| `minimal_launch` | Clean brand reveal, big typography and calm spacing | name, headline, CTA | Logo optional |

The installed template manifest describes:

```json
{
  "id": "bold_kinetic",
  "version": "1.0.0",
  "name": "Bold Kinetic",
  "sceneKinds": ["kinetic_text", "feature", "cta"],
  "supportedTargets": ["portrait", "landscape", "square"],
  "requiredInputs": ["brand.name", "creative.keyMessage", "creative.cta.label"],
  "optionalAssets": ["logo", "music"],
  "defaultScenes": ["hook", "benefit", "cta"],
  "motionPresets": ["stagger_words", "mask_reveal", "scale_pop"]
}
```

Template-specific form fields are generated from manifest metadata. Only expose controls that are actually supported by that scene implementation.

## 6. Project data contract and provided files

The canonical file is `project.json`. It is an immutable-snapshot-friendly declarative representation; **no JavaScript code or remote links are executed from user input**. It is validated against the JSON Schema file distributed with this specification.

Included deliverables:
- `kinetic-project.schema.json`: Draft 2020-12 JSON Schema for all canonical nested fields, including required values and valid enums.
- `kinetic-input-blank.json`: An editable minimal input form payload, with no assets needed.
- `easymoderator-promo-example.json`: A concrete EasyModerator-oriented 30-second sample with five scenes, two target aspect ratios and example asset references. **Sample media files are not bundled**; users must import actual files before rendering.

### Canonical data sections

```
project.json
├── schemaVersion     # For compatibility and migrations
├── project           # Name, campaign, language, description
├── template          # ID/version/variant
├── creative          # Objective, audience, tone, text, CTA and claim notes
├── brand             # Palette, fonts, logo references
├── assets[]          # Local imported assets (relative paths)
├── targets[]         # Aspect ratio + rendering choices
├── scenes[]          # Ordered content, timing, movement, visuals, per-target overrides
├── audio             # Music/voiceover/mix and beat cues
├── captions          # Caption rules / manually timed cues
└── export            # File format, codec, preset, filename, output behavior
```

**Referential constraints (server checks beyond JSON Schema):** scene IDs unique; asset IDs unique; all `*AssetId` references point to existing entries with compatible types; files are inside managed project; target IDs not duplicated; no unsupported scene kind for template; total render duration and output size within configured limits; no codec mismatch.

## 7. Rendering architecture

```text
React UI (localhost:4317)
        │
        ├──── form edits ──────────→ project.json (local, debounced autosave)
        │
        ├──── preview request ─────→ compile selected template and target
        │                                      │
        │                              seekable browser player
        │
        └──── export request ──────→ Fastify /api/renders
                                             │
                                    validate input + files
                                             │
                                      snapshot job inputs
                                             │
                                    resolve template + variables
                                             │
                                    generate standalone HTML
                                             │
                                       HyperFrames check
                                             │
                                Chromium deterministic frames
                                             │
                                      HyperFrames/FFmpeg
                                             │
                                 inspect audio/video output
                                             │
                                atomically move to exports/
                                             │
                                      return local result
```

### Rendering internals

1. Read the saved project and snapshot it for the current render job. Later edits should not mutate a running render.
2. Validate schema, template version, asset IDs, font availability, codec tuple, output path, and total duration.
3. Resolve all files into a sandboxed job directory and substitute only escaped text values into approved template variables. Prefer DOM `textContent` or escaping, not raw `innerHTML`.
4. Compile HTML/CSS/JS animation assets locally; use `data-composition-variables` and `data-variable-values` for composition inputs.
5. Generate scene-level timeline positions. For transitions with overlap, compute `totalDuration = Σ enabled scene durations − Σ transition overlap durations`; show this number in the UI. When an overlap is not valid, reduce it or show an error.
6. Build aspect-specific compositions. `reflow` changes layout and font fitting; do not simply crop a desktop video to portrait.
7. Run HyperFrames composition check then its local render command through a fixed executable path (`child_process.spawn` with argument array; no shell string interpolation).
8. HyperFrames handles seek/capture and FFmpeg encoding/mixing. If separate post-processing is required, avoid double-encoding where possible and verify synchronization.
9. After rendering, use `ffprobe` and basic frame probes to check output streams, size, dimensions, time, black/blank frames, and audio duration.
10. Save MP4 using an atomic rename and return the output path. A project archive can include JSON + imported media + template version metadata.

### Preview policy

- Interactive in-browser preview: player seeks the actual composition; changes may be debounced.
- Draft MP4 render: optional, low resolution/quality for sharing.
- Full export: explicit click only.
- Audio preview depends on browser autoplay constraints. Provide an explicit play control.
- Never claim the preview was identical to export until cross-frame QC verifies browser/runtime/font consistency.

## 8. Local filesystem layout

```text
kinetic-studio/
├── apps/
│   ├── web/                  # React / Vite local interface
│   └── local-server/         # Fastify and render job coordinator
├── packages/
│   ├── contracts/            # Zod schema and versioned JSON Schema
│   ├── template-engine/      # Manifest, compiler, responsive layout
│   ├── render-adapter/       # HyperFrames CLI/producer integration
│   └── shared-ui/
├── templates/
│   ├── bold_kinetic/         # manifest.json, scenes, preview assets
│   ├── problem_solution/
│   ├── ui_showcase/
│   ├── feature_stack/
│   ├── social_hook/
│   └── minimal_launch/
├── vendor/                   # Pinned offline JS/fonts/browser/ffmpeg install assets
└── data/                     # User-configurable local data root
    ├── projects/<id>/
    │   ├── project.json
    │   ├── assets/<imported files>
    │   ├── snapshots/<revision>.json
    │   ├── renders/<job-id>/
    │   └── thumbnails/
    ├── exports/
    └── logs/
```

Put user data outside the application install directory in packaged Windows/macOS/Linux builds. Include an easy backup/export function. Rendering should not modify source template files.

## 9. Minimal local API contracts

All requests are to `http://127.0.0.1:4317`. The UI and API should share one origin when packaged.

| Method | Endpoint | Request / result |
|---|---|---|
| GET | `/api/health` | Renderer/Chrome/FFmpeg/fonts readiness |
| GET | `/api/templates` | Local manifest summaries |
| GET | `/api/templates/:id` | Template defaults + field metadata |
| POST | `/api/projects` | Create and return project ID |
| GET/PUT | `/api/projects/:id` | Read / validate and save project JSON |
| POST | `/api/projects/:id/assets` | Import file into managed assets folder |
| POST | `/api/projects/:id/preflight` | Input/asset/typography/layout validation report |
| POST | `/api/projects/:id/preview` | Compile a target-specific local preview |
| POST | `/api/projects/:id/renders` | Queue local render; return job ID |
| GET | `/api/renders/:jobId` | `queued|validating|rendering|verifying|done|failed|cancelled` |
| GET | `/api/renders/:jobId/events` | Server-Sent Events for progress/logs |
| DELETE | `/api/renders/:jobId` | Cancel active job and clean temp resources |
| GET | `/api/renders/:jobId/file` | Stream finished local file, not arbitrary file path |

Use one worker/render at a time by default; additional concurrency must respect memory and CPU resources. Maintain a cancellable subprocess tree with max memory/duration/file-size bounds. Persist jobs to disk so an interrupted export is reported as failed/restartable, rather than falsely completed.

## 10. Rendering and UI validation

**Preflight errors**
- Missing required text for chosen template → identify scene and exact field.
- Missing or unreadable media → identify asset ID and guide re-import.
- Invalid aspect dimensions or codec tuple → suggest compatible preset.
- Missing Bangla/Latin glyphs → flag font and affected string.
- Content outside social platform-safe area → show overlay and allow resize/reflow.
- Headline too long for scene → recommend shorter copy or longer hold; prevent silent clipping.
- Scene motion exceeds scene length → recalculate or reject explicitly.
- Voiceover longer than video → trim with consent, extend scene(s), or warn; do not silently cut speech.
- An unverified claim / unknown asset usage rights → show approval-required warning before final export.
- Render worker crash → preserve project and error log, release temp resources, permit retry.
- Two exports with same path → suffix filename or require overwrite opt-in.

**Acceptance testing matrix**
1. Launch and export with physical internet/network disabled. Capture evidence that no outbound requests occur.
2. Complete font/typography render of mixed Bengali/English and punctuation at portrait and landscape sizes.
3. Verify every template renders at 30fps with no blank intermediate frames and stable first/last frames.
4. Compare exact frame grabs for identical inputs on the same pinned runtime to detect nondeterministic animation.
5. Load/restart/reopen project and recover all edits and relative asset references.
6. Test long words, emoji, surrogate pairs, mixed scripts and punctuation.
7. Test corrupt assets, oversized assets, cancelled jobs, repeated exports, low disk space, missing FFmpeg, and unsupported fonts.
8. Confirm active jobs can't reach arbitrary paths, read outside project folders, execute injected HTML, or access network URLs.
9. Validate codec and MP4 sound on Windows default player and browser player.
10. Render both 9:16 and 16:9 from one project and confirm each scene is composed intentionally (not stretched).

## 11. Implementation plan (simplicity-first)

**Stage 1: Local foundation** — basic React UI, Fastify local API, project folder CRUD, offline packaged renderer, one known-good end-to-end MP4 export.

**Stage 2: Inputs and presets** — canonical JSON Schema, manifest-driven forms, brand-kit fields, asset importer, three fully tested templates, autosave, validation.

**Stage 3: Composition and preview** — scene ordering, responsive 16:9/9:16 reflow, local player, common kinetic effects, timeline seek, high-quality render.

**Stage 4: Audio and refinement** — music, imported voiceover, manually timed captions, local screenshot animation, completion/cancel/retry, remaining templates, output QA.

**Release gate:** The complete Quick Create → Preview → MP4 export workflow must work with internet disconnected and save both a valid video and a reloadable project. Advanced options must be gated behind manifest support, not show decorative controls that do nothing.

## 12. Fastest test brief to fill in

If you want to generate an EasyModerator promo immediately after implementation, collect only these data items:

```text
Project name:
Template: bold_kinetic | problem_solution | ui_showcase | feature_stack | social_hook | minimal_launch
Target formats: 9:16 | 16:9 | both
Brand name:
Language: Bangla | English | mixed
Main hook/headline:
Supporting line:
Three key phrases / features (optional):
CTA text:
CTA URL or final on-screen text:
Logo file (optional for typography-only template):
Screenshot(s) (only required for UI showcase):
Music / voiceover file (optional):
Preferred duration in seconds:
Colors: use saved brand kit | custom

Advanced per scene (optional):
Scene order, duration, layout, entry/effect/exit, highlight words,
transition, media framing, cursor/camera motion, scene captions,
audio cues, portrait/landscape overrides.
```

That is the end goal: collect **the minimum inputs needed for a complete render**, let good templates provide defaults, and make every creative and rendering property adjustable when genuinely needed.
