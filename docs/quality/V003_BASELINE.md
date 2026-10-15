# Growth Studio V0.03 — Starting Audit and Baseline Evidence

**Audit date:** 2026-10-15
**Repository:** `mr3826/growth-studio`
**Remote main at start:** `8ee7c19b099392a379f5a002414c3d4bbf079964`
**Starting local HEAD:** `a0b78c2` (`docs(v0.03): track Growth Studio V0.03 OpenAI Creative Director specification`)
**Implementation branch:** `feat/growth-studio-v003-openai-creative-director-20261015`

## Git state and preservation

At the start of this implementation, `main` and `origin/main` pointed to the V0.02 merge at `8ee7c19`. The V0.02 feature ref remained at `010bbab`. A separate local V0.03 line already existed with six commits beyond main, ending at `a0b78c2`; this work was preserved and the new dated feature branch was created from it. The branch name includes a date suffix because `feat/growth-studio-v003-openai-creative-director` already existed locally.

No reset, push, pull request, merge, or deployment was performed. This document supersedes earlier baseline text that described a clean V0.02 checkout and presented V0.03 tests as already verified. Those assertions were not evidence for this implementation pass.

## Source areas inspected

- `apps/web`: project workflow, creative brief/concept/review dialogs, storyboard editor, brand/media and audio controls.
- `apps/local-server`: Fastify routes, consent checks, host/origin handling, project persistence, Creative Director provider and usage receipts.
- `packages/contracts`: project schema, starter projects, migration/normalization, E-drive storage resolver.
- `packages/template-engine`: installed template manifests, project preflight, deterministic scene composition.
- `packages/render-adapter`: local Chromium/FFmpeg export, media probing, Gemini TTS integration and voice cache.
- `tests`, `templates`, `docs/quality`, and the EasyModerator project assets used for the selectable kit.

The starting V0.03 branch already contained an OpenAI provider, creative screens, and an acceptance-report draft. The implementation work audited and hardened that material; it did not replace the V0.02 engine or user storage.

## Local environment measured during verification

| Component | Measured value |
|---|---|
| Node.js | `v25.6.1` |
| FFmpeg / ffprobe | `9.0-full_build.www.gyan.dev` / version `9.0` |
| Chrome | `155.0.8059.40` |
| Storage | `E:\GrowthStudio` |
| E: free space | `416,450,748,416` bytes (approximately 387.7 GiB) at the recorded check |
| `CONTENT_STUDIO_KEY` | Configured (boolean only; value not read or printed) |
| `CONTENT_STUDIO_GEMINI` | Configured (boolean only; value not read or printed) |

Test runs use a new directory under `E:\GrowthStudio\test-runs\` and do not delete previous user or test data.

## Retained V0.02 media independently probed

The following files predated this implementation and were read-only inputs to the baseline probe:

| File | Dimensions / rate | Duration | Codecs | `volumedetect` mean / max |
|---|---:|---:|---|---:|
| `E:\GrowthStudio\exports\test-c-easymoderator-16x9-story-ducked.mp4` | 1920×1080 @ 30 fps | 29.70 s | H.264 / AAC, mono 96 kHz | −16.5 / −1.5 dB |
| `E:\GrowthStudio\exports\test-f-offline-reopen-reexport.mp4` | 1920×1080 @ 30 fps | 29.70 s | H.264 / AAC, mono 96 kHz | −16.5 / −1.4 dB |

Both files were checked with FFmpeg 9.0 `ffprobe`, `volumedetect`, and `silencedetect=n=-40dB:d=0.5`. `ffprobe` confirmed the listed dimensions, frame rate, codecs, audio sample rate, duration, and file size. No silence interval was reported by the selected detector. This acoustic check is not human listening.

## Baseline test boundary

The V0.02 full automated test suite was not rerun before editing this starting branch. The earlier `V003_BASELINE.md` reported runs and metrics that could not be reproduced from its cited evidence, so they have been removed instead of being repeated as verified facts. Actual V0.03 test commands, isolated output paths, and measured results are recorded in `V003_ACCEPTANCE_REPORT.md` after the implementation verification completes.

The initial branch already contained six V0.03 commits. Therefore the starting SHA above is the verified local implementation base for this task; it is not represented as a fresh branch from V0.02 `main`.
