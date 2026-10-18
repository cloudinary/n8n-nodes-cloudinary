#!/usr/bin/env bash
# Install a build of this package into the isolated n8n exactly the way n8n installs a
# community package (community-packages.service `downloadPackage`): npm pack → extract
# into <user folder>/.n8n/nodes/node_modules/<pkg> → strip dev/peer/optional deps.
# Stripping peers matters: `n8n-workflow` must resolve to n8n's own copy, as it does for
# real users. `npm link` would load this repo's node_modules/n8n-workflow instead, and
# `instanceof NodeApiError` checks would silently compare against a different class.
#
#   install-branch.sh                 # build + install the current checkout
#   install-branch.sh <npm-version>   # install a published version (baseline), e.g. 0.2.3
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$HERE/../../.." && pwd)"
source "$HERE/env.sh"
NODES="$N8N_USER_FOLDER/.n8n/nodes"
PKG="$NODES/node_modules/n8n-nodes-cloudinary"
mkdir -p "$N8N_E2E_DIR"

if [ $# -ge 1 ]; then
	TGZ=$(cd "$N8N_E2E_DIR" && npm pack --silent "n8n-nodes-cloudinary@$1")
else
	(cd "$REPO" && npm run build >/dev/null)
	TGZ=$(cd "$REPO" && npm pack --silent --pack-destination "$N8N_E2E_DIR")
fi
rm -rf "$PKG" && mkdir -p "$PKG"
tar -xzf "$N8N_E2E_DIR/$TGZ" -C "$PKG" --strip-components=1 && rm "$N8N_E2E_DIR/$TGZ"
node -e '
const fs = require("fs");
const [pkgDir, nodesDir] = process.argv.slice(1);
const p = `${pkgDir}/package.json`;
const { devDependencies, peerDependencies, optionalDependencies, ...pj } = JSON.parse(fs.readFileSync(p, "utf8"));
fs.writeFileSync(p, JSON.stringify(pj, null, 2));
fs.writeFileSync(`${nodesDir}/package.json`,
	JSON.stringify({ name: "installed-nodes", private: true, dependencies: { [pj.name]: pj.version } }, null, 2));
console.log(`installed ${pj.name}@${pj.version} -> ${pkgDir}`);' "$PKG" "$NODES"
echo "Restart n8n to pick it up."
