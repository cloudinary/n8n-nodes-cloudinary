import { vi, expect } from 'vitest';
import type { IDataObject, IExecuteFunctions, IHttpRequestOptions } from 'n8n-workflow';
import { CREDENTIAL_TYPE, CloudinaryCredentials } from './types';

export const testCreds: CloudinaryCredentials = {
	cloudName: 'demo',
	apiKey: 'key123',
	apiSecret: 'secret123',
};

export interface MockCtxOptions {
	/** Node-parameter map. Reads of unknown names fall back to getNodeParameter's default arg. */
	params?: Record<string, unknown>;
	/** Return value of assertBinaryData. */
	binary?: { fileName?: string; mimeType?: string };
	/** Buffer returned by getBinaryDataBuffer. */
	buffer?: Buffer;
	/** Input items seen by execute() via getInputData. */
	items?: IDataObject[];
	/** What continueOnFail() reports. */
	continueOnFail?: boolean;
}

/**
 * Builds a mock IExecuteFunctions exposing only the surface the handlers and
 * execute() touch. The returned `http` spy resolves to {} by default; tests
 * configure it with mockResolvedValue / mockResolvedValueOnce / mockRejectedValue
 * and then assert the request contract via lastRequest/requestAt.
 */
export function makeCtx(options: MockCtxOptions = {}) {
	const {
		params = {},
		binary = { fileName: 'cat.png', mimeType: 'image/png' },
		buffer = Buffer.from('PNGDATA'),
		continueOnFail = false,
	} = options;

	const http = vi.fn().mockResolvedValue({});
	const ctx = {
		getInputData: vi.fn(() => options.items ?? [{ json: {} }]),
		getCredentials: vi.fn(async () => ({ ...testCreds })),
		getNodeParameter: vi.fn((name: string, _i: number, fallback?: unknown) =>
			name in params ? params[name] : fallback,
		),
		getNode: vi.fn(() => ({ name: 'Cloudinary', type: 'cloudinary' })),
		continueOnFail: vi.fn(() => continueOnFail),
		helpers: {
			assertBinaryData: vi.fn(() => binary),
			getBinaryDataBuffer: vi.fn(async () => buffer),
			httpRequestWithAuthentication: http,
		},
	} as unknown as IExecuteFunctions;

	return { ctx, http };
}

/**
 * Extracts the IHttpRequestOptions from the Nth call to
 * httpRequestWithAuthentication.call(ctx, TYPE, options). Because the handler
 * uses `.call`, `this` is NOT in the recorded args — they are [TYPE, options].
 */
export function requestAt(http: ReturnType<typeof vi.fn>, callIndex: number): IHttpRequestOptions {
	const [type, options] = http.mock.calls[callIndex];
	expect(type).toBe(CREDENTIAL_TYPE);
	return options as IHttpRequestOptions;
}

export function lastRequest(http: ReturnType<typeof vi.fn>): IHttpRequestOptions {
	return requestAt(http, http.mock.calls.length - 1);
}
