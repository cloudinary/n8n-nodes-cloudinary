import { joinTransformation } from '../../cloudinary.utils';
import { OperationHandler } from '../types';
import {
	buildComponents,
	buildTransformResult,
	padBackgroundSuffix,
	readTransformInput,
	resizeComponents,
} from './shared';

/**
 * Resize a stored asset to a width and/or height with a fit mode. Emits `c_<fit>,w_,h_`,
 * prefixed with a `b_` background for the pad fit modes when one is chosen. The fit modes
 * and pad backgrounds are identical for images and videos, so a single handler factory
 * serves both — only the `resource_type` (URL path segment) differs.
 */
const makeResize =
	(resourceType: 'image' | 'video'): OperationHandler =>
	async (ctx, i, creds) => {
		const { publicId, deliveryType, version, continueFrom } = readTransformInput(ctx, i);
		const width = ctx.getNodeParameter('resizeWidth', i, 0) as number;
		const height = ctx.getNodeParameter('resizeHeight', i, 0) as number;
		const fit = ctx.getNodeParameter('resizeFit', i, 'limit') as string;
		const padBackground = ctx.getNodeParameter('resizePadBackground', i, '') as string;
		const padBackgroundColor = ctx.getNodeParameter('resizePadBackgroundColor', i, '') as string;
		const background = padBackgroundSuffix(padBackground, padBackgroundColor);

		const components = buildComponents(ctx, i, () =>
			resizeComponents({ width, height, fit, background }),
		);

		return [
			buildTransformResult(creds, {
				resourceType,
				type: deliveryType,
				transformation: joinTransformation(components),
				publicId,
				version,
				continueFrom,
			}),
		];
	};

export const resizeImage = makeResize('image');
export const resizeVideo = makeResize('video');
