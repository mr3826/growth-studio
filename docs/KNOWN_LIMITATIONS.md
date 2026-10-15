# Growth Studio V0.03 — Scope, Limitations, and Operations

This document describes the current local workflow and provider boundaries. Account access, network availability, model catalogs, and human review can affect a particular run.

## Current scope

| Area | V0.03 behavior | Boundary |
|---|---|---|
| Creative workflow | Brief and product facts, three concepts, editable template-bound storyboard, scene rewrite/review, approval, brand/media, narration, motion, preview, and export. | AI drafts remain editable; approval, quality control, and publishing remain human actions. |
| Templates | `guided_product_story`, `bold_kinetic`, and `app_showcase`; scene types, motion, transitions, and media are validated against installed manifests. | AI cannot add renderer features or select unknown assets. |
| Formats | 9:16, 16:9, and 4:5 output through local Chromium and FFmpeg. | Export speed and visual fidelity depend on the local workstation and installed fonts/codecs. |
| Brand kits | EasyModerator Bold & Future-Facing remains selectable; unrelated products use their own palette and assets. | EasyModerator colors are not the default for unrelated brands. |
| Storage | Projects, caches, renders, and exports use the configured local storage root, normally `E:\GrowthStudio`. | Cloud sync and multi-machine rendering are outside this release. |
| Offline operation | Existing project edits, manual scripts, imported/cached narration, preview, and export continue offline. | New OpenAI concepts/storyboards and uncached Gemini speech require explicit online requests. |

## OpenAI Creative Director

- The local Fastify server reads `CONTENT_STUDIO_KEY`; the browser receives only configuration status and sanitized results.
- A user action and explicit consent are required before sending the bounded brief or selected storyboard text. Requests use the official Responses API, strict structured output, `store: false`, local validation against the selected template, output/token caps, and project spend limits.
- Model access and pricing can change. Provider errors, invalid structured output, quota limits, and timeouts return safe failures without disabling manual editing or export. The integration does not retry automatically.
- Generated claims must map to approved product evidence. Unknown facts, performance metrics, testimonials, capabilities, and integrations are not treated as verified copy.

## Gemini narration

- The server reads `CONTENT_STUDIO_GEMINI` and sends it in the `x-goog-api-key` request header. Provider-status responses expose only availability and the supported voice choices.
- Current REST synthesis uses `gemini-3.8-flash-tts`. Gemini 3.8 unary output is a complete 24 kHz, mono, 16-bit PCM WAV; the adapter preserves that RIFF file and retains a wrapper for headerless PCM responses. See [Google's current speech-generation guide](https://ai.google.dev/gemini-api/docs/generate-content/speech-generation).
- Only user-approved, non-empty scene narration can be sent, after explicit consent. Cached WAVs and imported narration remain usable offline.
- Model availability, quota, and voice quality depend on the Gemini account. This offline regression suite does not make a live Gemini request, and automated volume checks do not replace human listening.

## Audio and export checks

- Scene narration, music, sidechain ducking, explicit silent mode, media probes, and silence/volume checks are handled by the existing local audio pipeline.
- A deliberately silent export is valid only when the project declares silent mode. Reported FFmpeg `volumedetect` levels are technical measurements, not an EBU/ITU loudness certification or a human intelligibility assessment.
- Test runs create unique directories under `E:\GrowthStudio\test-runs` and preserve earlier results.

## Operational guidance

1. Record supported product claims in the product truth profile with evidence and approval before generating copy.
2. Review and approve scene narration before requesting Gemini speech generation.
3. Keep API keys in the local server environment. Do not place keys in client configuration, project files, or URLs.
4. Keep local source assets and cached voice files available when reopening a project offline.
5. Check export preflight and review the final MP4 before distribution.
