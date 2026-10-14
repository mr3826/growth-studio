# Kinetic Studio V0.01 — Offline Promotional Video Generator

**Kinetic Studio** is a completely offline, template-driven local web application that transforms user briefs, copy, brand assets, and animation preferences into high-impact promotional MP4 videos.

---

## ⚡ Highlights

- **100% Offline Runtime**: Requires zero cloud accounts, third-party APIs, or external network connectivity.
- **Local Full-Stack**: Built with React 18, Vite, TypeScript, and a Fastify server bound strictly to `127.0.0.1:4317`.
- **Production Bold Kinetic Template**: High-contrast, typographic promotional template with support for kinetic text hooks, problem-solution statements, UI mockups, and CTA closings.
- **Deterministic Frame Engine**: Every frame is mathematically computed by timeline position (`seekToFrame`), completely eliminating wall-clock jitter.
- **Real MP4 Rendering**: Local rendering pipeline utilizing Headless Chromium and FFmpeg with H.264 video encoding and AAC audio mixing.
- **Dual Aspect Ratios**: Generates both Portrait `1080×1920` (9:16) and Landscape `1920×1080` (16:9) at 30 FPS.
- **Interactive UI**: Live seekable preview player, aspect ratio toggle, brand kit customizer, scene manager, asset uploader, preflight validation modal, and real-time SSE render logs.

---

## 🛠️ Architecture Overview

```text
growth-studio/
├── apps/
│   ├── local-server/         # Fastify API coordinator running on 127.0.0.1:4317
│   └── web/                  # React 18 + Vite local UI with dark design system
├── packages/
│   ├── contracts/            # JSON Schema 2020-12 validator & project presets
│   ├── template-engine/      # Bold Kinetic responsive compiler & deterministic timeline engine
│   └── render-adapter/       # Offline Chromium frame-by-frame capture & FFmpeg MP4 pipeline
├── templates/
│   └── bold_kinetic/         # Production template manifest and modular scenes
├── data/
│   ├── projects/             # Local project storage, versioned snapshots, assets
│   └── exports/              # Exported MP4 videos & UI screenshots
└── tests/
    ├── server.test.js        # Fastify API integration tests
    ├── render.test.js        # Headless Chrome + FFmpeg rendering tests
    ├── browser.test.js       # End-to-end browser UI automation tests
    └── e2e.test.js           # Complete 7-stage pipeline verification
```

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v20+)
- [FFmpeg](https://ffmpeg.org/) (installed and available in system `PATH`)
- Google Chrome or Chromium (installed locally)

### Installation

```bash
# Install all dependencies across workspaces
npm install

# Build the frontend bundle
npm run build
```

### Running Locally

```bash
# Start the local server
npm start
```

Open your browser and navigate to:
👉 **[http://127.0.0.1:4317](http://127.0.0.1:4317)**

---

## 🧪 Testing & Verification

Kinetic Studio comes with automated test suites verifying all aspects of the application:

```bash
# Run Fastify API tests
node tests/server.test.js

# Run rendering engine test (produces 1080x1920 sample MP4)
node tests/render.test.js

# Run Puppeteer browser UI automation test
node tests/browser.test.js

# Run full end-to-end pipeline verification (exports portrait & landscape MP4s and checks ffprobe metrics)
node tests/e2e.test.js
```

---

## 📄 License

Apache-2.0
