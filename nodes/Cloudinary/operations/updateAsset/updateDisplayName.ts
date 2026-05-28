import { IDataObject, IHttpRequestOptions } from 'n8n-workflow';
import { basicAuth, buildResourceByAssetIdUrl, jsonHeaders } from '../../cloudinary.utils';
import { CREDENTIAL_TYPE, OperationHandler } from '../types';

export const updateDisplayName: OperationHandler = async (ctx, i, creds) => {
	const assetId = ctx.getNodeParameter('assetId', i) as string;
	const displayName = ctx.getNodeParameter('displayName', i) as string;

	const options: IHttpRequestOptions = {
		method: 'PUT',
		url: buildResourceByAssetIdUrl(creds.cloudName, assetId),
		body: { display_name: displayName },
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
