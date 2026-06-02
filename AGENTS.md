# AGENTS.md

Guidance for coding agents working in this repository. This is an n8n **community node** package — a single node (`n8n-nodes-cloudinary.cloudinary`) and a single credential type (`cloudinaryApi`). No service layer, no SDK; zero runtime deps beyond the `n8n-workflow` peer dep.

Deep references live in [docs/](docs/) and are linked inline below — read them when a task touches that area, so this file stays small.

## Commands

- `npm run build` — compile TypeScript and copy SVG/PNG icons into `dist/` via gulp.
- `npm run dev` — `tsc --watch`. Does not re-run the icon copy; if icons change, re-run `build`.
- `npm run lint` / `npm run lintfix` — ESLint (`eslint-plugin-n8n-nodes-base`) over `nodes`, `credentials`, `package.json`.
- `npm run format` — Prettier over `nodes` and `credentials`.
- `npm run n8n-validate` — `@n8n/scan-community-package`; required to pass before publishing.
- `npm run prepublishOnly` — build + stricter lint (`.eslintrc.prepublish.js`); runs automatically on `npm publish`.
- `npm test` — run the Vitest suite once. `npm run test:watch` for watch mode.

## Core rules

These bite often; the linked docs carry the full reasoning.

- **Tests use Vitest, not Jest.** `*.test.ts` is excluded from `tsconfig.json`, so any shared test util importing `vitest` must also be excluded or it leaks into `dist/`. → [docs/architecture.md#testing](docs/architecture.md#testing)
- **Three interaction flows** (signed Upload API / HTTP Basic auth / delivery-URL construction with no API call) — pick the right one when adding an op. → [docs/architecture.md#three-flows](docs/architecture.md#three-flows)
- **Transformation logic lives in the component builders**, not the handlers — Multi-Step is a second consumer and must not drift. Change the builder, not a handler. → [docs/transforms.md](docs/transforms.md)
- **Mirror the Cloudinary API for field/option/output names** (`type`, `public_id`, `resource_type`, …) — don't invent or prefix when an API name exists. → [docs/conventions.md#naming-mirror-the-cloudinary-api](docs/conventions.md#naming-mirror-the-cloudinary-api)
- **Saved-workflow JSON is a public contract** — evolve additively or bump `typeVersion`; never rename a param `name` or option `value`. → [docs/backwards-compat.md](docs/backwards-compat.md)
- **Structured metadata is a pipe-separated string, not JSON** — always go through `metadataToPipeString`. → [docs/conventions.md#structured-metadata-format](docs/conventions.md#structured-metadata-format)

## Architecture at a glance

A declarative node class + a per-operation handler map + small util files:

- [Cloudinary.node.ts](nodes/Cloudinary/Cloudinary.node.ts) — `INodeTypeDescription`; fields from [descriptions/](nodes/Cloudinary/descriptions/) drive the UI via `displayOptions.show` on `resource` + `operation`. `execute()` is a thin loop: resolve creds → look up `operationHandlers[`${resource}:${operation}`]` → wrap the returned JSON into `INodeExecutionData`.
- [operations/](nodes/Cloudinary/operations/) — one file per operation, grouped by resource; each exports an `OperationHandler`. [operations/index.ts](nodes/Cloudinary/operations/index.ts) maps `${resource}:${operation}` → handler.
- [cloudinary.utils.ts](nodes/Cloudinary/cloudinary.utils.ts) — signing, multipart, URL/delivery builders, metadata serialization, error extraction.

**Adding an operation:** (1) add it to the matching `operation` options block + any fields it needs (with the right `displayOptions.show`) under [descriptions/](nodes/Cloudinary/descriptions/); (2) drop a handler file in `operations/<resource>/`; (3) register it in [operations/index.ts](nodes/Cloudinary/operations/index.ts). No change to `execute()` needed.

The full file map, the three interaction flows, the testing setup, n8n integration points, and the build-output contract are in **[docs/architecture.md](docs/architecture.md)**.
