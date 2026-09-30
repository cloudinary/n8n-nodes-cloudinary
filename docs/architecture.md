# Architecture

This is an n8n **community node** package with a single node and a single credential type. There's no service layer and no SDK dependency. The runtime is a declarative node class, a per-operation handler map, and small util files.

## File map

- [nodes/Cloudinary/Cloudinary.node.ts](../nodes/Cloudinary/Cloudinary.node.ts) — declares the node via `INodeTypeDescription` (properties come from [descriptions/](../nodes/Cloudinary/descriptions/) and drive the entire n8n UI through `displayOptions.show` conditionals on `resource` + `operation`). `execute()` is a thin loop over input items: it resolves credentials, looks up `operationHandlers[`${resource}:${operation}`]`, calls the handler, and wraps each returned JSON object into an `INodeExecutionData` with the right `pairedItem`.
- [nodes/Cloudinary/operations/](../nodes/Cloudinary/operations/) — one file per operation, grouped by resource (`upload/`, `updateAsset/`, `asset/`, `admin/`, `transform/`, `widget/`, `generate/`), each exporting an `OperationHandler` (`(ctx, i, creds) => Promise<IDataObject[]>` — see [operations/types.ts](../nodes/Cloudinary/operations/types.ts)). [operations/index.ts](../nodes/Cloudinary/operations/index.ts) maps `${resource}:${operation}` to its handler. **Adding an operation:** (1) add it to the matching `operation` options block and any fields it needs (with the right `displayOptions.show`) under [descriptions/](../nodes/Cloudinary/descriptions/), (2) drop a handler file in `operations/<resource>/`, (3) register it in [operations/index.ts](../nodes/Cloudinary/operations/index.ts). No change to `execute()` is needed.
- [nodes/Cloudinary/cloudinary.utils.ts](../nodes/Cloudinary/cloudinary.utils.ts) — shared helpers used by the handlers: `generateCloudinarySignature`, `createMultipartBody` (hand-rolled multipart so the package has no `form-data` dependency), the URL builders (`buildUploadUrl`, `buildResourceUpdateUrl`), the delivery-URL builders (`buildDeliveryUrl`, `joinTransformation`), `metadataToPipeString`, `buildSearchExpression`, and `extractCloudinaryError`. Signature scheme and delivery-URL details are in **Three flows** below.
- [nodes/Cloudinary/mediaGeneration.client.ts](../nodes/Cloudinary/mediaGeneration.client.ts) — client for the Media Generation (Image Generation) API: types mirroring the OpenAPI spec in `CloudinaryLtd/media_generation` (`app/schema/schema.yml`), one function per spec `operationId` (`generateImage`, `generateImageFromImages`, `getGenerationTask`), and error mapping from the spec's `ErrorResponse`. The `generate/` handlers and [descriptions/generate.fields.ts](../nodes/Cloudinary/descriptions/generate.fields.ts) option lists are built from its constants. See **Media Generation API** below.
- [nodes/Cloudinary/sha256.utils.ts](../nodes/Cloudinary/sha256.utils.ts) — pure-JS SHA-256 so the package has zero runtime deps beyond the `n8n-workflow` peer dep.
- [credentials/CloudinaryApi.credentials.ts](../credentials/CloudinaryApi.credentials.ts) — `cloudName` / `apiKey` / `apiSecret`, plus optional `privateCdn` / `secureDistribution` (custom delivery hostname/CNAME) consumed only by `buildDeliveryUrl`. Referenced by name `cloudinaryApi` from `Cloudinary.CREDENTIAL_TYPE`.

## Three flows

The node mixes three Cloudinary interaction styles depending on endpoint — keep this distinction when adding operations:

1. **Signed Upload API** (`/v1_1/{cloud}/{resource_type}/upload`) — used by `upload.uploadUrl` and `upload.uploadFile`. Build a params object, call `generateCloudinarySignature`, append `signature`, then POST as `application/x-www-form-urlencoded` (URL upload) or `multipart/form-data` via `createMultipartBody` (file upload). The `file` field and `api_key` must be excluded from the signature payload.
2. **HTTP Basic auth** (`api_key:api_secret`) — used by everything under Admin API and Update Asset (`/tags/...`, `/metadata_fields`, `/resources/{type}/{storage_type}/{public_id}`). Passed via the `auth` option on `IHttpRequestOptions`; no signature.
3. **Delivery-URL construction (no API call)** — used by every `transform.*` operation. The handler reads fields, composes a transformation string (`joinTransformation`), and returns a delivery URL built by `buildDeliveryUrl` — it makes **no** `httpRequestWithAuthentication` call. The host is not always `res.cloudinary.com`: `buildDeliveryUrl` resolves shared (cloud in path) / private-CDN (`<cloud>-res.cloudinary.com`) / custom-hostname-CNAME (cloud absent) from the optional `privateCdn` / `secureDistribution` credentials, mirroring the SDKs' explicit-config approach. Signed delivery (`s--SIG--`, for private/authenticated/strict assets) is intentionally **not** implemented yet — the Delivery Type field carries a non-prominent disclaimer. Because these handlers make no HTTP call, their tests assert the **returned JSON** (`secure_url` + `transformation`), not a request spy — `makeCtx` already supplies the only surface they touch (`getNodeParameter` + `getNode`). Cloudinary builds delivery paths as `<public_id>.<format>` with public_id opaque, so a public_id that carries its own extension (e.g. `my_image1234.png`) needs the format re-appended (`…png.png`) or Cloudinary reads the id's extension as the format and 404s; named ops carry no format, so `trailingMediaFormat` (in `operations/transform/shared.ts`) recovers it from the public_id's trailing media extension. Signed/authenticated source assets still can't be transformed (signing not implemented).

## Media Generation API

The `generate` resource calls the Media Generation service (`https://api.cloudinary.com/v2/generate/{cloud_name}/…`). Auth is HTTP Basic like flow 2, but on the `/v2` base and with JSON bodies. The client in [mediaGeneration.client.ts](../nodes/Cloudinary/mediaGeneration.client.ts) is hand-written against the spec (no generator — runtime deps are forbidden, and it's three endpoints). When the spec changes, update the matching type/constant there; the UI option lists derive from those constants.

- **Sync vs. async.** `text_to_image` / `image_to_image` answer `200` with the finished result, or `202` with a task when the body sets `async: true`. The bodies differ only in `data`'s shape, so `isTaskResponse` discriminates on `data.task_id`. The node never polls on its own — sync mode already waits server-side; async mode hands back `task_id` for **Get Generation Task** or a webhook.
- **Request mapping.** The spec's nested `oneOf` objects (`model`, `image_size`, `target`) are flattened in the UI into a mode selector plus gated fields; pure builders in [operations/generate/shared.ts](../nodes/Cloudinary/operations/generate/shared.ts) map them back and validate against the spec's bounds. Only fields the user set are sent, so the service's documented defaults apply.
- **Output.** `shapeGenerationOutput` emits one item per generated asset with `storage` flattened to the top level, so `public_id` / `asset_id` / `secure_url` pipe straight into Transform and Asset ops. `simplify: false` returns the raw body.
- **Errors.** `httpRequestWithAuthentication` throws a `NodeApiError` that keeps the response body as `context.data`. `new NodeApiError(node, err)` returns an existing NodeApiError *untouched* (options ignored), so the client rewrites `message` / `description` / `httpCode` on it in place, using the spec's `error.code`, a per-status hint, and `request_id`.

## Testing

Tests use **Vitest** (not Jest, despite the n8n ecosystem leaning Jest). Two layers:

- **Pure-function unit tests** over the helpers in [cloudinary.utils.ts](../nodes/Cloudinary/cloudinary.utils.ts) — signing, URL builders, error extraction, metadata serialization.
- **Operation-handler tests** that mock `IExecuteFunctions` and assert the *request contract* (URL, method, `auth` vs `signature`, body shape) handed to `httpRequestWithAuthentication` — no real network calls. Shared mock builder and request-extraction helpers live in [nodes/Cloudinary/operations/testHelpers.ts](../nodes/Cloudinary/operations/testHelpers.ts). Note: because handlers call the HTTP helper via `.call(ctx, TYPE, options)`, the spy records args as `[TYPE, options]` — `this` is not in the args array.

[vitest.config.ts](../vitest.config.ts) aliases `n8n-workflow` to its built CJS entry (`n8n-workflow/dist/index.js`). This is required, not a hack: the package's `import` condition points at raw `src/index.ts`, which Vitest can't load.

`tsconfig.json` excludes `**/*.test.ts` so test files never compile into `dist/`. **Any shared test utility that imports `vitest` must also be excluded** — either name it `*.test.ts` or add it to the exclude list (as `testHelpers.ts` is). Otherwise it leaks `vitest` into the published package.

## n8n integration points

- All HTTP goes through `this.helpers.httpRequestWithAuthentication.call(this, Cloudinary.CREDENTIAL_TYPE, options)` — do not use `fetch` or `axios`.
- File uploads read binary via `this.helpers.assertBinaryData` + `getBinaryDataBuffer`; the `file` parameter holds the *binary property name*, not the file itself.
- Error handling respects `this.continueOnFail()` — per-item errors are pushed as `{ error: error.message }` rather than thrown when enabled.

## Build output contract

`package.json`'s `n8n.nodes` and `n8n.credentials` point at `dist/...` paths. The icon copy in [gulpfile.js](../gulpfile.js) is required because `tsc` won't copy the `.svg`; without it the node loads without an icon in n8n.
