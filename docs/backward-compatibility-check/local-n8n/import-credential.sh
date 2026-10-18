#!/usr/bin/env bash
# Create the `cloudinaryApi` credential the fixtures reference (id cldSmokeCred0001)
# from .local/smoke.env (gitignored):
#   CLOUDINARY_CLOUD_NAME=...
#   CLOUDINARY_API_KEY=...
#   CLOUDINARY_API_SECRET=...
# The secret is written to a 0600 temp file for `n8n import:credentials` (which encrypts
# it into the DB) and deleted immediately; it is never printed.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$HERE/../../.." && pwd)"
source "$HERE/env.sh"
ENV_FILE="${1:-$REPO/.local/smoke.env}"
umask 077
TMP="$(mktemp "$N8N_E2E_DIR/cred.XXXXXX")"
trap 'rm -f "$TMP"' EXIT
node -e '
const fs = require("fs");
const [envFile, out] = process.argv.slice(1);
const env = Object.fromEntries(fs.readFileSync(envFile, "utf8").split("\n")
	.filter((l) => /^CLOUDINARY_\w+=/.test(l))
	.map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim().replace(/^["\x27]|["\x27]$/g, "")]));
for (const k of ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"])
	if (!env[k]) { console.error(`missing ${k} in ${envFile}`); process.exit(1); }
fs.writeFileSync(out, JSON.stringify([{ id: "cldSmokeCred0001", name: "Cloudinary smoke",
	type: "cloudinaryApi", data: { cloudName: env.CLOUDINARY_CLOUD_NAME, apiKey: env.CLOUDINARY_API_KEY,
	apiSecret: env.CLOUDINARY_API_SECRET, privateCdn: false } }]));' "$ENV_FILE" "$TMP"
"$N8N_BIN" import:credentials --input="$TMP" >/dev/null
echo "credential cldSmokeCred0001 imported for cloud $(grep '^CLOUDINARY_CLOUD_NAME=' "$ENV_FILE" | cut -d= -f2)"
