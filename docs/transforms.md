# Transforms: the chaining model and how properties map

Read this first; the implementation notes below assume it.

**A transformation is a string of `/`-joined components**, applied left to right (`c_fill,w_400/f_auto/q_auto` = crop, then auto-format, then auto-quality). Within a component, qualifiers are comma-joined (`c_fill,w_400`). Every Transform handler builds this string and returns it as the **`transformation`** key on its result (see `buildTransformResult` in [shared.ts](../nodes/Cloudinary/operations/transform/shared.ts)), next to the finished `secure_url`.

**Chaining = composing several transformations into one.** There are three mechanisms, and they do *not* share code:

| Mechanism | Scope | Where it lives | Composes by |
|---|---|---|---|
| A single op | one component-set | each handler | the builder for that op |
| `combineTransformations` (Multi-Step) | many steps, **one node** | [multiStep.ts](../nodes/Cloudinary/operations/transform/multiStep.ts) | calling each step's builder, then `joinTransformation` |
| `Continue From Transformation` | many ops, **across nodes** | `buildTransformResult` prepend | `joinTransformation([continueFrom, ownTransformation])` |

**The property mapping that makes cross-node chaining work** is exactly one edge: an upstream op's **`transformation` output** is wired (via `{{ $json.transformation }}`) into a downstream op's **`continueFromTransformation` input**. The downstream handler prepends it before its own transformation. So the output property name (`transformation`) and the input param name (`continueFromTransformation`) are a contract — don't rename either without updating the other and the docs. (Param renames also break saved workflows — see [backwards-compat.md](backwards-compat.md).)

Two other consumers read a `transformation` string but are **not** Transform ops: `customTransformation` (user supplies the whole string) and the Widgets `videoPlayer` op (applies it to the video stream — see the Video Player section at the end). Both are deliberately excluded from `Continue From Transformation`.

---

# Transform components: keep Multi-Step in sync (reuse the builders)

The `transform.multiStep` operation (n8n's Edit Image "Multi Step" pattern: a sortable `transformSteps` fixedCollection where each step contributes one or more transformation components, chained with `/` and applied in order) is a **second consumer** of the same transformation logic the standalone transform ops use. To stop the two from drifting, the per-transform logic lives in pure **component builders** in [operations/transform/shared.ts](../nodes/Cloudinary/operations/transform/shared.ts) — `resizeComponents`, `cropComponents`, `trimComponents`, `optimizeComponents`, `convertComponents` — each `(params) => string[]`, throwing a plain `Error` on invalid input. Both call sites map their differently-named fields to the builder's param shape and call it: the standalone op (e.g. [resizeImage.ts](../nodes/Cloudinary/operations/transform/resizeImage.ts)) reads `resizeWidth`/`resizeHeight`/`resizeFit`; the matching Multi-Step step reads the collection's `width`/`height`/`fit` (resize), `cropWidth`/`cropHeight`/`cropAspectWidth`/`cropMode` (crop), etc. `buildComponents(ctx, i, build, prefix?)` wraps a builder call, turning its `Error` into the `NodeOperationError` (with `itemIndex`, and a `Step N: ` prefix for Multi-Step) the handlers throw.

**When you add or change a transformation, change the builder — not a handler.** Then: (1) if it's a new transform type, add a standalone op AND a `stepType` case in [multiStep.ts](../nodes/Cloudinary/operations/transform/multiStep.ts) + a `Step` field gated on that `stepType` in [transform.fields.ts](../nodes/Cloudinary/descriptions/transform.fields.ts); (2) cover both the standalone op and the Multi-Step step in [transform.test.ts](../nodes/Cloudinary/operations/transform/transform.test.ts). Note builders return a **component list**, so `optimizeComponents` yields `['f_auto', 'q_auto']` → `f_auto/q_auto` (two chained components) in both consumers. The Multi-Step `stepType` field is deliberately **not** named `action`/`operation` — the n8n linter treats those names as operation selectors and demands an `action` property on every option.

**Field definitions are necessarily split across two UI surfaces — this is the expected maintenance cost.** The transformation *logic* has one home (the builders). The *field declarations* have two:

| Surface | Location in `transform.fields.ts` | `displayOptions` key |
|---|---|---|
| Standalone op | Top-level `INodeProperties[]`, one block per op | `operation: ['resizeImage']` etc. |
| Multi-Step step | Inside `transformSteps` fixedCollection `values` | `stepType: ['resize']` etc. |

n8n's `fixedCollection` values don't support referencing external field definitions — everything must be inlined. This means when a transformation gains a new field, you update it in both places. Shared option arrays (e.g. `QUALITY_OPTIONS`, `FIT_OPTIONS`) are extracted as constants in `transform.fields.ts` and reused in both surfaces to reduce copy-paste risk. **If you add a new option array, do the same.**

Field names within Multi-Step steps differ from their standalone counterparts to avoid collision when multiple step types share the same fixedCollection values object: resize uses `width`/`height`/`fit`; crop uses `cropMode`/`cropWidth`/`cropHeight` (dimensions) or `cropAspectWidth`/`aspectRatio` (aspect ratio). [multiStep.ts](../nodes/Cloudinary/operations/transform/multiStep.ts) reads these and maps them to the builder's param shape.

## Chaining transforms across nodes: `Continue From Transformation`

Every transform op outputs its transformation under the `transformation` key. The **`Continue From Transformation`** field (param `continueFromTransformation`, a top-level optional string on the chainable ops) lets one op build on another's output **across separate nodes**: wire `{{ $json.transformation }}` from an upstream Transform action into it, and the value is prepended before this op's own transformation so the two compound into one delivery URL (e.g. `c_fill,w_400` + `f_auto/q_auto` → `c_fill,w_400/f_auto/q_auto`).

This is the cross-node counterpart to Multi-Step's in-node step list — same chaining, different ergonomics: Multi-Step composes everything inside one node; `Continue From Transformation` composes the `transformation` outputs of independent nodes. They share no code; this field is not a builder.

The prepend happens once, centrally, in `buildTransformResult` ([shared.ts](../nodes/Cloudinary/operations/transform/shared.ts)): `readTransformInput` reads + trims `continueFromTransformation` into `TransformInput.continueFrom`, every handler passes it through, and `buildTransformResult` does `joinTransformation([continueFrom || undefined, ownTransformation])`. So **no per-handler chaining logic exists** — a new transform op gets chaining for free as long as it routes its identity through `readTransformInput` and its result through `buildTransformResult`.

The field is gated to `CHAINABLE_TRANSFORM_OPS` in [transform.fields.ts](../nodes/Cloudinary/descriptions/transform.fields.ts), which excludes `customTransformation` (the user already controls the whole raw string) and `combineTransformations` (Multi-Step chains internally). Those two never read the param, so `readTransformInput` returns `''` for them and the prepend is a no-op — but the exclusion keeps the UI honest by not showing a field that would do nothing.

## Video Player (Widgets) — a transformation consumer, not a Transform op

The Widgets `videoPlayer` op ([videoPlayer.ts](../nodes/Cloudinary/operations/widget/videoPlayer.ts)) builds a Cloudinary Video Player **embed URL** (+ a `player_config` JSON), not a delivery URL — so it does *not* go through `buildTransformResult` and is not on `Continue From Transformation`. But it accepts the same kind of `transformation` string and applies it to the **video stream**, so the chaining mental model still applies (you can wire `{{ $json.transformation }}` into its Transformation field).

Two non-obvious facts, both learned the hard way and verified against the player source ([CloudinaryLtd/cloudinary-video-player-iframe](https://github.com/CloudinaryLtd/cloudinary-video-player-iframe) `src/utils.js`, and `cloudinary-video-player` `base-source.js`) plus in-browser:

1. **Embed-URL mapping is `source[transformation][raw_transformation]=<string>`, NOT a flat `source[transformation]=<string>`.** The embed page parses the query with `qs` into a nested object and feeds the video config's `transformation` to `new cloudinary.Transformation(obj)`, which expects a structured object — a raw string must ride under the `raw_transformation` key. A flat string is silently ignored (confirmed in-browser: `raw_transformation` blurs/crops the playing stream; the flat form does nothing). Image-only effects (e.g. `e_grayscale`) are also silently ignored on video — the poster is a *separate* source and is unaffected by this field.

2. **Adaptive streaming and format selection are mutually exclusive.** An HLS/DASH source type delivers via a streaming profile, which Cloudinary cannot combine with a transformation that pins a format (any `f_` component, e.g. an Optimize step's `f_auto:video`) — it errors with "Streaming profile not supported for non-streaming formats". The handler fails fast on this combination (`pinsFormat` + `ADAPTIVE_STREAMING_TYPES`) rather than letting it surface as a cryptic in-player error. If you add format-emitting logic or new source types, keep that guard correct.
