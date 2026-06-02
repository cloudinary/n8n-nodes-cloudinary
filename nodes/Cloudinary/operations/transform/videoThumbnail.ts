import { NodeOperationError } from 'n8n-workflow';
import { joinTransformation } from '../../cloudinary.utils';
import { OperationHandler } from '../types';
import { buildTransformResult, readTransformInput } from './shared';

/**
 * Generate a still thumbnail from a video: a video public ID delivered with an
 * image extension (e.g. `.jpg`), grabbing either an auto-selected frame (`so_auto`)
 * or a specific timestamp (`so_<t>`). An optional base transformation is prepended
 * before the frame selector so callers can chain from a previous transform step
 * (e.g. pipe `{{ $json.transformation }}` from a Trim or Multi-Step node).
 */
export const videoThumbnail: OperationHandler = async (ctx, i, creds) => {
	const { publicId, deliveryType, version } = readTransformInput(ctx, i);
	const frameMode = ctx.getNodeParameter('thumbnailFrameMode', i, 'auto') as string;
	const format = ctx.getNodeParameter('thumbnailFormat', i, 'jpg') as string;
	const baseTransformation = (ctx.getNodeParameter('thumbnailBaseTransformation', i, '') as string).trim();

	let frameComponent: string;
	if (frameMode === 'auto') {
		frameComponent = 'so_auto';
	} else {
		const timestamp = (ctx.getNodeParameter('thumbnailTimestamp', i, '') as string).trim();
		if (!timestamp) {
			throw new NodeOperationError(
				ctx.getNode(),
				'A timestamp is required when the frame is set to a specific time',
				{ itemIndex: i },
			);
		}
		frameComponent = `so_${timestamp}`;
	}

	return [
		buildTransformResult(creds, {
			resourceType: 'video',
			type: deliveryType,
			transformation: joinTransformation([baseTransformation || undefined, frameComponent]),
			publicId,
			format,
			version,
		}),
	];
};
