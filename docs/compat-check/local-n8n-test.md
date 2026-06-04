# Local end-to-end test in a real n8n

The contract diff proves the saved-workflow JSON contract holds. This proves a *real* workflow built on 0.0.9 still loads and runs after upgrading to the branch — the only way to catch breaks that live in handler code rather than the descriptor.

## 0. One-time setup

```bash
npm i -g n8n        # or use npx n8n
```

## 1. Capture a baseline workflow on deployed 0.0.9

Run n8n against the **published** package so you're authoring on the exact version users have:

```bash
mkdir -p /tmp/n8n-baseline && cd /tmp/n8n-baseline
npm init -y >/dev/null
npm i n8n-nodes-cloudinary@0.0.9
# point n8n at this folder's node_modules as a custom-extension dir
N8N_CUSTOM_EXTENSIONS="$PWD/node_modules/n8n-nodes-cloudinary" n8n start
```

Open http://localhost:5678, add a **Cloudinary** node, and build one workflow per legacy surface (these are the operations that existed in 0.0.9):

- **Upload → Upload from URL** and **Upload from File**
- **Update Asset → Update Tags** (set a `publicId`, `type`, tags, and something under Update Options)
- **Update Asset → Update Metadata**
- **Admin → Get Tags** and **Get Metadata Fields**

Configure real values, **execute each once** to confirm it works, then **Download** each workflow to JSON (⋯ menu → Download). Save them under `docs/compat-check/fixtures/` (gitignore real credentials — export with credentials *omitted*, n8n does this by default).

Stop n8n (Ctrl-C).

## 2. Build and link the branch

```bash
cd /Users/eitanpeer/dev/n8n-nodes-cloudinary
npm run build
npm link                       # registers n8n-nodes-cloudinary -> this checkout
```

## 3. Load the branch into a fresh n8n and import the 0.0.9 workflows

```bash
mkdir -p /tmp/n8n-branch && cd /tmp/n8n-branch
npm init -y >/dev/null
npm link n8n-nodes-cloudinary  # symlink to the built branch
N8N_CUSTOM_EXTENSIONS="$PWD/node_modules/n8n-nodes-cloudinary" n8n start
```

In the UI: **Import from File** each JSON you saved in step 1.

### What to verify on each imported workflow

- It loads with **no "unrecognized node/parameter" warnings**.
- Every field you set in 0.0.9 still shows its **stored value** (esp. `publicId`, `type`, tags, Update Options on Update Tags — the fields now gated behind `tagMode`).
- The node still resolves the same **operation** (no "operation not found").
- **Execute** each — output JSON shape matches what you got in step 1.

If a field that you set in 0.0.9 now appears empty or hidden, that's a narrowing break — capture it and reconcile against `backwards-compat.md`.

## 4. (Optional) Credential carry-over

Re-enter Cloudinary credentials in the branch instance. Confirm the existing `cloudName` / `apiKey` / `apiSecret` fields are unchanged and the two new fields (`privateCdn`, `secureDistribution`) are **optional** and default to off — an existing credential should keep working without touching them.

## Cleanup

```bash
npm rm -g n8n-nodes-cloudinary 2>/dev/null
cd /Users/eitanpeer/dev/n8n-nodes-cloudinary && npm unlink 2>/dev/null
rm -rf /tmp/n8n-baseline /tmp/n8n-branch
```
