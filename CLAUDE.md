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
- [nodes/Cloudinary/operations/](nodes/Cloudinary/operations/) — one file per operation, grouped by resource (`upload/`, `updateAsset/`, `asset/`, `admin/`, `transform/`), each exporting an `OperationHandler` (`(ctx, i, creds) => Promise<IDataObject[]>` — see [operations/types.ts](nodes/Cloudinary/operations/types.ts)). [operations/index.ts](nodes/Cloudinary/operations/index.ts) maps `${resource}:${operation}` to its handler. **Adding an operation:** (1) add it to the matching `operation` options block and any fields it needs (with the right `displayOptions.show`) under [descriptions/](nodes/Cloudinary/descriptions/), (2) drop a handler file in `operations/<resource>/`, (3) register it in [operations/index.ts](nodes/Cloudinary/operations/index.ts). No change to `execute()` is needed.
- [nodes/Cloudinary/cloudinary.utils.ts](nodes/Cloudinary/cloudinary.utils.ts) — shared helpers used by the handlers: `generateCloudinarySignature`, `createMultipartBody` (hand-rolled multipart so the package has no `form-data` dependency), the URL builders (`buildUploadUrl`, `buildResourceUpdateUrl`), the delivery-URL builders (`buildDeliveryUrl`, `joinTransformation`), `metadataToPipeString`, `buildSearchExpression`, and `extractCloudinaryError`. Signature scheme and delivery-URL details are in **Three flows** below.
- [nodes/Cloudinary/sha256.utils.ts](nodes/Cloudinary/sha256.utils.ts) — pure-JS SHA-256 so the package has zero runtime deps beyond the `n8n-workflow` peer dep.
- [credentials/CloudinaryApi.credentials.ts](credentials/CloudinaryApi.credentials.ts) — `cloudName` / `apiKey` / `apiSecret`, plus optional `privateCdn` / `secureDistribution` (custom delivery hostname/CNAME) consumed only by `buildDeliveryUrl`. Referenced by name `cloudinaryApi` from `Cloudinary.CREDENTIAL_TYPE`.

### Three flows

The node mixes three Cloudinary interaction styles depending on endpoint — keep this distinction when adding operations:

1. **Signed Upload API** (`/v1_1/{cloud}/{resource_type}/upload`) — used by `upload.uploadUrl` and `upload.uploadFile`. Build a params object, call `generateCloudinarySignature`, append `signature`, then POST as `application/x-www-form-urlencoded` (URL upload) or `multipart/form-data` via `createMultipartBody` (file upload). The `file` field and `api_key` must be excluded from the signature payload.
2. **HTTP Basic auth** (`api_key:api_secret`) — used by everything under Admin API and Update Asset (`/tags/...`, `/metadata_fields`, `/resources/{type}/{storage_type}/{public_id}`). Passed via the `auth` option on `IHttpRequestOptions`; no signature.
3. **Delivery-URL construction (no API call)** — used by every `transform.*` operation. The handler reads fields, composes a transformation string (`joinTransformation`), and returns a delivery URL built by `buildDeliveryUrl` — it makes **no** `httpRequestWithAuthentication` call. The host is not always `res.cloudinary.com`: `buildDeliveryUrl` resolves shared (cloud in path) / private-CDN (`<cloud>-res.cloudinary.com`) / custom-hostname-CNAME (cloud absent) from the optional `privateCdn` / `secureDistribution` credentials, mirroring the SDKs' explicit-config approach. Signed delivery (`s--SIG--`, for private/authenticated/strict assets) is intentionally **not** implemented yet — the Delivery Type field carries a non-prominent disclaimer. Because these handlers make no HTTP call, their tests assert the **returned JSON** (`secure_url` + `transformation`), not a request spy — `makeCtx` already supplies the only surface they touch (`getNodeParameter` + `getNode`). Cloudinary builds delivery paths as `<public_id>.<format>` with public_id opaque, so a public_id that carries its own extension (e.g. `my_image1234.png`) needs the format re-appended (`…png.png`) or Cloudinary reads the id's extension as the format and 404s; named ops carry no format, so `trailingMediaFormat` (in `operations/transform/shared.ts`) recovers it from the public_id's trailing media extension. Signed/authenticated source assets still can't be transformed (signing not implemented).

### Transform components: keep Multi-Step in sync (reuse the builders)

The `transform.multiStep` operation (n8n's Edit Image "Multi Step" pattern: a sortable `transformSteps` fixedCollection where each step contributes one or more transformation components, chained with `/` and applied in order) is a **second consumer** of the same transformation logic the standalone transform ops use. To stop the two from drifting, the per-transform logic lives in pure **component builders** in [operations/transform/shared.ts](nodes/Cloudinary/operations/transform/shared.ts) — `resizeComponents`, `cropComponents`, `trimComponents`, `optimizeComponents`, `convertComponents` — each `(params) => string[]`, throwing a plain `Error` on invalid input. Both call sites map their differently-named fields to the builder's param shape and call it: the standalone op (e.g. [resizeImage.ts](nodes/Cloudinary/operations/transform/resizeImage.ts)) reads `resizeWidth`/`resizeHeight`/`resizeFit`; the matching Multi-Step step reads the collection's `width`/`height`/`fit` (resize), `cropWidth`/`cropHeight`/`cropAspectWidth`/`cropMode` (crop), etc. `buildComponents(ctx, i, build, prefix?)` wraps a builder call, turning its `Error` into the `NodeOperationError` (with `itemIndex`, and a `Step N: ` prefix for Multi-Step) the handlers throw.

**When you add or change a transformation, change the builder — not a handler.** Then: (1) if it's a new transform type, add a standalone op AND a `stepType` case in [multiStep.ts](nodes/Cloudinary/operations/transform/multiStep.ts) + a `Step` field gated on that `stepType` in [transform.fields.ts](nodes/Cloudinary/descriptions/transform.fields.ts); (2) cover both the standalone op and the Multi-Step step in [transform.test.ts](nodes/Cloudinary/operations/transform/transform.test.ts). Note builders return a **component list**, so `optimizeComponents` yields `['f_auto', 'q_auto']` → `f_auto/q_auto` (two chained components) in both consumers. The Multi-Step `stepType` field is deliberately **not** named `action`/`operation` — the n8n linter treats those names as operation selectors and demands an `action` property on every option.

**Field definitions are necessarily split across two UI surfaces — this is the expected maintenance cost.** The transformation *logic* has one home (the builders). The *field declarations* have two:

| Surface | Location in `transform.fields.ts` | `displayOptions` key |
|---|---|---|
| Standalone op | Top-level `INodeProperties[]`, one block per op | `operation: ['resizeImage']` etc. |
| Multi-Step step | Inside `transformSteps` fixedCollection `values` | `stepType: ['resize']` etc. |

n8n's `fixedCollection` values don't support referencing external field definitions — everything must be inlined. This means when a transformation gains a new field, you update it in both places. Shared option arrays (e.g. `QUALITY_OPTIONS`, `FIT_OPTIONS`) are extracted as constants in `transform.fields.ts` and reused in both surfaces to reduce copy-paste risk. **If you add a new option array, do the same.**

Field names within Multi-Step steps differ from their standalone counterparts to avoid collision when multiple step types share the same fixedCollection values object: resize uses `width`/`height`/`fit`; crop uses `cropMode`/`cropWidth`/`cropHeight` (dimensions) or `cropAspectWidth`/`aspectRatio` (aspect ratio). [multiStep.ts](nodes/Cloudinary/operations/transform/multiStep.ts) reads these and maps them to the builder's param shape.

### Naming: mirror the Cloudinary API

When a field, option, or output key corresponds to something the Cloudinary API already names, **use the API's property name verbatim** — `type` (not "Delivery Type"), `public_id`, `resource_type`, `format`, `version`, `tags`, `context`. The `displayName` should match too (`Type`, not `Delivery Type`). This keeps the node's inputs/outputs interchangeable with API responses (so a Search result pipes straight into a later op) and consistent with the existing `asset`/`updateAsset` fields, which already share `name: 'type'` across resources gated by `displayOptions`. Only invent a name (optionally `transform`-/op-prefixed) for a knob that has **no** API counterpart. Don't prefix or rephrase an API-named field for novelty.

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

### Codex file (`Cloudinary.node.json`)

[Cloudinary.node.json](nodes/Cloudinary/Cloudinary.node.json) is the n8n **codex** — UI metadata for the nodes panel (categories, search aliases, doc links). Format reference: <https://docs.n8n.io/integrations/creating-nodes/build/reference/node-codex-files/>.

- `categories` must come from n8n's **fixed** list; arbitrary strings (e.g. a former `"Media"`) won't match any UI filter. As of writing the valid values are: Analytics, Communication, Data & Storage, Development, Finance & Accounting, Marketing & Content, Miscellaneous, Productivity, Sales, Utility. We use `Data & Storage` (asset storage) + `Marketing & Content` (closest match for a media/content tool — the list has no "Media").
- `alias` is a real, working field (extra keywords that surface the node in panel search) but is **undocumented** in the codex reference above — its only authoritative source is the n8n core source. Treat it as best-effort discoverability, not a guaranteed contract.

### Build output contract

`package.json`'s `n8n.nodes` and `n8n.credentials` point at `dist/...` paths. The icon copy in [gulpfile.js](gulpfile.js) is required because `tsc` won't copy the `.svg`; without it the node loads without an icon in n8n.
