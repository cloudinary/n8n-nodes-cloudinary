import { describe, it, expect } from 'vitest';
import type { IDataObject } from 'n8n-workflow';
import { updateTags } from './updateTags';
import { updateMetadata } from './updateMetadata';
import { makeCtx, lastRequest, testCreds } from '../testHelpers';

const resourceParams = { publicId: 'sample', resourceType: 'image', type: 'upload' };

describe('updateTags handler', () => {
	it('POSTs to the Admin resource-update URL with HTTP Basic auth (no signature)', async () => {
		const { ctx, http } = makeCtx({
			params: { ...resourceParams, tags: 'cat,dog', updateOptions: {} },
		});

		await updateTags(ctx, 0, testCreds);

		const req = lastRequest(http);
		expect(req.method).toBe('POST');
		expect(req.url).toBe('https://api.cloudinary.com/v1_1/demo/resources/image/upload/sample');
		expect(req.auth).toEqual({ username: testCreds.apiKey, password: testCreds.apiSecret });
		expect((req.body as IDataObject).signature).toBeUndefined();
	});

	it('sends tags and merges updateOptions into the body', async () => {
		const { ctx, http } = makeCtx({
			params: { ...resourceParams, tags: 'cat,dog', updateOptions: { context: 'alt=hi' } },
		});

		await updateTags(ctx, 0, testCreds);

		expect(lastRequest(http).body).toEqual({ tags: 'cat,dog', context: 'alt=hi' });
	});
});

describe('updateMetadata handler', () => {
	it('converts the structured-metadata JSON input to a pipe string', async () => {
		const { ctx, http } = makeCtx({
			params: { ...resourceParams, structuredMetadata: '{"color":"red"}', updateOptions: {} },
		});

		await updateMetadata(ctx, 0, testCreds);

		expect((lastRequest(http).body as IDataObject).metadata).toBe('color=red');
	});

	it('uses HTTP Basic auth and the resource-update URL', async () => {
		const { ctx, http } = makeCtx({
			params: { ...resourceParams, structuredMetadata: '{"color":"red"}', updateOptions: {} },
		});

		await updateMetadata(ctx, 0, testCreds);

		const req = lastRequest(http);
		expect(req.url).toBe('https://api.cloudinary.com/v1_1/demo/resources/image/upload/sample');
		expect(req.auth).toEqual({ username: testCreds.apiKey, password: testCreds.apiSecret });
	});

	it('propagates the metadata parse error for invalid JSON', async () => {
		const { ctx } = makeCtx({
			params: { ...resourceParams, structuredMetadata: '{bad}', updateOptions: {} },
		});

		await expect(updateMetadata(ctx, 0, testCreds)).rejects.toThrow(
			'Invalid JSON for structured metadata',
		);
	});
});
