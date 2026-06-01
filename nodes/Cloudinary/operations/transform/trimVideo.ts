import { joinTransformation } from '../../cloudinary.utils';
import { OperationHandler } from '../types';
import { buildComponents, buildTransformResult, readTransformInput, trimComponents } from './shared';

/**
 * Trim a video. Any combination of start (`so_`), end (`eo_`), and duration (`du_`)
 * is allowed; at least one is required. Values are in seconds (e.g. 2.5).
 */
export const trimVideo: OperationHandler = async (ctx, i, creds) => {
	const { publicId, deliveryType, version } = readTransformInput(ctx, i);
	const start = ctx.getNodeParameter('trimStart', i, '') as string;
	const end = ctx.getNodeParameter('trimEnd', i, '') as string;
	const duration = ctx.getNodeParameter('trimDuration', i, '') as string;

	const components = buildComponents(ctx, i, () => trimComponents({ start, end, duration }));

	return [
		buildTransformResult(creds, {
			resourceType: 'video',
			type: deliveryType,
			transformation: joinTransformation(components),
			publicId,
			version,
		}),
	];
};
