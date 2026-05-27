import { IDataObject, IHttpRequestOptions } from 'n8n-workflow';
import { basicAuth, buildResourceUpdateUrl, jsonHeaders } from '../../cloudinary.utils';
import { CREDENTIAL_TYPE, OperationHandler } from '../types';

export const updateTags: OperationHandler = async (ctx, i, creds) => {
	const publicId = ctx.getNodeParameter('publicId', i) as string;
	const resourceType = ctx.getNodeParameter('resourceType', i) as string;
	const type = ctx.getNodeParameter('type', i) as string;
	const tags = ctx.getNodeParameter('tags', i) as string;
	const updateOptions = ctx.getNodeParameter('updateOptions', i, {}) as IDataObject;

	const body: IDataObject = {
		tags,
		...updateOptions,
	};

	const options: IHttpRequestOptions = {
		method: 'POST',
		url: buildResourceUpdateUrl(creds.cloudName, resourceType, type, publicId),
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
