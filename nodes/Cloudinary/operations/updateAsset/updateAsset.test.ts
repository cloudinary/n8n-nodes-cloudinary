import { describe, it, expect } from 'vitest';
import type { IDataObject } from 'n8n-workflow';
import { deleteAssets } from './deleteAssets';
import { getAsset } from './getAsset';
import { updateTags } from './updateTags';
import { updateMetadata } from './updateMetadata';
import { updateDisplayName } from './updateDisplayName';
import { makeCtx, lastRequest, testCreds } from '../testHelpers';

const resourceParams = { publicId: 'sample', resourceType: 'image', type: 'upload' };
const PUBLIC_ID_URL = 'https://api.cloudinary.com/v1_1/demo/resources/image/upload/sample';
const ASSET_ID_URL = 'https://api.cloudinary.com/v1_1/demo/resources/abc123';
const BULK_DELETE_URL = 'https://api.cloudinary.com/v1_1/demo/resources/image/upload';

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

describe('deleteAssets handler', () => {
	const deleteResource = { resourceType: 'image', type: 'upload' };

	it('DELETEs the per-(resource_type, type) URL with public_ids as CSV in qs and Basic auth', async () => {
		const { ctx, http } = makeCtx({
			params: { ...deleteResource, publicIds: 'docs/strawberry', deleteOptions: {} },
		});

		await deleteAssets(ctx, 0, testCreds);

		const req = lastRequest(http);
		expect(req.method).toBe('DELETE');
		expect(req.url).toBe(BULK_DELETE_URL);
		expect(req.auth).toEqual({ username: testCreds.apiKey, password: testCreds.apiSecret });
		// Cloudinary wants a comma-separated string, not a JS array — `qs` would
		// otherwise serialize an array as public_ids[0]=... which is rejected.
		expect((req.qs as IDataObject).public_ids).toBe('docs/strawberry');
	});

	it('sends a single public_id as a plain string (no array, no brackets)', async () => {
		const { ctx, http } = makeCtx({
			params: { ...deleteResource, publicIds: 'solo', deleteOptions: {} },
		});

		await deleteAssets(ctx, 0, testCreds);

		expect((lastRequest(http).qs as IDataObject).public_ids).toBe('solo');
	});

	it('splits CSV public_ids and re-joins as a clean CSV (trimmed, blanks dropped)', async () => {
		const { ctx, http } = makeCtx({
			params: {
				...deleteResource,
				publicIds: ' docs/a ,, docs/b,docs/c ',
				deleteOptions: {},
			},
		});

		await deleteAssets(ctx, 0, testCreds);

		expect((lastRequest(http).qs as IDataObject).public_ids).toBe('docs/a,docs/b,docs/c');
	});

	it('accepts an array from an n8n expression and serializes it as CSV', async () => {
		const { ctx, http } = makeCtx({
			params: {
				...deleteResource,
				publicIds: ['docs/a', ' docs/b ', '', 'docs/c'],
				deleteOptions: {},
			},
		});

		await deleteAssets(ctx, 0, testCreds);

		expect((lastRequest(http).qs as IDataObject).public_ids).toBe('docs/a,docs/b,docs/c');
	});

	it('routes to the correct URL for non-image resource types', async () => {
		const { ctx, http } = makeCtx({
			params: { resourceType: 'video', type: 'private', publicIds: 'clip1', deleteOptions: {} },
		});

		await deleteAssets(ctx, 0, testCreds);

		expect(lastRequest(http).url).toBe(
			'https://api.cloudinary.com/v1_1/demo/resources/video/private',
		);
	});

	it('merges deleteOptions into qs only when set', async () => {
		const { ctx, http } = makeCtx({
			params: {
				...deleteResource,
				publicIds: 'docs/a',
				deleteOptions: { invalidate: true, keep_original: false, next_cursor: 'cur1' },
			},
		});

		await deleteAssets(ctx, 0, testCreds);

		expect(lastRequest(http).qs).toEqual({
			public_ids: 'docs/a',
			invalidate: true,
			keep_original: false,
			next_cursor: 'cur1',
		});
	});

	it('throws when no public IDs are provided (whitespace only)', async () => {
		const { ctx } = makeCtx({
			params: { ...deleteResource, publicIds: ' , ,', deleteOptions: {} },
		});

		await expect(deleteAssets(ctx, 0, testCreds)).rejects.toThrow('No public IDs provided');
	});

	it('throws when expression resolves to an empty array', async () => {
		const { ctx } = makeCtx({
			params: { ...deleteResource, publicIds: [], deleteOptions: {} },
		});

		await expect(deleteAssets(ctx, 0, testCreds)).rejects.toThrow('No public IDs provided');
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

describe('updateDisplayName handler', () => {
	it('PUTs the asset_id URL with body { display_name } and HTTP Basic auth', async () => {
		const { ctx, http } = makeCtx({
			params: { assetId: 'abc123', displayName: 'Sunset Cliffs' },
		});

		await updateDisplayName(ctx, 0, testCreds);

		const req = lastRequest(http);
		expect(req.method).toBe('PUT');
		expect(req.url).toBe(ASSET_ID_URL);
		expect(req.auth).toEqual({ username: testCreds.apiKey, password: testCreds.apiSecret });
		expect(req.body).toEqual({ display_name: 'Sunset Cliffs' });
		// No signature — this endpoint authenticates via Basic, like other Admin ops.
		expect((req.body as IDataObject).signature).toBeUndefined();
	});
});
