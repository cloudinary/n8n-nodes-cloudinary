import { defineConfig } from 'vitest/config';

export default defineConfig({
	resolve: {
		alias: {
			// n8n-workflow's "import" condition points at raw src/index.ts, which vitest
			// can't load. Pin to the built CJS entry so runtime imports (e.g. ApplicationError)
			// resolve during tests.
			'n8n-workflow': 'n8n-workflow/dist/index.js',
		},
	},
});
