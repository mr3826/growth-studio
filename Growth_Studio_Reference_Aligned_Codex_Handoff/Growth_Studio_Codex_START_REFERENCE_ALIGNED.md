# Paste this ONE prompt into Codex

**GOAL: Complete the existing `mr3826/growth-studio` repository as Growth Studio V0.01 — an offline, generic, reference-quality product promotional video generator.**

Read **both attached documents IN FULL before changing code**:
1. `Growth_Studio_V0.01_Codex_Completion_Goal_REFERENCE_ALIGNED.md` — authoritative implementation and acceptance contract.
2. `Growth_Studio_Reference_Video_Analysis.md` — the style, pacing, storyboard, format and long-form requirements derived from my reference video.

**Reference video:** I will provide a private local copy of `WhatsApp Video 2026-10-09 at 9.53.33 AM.mp4` if possible. If present, inspect it read-only. Do not upload, commit, redistribute, embed or imitate another product's logo/screenshots/marketing copy. Implement original reusable templates that can create the *same kind* of sophisticated product demonstration using my own input data and licensed assets.

**Critical changes from the earlier V0.01 goal:**
- Make **Guided Product Story / Problem→Solution** the hero template: chapter/storyboard-driven, kinetic Bengali/English typography, editorial backgrounds, highlighted words, animated phone and browser UI screenshots, on-screen callouts, smooth pans/zooms, interludes and CTA.
- Preserve two additional **genuinely distinct**, working templates: Bold Kinetic and App/Product Showcase.
- Make template form fields dynamic and fully functional; scene/chapter copy and media are provided by users. No EasyModerator-specific defaults.
- Use an action-first user journey: create → choose template → write/storyboard → add brand and screenshots/audio → customize motion → preview/validate → export.
- Support **4:5 (1080×1350 at 25 fps)**, **9:16 (1080×1920 at 30 fps)** and **16:9 (1920×1080 at 30 fps)**, with actual responsive scene compositions.
- Permit reference-length story videos (~10m41s) by lifting the 120s cap; design for **>=12 minutes** when actual disk/CPU permits, without accumulating full-res image sequences or overflowing system temp.
- On Windows, inspect free space; prefer **E:** for heavy projects, imported assets, render temp, and exports if available/writable with sufficient room. Do not invent disk metrics, force migrations, or delete user files.
- Preserve the current React/Vite/Fastify/Chromium/FFmpeg code when it works; only add or replace parts when actual evidence justifies it. No need to integrate HyperFrames if the existing frame-accurate pipeline is sufficient.
- Fix real render cancellation, origin/path security, file persistence, offline behavior and output verification. Do not create fake completion UI.

**Implement—not just plan.** Start by checking `git status`, exact remote SHA, local Windows hardware and E: space, and executing the current test/render baseline. Work on a new local feature branch; read the four original spec files already in the repo, plus the relevant Jeffallan skills. Record the baseline audit, execute the goal phases, commit locally after verified milestones, test the actual browser workflow, render outputs, inspect representative visual frames, run offline and security tests, and conduct an independent review. Do not push/create PR/merge/deploy without my permission.

**Done means:** all 3 templates really render, generic first run, all inputs change final video, safe save/reopen, real cancel/retry, correct offline Windows behavior, configured E: storage (where suitable), and **8 checked MP4s**: six 9:16/16:9 exports plus a 4:5/25fps 45–90s reference-inspired video and one 4:5 reference-length >=10m42s video. Include Bengali text legibility, screenshot movements, voice/audio when provided, 10-point creative quality rubric and `ffprobe` output. If the long render or any other gate is blocked by tested hardware, report **CONDITIONAL/BLOCKED** with evidence; never claim PASS on scaffolding, README statements, sample videos alone, or tests that did not actually run.

Follow the detailed report format in the goal file. **Begin now.**
