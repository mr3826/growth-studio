# Growth Studio V0.03

Growth Studio is a local, template-based promotional video editor for apps, SaaS products, services, and brands. Create a project from a product brief, build an editable storyboard, add approved narration and local media, preview it, then render an MP4 on the workstation.

The seven-stage workflow keeps the brief, template, storyboard, brand and media, motion, preview, and export in one project. The three installed templates are `guided_product_story`, `bold_kinetic`, and `app_showcase`; export targets include 9:16, 16:9, and 4:5.

## AI and offline use

OpenAI Creative Director features are optional. The Fastify server reads `CONTENT_STUDIO_KEY` from its process environment and sends a request only after a user starts an AI action and confirms the content to send. The key is never needed in the browser. Gemini speech generation is also optional and uses the server-side `CONTENT_STUDIO_GEMINI` environment variable; approved narration is sent through the current [Gemini speech API](https://ai.google.dev/gemini-api/docs/generate-content/speech-generation). Imported or cached voice files, project editing, local preview, and Chromium/FFmpeg export remain available without either API.

EasyModerator Bold & Future-Facing is a selectable brand kit. New and unrelated projects can use their own palettes, assets, copy, and templates.

## Architecture decisions

- OpenAI generates concepts and structured scene plans; the server validates those plans against the selected template, supported motions/transitions, available assets, and approved product facts.
- The existing local template engine and Chromium/FFmpeg renderer turn approved editable scenes into video. This keeps composition reproducible and export available offline without asking an AI model to generate every frame.
- Project briefs, product evidence, scene approval, assets, narration cache, and exports remain local. Provider calls are opt-in and report usage through local project receipts.

## Requirements

- Node.js 22.12 or newer
- FFmpeg and ffprobe on `PATH`
- Google Chrome or Chromium installed locally
- For the automated suites, a writable `E:\GrowthStudio` volume

## Install and run

```powershell
npm install
npm run build
npm start
```

Open [http://127.0.0.1:4317](http://127.0.0.1:4317). Set the optional API variables in the server process environment before starting it. Do not put API keys in project files or browser-side configuration.

Projects, cached media, renders, and exports use the configured local storage root, normally `E:\GrowthStudio`. The app binds to loopback for local use.

## Verify

```powershell
npm run build
npm test
npm run test:matrix
npm run test:creative
```

The test runner creates a new, uniquely named test directory under `E:\GrowthStudio\test-runs` for each run and preserves prior outputs. The full suite includes server, browser, audio-cache, contract, render, and export coverage. Video tests use the local renderer and validate the resulting MP4s with ffprobe and audio measurements.

The live OpenAI integration check is opt-in and costs API usage. It requires the server-side `CONTENT_STUDIO_KEY` and an explicit test-run flag:

```powershell
$env:LIVE_OPENAI_TEST = '1'
npm run test:creative:live
Remove-Item Env:LIVE_OPENAI_TEST
```

This check sends only its bounded synthetic QA brief, never uploads images, and writes generated projects and video outputs to its isolated test directory.

## Layout

```text
apps/local-server/       Fastify API, local persistence, optional AI providers
apps/web/                React and Vite user interface
packages/contracts/      Project schema, starter projects, storage paths
packages/template-engine/Scene validation and deterministic composition compiler
packages/render-adapter/ Local Chromium capture, FFmpeg, and audio helpers
templates/               Supported templates and motion manifests
tests/                   Automated contracts, browser, audio, render, and video checks
docs/quality/             Baseline evidence and acceptance reports
```

## License

Apache-2.0
