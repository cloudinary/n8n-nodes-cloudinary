import { describe, it, expect } from 'vitest';
import { NodeApiError, type IDataObject } from 'n8n-workflow';
import { textToImage } from './textToImage';
import { imageToImage } from './imageToImage';
import { getTask } from './getTask';
import {
	imageSize,
	modelSelection,
	referenceImages,
	shapeGenerationOutput,
	target,
} from './shared';
import { Cloudinary } from '../../Cloudinary.node';
import { makeCtx, lastRequest, testCreds } from '../testHelpers';

const TASK_ID = '053f4bde4b933c8ecef23724ecde63b6';

// Response bodies taken from the spec's `components.examples`.
const MANAGED_ASSET_RESULT = {
	data: {
		assets: [
			{
				storage: {
					storage_type: 'managed_asset',
					secure_url: 'https://res.cloudinary.com/demo/image/upload/v1750000000/my-public-id.png',
					asset_id: '0d6f8e1c2b3a4d5e6f7a8b9c0d1e2f3a',
					public_id: 'my-public-id',
					resource_type: 'image',
					type: 'upload',
					version: 1750000000,
				},
				format: 'png',
				width: 1024,
				height: 768,
				bytes: 2048576,
				model: { family: 'flux', tier: 'premium', id: 'flux-2-pro' },
				seed: 42,
				created_at: '2026-04-21T14:30:00Z',
			},
		],
	},
	limits: {
		addons_quota: [{ type: 'image_generation', used_by_request: 1, remaining: 48, limit: 50 }],
	},
	request_id: '17c3b70c5096df0e77e838323abb7029',
};

const ACCEPTED_TASK = {
	data: { task_id: TASK_ID, status: 'pending' },
	request_id: '17c3b70c5096df0e77e838323abb7029',
};

const COMPLETED_TASK = {
	data: {
		task_id: TASK_ID,
		status: 'completed',
		result: {
			assets: [
				{
					storage: {
						storage_type: 'temporary',
						secure_url: 'https://upload-global.cloudinary.com/v2/demo/uploads/a78a/stream',
						expires_at: '2026-06-25T12:50:26Z',
					},
					format: 'png',
					width: 1024,
					height: 768,
				},
			],
		},
	},
	request_id: 'req-2',
};

describe('generate:textToImage', () => {
	it('POSTs JSON with Basic auth to the v2 text_to_image endpoint, sending only the prompt by default', async () => {
		const { ctx, http } = makeCtx({ params: { prompt: '  A man with a hat  ' } });
		http.mockResolvedValue(MANAGED_ASSET_RESULT);

		await textToImage(ctx, 0, testCreds);

		const req = lastRequest(http);
		expect(req.method).toBe('POST');
		expect(req.url).toBe('https://api.cloudinary.com/v2/generate/demo/text_to_image');
		expect(req.auth).toEqual({ username: 'key123', password: 'secret123' });
		expect(req.json).toBe(true);
		expect(req.headers?.['Content-Type']).toBe('application/json');
		expect(req.body).toEqual({ prompt: 'A man with a hat' });
	});

	it('maps model, size, target and options onto the nested request shape', async () => {
		const { ctx, http } = makeCtx({
			params: {
				prompt: 'A sunset',
				modelSelection: 'family',
				modelFamily: 'flux',
				modelTier: 'premium',
				imageSize: 'aspectRatio',
				imageSizeAspectRatio: '16:9',
				imageSizeResolution: '2K',
				generateOptions: {
					public_id: 'my-public-id',
					upload_preset: 'some-preset',
					seed: 0,
					format: 'webp',
					async: true,
					notification_url: 'https://path.to/webhook',
				},
			},
		});
		http.mockResolvedValue(ACCEPTED_TASK);

		await textToImage(ctx, 0, testCreds);

		expect(lastRequest(http).body).toEqual({
			prompt: 'A sunset',
			model: { family: 'flux', tier: 'premium' },
			image_size: { aspect_ratio: '16:9', resolution: '2K' },
			target: {
				target_type: 'managed_asset',
				public_id: 'my-public-id',
				upload_preset: 'some-preset',
			},
			format: 'webp',
			seed: 0,
			async: true,
			notification_url: 'https://path.to/webhook',
		});
	});

	it('reads the text-to-image model ID field for By Model ID', async () => {
		const { ctx, http } = makeCtx({
			params: {
				prompt: 'x',
				modelSelection: 'id',
				textToImageModelId: 'flux-2-pro',
				imageToImageModelId: 'flux-2-pro-edit',
				imageSize: 'dimensions',
				imageSizeWidth: 1280,
				imageSizeHeight: 720,
				generateOptions: { target_type: 'temporary' },
			},
		});
		http.mockResolvedValue(MANAGED_ASSET_RESULT);

		await textToImage(ctx, 0, testCreds);

		const body = lastRequest(http).body as IDataObject;
		expect(body.model).toEqual({ id: 'flux-2-pro' });
		expect(body.image_size).toEqual({ width: 1280, height: 720 });
		expect(body.target).toEqual({ target_type: 'temporary' });
	});

	it('flattens each generated asset into one item with storage fields at the top level', async () => {
		const { ctx, http } = makeCtx({ params: { prompt: 'x' } });
		http.mockResolvedValue(MANAGED_ASSET_RESULT);

		const out = await textToImage(ctx, 0, testCreds);

		expect(out).toHaveLength(1);
		expect(out[0]).toMatchObject({
			public_id: 'my-public-id',
			asset_id: '0d6f8e1c2b3a4d5e6f7a8b9c0d1e2f3a',
			secure_url: 'https://res.cloudinary.com/demo/image/upload/v1750000000/my-public-id.png',
			resource_type: 'image',
			type: 'upload',
			storage_type: 'managed_asset',
			format: 'png',
			model: { id: 'flux-2-pro' },
			request_id: '17c3b70c5096df0e77e838323abb7029',
		});
		expect(out[0]).not.toHaveProperty('storage');
	});

	it('returns the task fields for an async (202) response', async () => {
		const { ctx, http } = makeCtx({ params: { prompt: 'x', generateOptions: { async: true } } });
		http.mockResolvedValue(ACCEPTED_TASK);

		const out = await textToImage(ctx, 0, testCreds);

		expect(out).toEqual([
			{ task_id: TASK_ID, status: 'pending', request_id: ACCEPTED_TASK.request_id },
		]);
	});

	it('returns the raw API response when Simplify is off', async () => {
		const { ctx, http } = makeCtx({ params: { prompt: 'x', simplify: false } });
		http.mockResolvedValue(MANAGED_ASSET_RESULT);

		expect(await textToImage(ctx, 0, testCreds)).toEqual([MANAGED_ASSET_RESULT]);
	});

	it('rejects an empty prompt without calling the API', async () => {
		const { ctx, http } = makeCtx({ params: { prompt: '   ' } });

		await expect(textToImage(ctx, 0, testCreds)).rejects.toThrow('Prompt is required');
		expect(http).not.toHaveBeenCalled();
	});

	it('rejects Public ID with the Temporary storage target', async () => {
		const { ctx, http } = makeCtx({
			params: { prompt: 'x', generateOptions: { target_type: 'temporary', public_id: 'p' } },
		});

		await expect(textToImage(ctx, 0, testCreds)).rejects.toThrow('Managed Asset storage target');
		expect(http).not.toHaveBeenCalled();
	});

	describe('error mapping', () => {
		const rateLimitedBody = {
			error: {
				category: 'rate_limit_error',
				code: 'MG_00429',
				message: 'Daily generation limit exceeded',
			},
			limits: {
				addons_quota: [{ type: 'image_generation', used_by_request: 1, remaining: 0, limit: 50 }],
			},
			request_id: 'req-429',
		};

		it('rewrites the NodeApiError n8n throws with the spec error code, hint and request ID', async () => {
			const { ctx, http } = makeCtx({ params: { prompt: 'x' } });
			// What httpRequestWithAuthentication throws: a NodeApiError wrapping the HTTP error.
			const httpError = Object.assign(new Error('Request failed with status code 429'), {
				response: { status: 429, data: rateLimitedBody },
			});
			http.mockRejectedValue(new NodeApiError(ctx.getNode(), httpError as never));

			const err = await textToImage(ctx, 0, testCreds).catch((e) => e);

			expect(err).toBeInstanceOf(NodeApiError);
			expect(err.message).toBe('MG_00429: Daily generation limit exceeded');
			expect(err.description).toContain('0 of 50 quota units remaining');
			expect(err.description).toContain('Request ID: req-429');
			expect(err.httpCode).toBe('429');
		});

		it('handles a plain error carrying the body under response.body', async () => {
			const { ctx, http } = makeCtx({ params: { prompt: 'x' } });
			http.mockRejectedValue({
				httpCode: 403,
				response: {
					body: {
						error: { category: 'auth_error', code: 'MG_00403', message: 'Add-on not enabled' },
						request_id: 'req-403',
					},
				},
			});

			const err = await textToImage(ctx, 0, testCreds).catch((e) => e);

			expect(err).toBeInstanceOf(NodeApiError);
			expect(err.message).toBe('MG_00403: Add-on not enabled');
			expect(err.description).toContain('Image Generation add-on');
		});
	});
});

describe('generate:imageToImage', () => {
	it('POSTs to image_to_image with reference images and the edit-model ID field', async () => {
		const { ctx, http } = makeCtx({
			params: {
				prompt: 'Place [1] on a marble counter',
				modelSelection: 'id',
				textToImageModelId: 'flux-2-pro',
				imageToImageModelId: 'flux-2-pro-edit',
				reference_images: {
					reference_image: [
						{ source_type: 'url', url: ' https://example.com/product.png ' },
						{ source_type: 'managed_asset', asset_id: '0d6f8e1c2b3a4d5e6f7a8b9c0d1e2f3a' },
					],
				},
			},
		});
		http.mockResolvedValue(MANAGED_ASSET_RESULT);

		await imageToImage(ctx, 0, testCreds);

		const req = lastRequest(http);
		expect(req.url).toBe('https://api.cloudinary.com/v2/generate/demo/image_to_image');
		expect(req.body).toEqual({
			prompt: 'Place [1] on a marble counter',
			model: { id: 'flux-2-pro-edit' },
			reference_images: [
				{ source_type: 'url', url: 'https://example.com/product.png' },
				{ source_type: 'managed_asset', asset_id: '0d6f8e1c2b3a4d5e6f7a8b9c0d1e2f3a' },
			],
		});
	});

	it('requires at least one reference image', async () => {
		const { ctx, http } = makeCtx({ params: { prompt: 'x', reference_images: {} } });

		await expect(imageToImage(ctx, 0, testCreds)).rejects.toThrow(
			'between 1 and 4 reference images',
		);
		expect(http).not.toHaveBeenCalled();
	});
});

describe('generate:getTask', () => {
	it('GETs the task by ID', async () => {
		const { ctx, http } = makeCtx({ params: { task_id: ` ${TASK_ID} ` } });
		http.mockResolvedValue(ACCEPTED_TASK);

		const out = await getTask(ctx, 0, testCreds);

		const req = lastRequest(http);
		expect(req.method).toBe('GET');
		expect(req.url).toBe(`https://api.cloudinary.com/v2/generate/demo/tasks/${TASK_ID}`);
		expect(req.body).toBeUndefined();
		expect(out).toEqual([
			{ task_id: TASK_ID, status: 'pending', request_id: ACCEPTED_TASK.request_id },
		]);
	});

	it('returns the generated asset(s) with task_id and status once completed', async () => {
		const { ctx, http } = makeCtx({ params: { task_id: TASK_ID } });
		http.mockResolvedValue(COMPLETED_TASK);

		const out = await getTask(ctx, 0, testCreds);

		expect(out).toEqual([
			{
				storage_type: 'temporary',
				secure_url: 'https://upload-global.cloudinary.com/v2/demo/uploads/a78a/stream',
				expires_at: '2026-06-25T12:50:26Z',
				format: 'png',
				width: 1024,
				height: 768,
				task_id: TASK_ID,
				status: 'completed',
				request_id: 'req-2',
			},
		]);
	});

	it('rejects a malformed task ID without calling the API', async () => {
		const { ctx, http } = makeCtx({ params: { task_id: '../resources/image' } });

		await expect(getTask(ctx, 0, testCreds)).rejects.toThrow('Invalid task ID');
		expect(http).not.toHaveBeenCalled();
	});
});

describe('request builders', () => {
	const model = (p: Partial<Parameters<typeof modelSelection>[0]>) =>
		modelSelection({ mode: 'default', family: '', tier: '', id: '', preference: '', ...p });

	it('modelSelection emits each ModelSelection form', () => {
		expect(model({})).toBeUndefined();
		expect(model({ mode: 'family', family: 'recraft' })).toEqual({ family: 'recraft' });
		expect(model({ mode: 'auto', preference: 'quality_fast' })).toEqual({
			mode: 'auto',
			preference: 'quality_fast',
		});
		expect(model({ mode: 'auto' })).toEqual({ mode: 'auto' });
		expect(() => model({ mode: 'id' })).toThrow('requires a model ID');
	});

	it('imageSize validates the spec dimension bounds', () => {
		const size = (width: number, height: number) =>
			imageSize({ mode: 'dimensions', aspectRatio: '', resolution: '', width, height });
		expect(size(64, 4096)).toEqual({ width: 64, height: 4096 });
		expect(() => size(63, 100)).toThrow('Width must be');
		expect(() => size(100, 4097)).toThrow('Height must be');
		expect(() => size(100.5, 100)).toThrow('whole number');
	});

	it('target is omitted when nothing is set and defaults to managed_asset otherwise', () => {
		expect(target({})).toBeUndefined();
		expect(target({ uploadPreset: 'p' })).toEqual({
			target_type: 'managed_asset',
			upload_preset: 'p',
		});
		expect(target({ targetType: 'managed_asset' })).toEqual({ target_type: 'managed_asset' });
	});

	it('referenceImages enforces count, HTTPS and asset ID', () => {
		const url = { source_type: 'url', url: 'https://a.com/x.png' };
		expect(() => referenceImages([url, url, url, url, url])).toThrow('between 1 and 4');
		expect(() => referenceImages([{ source_type: 'url', url: 'http://a.com/x.png' }])).toThrow(
			'Reference image 1: URL must be an HTTPS URL',
		);
		expect(() => referenceImages([url, { source_type: 'managed_asset', asset_id: ' ' }])).toThrow(
			'Reference image 2: Asset ID is required',
		);
	});

	it('shapeGenerationOutput keeps a failed task as a single envelope item', () => {
		expect(
			shapeGenerationOutput(
				{ data: { task_id: TASK_ID, status: 'failed' }, request_id: 'r' },
				true,
			),
		).toEqual([{ task_id: TASK_ID, status: 'failed', request_id: 'r' }]);
	});
});

describe('Cloudinary.execute dispatch for Generate', () => {
	it('routes generate:textToImage to its handler', async () => {
		const { ctx, http } = makeCtx({
			params: { resource: 'generate', operation: 'textToImage', prompt: 'x' },
		});
		http.mockResolvedValue(MANAGED_ASSET_RESULT);

		const [out] = await new Cloudinary().execute.call(ctx);

		expect(out).toHaveLength(1);
		expect(out[0].json.public_id).toBe('my-public-id');
		expect(out[0].pairedItem).toBe(0);
	});
});
