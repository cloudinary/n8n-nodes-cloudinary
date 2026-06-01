import { describe, it, expect } from 'vitest';
import type { IDataObject } from 'n8n-workflow';
import { optimizeImage } from './optimizeImage';
import { resizeImage } from './resizeImage';
import { cropImage } from './cropImage';
import { convertImage } from './convertImage';
import { optimizeVideo } from './optimizeVideo';
import { trimVideo } from './trimVideo';
import { videoThumbnail } from './videoThumbnail';
import { customTransformation } from './customTransformation';
import { multiStep } from './multiStep';
import { trailingMediaFormat } from './shared';
import { makeCtx, testCreds } from '../testHelpers';

// Transform handlers make NO HTTP call — they build a delivery URL and return it.
// So tests assert the returned JSON (secure_url + transformation + identity),
// not a request spy. makeCtx already provides getNodeParameter + getNode, which is
// the entire surface these handlers touch.

const HOST = 'https://res.cloudinary.com/demo';

describe('transform:optimizeImage', () => {
	it('emits f_auto/q_auto on the image/upload path by default', async () => {
		const { ctx } = makeCtx({ params: { transformPublicId: 'sample' } });
		const [out] = await optimizeImage(ctx, 0, testCreds);
		expect(out.transformation).toBe('f_auto/q_auto');
		expect(out.secure_url).toBe(`${HOST}/image/upload/f_auto/q_auto/sample`);
		expect(out.url).toBe('http://res.cloudinary.com/demo/image/upload/f_auto/q_auto/sample');
		expect(out.resource_type).toBe('image');
		expect(out.type).toBe('upload');
		expect(out.public_id).toBe('sample');
	});

	it('maps a quality level to q_auto:<level>', async () => {
		const { ctx } = makeCtx({ params: { transformPublicId: 'sample', imageQuality: 'eco' } });
		const [out] = await optimizeImage(ctx, 0, testCreds);
		expect(out.transformation).toBe('f_auto/q_auto:eco');
	});
});

describe('transform host variants', () => {
	it('puts the cloud name in the subdomain for a private CDN', async () => {
		const { ctx } = makeCtx({ params: { transformPublicId: 'sample' } });
		const [out] = await optimizeImage(ctx, 0, { ...testCreds, privateCdn: true });
		expect(out.secure_url).toBe('https://demo-res.cloudinary.com/image/upload/f_auto/q_auto/sample');
	});

	it('drops the cloud name for a custom hostname (CNAME)', async () => {
		const { ctx } = makeCtx({ params: { transformPublicId: 'sample' } });
		const [out] = await optimizeImage(ctx, 0, {
			...testCreds,
			secureDistribution: 'assets.example.com',
		});
		expect(out.secure_url).toBe('https://assets.example.com/image/upload/f_auto/q_auto/sample');
	});
});

describe('transform delivery type and additional options', () => {
	it('threads the top-level delivery type into the URL path', async () => {
		const { ctx } = makeCtx({
			params: { transformPublicId: 'sample', type: 'private' },
		});
		const [out] = await optimizeImage(ctx, 0, testCreds);
		expect(out.type).toBe('private');
		expect(out.secure_url).toBe(`${HOST}/image/private/f_auto/q_auto/sample`);
	});

	it('supports a social/fetch delivery type in the path (e.g. facebook)', async () => {
		const { ctx } = makeCtx({
			params: { transformPublicId: '65646572251', type: 'facebook' },
		});
		const [out] = await optimizeImage(ctx, 0, testCreds);
		expect(out.type).toBe('facebook');
		expect(out.secure_url).toBe(`${HOST}/image/facebook/f_auto/q_auto/65646572251`);
	});

	it('threads delivery type and version together', async () => {
		const { ctx } = makeCtx({
			params: {
				transformPublicId: 'sample',
				type: 'authenticated',
				transformAdditionalOptions: { version: '1234' },
			},
		});
		const [out] = await optimizeImage(ctx, 0, testCreds);
		expect(out.type).toBe('authenticated');
		expect(out.version).toBe('1234');
		expect(out.secure_url).toBe(`${HOST}/image/authenticated/f_auto/q_auto/v1234/sample`);
	});
});

describe('transform:resizeImage', () => {
	it('emits c_<fit>,w_,h_ with both dimensions', async () => {
		const { ctx } = makeCtx({
			params: { transformPublicId: 'sample', resizeWidth: 400, resizeHeight: 300, resizeFit: 'fit' },
		});
		const [out] = await resizeImage(ctx, 0, testCreds);
		expect(out.transformation).toBe('c_fit,w_400,h_300');
	});

	it('omits the missing dimension and defaults fit to limit', async () => {
		const { ctx } = makeCtx({ params: { transformPublicId: 'sample', resizeWidth: 800 } });
		const [out] = await resizeImage(ctx, 0, testCreds);
		expect(out.transformation).toBe('c_limit,w_800');
	});

	it('throws when neither width nor height is given', async () => {
		const { ctx } = makeCtx({ params: { transformPublicId: 'sample' } });
		await expect(resizeImage(ctx, 0, testCreds)).rejects.toThrow(/width and\/or a height/);
	});
});

describe('transform:cropImage', () => {
	it('emits c_fill,g_<focus>,w_,h_ for dimensions', async () => {
		const { ctx } = makeCtx({
			params: { transformPublicId: 'sample', cropWidth: 400, cropHeight: 300, cropFocus: 'face' },
		});
		const [out] = await cropImage(ctx, 0, testCreds);
		expect(out.transformation).toBe('c_fill,g_face,w_400,h_300');
	});

	it('emits ar_,c_fill,g_auto for aspect ratio', async () => {
		const { ctx } = makeCtx({
			params: {
				transformPublicId: 'sample',
				cropBy: 'aspectRatio',
				cropAspectRatio: '16:9',
				cropAspectWidth: 800,
			},
		});
		const [out] = await cropImage(ctx, 0, testCreds);
		expect(out.transformation).toBe('c_fill,g_auto,ar_16:9,w_800');
	});

	it('switches to b_gen_fill,c_pad when generative fill is on', async () => {
		const { ctx } = makeCtx({
			params: {
				transformPublicId: 'sample',
				cropBy: 'aspectRatio',
				cropAspectRatio: '1:1',
				cropGenerativeFill: true,
			},
		});
		const [out] = await cropImage(ctx, 0, testCreds);
		expect(out.transformation).toBe('b_gen_fill,c_pad,ar_1:1');
	});

	it('URL-encodes a generative fill prompt', async () => {
		const { ctx } = makeCtx({
			params: {
				transformPublicId: 'sample',
				cropWidth: 800,
				cropHeight: 600,
				cropGenerativeFill: true,
				cropGenerativeFillPrompt: 'a sandy beach',
			},
		});
		const [out] = await cropImage(ctx, 0, testCreds);
		expect(out.transformation).toBe('b_gen_fill:prompt_a%20sandy%20beach,c_pad,w_800,h_600');
	});

	it('throws when aspect ratio mode has no ratio', async () => {
		const { ctx } = makeCtx({
			params: { transformPublicId: 'sample', cropBy: 'aspectRatio' },
		});
		await expect(cropImage(ctx, 0, testCreds)).rejects.toThrow(/aspect ratio/);
	});

	it('throws when dimensions mode has no dimensions', async () => {
		const { ctx } = makeCtx({ params: { transformPublicId: 'sample' } });
		await expect(cropImage(ctx, 0, testCreds)).rejects.toThrow(/width and\/or a height/);
	});
});

describe('transform:convertImage', () => {
	it('emits f_<fmt> and delivers with the format extension', async () => {
		const { ctx } = makeCtx({ params: { transformPublicId: 'sample', convertFormat: 'png' } });
		const [out] = await convertImage(ctx, 0, testCreds);
		expect(out.transformation).toBe('f_png');
		expect(out.format).toBe('png');
		expect(out.secure_url).toBe(`${HOST}/image/upload/f_png/sample.png`);
	});
});

describe('transform:optimizeVideo', () => {
	it('emits f_auto:video/q_auto on the video path', async () => {
		const { ctx } = makeCtx({ params: { transformPublicId: 'clip' } });
		const [out] = await optimizeVideo(ctx, 0, testCreds);
		expect(out.transformation).toBe('f_auto:video/q_auto');
		expect(out.resource_type).toBe('video');
		expect(out.secure_url).toBe(`${HOST}/video/upload/f_auto:video/q_auto/clip`);
	});
});

describe('transform:trimVideo', () => {
	it('joins any combination of so/eo/du with commas', async () => {
		const { ctx } = makeCtx({
			params: { transformPublicId: 'clip', trimStart: '2.5', trimDuration: '5' },
		});
		const [out] = await trimVideo(ctx, 0, testCreds);
		expect(out.transformation).toBe('so_2.5,du_5');
	});

	it('supports start + end', async () => {
		const { ctx } = makeCtx({
			params: { transformPublicId: 'clip', trimStart: '0', trimEnd: '10' },
		});
		const [out] = await trimVideo(ctx, 0, testCreds);
		expect(out.transformation).toBe('so_0,eo_10');
	});

	it('throws when no bound is given', async () => {
		const { ctx } = makeCtx({ params: { transformPublicId: 'clip' } });
		await expect(trimVideo(ctx, 0, testCreds)).rejects.toThrow(/start, end, or duration/);
	});
});

describe('transform:videoThumbnail', () => {
	it('uses so_auto and a jpg extension by default', async () => {
		const { ctx } = makeCtx({ params: { transformPublicId: 'clip' } });
		const [out] = await videoThumbnail(ctx, 0, testCreds);
		expect(out.transformation).toBe('so_auto');
		expect(out.resource_type).toBe('video');
		expect(out.format).toBe('jpg');
		expect(out.secure_url).toBe(`${HOST}/video/upload/so_auto/clip.jpg`);
	});

	it('uses a specific timestamp and chosen format', async () => {
		const { ctx } = makeCtx({
			params: {
				transformPublicId: 'clip',
				thumbnailFrameMode: 'time',
				thumbnailTimestamp: '3',
				thumbnailFormat: 'png',
			},
		});
		const [out] = await videoThumbnail(ctx, 0, testCreds);
		expect(out.transformation).toBe('so_3');
		expect(out.secure_url).toBe(`${HOST}/video/upload/so_3/clip.png`);
	});

	it('throws when time mode has no timestamp', async () => {
		const { ctx } = makeCtx({
			params: { transformPublicId: 'clip', thumbnailFrameMode: 'time' },
		});
		await expect(videoThumbnail(ctx, 0, testCreds)).rejects.toThrow(/timestamp is required/);
	});
});

describe('trailingMediaFormat', () => {
	it('detects a standard media extension on the final segment', () => {
		expect(trailingMediaFormat('my_image1234.png')).toBe('png');
		expect(trailingMediaFormat('clip.mp4')).toBe('mp4');
		expect(trailingMediaFormat('folder/sub/photo.JPG')).toBe('jpg');
	});

	it('ignores non-media extensions and folder dots', () => {
		expect(trailingMediaFormat('report.final')).toBeUndefined();
		expect(trailingMediaFormat('archive.tar')).toBeUndefined();
		expect(trailingMediaFormat('folder.v2/photo')).toBeUndefined();
		expect(trailingMediaFormat('samples/animals/cat')).toBeUndefined();
		expect(trailingMediaFormat('sample')).toBeUndefined();
	});
});

describe('transform public_id with embedded extension (special case)', () => {
	it('re-appends the format so a dotted public_id resolves (optimize)', async () => {
		const { ctx } = makeCtx({ params: { transformPublicId: 'my_image1234.png' } });
		const [out] = await optimizeImage(ctx, 0, testCreds);
		expect(out.transformation).toBe('f_auto/q_auto');
		expect(out.format).toBe('png');
		expect(out.secure_url).toBe(`${HOST}/image/upload/f_auto/q_auto/my_image1234.png.png`);
	});

	it('re-appends the format for resize too', async () => {
		const { ctx } = makeCtx({
			params: { transformPublicId: 'my_image1234.png', resizeWidth: 400 },
		});
		const [out] = await resizeImage(ctx, 0, testCreds);
		expect(out.secure_url).toBe(`${HOST}/image/upload/c_limit,w_400/my_image1234.png.png`);
	});

	it('keeps an explicit convert format over the public_id extension', async () => {
		const { ctx } = makeCtx({
			params: { transformPublicId: 'my_image1234.png', convertFormat: 'webp' },
		});
		const [out] = await convertImage(ctx, 0, testCreds);
		expect(out.format).toBe('webp');
		expect(out.secure_url).toBe(`${HOST}/image/upload/f_webp/my_image1234.png.webp`);
	});

	it('leaves a dot-free public_id untouched', async () => {
		const { ctx } = makeCtx({ params: { transformPublicId: 'samples/cat' } });
		const [out] = await optimizeImage(ctx, 0, testCreds);
		expect(out.format).toBeUndefined();
		expect(out.secure_url).toBe(`${HOST}/image/upload/f_auto/q_auto/samples/cat`);
	});
});

describe('transform:customTransformation', () => {
	it('uses the raw transformation string verbatim with the chosen resource type', async () => {
		const { ctx } = makeCtx({
			params: {
				transformPublicId: 'clip',
				customResourceType: 'video',
				customTransformationString: 'so_0,du_10/f_auto:video/q_auto',
				customFormat: 'mp4',
			},
		});
		const [out] = await customTransformation(ctx, 0, testCreds);
		expect(out.transformation).toBe('so_0,du_10/f_auto:video/q_auto');
		expect(out.resource_type).toBe('video');
		expect(out.format).toBe('mp4');
		expect(out.secure_url).toBe(`${HOST}/video/upload/so_0,du_10/f_auto:video/q_auto/clip.mp4`);
	});

	it('throws on an empty transformation string', async () => {
		const { ctx } = makeCtx({
			params: { transformPublicId: 'clip', customTransformationString: '   ' },
		});
		await expect(customTransformation(ctx, 0, testCreds)).rejects.toThrow(/transformation string/);
	});

	it('does not include a format key when none is given', async () => {
		const { ctx } = makeCtx({
			params: { transformPublicId: 'sample', customTransformationString: 'e_grayscale' },
		});
		const [out] = await customTransformation(ctx, 0, testCreds);
		expect(out.format).toBeUndefined();
		expect((out as IDataObject).secure_url).toBe(`${HOST}/image/upload/e_grayscale/sample`);
	});
});

describe('transform:multiStep', () => {
	it('chains trim → crop (aspect ratio) → optimize into one video URL in order', async () => {
		const { ctx } = makeCtx({
			params: {
				transformPublicId: 'reel',
				multiStepResourceType: 'video',
				transformSteps: {
					step: [
						{ stepType: 'trim', end: '15' },
						{ stepType: 'crop', cropMode: 'aspectRatio', aspectRatio: '9:16', focus: 'auto' },
						{ stepType: 'optimize', quality: 'auto' },
					],
				},
			},
		});
		const [out] = await multiStep(ctx, 0, testCreds);
		expect(out.transformation).toBe('eo_15/c_fill,g_auto,ar_9:16/f_auto:video/q_auto');
		expect(out.resource_type).toBe('video');
		expect(out.secure_url).toBe(`${HOST}/video/upload/eo_15/c_fill,g_auto,ar_9:16/f_auto:video/q_auto/reel`);
	});

	it('emits f_auto (not :video) for the image resource type', async () => {
		const { ctx } = makeCtx({
			params: {
				transformPublicId: 'sample',
				multiStepResourceType: 'image',
				transformSteps: { step: [{ stepType: 'optimize', quality: 'eco' }] },
			},
		});
		const [out] = await multiStep(ctx, 0, testCreds);
		expect(out.transformation).toBe('f_auto/q_auto:eco');
		expect(out.secure_url).toBe(`${HOST}/image/upload/f_auto/q_auto:eco/sample`);
	});

	it('resize + convert chains the component and sets the delivery format', async () => {
		const { ctx } = makeCtx({
			params: {
				transformPublicId: 'sample',
				multiStepResourceType: 'image',
				transformSteps: {
					step: [
						{ stepType: 'resize', width: 800, fit: 'limit' },
						{ stepType: 'convert', format: 'webp' },
					],
				},
			},
		});
		const [out] = await multiStep(ctx, 0, testCreds);
		expect(out.transformation).toBe('c_limit,w_800/f_webp');
		expect(out.format).toBe('webp');
		expect(out.secure_url).toBe(`${HOST}/image/upload/c_limit,w_800/f_webp/sample.webp`);
	});

	it('crop by dimensions emits c_fill,g_<focus>,w_,h_', async () => {
		const { ctx } = makeCtx({
			params: {
				transformPublicId: 'sample',
				multiStepResourceType: 'image',
				transformSteps: {
					step: [{ stepType: 'crop', cropMode: 'dimensions', width: 400, height: 300, focus: 'face' }],
				},
			},
		});
		const [out] = await multiStep(ctx, 0, testCreds);
		expect(out.transformation).toBe('c_fill,g_face,w_400,h_300');
	});

	it('passes a raw component through verbatim', async () => {
		const { ctx } = makeCtx({
			params: {
				transformPublicId: 'sample',
				multiStepResourceType: 'image',
				transformSteps: { step: [{ stepType: 'raw', raw: 'e_grayscale' }] },
			},
		});
		const [out] = await multiStep(ctx, 0, testCreds);
		expect(out.transformation).toBe('e_grayscale');
	});

	it('throws when no steps are provided', async () => {
		const { ctx } = makeCtx({
			params: { transformPublicId: 'reel', multiStepResourceType: 'video' },
		});
		await expect(multiStep(ctx, 0, testCreds)).rejects.toThrow(/at least one transformation step/);
	});

	it('reports the offending step index when a step is incomplete', async () => {
		const { ctx } = makeCtx({
			params: {
				transformPublicId: 'reel',
				multiStepResourceType: 'video',
				transformSteps: {
					step: [{ stepType: 'optimize', quality: 'auto' }, { stepType: 'trim' }],
				},
			},
		});
		await expect(multiStep(ctx, 0, testCreds)).rejects.toThrow(/Step 2: Trim requires/);
	});
});
