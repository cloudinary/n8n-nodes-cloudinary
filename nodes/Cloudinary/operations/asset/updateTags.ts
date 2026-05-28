import { IDataObject, IHttpRequestOptions } from 'n8n-workflow';
import { basicAuth, buildResourceByAssetIdUrl, jsonHeaders } from '../../cloudinary.utils';
import { CREDENTIAL_TYPE, OperationHandler } from '../types';
import { appendTags } from '../tagAppend';

export const updateTags: OperationHandler = async (ctx, i, creds) => {
	const tagMode = ctx.getNodeParameter('tagMode', i, 'set') as string;
	if (tagMode === 'append') {
		return appendTags(ctx, i, creds);
	}

	const assetId = ctx.getNodeParameter('assetId', i) as string;
	const tags = ctx.getNodeParameter('tags', i) as string;
	const updateOptions = ctx.getNodeParameter('updateOptions', i, {}) as IDataObject;

	const body: IDataObject = {
		tags,
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
