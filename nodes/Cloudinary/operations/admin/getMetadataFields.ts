import { IDataObject, IHttpRequestOptions } from 'n8n-workflow';
import { basicAuth, jsonHeaders } from '../../cloudinary.utils';
import { CREDENTIAL_TYPE, OperationHandler } from '../types';

export const getMetadataFields: OperationHandler = async (ctx, i, creds) => {
	const options: IHttpRequestOptions = {
		method: 'GET',
		url: `https://api.cloudinary.com/v1_1/${creds.cloudName}/metadata_fields`,
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
