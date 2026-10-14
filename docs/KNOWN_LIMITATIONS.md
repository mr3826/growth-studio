# Growth Studio V0.01 — Known Limitations & Architectural Scope

This document provides an honest, transparent assessment of Growth Studio V0.01's current technical boundaries, design decisions, and future roadmap differentiators.

---

## 1. Scope Boundaries for V0.01

| Feature Area | V0.01 Production Implementation | Future Scope (V0.02+) |
| :--- | :--- | :--- |
| **Offline Operation** | 100% self-contained local loopback (`http://127.0.0.1:4317`). Zero external cloud calls, no accounts, no API keys. | Optional cloud backup sync to private S3/GCS buckets. |
| **Video Encoding** | Local Chromium page frame capture piped directly into local FFmpeg (`image2pipe` -> `libx264` / `aac`). | Hardware-accelerated NVENC / QuickSync encoding profiles. |
| **Aspect Ratios** | Dedicated responsive reflow across 4:5 (1080×1350 @ 25 FPS), 9:16 (1080×1920 @ 30 FPS), and 16:9 (1920×1080 @ 30 FPS). | Custom arbitrary resolutions (e.g. ultra-wide 21:9 or billboard displays). |
| **Typography & Scripts** | Complete offline Bengali (বাংলা) and English kinetic typography with conjunct preservation (যুক্তাক্ষর), punctuation stripping, and accent highlight sweeps. Uses native Windows `Nirmala UI` and web-safe fallbacks. | Dynamic TTF/WOFF2 webfont drag-and-drop loader. |
| **Audio Pipeline** | Local prerecorded audio import (`.wav`, `.mp3`, `.aac`, `.m4a`), volume control, cross-fades, and automatic looping. Fallback silent stereo audio generator (`anullsrc`). | Real-time text-to-speech (TTS) voice synthesis and automated beat-marker detection. |
| **Templates** | 3 distinct structural archetypes: `guided_product_story` (hero reference), `bold_kinetic` (punchy text), `app_showcase` (hardware UI demo). | Custom user-authored template DSL and community template marketplace. |
| **Storage Architecture** | Central storage resolver automatically detects and prioritizes Windows drive `E:\GrowthStudio` (with 388+ GB headroom) for projects, render buffers, and exports, safeguarding drive `C:`. | Multi-drive striping and automated archival to cold storage. |

---

## 2. Platform-Specific Considerations

### Windows Storage Drive Detection
- On Windows systems with an active `E:` drive, Growth Studio automatically roots all heavy operations in `E:\GrowthStudio` (`projects/`, `renders/`, `exports/`, `cache/`).
- On systems lacking an `E:` drive or running Linux/macOS, the engine safely falls back to `{cwd}/data` with system temp directories.
- The preflight validation engine enforces a mandatory 2.0 GB headroom safety reserve before any render job is allowed to execute.

### Process Termination on Windows
- Windows does not support POSIX process group signals (`SIGTERM`/`SIGKILL`) for child subtrees.
- Growth Studio implements native `taskkill /pid <PID> /T /F` execution inside `packages/render-adapter/src/index.js` to ensure zero orphaned FFmpeg or Chromium processes when an export is aborted by the user.

---

## 3. Operational Best Practices

1. **Long-Form Walkthroughs (>=10 minutes)**:
   - For long-form walkthroughs (e.g. 10m42s / 642s), use the direct JPEG acceleration pipeline (`frameFormat: 'jpeg'`) to maintain high encoding throughput (~20-25 fps) while keeping memory usage strictly bounded.
2. **Local Media Assets**:
   - For crisp screenshots inside mobile and desktop mockups, use PNG or WebP images with a minimum resolution of 1080px wide.
3. **Bengali Text Input**:
   - Ensure Bengali text is entered in standard Unicode UTF-8. The grapheme tokenizer automatically splits tokens around conjuncts and matras without breaking complex characters.
