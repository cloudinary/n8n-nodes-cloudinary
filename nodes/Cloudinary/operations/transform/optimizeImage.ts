import { joinTransformation } from '../../cloudinary.utils';
import { OperationHandler } from '../types';
import { buildTransformResult, optimizeComponents, readTransformInput } from './shared';

/** Optimize an image: auto-format + auto-quality. Emits `f_auto/q_auto[:level]`. */
export const optimizeImage: OperationHandler = async (ctx, i, creds) => {
	const { publicId, deliveryType, version } = readTransformInput(ctx, i);
	const quality = ctx.getNodeParameter('imageQuality', i, 'auto') as string;

	const transformation = joinTransformation(optimizeComponents({ quality, resourceType: 'image' }));

	return [
		buildTransformResult(creds, {
			resourceType: 'image',
			type: deliveryType,
			transformation,
			publicId,
			version,
		}),
	];
};
