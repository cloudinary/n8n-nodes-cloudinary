#!/usr/bin/env node
/**
 * Diff two contract snapshots (from extract-contract.cjs) and report backward-
 * compatibility breaks per docs/backwards-compat.md.
 *
 * Usage: node diff-contract.cjs <baseline.json> <candidate.json>
 *
 * Exit code 1 if any BREAKING change is found, else 0 — so it can gate CI.
 *
 * Breaking (frozen-by-string / frozen-by-meaning):
 *   - node `name` or `version` changed; credential `name` changed
 *   - parameter present in baseline missing in candidate (removed/renamed)
 *   - option `value` present in baseline missing in candidate
 *   - parameter `type` changed
 *   - parameter `default` changed
 *   - displayOptions.show narrowed (param shown in fewer resource/op combos)
 * Additive (safe, informational):
 *   - new parameters, new option values, loosened displayOptions
 */
'use strict';

const fs = require('fs');

const [, , basePath, candPath] = process.argv;
if (!basePath || !candPath) {
	console.error('usage: diff-contract.cjs <baseline.json> <candidate.json>');
	process.exit(2);
}

const base = JSON.parse(fs.readFileSync(basePath, 'utf8'));
const cand = JSON.parse(fs.readFileSync(candPath, 'utf8'));

const breaks = [];
const additions = [];
const warnings = [];

function indexByPath(snapshot, key) {
	const m = new Map();
	for (const p of snapshot[key]) m.set(p.path, p);
	return m;
}

// --- node + credential identity (frozen-by-string) ---
if (base.node.name !== cand.node.name) {
	breaks.push(`Node \`name\` changed: "${base.node.name}" -> "${cand.node.name}" (orphans every saved workflow)`);
}
if (base.credential.name !== cand.credential.name) {
	breaks.push(`Credential \`name\` changed: "${base.credential.name}" -> "${cand.credential.name}" (orphans stored credentials)`);
}
if (base.node.version !== cand.node.version) {
	warnings.push(`Node descriptor \`version\` changed: ${base.node.version} -> ${cand.node.version}. A bump is the sanctioned escape hatch for non-additive changes — confirm the handler branches on typeVersion where semantics diverge.`);
} else {
	warnings.push(`Node descriptor \`version\` unchanged (${base.node.version}). EVERY change below must be additive, or it is a break.`);
}

/**
 * displayOptions narrowing check. The relevant axis is `show` on
 * resource/operation: a stored value stops being read if the field is shown in
 * a strict subset of the combos it used to appear in.
 * We approximate "combos" as the cartesian set of show.resource x show.operation.
 */
function showCombos(displayOptions) {
	const show = displayOptions && displayOptions.show;
	if (!show) return null; // null = "always shown"
	const resources = show.resource || ['*'];
	const operations = show.operation || ['*'];
	const combos = new Set();
	for (const r of resources) for (const o of operations) combos.add(`${r}|${o}`);
	return combos;
}

function compareParams(baseParams, candParams, label) {
	const baseIdx = indexByPath({ x: baseParams }, 'x');
	const candIdx = indexByPath({ x: candParams }, 'x');

	for (const [path, bp] of baseIdx) {
		const cp = candIdx.get(path);
		if (!cp) {
			breaks.push(`[${label}] parameter removed/renamed: \`${path}\` (frozen-by-string)`);
			continue;
		}
		if (bp.type !== cp.type) {
			breaks.push(`[${label}] \`${path}\` type changed: "${bp.type}" -> "${cp.type}" (frozen-by-meaning, mis-deserializes stored value)`);
		}
		if (JSON.stringify(bp.default) !== JSON.stringify(cp.default)) {
			breaks.push(`[${label}] \`${path}\` default changed: ${JSON.stringify(bp.default)} -> ${JSON.stringify(cp.default)} (frozen-by-meaning, retroactively rewrites untouched fields)`);
		}
		// option value set: removed values are breaks; added are additive.
		if (bp.optionValues) {
			const candVals = new Set(cp.optionValues || []);
			for (const v of bp.optionValues) {
				if (!candVals.has(v)) {
					breaks.push(`[${label}] \`${path}\` option value removed: "${v}" (frozen-by-string, orphans workflows that selected it)`);
				}
			}
			const baseVals = new Set(bp.optionValues);
			for (const v of cp.optionValues || []) {
				if (!baseVals.has(v)) additions.push(`[${label}] \`${path}\` new option value: "${v}"`);
			}
		}
		// displayOptions narrowing
		const baseCombos = showCombos(bp.displayOptions);
		const candCombos = showCombos(cp.displayOptions);
		if (baseCombos === null && candCombos !== null) {
			breaks.push(`[${label}] \`${path}\` displayOptions narrowed: was always-shown, now gated on ${[...candCombos].join(', ')} (frozen-by-meaning, drops stored intent)`);
		} else if (baseCombos && candCombos) {
			const dropped = [...baseCombos].filter((c) => !candCombos.has(c) && !candCombos.has(c.replace(/\|.*/, '|*')));
			if (dropped.length) {
				warnings.push(`[${label}] \`${path}\` may be narrowed: combos no longer shown: ${dropped.join(', ')} — confirm those resource/operation pairs still exist (if the op was removed, that removal is the real break).`);
			}
		}
	}

	for (const [path] of candIdx) {
		if (!baseIdx.has(path)) additions.push(`[${label}] new parameter: \`${path}\``);
	}
}

compareParams(base.params, cand.params, 'node');
compareParams(base.credParams, cand.credParams, 'credential');

// --- report ---
const line = '─'.repeat(72);
console.log(line);
console.log('BACKWARD-COMPATIBILITY CONTRACT DIFF');
console.log(`  baseline:  ${basePath}`);
console.log(`  candidate: ${candPath}`);
console.log(line);

if (warnings.length) {
	console.log('\nNOTES / MANUAL REVIEW:');
	for (const w of warnings) console.log(`  • ${w}`);
}

console.log(`\nADDITIVE changes (safe): ${additions.length}`);
for (const a of additions) console.log(`  + ${a}`);

console.log(`\nBREAKING changes: ${breaks.length}`);
for (const b of breaks) console.log(`  ✗ ${b}`);

console.log('\n' + line);
if (breaks.length) {
	console.log(`VERDICT: ${breaks.length} BREAKING change(s) — NOT backward compatible without a typeVersion bump or redesign.`);
	process.exit(1);
} else {
	console.log('VERDICT: No contract breaks detected. Changes are additive (review NOTES above to confirm).');
	process.exit(0);
}
