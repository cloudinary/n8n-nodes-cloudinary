import { NodeOperationError } from 'n8n-workflow';
import { OperationHandler } from '../types';
import { buildTransformResult, readTransformInput } from './shared';

/**
 * Power-user escape hatch: build a delivery URL from a raw Cloudinary
 * transformation string, used verbatim. Resource type is explicit (image/video)
 * since a freeform string can target either.
 */
export const customTransformation: OperationHandler = async (ctx, i, creds) => {
	const { publicId, deliveryType, version } = readTransformInput(ctx, i);
	const resourceType = ctx.getNodeParameter('customResourceType', i, 'image') as string;
	const transformation = (ctx.getNodeParameter('customTransformationString', i, '') as string).trim();
	const format = (ctx.getNodeParameter('customFormat', i, '') as string).trim();

	if (!transformation) {
		throw new NodeOperationError(ctx.getNode(), 'A transformation string is required', {
			itemIndex: i,
		});
	}

	return [
		buildTransformResult(creds, {
			resourceType,
			type: deliveryType,
			transformation,
			publicId,
			format: format || undefined,
			version,
		}),
	];
};
