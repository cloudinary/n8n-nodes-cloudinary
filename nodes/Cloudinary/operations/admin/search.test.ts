import { describe, it, expect } from 'vitest';
import type { IDataObject } from 'n8n-workflow';
import { search } from './search';
import { makeCtx, lastRequest, requestAt, testCreds } from '../testHelpers';

const params = (overrides: Record<string, unknown> = {}) => ({
	searchExpression: 'tags=cat',
	searchResourceTypes: ['image'],
	searchReturnAll: false,
	searchMaxResults: 50,
	searchAdditionalFields: {},
	...overrides,
});

describe('search handler', () => {
	it('POSTs to the search endpoint with Basic auth and json:true', async () => {
		const { ctx, http } = makeCtx({ params: params() });
		http.mockResolvedValue({ resources: [{ public_id: 'a' }] });

		await search(ctx, 0, testCreds);

		const req = lastRequest(http);
		expect(req.method).toBe('POST');
		expect(req.url).toBe('https://api.cloudinary.com/v1_1/demo/resources/search');
		expect(req.json).toBe(true);
		expect(req.auth).toEqual({ username: testCreds.apiKey, password: testCreds.apiSecret });
	});

	it('injects a resource_type clause into the expression', async () => {
		const { ctx, http } = makeCtx({ params: params({ searchResourceTypes: ['video'] }) });
		http.mockResolvedValue({ resources: [] });

		await search(ctx, 0, testCreds);

		expect((lastRequest(http).body as IDataObject).expression).toBe(
			'(tags=cat) AND resource_type:video',
		);
	});

	it('returns the flattened resources array', async () => {
		const { ctx, http } = makeCtx({ params: params() });
		http.mockResolvedValue({ resources: [{ public_id: 'a' }, { public_id: 'b' }] });

		const result = await search(ctx, 0, testCreds);

		expect(result).toEqual([{ public_id: 'a' }, { public_id: 'b' }]);
	});

	it('does not paginate when returnAll is false even if a cursor is returned', async () => {
		const { ctx, http } = makeCtx({ params: params({ searchMaxResults: 50 }) });
		// First (and only) page fills the requested count, so the loop stops.
		http.mockResolvedValue({
			resources: Array.from({ length: 50 }, (_, k) => ({ public_id: `p${k}` })),
			next_cursor: 'more',
		});

		const result = await search(ctx, 0, testCreds);

		expect(http).toHaveBeenCalledTimes(1);
		expect(result).toHaveLength(50);
	});

	it('follows next_cursor across pages when returnAll is true', async () => {
		const { ctx, http } = makeCtx({ params: params({ searchReturnAll: true }) });
		http
			.mockResolvedValueOnce({ resources: [{ public_id: 'a' }], next_cursor: 'cur1' })
			.mockResolvedValueOnce({ resources: [{ public_id: 'b' }] });

		const result = await search(ctx, 0, testCreds);

		expect(http).toHaveBeenCalledTimes(2);
		// Page size is capped at 500 for returnAll, and the cursor is threaded through.
		expect((requestAt(http, 0).body as IDataObject).max_results).toBe(500);
		expect((requestAt(http, 1).body as IDataObject).next_cursor).toBe('cur1');
		expect(result).toEqual([{ public_id: 'a' }, { public_id: 'b' }]);
	});

	it('maps a 429 rate-limit error to a helpful NodeOperationError', async () => {
		const { ctx, http } = makeCtx({ params: params() });
		http.mockRejectedValue({ httpCode: 429, response: { headers: { 'retry-after': '60' } } });

		await expect(search(ctx, 0, testCreds)).rejects.toThrow(
			'Cloudinary Search rate limit exceeded',
		);
	});

	it('maps a 400 query error to an Invalid search expression error', async () => {
		const { ctx, http } = makeCtx({ params: params() });
		http.mockRejectedValue({
			httpCode: 400,
			response: { body: { error: { message: 'Query Error (at position 5)' } } },
		});

		await expect(search(ctx, 0, testCreds)).rejects.toThrow('Invalid search expression');
	});

	it('surfaces a generic Cloudinary message for other errors', async () => {
		const { ctx, http } = makeCtx({ params: params() });
		http.mockRejectedValue({
			httpCode: 500,
			response: { body: { error: { message: 'Internal failure' } } },
		});

		await expect(search(ctx, 0, testCreds)).rejects.toThrow('Cloudinary search failed');
	});
});
