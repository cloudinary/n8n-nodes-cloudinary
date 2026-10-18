#!/usr/bin/env node
// Summarize the most recent execution in the isolated n8n: per node, its status and
// the key output fields (or its error). `n8n execute --rawOutput` prints little for
// multi-branch workflows, so this reads the stored run from the SQLite DB instead.
//   source env.sh && node show-last-execution.cjs
const { execFileSync } = require('child_process');
const path = require('path');

const e2eDir = process.env.N8N_E2E_DIR;
if (!e2eDir) {
	console.error('Source env.sh first.');
	process.exit(1);
}
// n8n stores run data "flatted"; use the copy that ships with the local n8n install.
const { parse } = require(path.join(e2eDir, 'n8n/node_modules/flatted'));
const db = path.join(process.env.N8N_USER_FOLDER, '.n8n/database.sqlite');
const rows = JSON.parse(
	execFileSync('sqlite3', [
		'-json',
		db,
		'select e.id, e.status, d.data from execution_entity e join execution_data d on d.executionId = e.id order by e.id desc limit 1',
	]).toString() || '[]',
);
if (!rows.length) {
	console.error('No executions yet.');
	process.exit(1);
}
const [{ id, status, data }] = rows;
const run = parse(data);
const KEYS = ['storage_type', 'public_id', 'asset_id', 'secure_url', 'expires_at', 'format', 'width', 'height',
	'model', 'seed', 'task_id', 'status', 'request_id', 'transformation', 'error'];

console.log(`execution ${id}: ${status}`);
for (const [node, runs] of Object.entries(run.resultData.runData)) {
	for (const r of runs) {
		if (r.error) {
			console.log(`\n■ ${node} — NODE ERROR: ${r.error.message}\n   ${r.error.description ?? ''}`);
			continue;
		}
		const items = r.data?.main?.[0] ?? [];
		console.log(`\n■ ${node} — ${r.executionStatus ?? ''} ${items.length} item(s), ${r.executionTime}ms`);
		for (const item of items) {
			const out = {};
			for (const k of KEYS) if (item.json[k] !== undefined) out[k] = item.json[k];
			const quota = item.json.limits?.addons_quota?.[0];
			if (quota) out.quota = `${quota.remaining}/${quota.limit} remaining`;
			console.log('   ' + JSON.stringify(out));
		}
	}
}
if (run.resultData.error) console.log('\nWORKFLOW ERROR:', run.resultData.error.message);
process.exit(status === 'success' ? 0 : 1);
