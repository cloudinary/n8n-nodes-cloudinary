import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { IDataObject } from 'n8n-workflow';
import { uploadUrl } from './uploadUrl';
import { generateCloudinarySignature } from '../../cloudinary.utils';
import { makeCtx, lastRequest, testCreds } from '../testHelpers';

const baseParams = {
	url: 'https://example.com/a.jpg',
	resource_type: 'image',
	additionalFields: {},
};

describe('uploadUrl handler', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
	});

	it('POSTs urlencoded to the signed-upload endpoint', async () => {
		const { ctx, http } = makeCtx({ params: baseParams });

		await uploadUrl(ctx, 0, testCreds);

		const req = lastRequest(http);
		expect(req.method).toBe('POST');
		expect(req.url).toBe('https://api.cloudinary.com/v1_1/demo/image/upload');
		expect(req.headers?.['Content-Type']).toBe('application/x-www-form-urlencoded');
		expect(req.auth).toBeUndefined();
	});

	it('puts the remote url in the body as `file` and signs it', async () => {
		const { ctx, http } = makeCtx({ params: baseParams });

		await uploadUrl(ctx, 0, testCreds);

		const body = lastRequest(http).body as IDataObject;
		expect(body.file).toBe('https://example.com/a.jpg');
		// `file` is part of the signed payload here (unlike file upload), but
		// generateCloudinarySignature excludes it — so the signature must match
		// the payload computed without file/api_key/signature.
		const timestamp = body.timestamp as number;
		expect(body.signature).toBe(
			generateCloudinarySignature(
				{ timestamp, api_key: testCreds.apiKey, file: body.file },
				testCreds.apiSecret,
			),
		);
	});

	it('converts structured metadata to a pipe string in the body', async () => {
		const { ctx, http } = makeCtx({
			params: { ...baseParams, additionalFields: { metadata: { a: '1', b: ['x'] } } },
		});

		await uploadUrl(ctx, 0, testCreds);

		const body = lastRequest(http).body as IDataObject;
		expect(body.metadata).toBe('a=1|b=["x"]');
	});

	it('returns the HTTP response wrapped in an array', async () => {
		const { ctx, http } = makeCtx({ params: baseParams });
		http.mockResolvedValue({ public_id: 'sample' });

		const result = await uploadUrl(ctx, 0, testCreds);

		expect(result).toEqual([{ public_id: 'sample' }]);
	});
});
