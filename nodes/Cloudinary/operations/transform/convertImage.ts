import { joinTransformation } from '../../cloudinary.utils';
import { OperationHandler } from '../types';
import { buildComponents, buildTransformResult, convertComponents, readTransformInput } from './shared';

/** Convert an image to another format. Emits `f_<fmt>` and delivers with `.<fmt>`. */
export const convertImage: OperationHandler = async (ctx, i, creds) => {
	const { publicId, deliveryType, version } = readTransformInput(ctx, i);
	const format = ctx.getNodeParameter('convertFormat', i, 'webp') as string;

	const components = buildComponents(ctx, i, () => convertComponents(format));

	return [
		buildTransformResult(creds, {
			resourceType: 'image',
			type: deliveryType,
			transformation: joinTransformation(components),
			publicId,
			format,
			version,
		}),
	];
};
