import { generateImage } from '../../mediaGeneration.client';
import { OperationHandler } from '../types';
import { readGenerateRequest, shapeGenerationOutput } from './shared';

/** Generate an image from a text prompt (`POST /generate/{cloud_name}/text_to_image`). */
export const textToImage: OperationHandler = async (ctx, i, creds) => {
	const body = readGenerateRequest(ctx, i, 'textToImageModelId');
	const simplify = ctx.getNodeParameter('simplify', i, true) as boolean;

	const response = await generateImage(ctx, i, creds, body);
	return shapeGenerationOutput(response, simplify);
};
