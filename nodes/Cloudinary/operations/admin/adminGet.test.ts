import { describe, it, expect } from 'vitest';
import { getTags } from './getTags';
import { getMetadataFields } from './getMetadataFields';
import { makeCtx, lastRequest, testCreds } from '../testHelpers';

describe('getTags handler', () => {
	it('GETs the tags endpoint for the resource type with Basic auth', async () => {
		const { ctx, http } = makeCtx({
			params: { getTagsResourceType: 'image', tagsPrefix: '', tagsMaxResults: 100 },
		});

		await getTags(ctx, 0, testCreds);

		const req = lastRequest(http);
		expect(req.method).toBe('GET');
		expect(req.url).toBe('https://api.cloudinary.com/v1_1/demo/tags/image');
		expect(req.auth).toEqual({ username: testCreds.apiKey, password: testCreds.apiSecret });
	});

	it('omits the prefix query param when prefix is empty', async () => {
		const { ctx, http } = makeCtx({
			params: { getTagsResourceType: 'image', tagsPrefix: '', tagsMaxResults: 100 },
		});

		await getTags(ctx, 0, testCreds);

		expect(lastRequest(http).qs).toEqual({ max_results: 100 });
	});

	it('includes the prefix query param when provided', async () => {
		const { ctx, http } = makeCtx({
			params: { getTagsResourceType: 'video', tagsPrefix: 'promo', tagsMaxResults: 50 },
		});

		await getTags(ctx, 0, testCreds);

		expect(lastRequest(http).qs).toEqual({ prefix: 'promo', max_results: 50 });
	});
});

describe('getMetadataFields handler', () => {
	it('GETs the metadata_fields endpoint with Basic auth', async () => {
		const { ctx, http } = makeCtx();

		await getMetadataFields(ctx, 0, testCreds);

		const req = lastRequest(http);
		expect(req.method).toBe('GET');
		expect(req.url).toBe('https://api.cloudinary.com/v1_1/demo/metadata_fields');
		expect(req.auth).toEqual({ username: testCreds.apiKey, password: testCreds.apiSecret });
	});
});
