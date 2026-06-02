# Conventions

## Naming: mirror the Cloudinary API

When a field, option, or output key corresponds to something the Cloudinary API already names, **use the API's property name verbatim** — `type` (not "Delivery Type"), `public_id`, `resource_type`, `format`, `version`, `tags`, `context`. The `displayName` should match too (`Type`, not `Delivery Type`). This keeps the node's inputs/outputs interchangeable with API responses (so a Search result pipes straight into a later op) and consistent with the existing `asset`/`updateAsset` fields, which already share `name: 'type'` across resources gated by `displayOptions`. Only invent a name (optionally `transform`-/op-prefixed) for a knob that has **no** API counterpart. Don't prefix or rephrase an API-named field for novelty.

## Structured metadata format

Cloudinary expects structured metadata as a pipe-separated `key=value|key=value` string, not JSON. Both upload paths and `updateMetadata` convert the user's JSON input via the shared `metadataToPipeString` helper in [cloudinary.utils.ts](../nodes/Cloudinary/cloudinary.utils.ts) (arrays get `JSON.stringify`ed, scalars passed through). If you add another op that takes structured metadata, call the same helper — passing raw JSON will silently produce a bad request.

## Codex file (`Cloudinary.node.json`)

[Cloudinary.node.json](../nodes/Cloudinary/Cloudinary.node.json) is the n8n **codex** — UI metadata for the nodes panel (categories, search aliases, doc links). Format reference: <https://docs.n8n.io/integrations/creating-nodes/build/reference/node-codex-files/>.

- `categories` must come from n8n's **fixed** list; arbitrary strings (e.g. a former `"Media"`) won't match any UI filter. As of writing the valid values are: Analytics, Communication, Data & Storage, Development, Finance & Accounting, Marketing & Content, Miscellaneous, Productivity, Sales, Utility. We use `Data & Storage` (asset storage) + `Marketing & Content` (closest match for a media/content tool — the list has no "Media").
- `alias` is a real, working field (extra keywords that surface the node in panel search) but is **undocumented** in the codex reference above — its only authoritative source is the n8n core source. Treat it as best-effort discoverability, not a guaranteed contract.
