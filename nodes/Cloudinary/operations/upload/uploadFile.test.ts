import { describe, it, expect, vi, beforeEach } from 'vitest';
import { uploadFile } from './uploadFile';
import { generateCloudinarySignature } from '../../cloudinary.utils';
import { makeCtx, lastRequest, testCreds } from '../testHelpers';

const baseParams = { file: 'data', resource_type_file: 'image', additionalFieldsFile: {} };

describe('uploadFile handler', () => {
	beforeEach(() => {
		// Pin the clock so the timestamp (and thus the signature) is deterministic.
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
	});

	it('POSTs to the signed-upload endpoint for the chosen resource type', async () => {
		const { ctx, http } = makeCtx({ params: baseParams });

		await uploadFile(ctx, 0, testCreds);

		const req = lastRequest(http);
		expect(req.method).toBe('POST');
		expect(req.url).toBe('https://api.cloudinary.com/v1_1/demo/image/upload');
		expect(req.headers?.['Content-Type']).toMatch(/^multipart\/form-data; boundary=/);
	});

	it('includes api_key, timestamp, and a valid signature in the multipart body', async () => {
		const { ctx, http } = makeCtx({ params: baseParams });

		await uploadFile(ctx, 0, testCreds);

		const body = (lastRequest(http).body as Buffer).toString('latin1');
		const timestamp = Math.round(new Date('2026-01-01T00:00:00Z').getTime() / 1000);
		const expectedSig = generateCloudinarySignature(
			{ timestamp, api_key: testCreds.apiKey },
			testCreds.apiSecret,
		);

		expect(body).toContain('name="api_key"');
		expect(body).toContain(testCreds.apiKey);
		expect(body).toContain('name="timestamp"');
		expect(body).toContain(String(timestamp));
		expect(body).toContain('name="signature"');
		expect(body).toContain(expectedSig);
	});

	it('does NOT use HTTP Basic auth (signed-upload flow, not Admin API)', async () => {
		const { ctx, http } = makeCtx({ params: baseParams });

		await uploadFile(ctx, 0, testCreds);

		expect(lastRequest(http).auth).toBeUndefined();
	});

	it('converts structured metadata to a pipe string before signing and sending', async () => {
		const { ctx, http } = makeCtx({
			params: {
				...baseParams,
				additionalFieldsFile: { metadata: { color: 'red', tags: ['a', 'b'] } },
			},
		});

		await uploadFile(ctx, 0, testCreds);

		const body = (lastRequest(http).body as Buffer).toString('latin1');
		expect(body).toContain('color=red|tags=["a","b"]');
	});

	it('sends the binary file part with its filename and mime type', async () => {
		const { ctx, http } = makeCtx({ params: baseParams });

		await uploadFile(ctx, 0, testCreds);

		const body = (lastRequest(http).body as Buffer).toString('latin1');
		expect(body).toContain('filename="cat.png"');
		expect(body).toContain('Content-Type: image/png');
		expect(body).toContain('PNGDATA');
	});

	it('falls back to a default filename and mime type when binary metadata is missing', async () => {
		const { ctx, http } = makeCtx({ params: baseParams, binary: {} });

		await uploadFile(ctx, 0, testCreds);

		const body = (lastRequest(http).body as Buffer).toString('latin1');
		expect(body).toContain('filename="file"');
		expect(body).toContain('Content-Type: application/octet-stream');
	});

	it('returns the HTTP response wrapped in an array', async () => {
		const { ctx, http } = makeCtx({ params: baseParams });
		const response = { public_id: 'sample', secure_url: 'https://res.cloudinary.com/x' };
		http.mockResolvedValue(response);

		const result = await uploadFile(ctx, 0, testCreds);

		expect(result).toEqual([response]);
	});
});
