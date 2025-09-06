# Mixing Analyzer

A lightweight web app that uses Google GenAI (Gemini) to provide technical mixing and mastering analyses for audio files. The app is aimed at audio engineers, producers, and music professionals who want automated, technical feedback about mixes or stems (EQ, dynamics, loudness, stereo image, reverb/delay, metadata detection, and AI-generation detection).

---

## Features

- Analyze a single full mix or multiple stems.
- Several analysis modes:
  - Mixing & Mastering feedback (EQ, dynamics, stereo image, loudness metrics, actionable recommendations)
  - Harshness & resonance detection (problem frequency ranges and fixes)
  - Reverb & delay analysis
  - Song metadata (BPM, key, genre, instruments)
  - AI-generation detection with confidence and justification
- Multilingual UI: English, Chinese (Simplified), Japanese.
- Generate and download a Markdown report of the analysis.
- Client-side checks: file count limit (10 files), approximate total duration check (best-effort using browser APIs; ~1 hour recommended max).

---

## Quickstart

Prerequisites
- Node.js (recommended latest LTS)
- A Gemini / Google GenAI API key

Install dependencies
```
npm install
```

Run in development
- Set the API key (see environment variables below), then:
```
npm run dev
```

Build for production
```
npm run build
npm run preview
```

---

## Environment variables

The app expects an API key to be available to the client code at runtime. The repository has historically referenced `GEMINI_API_KEY` in the original README, while the code reads `process.env.API_KEY`. You should ensure one of these is set when starting the dev server or building for production. Recommended approach:

- Create a `.env.local` file at the project root for local dev:
```
# .env.local
API_KEY=your_gemini_api_key_here
# (optional: if other tooling expects GEMINI_API_KEY)
GEMINI_API_KEY=your_gemini_api_key_here
```

Notes
- Vite exposes env variables that start with `VITE_` to client code via `import.meta.env`. This project currently reads `process.env.API_KEY` from the bundle. If you find `API_KEY` is undefined in the browser, either:
  1. Start the dev server with an environment variable set in your shell:
     - PowerShell (Windows):
       ```
       $env:API_KEY="your_gemini_api_key_here"
       npm run dev
       ```
     - macOS / Linux:
       ```
       API_KEY=your_gemini_api_key_here npm run dev
       ```
  2. Or modify the code to use `import.meta.env.VITE_API_KEY` and set `VITE_API_KEY` in your `.env` files (safer for Vite workflows).
- Keep API keys secret. Do not commit secrets to source control.

---

## How it works (high-level)

1. User selects one or more audio files (full mix or stems).
2. The app attempts a best-effort duration check using the browser's Audio metadata API (may return 0 for some formats).
3. The files are converted to base64 and sent inline to the Google GenAI model (`gemini-2.5-flash`) with:
   - A structured system instruction that asks the model to behave as a technical mixing/mastering engineer.
   - A JSON response schema that enforces structured output for each requested analysis.
4. The app parses the JSON response, renders a sanitized HTML view, and provides a Markdown report for download.

---

## UI / Usage details

- Upload: click "Choose Track or Stems" and pick up to 10 audio files.
- Select the analyses you want (Mixing Feedback, Harshness, Effects, Metadata, AI Check).
- Click "Analyze Audio". Wait for the AI response (may take several seconds depending on network and model latency).
- If the AI returns structured JSON as expected, you'll see rendered sections for each selected analysis and can download the report as Markdown.
- If parsing fails, an error message will be shown and the console will contain the raw AI response for debugging.

Supported file types (best-effort)
- WAV, FLAC, MP3 (also accepts other types but browser support & inference by the model vary).

Client-side limits and checks
- Maximum: 10 files per analysis request.
- Total duration: app checks and warns if the total estimated duration seems to exceed ~1 hour (3600 seconds). This is a heuristic — the model may accept different limits.

---

## Troubleshooting

- API key missing / Authorization errors
  - Ensure `API_KEY` (or GEMINI_API_KEY) is set in your environment before running the dev server or building the site.
  - Check browser console for network errors and authorization failures.

- AI response parsing fails (invalid JSON)
  - The app expects the model to return a single valid JSON object that conforms to the provided schema.
  - If parsing fails, open the browser console to inspect `response.text` (the raw AI response). The model might have returned non-JSON text or included additional commentary.
  - Typical fixes:
    - Lower temperature (the code sets temperature to 0 for deterministic output).
    - Confirm the model used supports structured output by schema.
    - If the model includes text outside of JSON, consider stricter system instructions or pre/post-processing.

- Duration returns 0 or unknown
  - Some formats or cross-origin media may not expose metadata to the browser. This only affects the client-side UX check; the AI will still receive the base64 audio data.

---

## Development notes

Key files
- `index.tsx` - main client application code handling UI, file conversion, AI request, rendering, and report generation.
- `index.html` - app HTML
- `index.css` - styling
- `metadata.json` - app metadata (used for publishing to AI Studio)
- `package.json` - scripts & dependencies

Notable dependencies
- @google/genai — client to interact with Gemini / GenAI
- marked — Markdown rendering for recommendations
- dompurify — sanitizes AI-generated HTML for safe rendering

NPM scripts
- `dev` — start Vite dev server
- `build` — build production bundle
- `preview` — preview production build locally

Suggested improvements (ideas)
- Switch to `import.meta.env.VITE_API_KEY` and document Vite env usage.
- Add a server-side proxy for the GenAI requests to keep API keys off the client.
- Add unit & integration tests for parsing and rendering logic.
- Add production CORS & rate-limit handling when using a server.

---

## Security & privacy

- Audio files are sent to the GenAI model as base64 inline data. Do not upload sensitive or private audio recordings unless you consent to sending them to the model provider.
- Consider moving AI requests server-side to avoid exposing API keys to client bundles and to add access control and logging.

---

## Metadata

- Project name (metadata.json): Mixing Analyzer
- Description: An AI-powered mixing analyzer for audio engineers, producers, and music professionals.

---

## License & attribution

Several source files contain Google LLC Apache-2.0 headers (see individual files). Add an appropriate LICENSE file if you intend to publish under a specific license.

---

## Contact / Contribution

- Open an issue or pull request on the repository to propose fixes or enhancements.
- Please avoid committing secrets (API keys) to the repo.

---

## Example .env.local

```
# .env.local (project root)
API_KEY=your_gemini_api_key_here
# Optional (if other tools expect this)
GEMINI_API_KEY=your_gemini_api_key_here
```

---

Thank you for using Mixing Analyzer. If you want, I can:
- Convert the API env handling to `VITE_API_KEY` and update the code to use `import.meta.env`.
- Add a LICENSE file or CI config for automated builds.
