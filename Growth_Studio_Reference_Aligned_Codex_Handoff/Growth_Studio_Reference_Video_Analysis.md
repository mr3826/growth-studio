# Reference Video Analysis — Growth Studio V0.01

**Purpose:** Provide the coding agent an observable target for *style and production capabilities*, not a request to copy somebody else's branding, product screens, wording or exact scenes.

## Source and measured facts

- Uploaded reference: `WhatsApp Video 2026-10-09 at 9.53.33 AM.mp4` (user-supplied video; keep PRIVATE and out of Git).
- Duration: **641.45 seconds (10 minutes 41.45 seconds)**.
- Video stream: **368 × 464**, aspect ratio **0.7931** (approximately **4:5**, NOT 9:16); **25 fps**; H.264 / yuv420p.
- Audio track: **AAC**, 48 kHz, stereo. The precise speech/dialogue was **not transcribed**, so do not assume timing/transcript accuracy from this analysis alone.
- This is a **long-form, chapter-based Bengali-language product demonstration/promotion**, not a purely typographic 15-second ad.

## Observed creative grammar

1. **Editorial, bright canvas:** Predominantly warm off-white/light-cream backgrounds, occasional full-screen vivid lime accents, dark near-black typographic emphasis, simple thin rules, restrained shadows and subtle backdrop texture.
2. **Bangla-first kinetic typography:** Large heavy Bengali headlines, highlights and underlines behind selected words, short staggered reveals, punchline/benefit beats, foreground labels and small subtitles. Multiple short text beats rather than a wall of text.
3. **Kinetic UI explainer:** Small desktop dashboard screenshots layered alongside large phone/Messenger-like mockups, product cards, crop/focus animations, browser windows, arrows, badges, icons and pinpoint callouts.
4. **Narrative chapters:** Begins with a value proposition and pain/cost question; then shows communication/inbox screens, mobile chat and product discovery, interactions/orders, more back-office functions, and a branded call to action. Not every frame shows the software—typographic contrast screens punctuate long demonstrations.
5. **Layered motions:** Pan/zoom/reframe of interfaces, device slide/float, text reveals, highlight sweeps, callout entrance/exit, focus changes, scene-to-scene wipes/fades; deliberately sparse compositions even when visual content is complex.
6. **Clear visual hierarchy:** One primary claim/headline and one primary UI interaction at a time; strong scale contrast, left/right negative space, readable captions, consistent brand chips.
7. **Sound matters:** A real audio stream is present. Implement imported voiceover/music, timeline placement, gain/muting and fades. Do not claim speech-to-text or precise transcript alignment unless implemented and verified.
8. **Long-form pacing:** A series of many short illustrative actions/interludes is connected into a >10-minute walkthrough; scene composition, asset management and rendering must be efficient beyond 120 seconds.

### Example reference timestamps (indicative, not exact shot boundaries)

| Time | Observable beat | Template requirement |
| --- | --- | --- |
| 00:00 | Value headline + multiple platform icons + dashboard visual | Branded title + icon cluster + screenshot layer |
| 00:24 | Full lime typographic punchline/large numeric glyph | High-contrast accent beat / oversized typography |
| 01:25 | Large phone device adjacent to thin alignment line | Responsive phone frame and geometric motion |
| 01:57 | Product picture and Bengali headline with highlighted word | Text/media split + word highlight |
| 03:50 | Phone conversation and UI callout labels | UI mockup + callout tracking |
| 04:32 | Phone message/product detail sequence | Zoom/pan/crop and narrated UI step sequence |
| 06:25 | Dashboard form with specific spotlight labels | Browser screenshot focus rect and annotations |
| 09:25 | Bold transition card with near-empty background | Chapter interlude / pacing controls |
| 10:37 | Full-frame lime typographic closing punchline | Outro crescendo / CTA |

## What to reproduce versus NOT reproduce

**Reproduce as capabilities:** bright editorial theme, strong typography, Bengali-safe line breaking, accents, scene grammar, screenshot-driven product demonstrations, camera moves, mobile and browser mockups, animation synchrony, voiceover support, variable shot duration, 4:5 support, long-form chapters.

**Do NOT copy:** original product/competitor name or logo, third-party interface screenshots, exact Bengali promotional copy, trademarks, fabricated product behavior or source video frames. Instead, use user-provided licensed content or original generic mockups.

## Implementation implications

- Make **Guided Product Story / Problem→Solution** the **reference-inspired hero template**, with modular chapter scenes, and keep **Bold Kinetic** and **App/Product Showcase** as two other distinct real templates. Three templates total, not four loosely working examples.
- Support **4:5 (1080×1350)** at **25 fps** as an additional target, while preserving **9:16 (1080×1920)** and **16:9 (1920×1080)** at 30 fps.
- Remove the fixed **120-second** hard cap; support **10:41.45 reference length** with an adjustable, resource-aware long-form ceiling >= **12 minutes**, and preflight limits based on disk/compute.
- Add a **chapter/storyboard form**, content-to-scene assignment, per-layer media/typography/callout inputs, reusable motion recipes, editable cue durations, optional prerecorded narration, and scene-level audio cues.
- Render preview and exported video from the **same seekable timeline**, including Bangla grapheme-safe animation and imported media bounds.
- Favor scene composition reuse and streaming output; never retain 10-minute full-resolution image sequences or render temp on C: when E: selected.
- Use a **creative quality rubric** in addition to technical checks (clear hierarchy, legibility, safe areas, purposeful transitions, consistent branding, non-static scenes and sound/timing).

## Local handoff

Copy the reference video to a user-approved private path on the Windows computer such as `E:\GrowthStudio\references\source-reference.mp4` only after verifying E: availability and consent. Do **not** git add the file, do not bundle or publish it, and do not send it to any cloud AI service. If the original cannot be made available to Codex, this measured analysis and the contact sheet are minimum acceptable reference inputs; mark pixel-level/visual-comparative QA as unverified rather than invented.
