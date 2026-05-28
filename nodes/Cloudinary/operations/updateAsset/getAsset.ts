import { IDataObject, IHttpRequestOptions } from 'n8n-workflow';
import { basicAuth, buildResourceByAssetIdUrl, jsonHeaders } from '../../cloudinary.utils';
import { CREDENTIAL_TYPE, OperationHandler } from '../types';

export const getAsset: OperationHandler = async (ctx, i, creds) => {
	const assetId = ctx.getNodeParameter('assetId', i) as string;
	const getOptions = ctx.getNodeParameter('getOptions', i, {}) as IDataObject;

	const options: IHttpRequestOptions = {
		method: 'GET',
		url: buildResourceByAssetIdUrl(creds.cloudName, assetId),
		qs: getOptions,
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
