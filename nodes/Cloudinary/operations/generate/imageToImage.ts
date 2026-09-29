import { IDataObject, NodeOperationError } from 'n8n-workflow';
import { generateImageFromImages } from '../../mediaGeneration.client';
import { OperationHandler } from '../types';
import { readGenerateRequest, referenceImages, shapeGenerationOutput } from './shared';

/**
 * Generate an image guided by reference images
 * (`POST /generate/{cloud_name}/image_to_image`). Only `-edit` models are
 * selectable here, hence the separate model-ID field.
 */
export const imageToImage: OperationHandler = async (ctx, i, creds) => {
	const body = readGenerateRequest(ctx, i, 'imageToImageModelId');
	const simplify = ctx.getNodeParameter('simplify', i, true) as boolean;
	const collection = ctx.getNodeParameter('reference_images', i, {}) as IDataObject;
	const rows = (collection.reference_image as IDataObject[] | undefined) ?? [];

	let references;
	try {
		references = referenceImages(rows);
	} catch (error) {
		throw new NodeOperationError(ctx.getNode(), (error as Error).message, { itemIndex: i });
	}

	const response = await generateImageFromImages(ctx, i, creds, {
		...body,
		reference_images: references,
	});
	return shapeGenerationOutput(response, simplify);
};
