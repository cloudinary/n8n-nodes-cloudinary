import { describe, it, expect } from 'vitest';
import type { IDataObject } from 'n8n-workflow';
import { updateTags } from './updateTags';
import { updateMetadata } from './updateMetadata';
import { makeCtx, lastRequest, testCreds } from '../testHelpers';

const ASSET_ID_URL = 'https://api.cloudinary.com/v1_1/demo/resources/abc123';

describe('asset:updateTags handler', () => {
	it('PUTs the asset_id URL with body { tags } and Basic auth', async () => {
		const { ctx, http } = makeCtx({
			params: { assetId: 'abc123', tags: 'cat,dog' },
		});

		await updateTags(ctx, 0, testCreds);

		const req = lastRequest(http);
		expect(req.method).toBe('PUT');
		expect(req.url).toBe(ASSET_ID_URL);
		expect(req.auth).toEqual({ username: testCreds.apiKey, password: testCreds.apiSecret });
		expect(req.body).toEqual({ tags: 'cat,dog' });
		expect((req.body as IDataObject).signature).toBeUndefined();
	});

	it('spreads updateOptions into the body', async () => {
		const { ctx, http } = makeCtx({
			params: { assetId: 'abc123', tags: 'cat', updateOptions: { invalidate: true } },
		});

		await updateTags(ctx, 0, testCreds);

		const req = lastRequest(http);
		expect(req.body).toEqual({ tags: 'cat', invalidate: true });
	});
});

describe('asset:updateTags append mode', () => {
	it('POSTs to /:resource_type/tags with command=add, signed body, CSV joined ids', async () => {
		const { ctx, http } = makeCtx({
			params: {
				tagMode: 'append',
				tagAppendPublicIds: 'docs/a, docs/b',
				tagAppendResourceType: 'image',
				tagAppendType: 'upload',
				tags: 'cat,dog',
			},
		});

		await updateTags(ctx, 0, testCreds);

		const req = lastRequest(http);
		expect(req.method).toBe('POST');
		expect(req.url).toBe('https://api.cloudinary.com/v1_1/demo/image/tags');
		expect(req.headers?.['Content-Type']).toBe('application/x-www-form-urlencoded');
		expect(req.auth).toBeUndefined();
		const body = req.body as IDataObject;
		expect(body.command).toBe('add');
		expect(body.public_ids).toBe('docs/a,docs/b');
		expect(body.tag).toBe('cat,dog');
		expect(body.type).toBe('upload');
		expect(body.api_key).toBe(testCreds.apiKey);
		expect(typeof body.signature).toBe('string');
		expect((body.signature as string).length).toBeGreaterThan(0);
	});

	it('includes delivery type in the signed body for authenticated assets', async () => {
		const { ctx, http } = makeCtx({
			params: {
				tagMode: 'append',
				tagAppendPublicIds: 'secret/asset',
				tagAppendResourceType: 'image',
				tagAppendType: 'authenticated',
				tags: 'classified',
			},
		});

		await updateTags(ctx, 0, testCreds);

		const body = lastRequest(http).body as IDataObject;
		expect(body.type).toBe('authenticated');
	});

	it('routes video resource type to /video/tags', async () => {
		const { ctx, http } = makeCtx({
			params: {
				tagMode: 'append',
				tagAppendPublicIds: 'clip',
				tagAppendResourceType: 'video',
				tagAppendType: 'upload',
				tags: 'trailer',
			},
		});

		await updateTags(ctx, 0, testCreds);

		expect(lastRequest(http).url).toBe('https://api.cloudinary.com/v1_1/demo/video/tags');
	});
});

describe('asset:updateMetadata handler', () => {
	it('PUTs the asset_id URL with pipe-string metadata and Basic auth', async () => {
		const { ctx, http } = makeCtx({
			params: { assetId: 'abc123', structuredMetadata: '{"color":"red"}' },
		});

		await updateMetadata(ctx, 0, testCreds);

		const req = lastRequest(http);
		expect(req.method).toBe('PUT');
		expect(req.url).toBe(ASSET_ID_URL);
		expect(req.auth).toEqual({ username: testCreds.apiKey, password: testCreds.apiSecret });
		expect((req.body as IDataObject).metadata).toBe('color=red');
	});
});
