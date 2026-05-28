import { IDataObject, IHttpRequestOptions } from 'n8n-workflow';
import {
	basicAuth,
	buildResourceByAssetIdUrl,
	jsonHeaders,
	metadataToPipeString,
} from '../../cloudinary.utils';
import { CREDENTIAL_TYPE, OperationHandler } from '../types';

export const updateMetadata: OperationHandler = async (ctx, i, creds) => {
	const assetId = ctx.getNodeParameter('assetId', i) as string;
	const structuredMetadata = ctx.getNodeParameter('structuredMetadata', i) as string;
	const updateOptions = ctx.getNodeParameter('updateOptions', i, {}) as IDataObject;

	const body: IDataObject = {
		metadata: metadataToPipeString(structuredMetadata),
		...updateOptions,
	};

	const options: IHttpRequestOptions = {
		method: 'PUT',
		url: buildResourceByAssetIdUrl(creds.cloudName, assetId),
		body,
		headers: jsonHeaders(),
		auth: basicAuth(creds),
	};

	const response = await ctx.helpers.httpRequestWithAuthentication.call(
		ctx,
		CREDENTIAL_TYPE,
		options,
	);
	return [response as IDataObject];
};
