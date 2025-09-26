# Rive → CasparCG Generator

A Cloudflare worker to generate production‑ready **CasparCG HTML templates** from your **Rive (.riv)** files — without uploading the .riv to the server. The .riv file is inspected locally in your web browser; the Worker receives only a small JSON schema (artboard, state machine inputs, and data‑binding properties) and returns a tailored HTML template that implements CasparCG’s HTML API (`update`, `play`, `next`, `stop`, `remove`).

<p align="center">
  <img alt="Rive to CasparCG" src="https://img.shields.io/badge/Rive-%E2%86%92%20CasparCG-blue"> 
  <img alt="Cloudflare Workers" src="https://img.shields.io/badge/Cloudflare-Workers-orange">
  <img alt="PicoCSS" src="https://img.shields.io/badge/UI-PicoCSS-6aa">
</p>

---

## Key Features

* **No Upload of .riv**: The browser reads the .riv file via the Rive web runtime; only a schema (names & types) is POSTed to the Worker. Your Rive artwork stays secure.
* **PicoCSS UI**: Clean, responsive index page with file picker, artboard/state‑machine selectors, property/inputs list, and trigger mapping.
* **CasparCG‑Ready Output**: Downloadable HTML template that implements the AMCP HTML template API.
* **Pluggable Generators**: Modular “template plugins” (e.g., a basic single‑HTML template, a lower‑third variant, or a ZIP bundle with assets).
* **Cloudflare Workers**: One Worker serves the UI (static assets) and handles `/generate` for template creation.

---

## How it Works

1. **Select a .riv** in the UI (served from `/public`).
2. The page loads the Rive Canvas runtime, opens the file from memory, and discovers:

   * Artboards & State Machines
   * State Machine Inputs (boolean/number/trigger)
   * ViewModel (data‑binding) Properties (string/number/boolean/color)
3. You optionally map **trigger inputs** to Caspar actions (Play/In, Out, Next).
4. The browser sends a **schema JSON** + options to `POST /generate`.
5. The Worker calls a selected **template plugin** and returns a ready‑to‑use HTML file (or a ZIP), which your browser downloads.

**Privacy**: The .riv bytes never leave your machine. Only a small JSON schema is transmitted.

---

## Project Structure

```
rive-casper-generator/
├─ wrangler.toml
├─ public/                 # Static UI (served as Workers assets)
│  ├─ index.html           # PicoCSS UI; reads .riv locally
│  ├─ css/
│  └─ js/
├─ src/
│  ├─ worker.mjs           # Worker entry (handles /generate)
│  ├─ router.mjs           # Lightweight router (optional)
│  ├─ handlers/
│  │  ├─ generate.mjs      # POST /generate → call plugin
│  │  └─ list-templates.mjs# GET /templates → enumerate plugins
│  ├─ lib/
│  │  ├─ schema.js         # Types + minimal validation
│  │  ├─ utils.js          # Headers & helpers
│  │  └─ zip.js            # (optional) ZIP bundling
│  └─ templates/           # Template plugins
│     ├─ registry.mjs
│     ├─ caspar-basic.mjs
│     ├─ caspar-lowerthird.mjs
│     └─ caspar-bundle.mjs
└─ README.md
```

---

## Prerequisites

* Node.js (for local tooling via `npx`)
* Cloudflare account & Wrangler (for deploys)

> You do **not** need a build step for the UI; `/public` is served as static assets by the Worker.

---

## Quick Start (Local)

1. **Install & run dev server**

   ```bash
   npx wrangler dev
   ```
2. Open **[http://127.0.0.1:8787/](http://127.0.0.1:8787/)**. Select a `.riv`, choose artboard/state machine, map triggers, click **Download**.

### Example `wrangler.toml`

```toml
name = "rive-casper-generator"
main = "src/worker.mjs"
compatibility_date = "2025-09-26"
compatibility_flags = ["nodejs_compat"]

[assets]
directory = "public"
# binding = "ASSETS"   # optional; if you want to fetch assets from code
```

---

## Deploy

```bash
npx wrangler deploy
```

If your CI expects a specific Worker name, ensure `name = "…"` in `wrangler.toml` matches the CI configuration.

---

## Using the UI

1. **Select .riv** (top center).
2. Pick **Artboard** and **State Machine** from the detected lists.
3. Review **ViewModel properties** and **State Machine inputs** (read‑only).
4. Choose which **trigger inputs** should be called for **Play/In**, **Out**, and **Next** (optional).
5. Click **Download** to get the generated Caspar template.

---

## API

### `POST /generate`

Request body:

```json
{
  "template": "caspar-basic",
  "filename": "caspar-mygraphic.html",
  "schema": {
    "artboard": "Main",
    "stateMachine": "MainSM",
    "inputs": [ { "name": "Show", "type": "trigger" } ],
    "viewModelProps": [ { "name": "Title", "type": "string" } ]
  },
  "options": {
    "casparTriggers": { "in": "Show", "out": "Hide", "next": null },
    "includeViewModelProps": true
  },
  "aliasMap": { "Headline": "Title" }
}
```

Response:

* `text/html` (downloaded file) or `application/zip` (if the plugin returns a bundle).

---

## Template Plugins

A plugin is a pure function that turns a `schema` into a file (HTML or ZIP):

```js
export default {
  key: "caspar-basic",
  name: "Caspar Basic",
  kind: "single-html",
  description: "AMCP HTML template",
  async generate(schema, { aliasMap = {}, options = {} } = {}) {
    // Build and return { type: "html"|"zip", content }
  }
}
```

Register new plugins in `src/templates/registry.mjs` and the UI can expose them via `/templates`.

---

## CasparCG Template Behavior

The generated HTML provides:

* `window.update(rawJsonString)`: apply data (text/colors/booleans/numbers) and fire triggers when values are `true`.
* `window.play()`: start animation (and optional mapped “In” trigger).
* `window.next()`: optional mapped trigger or controlled via `UPDATE`.
* `window.stop()`: optional mapped “Out” trigger or stop playback.
* `window.remove()`: cleanup.

**Tip:** You can always drive any input via `CG … UPDATE` JSON keys matching your Rive names (or the aliases you provided).

---

## Troubleshooting

* **Missing entry point**: Ensure `main = "src/worker.mjs"` exists in `wrangler.toml` and that the file is committed.
* **Static HTML import errors**: Don’t `import "public/index.html?raw"`; serve it via `[assets]` instead.
* **Name mismatch in CI**: Align `name = "…"` with the CI/Workers project name.
* **404s in dev**: Verify `/public` exists and the `[assets]` directory matches.
* **Rive not loading**: Confirm the runtime script is loaded (`@rive-app/canvas`) and a hidden `<canvas>` exists.

---

## Roadmap

* ZIP bundle output (HTML + `/assets/graphics.riv` placeholder)
* Multiple template presets (lower third, bug, ticker)
* Alias editor UI and type‑aware form generation
* Optional remote schema signing or caching (still without uploading .riv)

---

## Contributing

PRs welcome! For significant changes, please open an issue first to discuss your idea. Follow the modular plugin pattern and include tests for new generators.

---

## License

MIT © Your Name

---

## Acknowledgements

* [Rive Web Runtime]
* [CasparCG]
* [Cloudflare Workers]
* [PicoCSS]

> Trademarks and brand names are the property of their respective owners.
