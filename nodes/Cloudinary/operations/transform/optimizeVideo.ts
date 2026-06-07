import { joinTransformation } from '../../cloudinary.utils';
import { OperationHandler } from '../types';
import { buildTransformResult, optimizeComponents, readTransformInput } from './shared';

/**
 * Optimize a video: auto-quality plus `f_auto:video`, which auto-selects both the
 * format and the codec for the requesting browser. Emits `f_auto:video/q_auto[:level]`.
 */
export const optimizeVideo: OperationHandler = async (ctx, i, creds) => {
	const { publicId, deliveryType, version, continueFrom } = readTransformInput(ctx, i);
	const quality = ctx.getNodeParameter('videoQuality', i, 'auto') as string;

	const transformation = joinTransformation(optimizeComponents({ quality, resourceType: 'video' }));

	return [
		buildTransformResult(creds, {
			resourceType: 'video',
			type: deliveryType,
			transformation,
			publicId,
			version,
			continueFrom,
		}),
	];
};
