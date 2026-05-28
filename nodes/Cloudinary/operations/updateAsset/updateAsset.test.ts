import { describe, it, expect } from 'vitest';
import type { IDataObject } from 'n8n-workflow';
import { getAsset } from './getAsset';
import { updateTags } from './updateTags';
import { updateMetadata } from './updateMetadata';
import { makeCtx, lastRequest, testCreds } from '../testHelpers';

const resourceParams = { publicId: 'sample', resourceType: 'image', type: 'upload' };
const PUBLIC_ID_URL = 'https://api.cloudinary.com/v1_1/demo/resources/image/upload/sample';
const ASSET_ID_URL = 'https://api.cloudinary.com/v1_1/demo/resources/abc123';

describe('getAsset handler', () => {
	it('GETs the asset_id URL with HTTP Basic auth', async () => {
		const { ctx, http } = makeCtx({ params: { assetId: 'abc123', getOptions: {} } });

		await getAsset(ctx, 0, testCreds);

		const req = lastRequest(http);
		expect(req.method).toBe('GET');
		expect(req.url).toBe(ASSET_ID_URL);
		expect(req.auth).toEqual({ username: testCreds.apiKey, password: testCreds.apiSecret });
		expect(req.body).toBeUndefined();
	});

	it('passes getOptions through as query string', async () => {
		const { ctx, http } = makeCtx({
			params: {
				assetId: 'abc123',
				getOptions: { colors: true, faces: true, image_metadata: true },
			},
		});

		await getAsset(ctx, 0, testCreds);

		expect(lastRequest(http).qs).toEqual({ colors: true, faces: true, image_metadata: true });
	});
});

describe('updateTags handler', () => {
	it('POSTs to the Admin resource-update URL with HTTP Basic auth (no signature)', async () => {
		const { ctx, http } = makeCtx({
			params: { ...resourceParams, tags: 'cat,dog', updateOptions: {} },
		});

		await updateTags(ctx, 0, testCreds);

		const req = lastRequest(http);
		expect(req.method).toBe('POST');
		expect(req.url).toBe(PUBLIC_ID_URL);
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
		expect(req.url).toBe(PUBLIC_ID_URL);
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
