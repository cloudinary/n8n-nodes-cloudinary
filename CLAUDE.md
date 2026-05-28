# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run build` — compile TypeScript and copy SVG/PNG icons into `dist/` via gulp.
- `npm run dev` — `tsc --watch`. Does not re-run the icon copy; if icons change, re-run `build`.
- `npm run lint` / `npm run lintfix` — ESLint with `eslint-plugin-n8n-nodes-base` over `nodes`, `credentials`, and `package.json`.
- `npm run format` — Prettier over `nodes` and `credentials`.
- `npm run n8n-validate` — runs `@n8n/scan-community-package` against this package; required to pass before publishing as a community node.
- `npm run prepublishOnly` — build + stricter lint config (`.eslintrc.prepublish.js`). Runs automatically on `npm publish`.
- `npm test` — run the Vitest suite once. `npm run test:watch` for watch mode.

## Testing

Tests use **Vitest** (not Jest, despite the n8n ecosystem leaning Jest). Two layers:

- **Pure-function unit tests** over the helpers in [cloudinary.utils.ts](nodes/Cloudinary/cloudinary.utils.ts) — signing, URL builders, error extraction, metadata serialization.
- **Operation-handler tests** that mock `IExecuteFunctions` and assert the *request contract* (URL, method, `auth` vs `signature`, body shape) handed to `httpRequestWithAuthentication` — no real network calls. Shared mock builder and request-extraction helpers live in [nodes/Cloudinary/operations/testHelpers.ts](nodes/Cloudinary/operations/testHelpers.ts). Note: because handlers call the HTTP helper via `.call(ctx, TYPE, options)`, the spy records args as `[TYPE, options]` — `this` is not in the args array.

[vitest.config.ts](vitest.config.ts) aliases `n8n-workflow` to its built CJS entry (`n8n-workflow/dist/index.js`). This is required, not a hack: the package's `import` condition points at raw `src/index.ts`, which Vitest can't load.

`tsconfig.json` excludes `**/*.test.ts` so test files never compile into `dist/`. **Any shared test utility that imports `vitest` must also be excluded** — either name it `*.test.ts` or add it to the exclude list (as `testHelpers.ts` is). Otherwise it leaks `vitest` into the published package.

## Architecture

This is an n8n **community node** package with a single node and a single credential type. There's no service layer and no SDK dependency. The runtime is a declarative node class, a per-operation handler map, and small util files.

- [nodes/Cloudinary/Cloudinary.node.ts](nodes/Cloudinary/Cloudinary.node.ts) — declares the node via `INodeTypeDescription` (properties come from [descriptions/](nodes/Cloudinary/descriptions/) and drive the entire n8n UI through `displayOptions.show` conditionals on `resource` + `operation`). `execute()` is a thin loop over input items: it resolves credentials, looks up `operationHandlers[`${resource}:${operation}`]`, calls the handler, and wraps each returned JSON object into an `INodeExecutionData` with the right `pairedItem`.
- [nodes/Cloudinary/operations/](nodes/Cloudinary/operations/) — one file per operation, grouped by resource (`upload/`, `updateAsset/`, `admin/`), each exporting an `OperationHandler` (`(ctx, i, creds) => Promise<IDataObject[]>` — see [operations/types.ts](nodes/Cloudinary/operations/types.ts)). [operations/index.ts](nodes/Cloudinary/operations/index.ts) maps `${resource}:${operation}` to its handler. **Adding an operation:** (1) add it to the matching `operation` options block and any fields it needs (with the right `displayOptions.show`) under [descriptions/](nodes/Cloudinary/descriptions/), (2) drop a handler file in `operations/<resource>/`, (3) register it in [operations/index.ts](nodes/Cloudinary/operations/index.ts). No change to `execute()` is needed.
- [nodes/Cloudinary/cloudinary.utils.ts](nodes/Cloudinary/cloudinary.utils.ts) — shared helpers used by the handlers: `generateCloudinarySignature`, `createMultipartBody` (hand-rolled multipart so the package has no `form-data` dependency), the URL builders (`buildUploadUrl`, `buildResourceUpdateUrl`), `metadataToPipeString`, `buildSearchExpression`, and `extractCloudinaryError`. Signature scheme details are in **Two distinct auth flows** below.
- [nodes/Cloudinary/sha256.utils.ts](nodes/Cloudinary/sha256.utils.ts) — pure-JS SHA-256 so the package has zero runtime deps beyond the `n8n-workflow` peer dep.
- [credentials/CloudinaryApi.credentials.ts](credentials/CloudinaryApi.credentials.ts) — `cloudName` / `apiKey` / `apiSecret`. Referenced by name `cloudinaryApi` from `Cloudinary.CREDENTIAL_TYPE`.

### Two distinct auth flows

The node mixes two Cloudinary auth styles depending on endpoint — keep this distinction when adding operations:

1. **Signed Upload API** (`/v1_1/{cloud}/{resource_type}/upload`) — used by `upload.uploadUrl` and `upload.uploadFile`. Build a params object, call `generateCloudinarySignature`, append `signature`, then POST as `application/x-www-form-urlencoded` (URL upload) or `multipart/form-data` via `createMultipartBody` (file upload). The `file` field and `api_key` must be excluded from the signature payload.
2. **HTTP Basic auth** (`api_key:api_secret`) — used by everything under Admin API and Update Asset (`/tags/...`, `/metadata_fields`, `/resources/{type}/{storage_type}/{public_id}`). Passed via the `auth` option on `IHttpRequestOptions`; no signature.

### Structured metadata format

Cloudinary expects structured metadata as a pipe-separated `key=value|key=value` string, not JSON. Both upload paths and `updateMetadata` convert the user's JSON input via the shared `metadataToPipeString` helper in [cloudinary.utils.ts](nodes/Cloudinary/cloudinary.utils.ts) (arrays get `JSON.stringify`ed, scalars passed through). If you add another op that takes structured metadata, call the same helper — passing raw JSON will silently produce a bad request.

### Backwards compatibility (n8n workflow persistence)

n8n persists each saved workflow as JSON. That JSON references this node — and many things *inside* this node — by string identifier. Anything it references by string is a public API; anything it uses to interpret missing or stored values is part of the same contract. Both can only evolve **additively**, or behind an explicit `typeVersion` bump.

**Frozen-by-string** — renaming or removing orphans every saved workflow that references it:
- Node `type` (`n8n-nodes-cloudinary.cloudinary`) — class export and top-level `name`.
- Credential `name` (`cloudinaryApi`, exposed via `CREDENTIAL_TYPE`).
- Parameter `name` (every entry under `properties`, at every nesting level — `collection` / `fixedCollection` children included).
- Option `value` in `options` / `multiOptions` — including the `resource` and `operation` selectors, whose `value` strings key the `operationHandlers` map. Renaming `upload:uploadFile` is the same severity of break as renaming a parameter `name`.

**Frozen-by-meaning** — silent behavior change in saved workflows, no error:
- Parameter `type` (`string` → `number`, `options` → `multiOptions`, `collection` → `fixedCollection`, etc.) — mis-deserializes the stored value.
- `default` — workflows saved before a field existed (or where the user left it untouched) fall back to it on load; changing it retroactively rewrites their behavior.
- The set of `options[].value` — adding entries is safe; removing or renaming one orphans workflows that selected it.
- `displayOptions.show` — *loosening* (showing the field in more cases) is safe; *narrowing* silently drops user intent, since the stored value lingers in the JSON but stops being read.

**Free to change** — UI-only metadata: `displayName`, `description`, `placeholder`, `hint`, `group`, `icon`, ordering, help text.

**Additive-mode pattern (preferred).** Add a mode selector (`options`) whose default reproduces current behavior, gate existing fields behind that default, gate new fields behind the new mode, and add a *new* helper for the new path rather than changing the existing one. Worked example — supporting Update Asset by **asset ID** alongside the existing `resourceType` + `type` + `publicId`: the endpoint differs in method as well as path (`PUT /resources/:asset_id` vs `POST /resources/:resource_type/:type/:public_id`), so add `buildResourceUpdateByAssetIdUrl`, an "Identify By" selector defaulting to `Public ID`, an `assetId` field gated on the new mode, and branch the handler. Old workflows (no stored value) get the default and behave exactly as before — no version bump needed.

**When additive isn't possible, bump `typeVersion`.** Increment `version` in `INodeTypeDescription`, keep the old behavior reachable, and branch on `this.getNode().typeVersion` where semantics diverge. Use this for type changes, removed operations, or any repurposed field.

**Separate axis — runtime-host compatibility.** `engines.node`, the peer range on `n8n-workflow`, and any native deps govern which n8n installations can *load* this node. That's distinct from workflow-JSON compatibility (which saved workflows still *run* correctly inside a given install). Same discipline — don't silently raise the floor — but it lives in `package.json`, not the node description.

### n8n integration points

- All HTTP goes through `this.helpers.httpRequestWithAuthentication.call(this, Cloudinary.CREDENTIAL_TYPE, options)` — do not use `fetch` or `axios`.
- File uploads read binary via `this.helpers.assertBinaryData` + `getBinaryDataBuffer`; the `file` parameter holds the *binary property name*, not the file itself.
- Error handling respects `this.continueOnFail()` — per-item errors are pushed as `{ error: error.message }` rather than thrown when enabled.

### Build output contract

`package.json`'s `n8n.nodes` and `n8n.credentials` point at `dist/...` paths. The icon copy in [gulpfile.js](gulpfile.js) is required because `tsc` won't copy the `.svg`; without it the node loads without an icon in n8n.
