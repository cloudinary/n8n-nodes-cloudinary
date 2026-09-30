# Local end-to-end test in a real n8n

The unit tests mock `IExecuteFunctions`, and the contract diff proves the saved-workflow JSON contract holds. Neither runs the node inside n8n. This guide does: it installs a build of this package into an isolated local n8n **the same way n8n installs a community package**, then runs real workflows against it, both headlessly (CLI) and in the editor.

It catches what the other checks can't:

- breaks that live in handler code rather than the descriptor (an upgraded workflow loads but behaves differently);
- n8n's own parameter resolution (expressions, `fixedCollection` shapes, defaults for untouched fields);
- n8n's real HTTP helper and error wrapping (`httpRequestWithAuthentication` throws a `NodeApiError` — see [architecture.md → Media Generation API](../architecture.md#media-generation-api));
- the AI Agent tool variant n8n derives from `usableAsTool` (`n8n-nodes-cloudinary.cloudinaryTool`).

Everything lives under `local-n8n/`:

| File | Purpose |
|---|---|
| `env.sh` | Isolated instance settings. Its own user folder (DB, encryption key, installed packages) under `$N8N_E2E_DIR` (default `$TMPDIR/n8n-cloudinary-e2e`); nothing touches `~/.n8n`. |
| `install-branch.sh` | Build + install the current checkout, or `install-branch.sh <version>` for a published version. |
| `import-credential.sh` | Creates the `cloudinaryApi` credential the fixtures reference (id `cldSmokeCred0001`) from `.local/smoke.env`. |
| `show-last-execution.cjs` | Prints each node's status and key output fields for the latest execution. |
| `fixtures/*.workflow.json` | Workflows to import and run. |

## 0. One-time setup

**n8n requires Node ≥ 24** (check with `npm view n8n engines`). Install n8n into the e2e folder, not globally:

```bash
source docs/backward-compatibility-check/local-n8n/env.sh
mkdir -p "$N8N_E2E_DIR/n8n" && cd "$N8N_E2E_DIR/n8n" && npm init -y >/dev/null
PYTHON=/usr/bin/python3 npm_config_python=/usr/bin/python3 npm i n8n --no-audit --no-fund
cd - && "$N8N_BIN" --version
```

The `PYTHON=` override is needed if your default `python3` is 3.12 or newer. n8n compiles native modules (`isolated-vm`) with an old bundled `node-gyp` that imports `distutils`, which Python 3.12 removed. The build fails with `ModuleNotFoundError: No module named 'distutils'`. On macOS, `/usr/bin/python3` (Command Line Tools, 3.9) still has it. Elsewhere, point it at any Python ≤ 3.11 or one with `setuptools` installed.

Create `.local/smoke.env` in the repo (gitignored) with the cloud to test against:

```
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

For the **Generate** fixture, that cloud needs the [Image Generation add-on](https://console.cloudinary.com/app/marketplace/details/image_generation).

## 1. Install the branch

```bash
source docs/backward-compatibility-check/local-n8n/env.sh
docs/backward-compatibility-check/local-n8n/install-branch.sh
docs/backward-compatibility-check/local-n8n/import-credential.sh
```

**Why not `npm link`:** n8n installs a community package from its npm tarball and strips `peerDependencies`, so `n8n-workflow` resolves to *n8n's own* copy. A linked checkout resolves this repo's `node_modules/n8n-workflow` instead. Every `instanceof NodeApiError` / `NodeOperationError` check then compares against a different class, and the run no longer reflects what users get. `install-branch.sh` mirrors n8n's `downloadPackage` step for step.

Re-run `install-branch.sh` after every code change, then restart n8n (or re-run the CLI).

## 2. Run the fixtures headlessly

```bash
source docs/backward-compatibility-check/local-n8n/env.sh
"$N8N_BIN" import:workflow --input=docs/backward-compatibility-check/local-n8n/fixtures/generate-smoke.workflow.json
"$N8N_BIN" execute --id=cldGenSmokeTest1
node docs/backward-compatibility-check/local-n8n/show-last-execution.cjs
```

`show-last-execution.cjs` exits non-zero unless the execution succeeded.

**If the editor (`n8n start`, step 3) is running at the same time**, `n8n execute` fails because the task-broker port (5679) is taken. With `N8N_LOG_LEVEL=warn` it prints nothing and just exits 1, and `show-last-execution.cjs` then reports the *previous* run. Either stop the editor, or give the CLI its own port: `N8N_RUNNERS_BROKER_PORT=5690 "$N8N_BIN" execute …`.

### `generate-smoke.workflow.json`

About 6 add-on quota units per run with the FLUX standard models it pins. It leaves one image under `n8n-smoke/` in the media library; everything else uses temporary storage.

| Node | Proves | Expect |
|---|---|---|
| Text to Image (managed) | family/tier + aspect-ratio size + seed; an **expression** in the `generateOptions.public_id` collection | 1 item; `storage_type: managed_asset`, top-level `public_id`/`asset_id`/`secure_url`, `model.id: flux-2-klein-9b`, `seed: 7`, 512×512 |
| Transform: Optimize generated | Generate output pipes into Transform via `{{ $json.public_id }}` | `secure_url` = `…/image/upload/f_auto/q_auto/n8n-smoke/editor-…` |
| Image to Image (from generated) | an expression **inside a `fixedCollection` row** (`reference_images.reference_image[].url`) | `model.id: flux-2-klein-9b-edit`, `storage_type: temporary` |
| Text to Image (async) → Wait (20 s) → Get Generation Task | 202 path; `task_id` piped through a real Wait node | first `status: pending`; Get Generation Task returns the flattened image with `status: completed` |
| Error: invalid task | error rewrite through n8n's real HTTP helper, with *continue on fail* | `{ "error": "MG_00002: invalid task id" }` |
| Error: missing reference asset | same, 404 path | `{ "error": "MG_00704: reference asset '0000…' not found" }` |

If an error node shows n8n's generic text (e.g. *"The resource you are requesting could not be found"*) instead of an `MG_…` code, the client's `NodeApiError` rewrite has regressed.

## 3. Check the editor

```bash
source docs/backward-compatibility-check/local-n8n/env.sh
"$N8N_BIN" start          # http://localhost:5678
```

On first load, create the local owner account (throwaway; it lives in the e2e DB). The imported workflow and credential appear under it.

For the **Generate** resource, verify:

- It appears in the Resource dropdown, and in the nodes panel's *Add action* list, as **Generate Image From Text / From Reference Images / Get Generation Task**.
- The field visibility switches: *Model* shows Family + Tier, one Model ID list, or Preference. Text-to-image offers only non-`-edit` model IDs, and image-to-image offers only `-edit` ones. *Image Size* shows Aspect Ratio + Resolution, or Width + Height.
- *Reference Images* allows at most 4 rows, with URL vs Asset ID switching per row.
- *Options* lists Async, Format, Notification URL, Public ID, Seed, Storage, Upload Preset.
- Executing a node from the editor shows the same output as the headless run.
- (AI Agent) An **AI Agent** node can attach the Cloudinary tool, and Generate appears among its resources.

## 4. Upgrade check: workflows saved on the published version

Proves that a real workflow built on the published version still loads and runs after upgrading to the branch.

1. Install the published baseline (`npm view n8n-nodes-cloudinary version`) into a **fresh** e2e dir:
   ```bash
   export N8N_E2E_DIR="${TMPDIR:-/tmp}/n8n-cloudinary-baseline"   # before sourcing env.sh
   source docs/backward-compatibility-check/local-n8n/env.sh
   # one-time n8n install into this dir: see step 0
   docs/backward-compatibility-check/local-n8n/install-branch.sh 0.2.3
   docs/backward-compatibility-check/local-n8n/import-credential.sh
   "$N8N_BIN" start
   ```
2. In the editor, build one workflow per existing surface you touched (Upload, Transform, Asset, Widget, Library, Asset (Legacy)), configure real values, **execute each once**, and **Download** each (⋯ → Download; credentials are omitted by default). Save them under `local-n8n/fixtures/` so later upgrades can reuse them.
3. Stop n8n, run `install-branch.sh` (no argument) to swap in the branch build, then restart n8n.
4. Re-open or import each workflow and verify:
   - It loads with **no "unrecognized node/parameter" warnings**.
   - Every field you set still shows its **stored value**.
   - The node still resolves the same **operation** (no "operation not found").
   - **Execute** each: the output JSON shape matches the baseline run.

   A field that now appears empty or hidden is a narrowing break. Reconcile it against [backwards-compat.md](../backwards-compat.md).

## 5. (Optional) Credential carry-over

Confirm the existing credential keeps working without edits after the upgrade. New credential fields must be optional and default to off.

## Cleanup

```bash
source docs/backward-compatibility-check/local-n8n/env.sh
rm -rf "$N8N_E2E_DIR"
```

Delete any `n8n-smoke/` images from the media library if you don't want to keep them.
