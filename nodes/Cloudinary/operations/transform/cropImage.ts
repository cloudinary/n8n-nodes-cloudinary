import { joinTransformation } from '../../cloudinary.utils';
import { OperationHandler } from '../types';
import { buildComponents, buildTransformResult, cropComponents, readTransformInput } from './shared';

/**
 * Crop a stored asset to fixed dimensions or an aspect ratio.
 * - Default: `c_fill,g_<focus>,w_,h_` (crops away pixels).
 * - Generative Fill: `b_gen_fill[:prompt_...],c_pad,...` — extends/pads the canvas
 *   with AI-generated content instead of cropping (a generative AI effect).
 *
 * One factory serves images and videos: the crop dimensions, aspect ratio, and focus
 * (`g_auto`/`g_face`/`g_center`) are valid for both. Generative Fill is image-only — the
 * video op simply does not declare those fields, so `getNodeParameter` returns the
 * `false`/`''` defaults and the gen-fill branch never fires for video.
 */
const makeCrop =
	(resourceType: 'image' | 'video'): OperationHandler =>
	async (ctx, i, creds) => {
		const { publicId, deliveryType, version } = readTransformInput(ctx, i);
		const cropBy = ctx.getNodeParameter('cropBy', i, 'dimensions') as string;
		const genFill = ctx.getNodeParameter('cropGenerativeFill', i, false) as boolean;
		const focus = ctx.getNodeParameter('cropFocus', i, 'auto') as string;
		const genFillPrompt = ctx.getNodeParameter('cropGenerativeFillPrompt', i, '') as string;

		// Aspect-ratio mode reads its own width field; dimensions mode reads width+height.
		const width =
			cropBy === 'aspectRatio'
				? (ctx.getNodeParameter('cropAspectWidth', i, 0) as number)
				: (ctx.getNodeParameter('cropWidth', i, 0) as number);
		const height =
			cropBy === 'aspectRatio' ? 0 : (ctx.getNodeParameter('cropHeight', i, 0) as number);
		const aspectRatio =
			cropBy === 'aspectRatio' ? (ctx.getNodeParameter('cropAspectRatio', i, '') as string) : '';

		const components = buildComponents(ctx, i, () =>
			cropComponents({ cropBy, width, height, aspectRatio, focus, genFill, genFillPrompt }),
		);

		return [
			buildTransformResult(creds, {
				resourceType,
				type: deliveryType,
				transformation: joinTransformation(components),
				publicId,
				version,
			}),
		];
	};

export const cropImage = makeCrop('image');
export const cropVideo = makeCrop('video');
