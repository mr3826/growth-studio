# Growth Studio V0.01 — Baseline Audit & System Inventory

**Date:** 2026-10-14  
**Branch:** `feat/growth-studio-v001-completion`  
**Base SHA:** `e1e1ee4089f788ede3fbfd81c006b7c07f40b19a`  
**Repository:** `mr3826/growth-studio`  

---

## 1. Environment & Hardware Inventory

| Item | Value / Status | Notes |
| :--- | :--- | :--- |
| **OS** | Windows 10/11 Enterprise (64-bit) | Local physical machine |
| **Node.js** | `v25.6.1` | Local Node runtime |
| **FFmpeg** | `9.0-full_build-www.gyan.dev` | In system PATH, hardware accelerated H.264 & AAC |
| **ffprobe** | Present in PATH | Validates codecs, frame counts, bitrates, audio channels |
| **Chromium / Chrome** | `155.0.8037.0` | `C:\Program Files\Google\Chrome\Application\chrome.exe` |
| **Drive C:** | **8.13 GB free** (out of 235.8 GB) | **CRITICALLY CONSTRAINED**. Unsuitable for render scratch / buffers. |
| **Drive D:** | **154.29 GB free** (out of 251.51 GB) | Code repository root: `D:\hexabyte_technologies\growth-studio` |
| **Drive E:** | **388.07 GB free** (out of 484.69 GB) | **PRIMARY LARGE STORAGE**: Target for render scratch, projects & exports |
| **Drive F:** | **186.75 GB free** (out of 195.31 GB) | Secondary storage |
| **Bengali Fonts** | `Nirmala.ttc` in `C:\Windows\Fonts` | Standard Windows Indic font; offline fonts to be bundled |

---

## 2. Baseline Architecture & Defect Identification

### 2.1 Current Strengths
1. **Piped Rendering Pipeline**: Frame streaming from Puppeteer (`page.screenshot`) into FFmpeg `stdin` (`image2pipe`) already avoids dumping thousands of PNGs to disk.
2. **Local Fastify Server**: Fastify running on `127.0.0.1:4317` with modular routes for projects, templates, and renders.
3. **React/Vite UI**: Functional UI with Canvas/HTML preview and controls.

### 2.2 Baseline Defects & Missing Requirements Against V0.01 Reference Spec

| # | Defect / Limitation | Specification Requirement | Fix Strategy |
| :--- | :--- | :--- | :--- |
| 1 | **Hardcoded C: Temp Usage** | Spec §5 requires central storage path resolver and using E: drive (388 GB free) | Implement storage resolver defaulting to `E:\GrowthStudio` (with graceful fallback to `D:\hexabyte_technologies\growth-studio\data\growth-studio`), never using C: temp. |
| 2 | **120s Duration Limit** | Spec §6 requires supporting long walkthroughs (up to >=720s) | Remove 120s hard cap; calculate required disk/memory dynamically in preflight. |
| 3 | **Only 1 Template (`bold_kinetic`)** | Spec §4 requires 3 distinct templates: `guided_product_story` (HERO), `bold_kinetic`, `app_showcase` | Build `guided_product_story` with chapter storyboard, 4:5 reflow, Bengali kinetic typography, highlighted bars, device mockups; implement `app_showcase`. |
| 4 | **No 4:5 Aspect Ratio (1080x1350 @ 25 FPS)** | Spec §1 & §4 requires 4:5 (1080x1350 @ 25 FPS) matching the reference video | Implement 4:5 target in contracts, templates, preview, and render engine. |
| 5 | **Flat Tab UI instead of Action-First Work Tree** | Spec §3 requires 7-stage Action-First Work Tree (Project Home -> Create -> Choose Template -> Message & Storyboard -> Brand & Media -> Customize Motion -> Preview & Validate -> Export) | Rebuild `apps/web` navigation and state flow into the guided work-tree. |
| 6 | **Product-Specific EasyModerator Hardcoding** | Spec §2 requires generic neutral first-run flow (e.g. Blank SaaS, Blank App) | Decouple templates and starter projects from any specific commercial product. |
| 7 | **Render Cancellation Does Not Abort Process** | Spec §6 & §8 requires true abort terminating child process trees on Windows | Implement `tree-kill` / `taskkill /PID /T /F` logic on render cancellation. |
| 8 | **Audio Import & Mix Support** | Spec §5 requires supporting local music & narration tracks | Integrate audio inputs into render FFmpeg pipeline (`-i audio.mp3 -c:a aac -shortest`). |

---

## 3. Architecture Decision Records (ADRs)

### ADR-001: Chromium + FFmpeg Direct-Pipe Renderer vs HyperFrames
- **Context:** Spec §6 asks to evaluate whether HyperFrames should be adopted or whether the current Chromium+FFmpeg direct-pipe architecture meets all requirements.
- **Decision:** **Retain and optimize the Chromium + FFmpeg direct-pipe renderer**.
- **Rationale:** The current renderer already achieves frame-accurate, deterministic rendering by seeking virtual time in Chromium and piping buffers directly into FFmpeg `stdin`. HyperFrames would introduce complex external dependencies without solving any offline limitation that cannot be handled directly in the Chromium DOM.

### ADR-002: Storage Resolver on Drive E:
- **Context:** Drive C: has only 8.13 GB free. A 10-minute 25 FPS render (15,000+ frames) could easily exhaust C:. Drive E: has 388.07 GB free.
- **Decision:** Introduce `getStorageRoot()` in `@kinetic-studio/contracts` and backend:
  - If `E:\` is accessible and writable, root is `E:\GrowthStudio\`.
  - Directory structure:
    - `E:\GrowthStudio\projects\`
    - `E:\GrowthStudio\renders\`
    - `E:\GrowthStudio\exports\`
    - `E:\GrowthStudio\cache\`
  - All temp folders and export destinations will reside on `E:\`.
  - Configurable via `GROWTH_STUDIO_DATA_DIR` environment variable.

### ADR-003: Aspect Ratio & Frame Rate Reflow
- **Context:** The reference video is 4:5 (1080x1350) at 25 FPS. The existing system only supported 9:16 and 16:9 at 30 FPS.
- **Decision:** Support three distinct targets:
  - `portrait_4_5`: 1080×1350 @ 25 FPS (Reference Standard)
  - `portrait`: 1080×1920 @ 30 FPS (Vertical Reel / Story)
  - `landscape`: 1920×1080 @ 30 FPS (Widescreen 16:9)

---

## 4. Baseline Gate Status
- **Baseline Audit**: **PASSED**
- **Action Plan**: Proceed to **Phase B** (dependable installation, central storage resolver on E:, offline checks).
