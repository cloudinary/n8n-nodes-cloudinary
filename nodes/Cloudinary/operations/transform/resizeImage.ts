import { joinTransformation } from '../../cloudinary.utils';
import { OperationHandler } from '../types';
import { buildComponents, buildTransformResult, readTransformInput, resizeComponents } from './shared';

/** Resize an image to a width and/or height with a fit mode. Emits `c_<fit>,w_,h_`. */
export const resizeImage: OperationHandler = async (ctx, i, creds) => {
	const { publicId, deliveryType, version } = readTransformInput(ctx, i);
	const width = ctx.getNodeParameter('resizeWidth', i, 0) as number;
	const height = ctx.getNodeParameter('resizeHeight', i, 0) as number;
	const fit = ctx.getNodeParameter('resizeFit', i, 'limit') as string;

	const components = buildComponents(ctx, i, () => resizeComponents({ width, height, fit }));

	return [
		buildTransformResult(creds, {
			resourceType: 'image',
			type: deliveryType,
			transformation: joinTransformation(components),
			publicId,
			version,
		}),
	];
};
