# Backward-compatibility verification: `feat/image-video-transformations` vs deployed `0.0.9`

## What we're verifying and why

n8n persists every saved workflow as JSON that references this node — and many things *inside* it — by **string identifier** (node `type`, credential `name`, parameter `name`, option `value`). Those strings, plus the values used to *interpret* stored data (`type`, `default`, `displayOptions.show`), form a public contract. See [../backwards-compat.md](../backwards-compat.md) for the full rules. A break means a previously-saved user workflow silently misbehaves or loses a stored value after they upgrade.

### The baseline (verified, not assumed)

| Fact | Value |
|---|---|
| Deployed version on npm | **0.0.9** (`npm view n8n-nodes-cloudinary version`), published 2026-01-11 |
| Git commit for 0.0.9 | **`origin/master` = `fbdfa17`** (also the merge-base of this branch) |
| Deployed node descriptor `version` | **1** |
| This branch's descriptor `version` | **still 1** ← key risk |

Because the descriptor `version` did **not** change while the entire operation/parameter surface was rewritten, **every change must be additive**. Anything non-additive needs either a redesign to be additive, or a `typeVersion` bump in `Cloudinary.node.ts`.

`origin/master` (`fbdfa17`) is the one true baseline. We do **not** compare against local `master` history beyond it.

## The automated check

Two scripts under `docs/compat-check/`:

1. **`extract-contract.cjs`** — instantiates the compiled node (`new Cloudinary().description`) and walks `properties` recursively (into `collection` / `fixedCollection` children) to emit a normalized JSON snapshot of the contract: every parameter `name`+`type`+`default`+`displayOptions`, and every `options[].value`. Run against the built `dist/` of any checkout.
2. **`diff-contract.cjs`** — loads two snapshots (baseline, candidate) and reports **breaking changes** by the rules in `backwards-compat.md`:
   - removed/renamed parameter `name` (frozen-by-string)
   - removed/renamed option `value` (frozen-by-string)
   - changed parameter `type` (frozen-by-meaning)
   - changed `default` (frozen-by-meaning)
   - narrowed `displayOptions.show` (frozen-by-meaning)
   - changed node `type` name or credential `name`
   - It also lists **additive** changes (new params/options) as informational.

Exit code is non-zero if any breaking change is found, so it can gate CI.

## Run it

From the repo root:

```bash
npm run compat-check   # alias for: bash docs/compat-check/run.sh
```

This also runs in CI as a required PR gate — see the **Backward-compat contract check** step in [`.github/workflows/pr-check.yml`](../../.github/workflows/pr-check.yml). That checkout uses `fetch-depth: 0` so the baseline commit's history is available for the worktree build.

`run.sh` does the whole thing hermetically:
- creates a git worktree at the baseline commit (`fbdfa17`) under a temp dir,
- `npm ci && npm run build` there,
- builds the current checkout (`npm run build`),
- extracts both contracts,
- diffs them and prints a verdict,
- cleans up the worktree.

The verdict is also written to **`.local/compat-check-findings.md`** (with the two contract snapshots beside it as `.local/{baseline,candidate}.snapshot.json`). `.local/` is gitignored — these are regenerable, point-in-time artifacts tied to a specific baseline/candidate pair, so they are deliberately **not** committed. Re-run `run.sh` to refresh them; don't hand-edit.

To run the pieces manually (e.g. against an arbitrary ref):

```bash
# baseline snapshot
git worktree add /tmp/cld-base fbdfa17
( cd /tmp/cld-base && npm ci && npm run build )
node docs/compat-check/extract-contract.cjs /tmp/cld-base/dist > /tmp/base.json

# candidate snapshot (current branch, already built)
npm run build
node docs/compat-check/extract-contract.cjs ./dist > /tmp/cand.json

# diff
node docs/compat-check/diff-contract.cjs /tmp/base.json /tmp/cand.json

git worktree remove /tmp/cld-base --force
```

## What the automation can't fully judge (manual review)

The script flags suspected breaks; a human confirms intent on:

- **`displayOptions` narrowing** — the script detects when a param is shown in *fewer* `resource`/`operation` combinations than before. Sometimes that's intentional (the op was genuinely removed). Confirm the op still exists.
- **Semantic default changes that aren't literal** — e.g. a field whose effective default comes from handler code, not the descriptor `default`. Spot-check handlers in `operations/` for any field that previously had an implicit behavior.
- **Removed operations** — if an `operation` option `value` from 0.0.9 is gone, every workflow using it orphans. The script flags this; decide whether to restore it or bump `typeVersion`.
- **Credential field changes** — `CloudinaryApi.credentials.ts` gained 18 lines (`privateCdn`/`secureDistribution`). New optional fields are additive; confirm no existing field `name` changed and no existing default flipped.
- **Metadata/tags serialization** — structured metadata must still go through `metadataToPipeString` (pipe-separated, not JSON). A workflow that stored values relies on identical serialization. Covered by unit tests (`cloudinary.utils.test.ts`); confirm those pass.

## Local end-to-end test (real n8n)

Automated contract diffing proves the JSON contract holds. To prove a *real saved workflow* still runs, load both versions into a local n8n and replay a workflow built on 0.0.9. See [local-n8n-test.md](local-n8n-test.md).
