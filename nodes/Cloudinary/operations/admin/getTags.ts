import { IDataObject, IHttpRequestOptions } from 'n8n-workflow';
import { basicAuth, jsonHeaders } from '../../cloudinary.utils';
import { CREDENTIAL_TYPE, OperationHandler } from '../types';

export const getTags: OperationHandler = async (ctx, i, creds) => {
	const resourceType = ctx.getNodeParameter('getTagsResourceType', i) as string;
	const prefix = ctx.getNodeParameter('tagsPrefix', i, '') as string;
	const maxResults = ctx.getNodeParameter('tagsMaxResults', i, 100) as number;

	const queryParams: IDataObject = {};
	if (prefix) {
		queryParams.prefix = prefix;
	}
	if (maxResults) {
		queryParams.max_results = maxResults;
	}

	const options: IHttpRequestOptions = {
		method: 'GET',
		url: `https://api.cloudinary.com/v1_1/${creds.cloudName}/tags/${resourceType}`,
		qs: queryParams,
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
