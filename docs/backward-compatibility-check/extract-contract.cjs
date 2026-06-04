#!/usr/bin/env node
/**
 * Extract the n8n public contract from a built Cloudinary node.
 *
 * Usage: node extract-contract.cjs <path-to-dist>
 * Prints a normalized JSON snapshot to stdout.
 *
 * The contract = everything n8n persists by string in saved-workflow JSON, plus
 * the values it uses to interpret stored data. See docs/backwards-compat.md.
 *
 * We instantiate the real compiled node and walk description.properties so the
 * snapshot reflects exactly what n8n loads — no fragile source parsing.
 */
'use strict';

const path = require('path');

const distRoot = process.argv[2];
if (!distRoot) {
	console.error('usage: extract-contract.cjs <path-to-dist>');
	process.exit(2);
}

const nodePath = path.resolve(distRoot, 'nodes/Cloudinary/Cloudinary.node.js');
const credPath = path.resolve(distRoot, 'credentials/CloudinaryApi.credentials.js');

const nodeMod = require(nodePath);
const NodeClass = nodeMod.Cloudinary || nodeMod.default || Object.values(nodeMod)[0];
const node = new NodeClass();
const desc = node.description;

let credName;
let credProps = [];
try {
	const credMod = require(credPath);
	const CredClass = credMod.CloudinaryApi || credMod.default || Object.values(credMod)[0];
	const cred = new CredClass();
	credName = cred.name;
	credProps = cred.properties || [];
} catch (e) {
	credName = '<unreadable: ' + e.message + '>';
}

/**
 * Walk a properties array recursively. Path is a list of parameter `name`s from
 * the root, so collection/fixedCollection children are namespaced and can't
 * collide with top-level params of the same name.
 */
function walk(properties, parentPath, out) {
	for (const p of properties || []) {
		const myPath = [...parentPath, p.name].join('.');
		const entry = {
			path: myPath,
			name: p.name,
			type: p.type,
			// `default` is frozen-by-meaning. Normalize undefined to a sentinel so
			// "had no default" vs "default is undefined" don't read as a change.
			default: 'default' in p ? p.default : '<none>',
			// displayOptions.show is the narrowing axis. Capture it verbatim.
			displayOptions: p.displayOptions || null,
		};

		// option/multiOptions value sets are frozen-by-string.
		if (Array.isArray(p.options) && (p.type === 'options' || p.type === 'multiOptions')) {
			entry.optionValues = p.options
				.map((o) => o.value)
				.sort();
		}
		out.params.push(entry);

		// Recurse into collection / fixedCollection children.
		if (p.type === 'collection' && Array.isArray(p.options)) {
			walk(p.options, [...parentPath, p.name], out);
		}
		if (p.type === 'fixedCollection' && Array.isArray(p.options)) {
			for (const optionGroup of p.options) {
				// fixedCollection groups have their own `name` + `values[]`.
				walk(optionGroup.values || [], [...parentPath, p.name, optionGroup.name], out);
			}
		}
	}
}

const out = {
	node: {
		// frozen-by-string node identity
		name: desc.name,
		version: desc.version,
	},
	credential: {
		name: credName,
	},
	params: [],
	credParams: [],
};

walk(desc.properties, [], out);

// credential properties use the same shape
const credOut = { params: [] };
walk(credProps, [], credOut);
out.credParams = credOut.params;

// stable ordering for clean diffs
out.params.sort((a, b) => a.path.localeCompare(b.path));
out.credParams.sort((a, b) => a.path.localeCompare(b.path));

process.stdout.write(JSON.stringify(out, null, 2) + '\n');
