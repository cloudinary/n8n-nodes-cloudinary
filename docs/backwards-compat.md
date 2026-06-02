# Backwards compatibility (n8n workflow persistence)

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
