# CODEX GOAL — Growth Studio V0.03: OpenAI Creative Director + Production-Quality Videos

**Repository:** `mr3826/growth-studio`  
**Verified remote baseline (2026-10-15):** `main` at `8ee7c19b099392a379f5a002414c3d4bbf079964` (PR #1 included V0.02).  
**Local branch and worktree:** UNKNOWN. Audit before editing; newer local commits may exist.  
**Mission:** Make Growth Studio a high-quality, generic, template-based promotional video production application where users enter business/product facts, approve AI creative suggestions, and export polished branded videos with synchronized narration. Use **OpenAI** for optional creative intelligence via `CONTENT_STUDIO_KEY`, **Gemini** for optional voice generation via `CONTENT_STUDIO_GEMINI`, and the **existing local Chromium + FFmpeg** pipeline for preview and MP4 export. All manual/cached workflows must work offline.

## One clear finish line

A user can create a project for **any brand or app**, supply product information, brand assets, screenshots, target audience, approved claims and CTA, click **Develop 3 Concepts**, choose a creative concept, generate an editable storyboard, approve/edit on-screen copy and narration scene by scene, optionally generate Gemini voice, preview and revise the video, pass meaningful preflight checks, and export a **professional-quality, audible, brand-consistent MP4** in 9:16 and 16:9 (preserve 4:5 support). The exported video must accurately represent only supplied/approved product features. With no internet or API keys, the entire pre-existing manual workflow and cached projects still function.

**This is a new development goal after V0.02, NOT permission to redo V0.02 or overwrite the current repo.**

## 0. Evidence-first local audit and branch safety — mandatory first task

- [ ] Run `git status --short`, `git branch -avv`, `git log -8 --oneline`, `git remote -v` and inspect refs; fetch read-only updates if permitted. Preserve dirty/untracked work before switching branches. Never reset/discard user work.
- [ ] Compare local and remote `main`, the V0.02 feature branch and latest local HEAD. **Start from the most complete verified implementation, preferably up-to-date main**, but preserve any unreleased local work; do not blindly reset to the quoted SHA.
- [ ] Create local feature branch `feat/growth-studio-v003-openai-creative-director` or a unique suffix if already present. Commit locally at verified milestones; **DO NOT push, open PR, merge or deploy** unless explicitly approved.
- [ ] Read actual current source for `apps/web`, `apps/local-server`, `packages/contracts`, `packages/template-engine`, `packages/render-adapter`, V0.02 Gemini TTS, render job persistence, E-drive storage resolver and docs/quality. Read the original four input files and latest V0.02 release goal. Do not infer functionality from docs alone.
- [ ] Run current build/tests, a narrated 16:9 render, and an offline cached-audio re-export. Record actual baselines (`ffprobe`, LUFS/levels, representative frames, logs, exit codes) in `docs/quality/V003_BASELINE.md`.
- [ ] Measure Windows drive free space. Preserve `E:\GrowthStudio` when writable and appropriately provisioned; all generated media, AI caches and render temp belong under configured storage root, not a space-constrained C: drive. Never move existing assets destructively.
- [ ] Identify the exact EasyModerator Bold & Future-Facing design-system source in the workspace; approved design tokens and logo take precedence over provisional colors. Preserve brand isolation for all other customers.

## 1. Technology decisions — keep architecture lean

- **OpenAI Creative Provider:** server-only official OpenAI Node SDK + Responses API + strict Structured Outputs. Read key from `process.env.CONTENT_STUDIO_KEY` ONLY on the Fastify server. Verify model is actually accessible before enabling operations. Default suggested `gpt-6.1-sol` for concept/storyboard, `gpt-6-luna` for short variants/rewrite, optional user-selected `gpt-6-astra` for premium creative direction/critique. These are configuration defaults, not hard dependencies; handle account-model availability and pricing changes.
- **Gemini narration:** keep the existing `CONTENT_STUDIO_GEMINI` server-side integration, per-scene TTS generation, voice import, narration approval, offline cache and audio mixer. Do not replace or duplicate it with OpenAI TTS by default.
- **Rendering:** preserve V0.02 deterministic Chromium + FFmpeg engine and its three templates (`guided_product_story`, `bold_kinetic`, `app_showcase`). No new video-generation subscription or external rendering provider. The model must NOT emit executable JavaScript, arbitrary HTML/CSS, shell commands or unrestricted render scripts.
- **Output contract:** AI generates a **strictly validated data structure**, and a local compiler maps it into the existing scene and animation schema. Template names, scene kinds, motion names and target IDs must be sourced from **actual installed manifests**. Never invent unsupported animations/assets and label them working.
- **No extra infrastructure:** maintain existing Fastify/React/Vite/workspaces and project-based local JSON storage. No PostgreSQL/Redis/cloud services required.
- **Connectivity:** AI actions clearly marked **Online — OpenAI** or **Online — Gemini**. Editing, project save/reopen, local previews and rendering must work disconnected.

Official API references (recheck at implementation):
- https://developers.openai.com/api/docs/guides/text
- https://developers.openai.com/api/docs/guides/structured-outputs
- https://developers.openai.com/api/docs/models
- https://ai.google.dev/gemini-api/docs/speech-generation

## 2. User-facing action-first journey and screen design

Continue the 7-stage work tree; **add helpful creative actions inside it**, not a confusing new separate dashboard. Show the primary NEXT ACTION and project status.

1. **Create project / Brief** — name, category (SaaS/app/service/product), audience/persona, intended platform, language (Bangla/English/mixed), duration target (15s/30s/60s/custom), communication goal (awareness/demo/conversion), stage of funnel, problem, benefits, proof/claims, feature list/status, differentiation, offers (if verified), tagline, prohibited topics, CTA/destination and script tone. Allow optional structured import from project JSON. Fields grouped into Basic and Advanced; save draft progressively.
2. **Choose template + Brand** — display actual motion preview and required asset slots; retain three existing templates and 4:5/9:16/16:9. Choose any saved brand kit, including optional `EasyModerator — Bold & Future-Facing`. Template choice **MUST NOT overwrite** selected brand palette. Explicitly offer visual style variants such as bold-dark, light editorial, product-demo without confusing these with brand identity.
3. **Develop creative concepts (OpenAI, optional)** — after clear consent, user clicks `Generate 3 Concepts`. Present 3 **distinct** creative angles (e.g. problem→solution, outcome/story, product proof), each with hook, target pain, treatment, suggested duration, scene outline, voice style, risk/claim notes and rationale. User chooses one, requests revisions or continues manually. No AI call on opening page or saving forms.
4. **Build storyboard and narration (OpenAI, optional)** — user clicks `Create Storyboard`; structured scene objects flow into the real editor. Include stable scene IDs, chapter, scene purpose, duration, scene kind, headline, subhead, highlighted words, visual asset references, screenshot crop/focus, callouts, motion preset, camera movement from allowed presets, transition, on-screen CTA, Bangla/English narrator script, pronunciation hint and evidence/provenance. Show editable scene cards and drag/reorder/duplicate; regenerate **selected scene only** without rewriting manually edited or approved scenes. Side-by-side script/preview; clearly mark AI drafts versus approved content.
5. **Add assets & narration** — user selects/screenshots/logos locally. Optional image/screenshot analysis via OpenAI vision only if user explicitly selects the files to send. Do not send by default; give clear consent with filenames/content description; strip metadata where practical. Gemini generates speech **only from approved narration** and only on explicit click, keeps cache stable per scene, supports import-recorded voice fallback. Offer play voice, fit scene to voice, pronunciation dictionary, pause timing and background music/SFX from user-supplied locally licensed files.
6. **Motion, preview and creative polish** — controlled adjustments to supported timeline parameters. Allow OpenAI `Review Storyboard` (text/metadata only) and optionally `Review Selected Frames` with separate informed opt-in (only specifically selected lower-res frames leave machine). Return prioritized **suggestions**, not made-up PASS. Show before/after proposals and one-click apply to only accepted fields; do not change approved claims/brand kit without confirmation.
7. **Preflight → Export → Review** — validate facts/claims approvals, asset resolution, typography, sound, durations, scene visibility, safe zones and offline readiness. Render local MP4, inspect ffprobe/audio levels/representative frames, playback. Export full project archive with user assets locally if requested; no API keys in archive. Show offline indicator and AI provider errors gracefully.

**Action-first UX standards:** show task completion flags, blocker reasons, per-scene approval state, immediate preview of edited input, clear Save, Back and Next; no hidden magic sync buttons. Editing manually is always first-class. Avoid generic admin/dashboard cards; the work tree is the navigation backbone. Keyboard accessible controls and small laptop responsive layout.

## 3. Brand + factual evidence requirements

- Keep the generator generic; **EasyModerator is one selectable saved brand kit and one test fixture**, never a forced default. For EasyModerator provisional tokens only (when approved source is absent): Midnight `#17223B`, Violet `#7460D9`, Sunlight `#F4C35E`, White `#FFFFFF`. Actual brand file supersedes tokens. The logo, typography, palette and motion personality must carry into all three templates.
- Implement a **Product Truth Profile** with explicit `verified_live`, `approved_demo`, `planned`, `unknown` for each feature/claim, source/evidence text and approval flags. Only verified live features and explicitly labeled demo behavior may be marketed as currently available. Do not invent customer outcomes, price offers, adoption metrics, integrations, screenshots, testimonials, or numerical sales gains.
- If a claim cannot be established, surface `needs_approval` with a reason, and block publication-ready export of that unapproved claim (or require its removal/approval with real evidence, including distinct disclaimer for demo/simulation). Never silently rewrite unapproved facts as true.
- Prompt injection threat: uploaded screenshots/brief text are **data**, never instructions to override system constraints or run code. Escape/sanitize user strings and reject invalid asset IDs/unsafe URLs.
- Prefer authentic UI screenshots, customer-approved recordings, and brand assets over invented imitation screenshots. AI concept generation should not represent fictional UI as the real application.
- For bilingual Bangla/English, support accurate grapheme clusters, appropriate whitespace, line breaks, non-clipped text, and actual local fonts. Never force Bengali copy when the project selected English.

## 4. Server + contract implementation

- Add a **provider abstraction**, not ad hoc OpenAI calls sprinkled in routes. Suggested responsibilities:
  - `CreativeProvider` interface: `generateConcepts`, `buildStoryboard`, `rewriteSelectedScene`, `reviewStoryboard`, optional `reviewOptedInFrames`.
  - `OpenAiCreativeProvider` as server-only implementation using official SDK, explicit model IDs, request timeout, abort, rate-limit/backoff, and sanitized error codes.
  - `CreativeOrchestrator` for one approved task per request, persisted draft revisions, allowed motion lookups, claim checking and schema adaptation.
  - `AiUsageRecorder` for per-call model, timestamps, input/output token counts (if reported), estimated/actual cost, cache/reuse and project limits; no secrets, raw prompts with sensitive data or external hidden IDs logged.
- Suggested API surface (adapt names to repository conventions):
  - `GET /api/creative/provider-status`: configured boolean, selectable/validated model IDs, offline status and sanitized API availability; never key/token.
  - `POST /api/projects/:id/creative/concepts`: explicit opt-in payload, return 3 structured concepts. Persist drafts locally, never silently overwrite approved data.
  - `POST /api/projects/:id/creative/storyboard`: chosen concept → validated scene proposal.
  - `POST /api/projects/:id/creative/scenes/:sceneId/rewrite`: regenerate selected scene only, preserving approved locks.
  - `POST /api/projects/:id/creative/review`: factual/brand/pacing/legibility recommendations; separate opt-in route for frame images.
  - `GET /api/projects/:id/creative/history`, `GET /api/projects/:id/creative/usage`: local history and budget status.
- Enforce `same-origin`, loopback server, request size limits, no arbitrary remote URLs, schema validation, bounded request frequency and proper API error mapping. Verify CSRF/local browser interactions and localhost abuse scenarios; use exact allowlist rather than permissive CORS.
- **Structured Outputs** (strict `json_schema` via Responses API) for versioned `CreativeConceptsV1` and `VideoStoryboardV1`, with required fixed fields, additionalProperties=false, allowed enums and IDs. Revalidate against local authoritative Zod/AJV schemas after model returns; reject/repair boundedly only when safe and avoid runaway retries.
- Proposed storyboard contract:
  ```text
  schemaVersion, projectId, conceptId, selectedTemplateId,
  approvedBrandKitId, targetFormats, estimatedDuration,
  scenes[]:{sceneId,chapter,role,sceneKind,durationSeconds,
    onscreen:{eyebrow,headline,subheadline,highlightWords,cta},
    narration:{language,text,pronunciationNotes,approved},
    visuals:{assetIds,deviceType,cropRect,callouts},
    motion:{entrance,emphasis,exit,transition,cameraPreset,intensity},
    claims:[{claimText,evidenceId,status}],approvalStatus}
  ```
  Map to existing project shape; do not require a broad breaking rewrite of old projects. Version/migrate older V0.01/V0.02 projects in tests.
- Never let AI invent a screenshot `assetId`; it may only select from the user's approved manifest. Every scene kind/motion ID must exist in current templates. Display limitations instead of making silent substitutions.
- Persist **three layers**: user's source brief/evidence, approved creative plan, rendered timeline; preserve provenance. On manual edits, track dirty state, approvals and revisions. Reopen saved project without OpenAI/Gemini connection.

## 5. AI cost, privacy, reliability and offline gates

- `CONTENT_STUDIO_KEY` for OpenAI (read via `process.env` in local Fastify process). `CONTENT_STUDIO_GEMINI` remains for Gemini TTS. Detect configured **boolean** without echoing secrets; do not ask to paste keys in browser; don't hardcode, commit or copy `.env`.
- No automatic API calls on load, autosave, preview, export or render. An explicit user action initiates each cloud call, with preview of content/files to send, model choice, rough estimated cost, and opt-out. Require explicit confirmation for sending any screenshot/user-selected frame. Allow local-only mode for all existing manual workflows.
- Provide per-project spend cap (configurable; default conservative, e.g. USD $1 per project for AI creative text) and optional per-request cap; estimate conservatively and block additional calls when cap would be exceeded pending user approval. Usage receipts must reconcile when the API returns actual token usage; don't falsely promise exact prices. Support cancellation/timeouts; no unbounded automatic retries; local cache of accepted text/storyboards to prevent repeated billing.
- OpenAI models **may not be in the user's API account**, may be rate-limited or unavailable; model routing should be configurable and tested at runtime. Suggested defaults are `gpt-6.1-sol` creative direction, `gpt-6-luna` for low-cost rewrite and `gpt-6-astra` optional premium; do not force a tier that fails on this account. Do not use the API for every frame.
- Keep cloud boundary obvious: when OpenAI or Gemini unavailable, show actionable status and allow manual storyboard creation, imported narration, cached audio, preview and export offline.
- Remove/hash/redact sensitive sample content from telemetry. If using user-selected screenshots, do not upload private chats, payment information, access tokens or personal customer data unless explicitly redacted and approved. No unsolicited web research; product truth comes from provided claims/assets unless a separately approved research feature is later implemented.
- Local storage: cache AI results, audio and sample renders under configured `E:\GrowthStudio` when appropriate; honor existing storage migration and backup rules. Never embed API key into archived JSON or video metadata.

## 6. Better creative quality without uncontrolled complexity

- For each concept, return **three meaningfully different** hooks/approaches, not just synonyms. Each must include audience relevance, problem/benefit framing, suggested template and why it fits, timing and concrete scene beats.
- Give narration a natural speaking rate and estimate voiced scene time; audio owns minimum scene duration when selected. Never cut off voiceover; support user override with explicit warning. Keep logo/CTA visible long enough to read (check actual fps/time, not assumptions).
- Let the user specify output style: `educational`, `energetic`, `premium`, `trust-building`, `direct-response`, with adjustable motion intensity. All variants still inherit brand colors. Context-aware scenes must show a real product workflow instead of filler motion.
- Maintain coherent audio/visual pacing: scene text should relate to narrated sentence, transitions not all identical, strategic silent/beat pauses possible, and music ducked under voice. Use existing audio and waveform tools.
- A structured **Creative Review** should score and suggest specific edits in: hook, benefits, facts, brand, storyboard logic, mobile legibility, Bangla language, motion variety, audio sync, CTA. Text-only review cannot claim it inspected pixels. If opted-in frames are analyzed, label frame times and review only those sampled frames; no whole-video comprehension claims.
- Content must be authored and approved before TTS, and TTS clips should only regenerate for scenes whose narration changed. Preserve fingerprints/hashes for cache reuse.
- Do not integrate automatic AI-image generation, stock asset purchases, background video generation, competitor brand mimicry, voice cloning or heavyweight multitrack editor in V0.03 unless required to close a proven blocker. They are later scope, not MVP dependencies.

## 7. Mandatory automated and real-world tests

**Unit/contract tests:**
- [ ] OpenAI schema conformity, invalid enum/hallucinated asset ID rejection, stable scene IDs and migration from V0.02.
- [ ] Claim/evidence gating, brand isolation, Bengali Unicode/punctuation and negative prompt-injection cases.
- [ ] Approvals/locked scene state, regeneration preserving unaffected scenes, cache hits without second API call.
- [ ] Per-project budget, token receipt recording, rate limits, cancellation, timeout, 401/403/429/5xx and provider offline fallback.
- [ ] Local network/API key secrecy: no key in frontend bundle, network status routes, logs, project exports, error responses or Git.

**Browser integration:**
- [ ] End-to-end action-first path: generic brief → 3 concepts → concept selection → storyboard preview → scene edit → approval → Gemini voice **or imported WAV** → preflight → MP4 export → save/reopen.
- [ ] Negative path: missing API key and disconnected internet → manual input, cached project and offline video export still work.
- [ ] Optional upload consent: no image/frame leaves machine until explicit targeted consent, and cancellation cancels send.
- [ ] Mobile/laptop UI works; tab order, focus, keyboard and Bangla scripts remain usable.

**Video proof matrix (actual videos, not simulated):**
- [ ] **A — EasyModerator 16:9**, 30–60 s, selected Bold & Future-Facing kit, approved live-feature screenshots, visible product story, approved narration and music, H.264/AAC, audible and synced.
- [ ] **B — Same EasyModerator story 9:16**, real responsive layout (not crop), readable Bengali/English captions and consistent timing/audio.
- [ ] **C — Unrelated generic brand**, 20–45 s in 4:5 with distinctive own palette, assets, script and approved claim set; no EasyModerator or DukanBot leakage.
- [ ] **D — Offline re-export**, copy/edit previously approved storyboard while network is disconnected, use cached voice asset, export audible video with zero outbound requests.
- [ ] **E — Manual/no-key workflow**, create and export a project without OpenAI or Gemini and without forced AI steps.
- [ ] **F — AI selective regeneration**, only one scene revised, unaffected approved scenes and audio reused unchanged (test content hashes).
- [ ] Run `ffprobe`, `volumedetect`, `silencedetect`, optional `ebur128`, inspect beginning/middle/end frames and actual playback. Acoustic measures establish non-silence; **human** listening is a distinct sign-off and may be `NOT_VERIFIED` until actually heard.
- [ ] Conduct an independent negative/security/code review. Block PASS for uncaught secrets, invented claims, unsupported animation metadata, broken render, broken offline fallback or incorrect approval handling.

**Acceptance requirements for OpenAI:**
- [ ] At least **one real Responses API call** with the actual configured account to generate 3 distinct concepts or an editable storyboard and log sanitized model ID, status, usage and local cost estimate (never secrets). If permission/quota blocks calls, mark `OPENAI_LIVE=BLOCKED`, not fake PASS.
- [ ] Strict schema and local validation proven; exactly one accepted concept must produce editable scenes that actually render.
- [ ] Verify Gemini existing functionality hasn't regressed, or record API-quota-specific blocker with local imported voice passing.
- [ ] Verify version-controlled tests and locally generated receipts are honest; no replacing measured results with a model's assessment.

## 8. Implementation waves and milestones

**Wave A — Audit & baseline:** Source/disk/git/test inventory; V0.02 render and audio baseline; review source skills. Commit factual baseline documentation.

**Wave B — OpenAI provider & safety:** Model availability, server-only secret, endpoint protections, `Structured Outputs` schemas, usage/budget accounting, offline/error handling, provider tests. Commit after passing targeted tests.

**Wave C — Creative workflow:** Product Truth Profile; creative brief; 3 distinct concept generation; storyboard compiler; per-scene regenerate; provenance, approvals and history. Ensure no arbitrary code generation. Commit after UI/server tests.

**Wave D — Action-first interface & brand quality:** UX steps including optional AI actions, brief form, comparison, scene revisions, creative review, brand kit integrity, screenshot consent and preview. Commit after browser tests.

**Wave E — Gemini bridge and audio sync:** Approved scene narration → existing per-scene Gemini TTS or imported WAV; cache and scene-fit; retain audio when unrelated text changes; round-trip save/reopen. Commit after audio regression tests.

**Wave F — Actual video, offline, security + creative review:** Render matrix A–F; audio/frame verification; listening checklist; negative tests, fix P0/P1; independent reviewer findings; final documentation and traceable report. Commit locally.

**No push, PR, merge, deployment, production app integration or force reset without separate explicit authorization.**

## 9. Relevant engineering skills

Read **only applicable** `SKILL.md` instructions from https://github.com/Jeffallan/claude-skills (read-only), especially Spec Miner, Architecture Designer, TypeScript Pro, React Expert, API Designer, Prompt Engineer, Test Master, Secure Code Guardian, Security Reviewer, Debugging Wizard and Code Reviewer. Document architectural tradeoffs; prefer minimal verified patches and root-cause fixes over speculative rewrites.

## 10. Final report — exact fields

```text
REPO=mr3826/growth-studio
REMOTE_MAIN_AT_START=<verified SHA>
LOCAL_BASE_SHA=<verified SHA>
LOCAL_BRANCH=<branch>
HEAD_SHA=<committed SHA>
GIT_CLEAN=YES|NO + explanation
STATUS=PASS|CONDITIONAL|BLOCKED
OPENAI_KEY_CONFIGURED=YES|NO (NEVER show key)
OPENAI_LIVE=PASS|BLOCKED + reason
OPENAI_MODEL_ACTUALLY_USED=<ID>
OPENAI_STRUCTURED_STORYBOARD=PASS|FAIL|BLOCKED
OPENAI_REQUESTS_AND_COST=<sanitized measured usage/estimate>
CREATIVE_CONCEPTS=PASS|FAIL + proof of three distinct outputs
CLAIMS_AND_APPROVALS=PASS|FAIL
AI_SCENE_REGEN=PASS|FAIL
GEMINI_TTS_REGRESSION=PASS|BLOCKED + reason
BRAND_ISOLATION=PASS|FAIL
ACTION_FIRST_UI=PASS|FAIL
OFFLINE_MANUAL=PASS|FAIL
OFFLINE_CACHED_AUDIO=PASS|FAIL
STORAGE_ROOT=<measured path + free space>
VIDEO_MATRIX=<A-F output paths, resolution/fps/duration, ffprobe, voice/loudness readings>
HUMAN_LISTENING=PASS|NOT_VERIFIED + evidence
TESTS=<actual commands and exit codes>
SECURITY_FINDINGS=<severity and resolution>
KNOWN_LIMITATIONS=<remaining>
PUSH=NO
PR=NO
MERGE=NO
```

**PASS requires all mandatory functional + security gates actually observed.** Real third-party outages/limits may yield CONDITIONAL/BLOCKED while leaving offline/manual paths fully working. Never invent a successful cloud call, QA listener, video inspection or source-code test.
