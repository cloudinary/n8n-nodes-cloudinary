import { IDataObject, IHttpRequestOptions } from 'n8n-workflow';
import {
	generateCloudinarySignature,
	buildUploadUrl,
	metadataToPipeString,
	USER_AGENT,
} from '../../cloudinary.utils';
import { CREDENTIAL_TYPE, OperationHandler } from '../types';

export const uploadUrl: OperationHandler = async (ctx, i, creds) => {
	const url = ctx.getNodeParameter('url', i) as string;
	const resourceType = ctx.getNodeParameter('resource_type', i) as string;
	const additionalFields = ctx.getNodeParameter('additionalFields', i, {}) as IDataObject;

	if (additionalFields.metadata) {
		additionalFields.metadata = metadataToPipeString(
			additionalFields.metadata as IDataObject | string,
		);
	}

	const timestamp = Math.round(new Date().getTime() / 1000);
	const params: IDataObject = {
		timestamp,
		api_key: creds.apiKey,
		file: url,
		...additionalFields,
	};
	params.signature = generateCloudinarySignature(params, creds.apiSecret);

	const options: IHttpRequestOptions = {
		method: 'POST',
		url: buildUploadUrl(creds.cloudName, resourceType),
		body: params,
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			'User-Agent': USER_AGENT,
		},
	};

	const response = await ctx.helpers.httpRequestWithAuthentication.call(
		ctx,
		CREDENTIAL_TYPE,
		options,
	);
	return [response as IDataObject];
};
