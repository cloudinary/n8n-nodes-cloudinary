import { IDataObject, IHttpRequestOptions } from 'n8n-workflow';
import {
	generateCloudinarySignature,
	createMultipartBody,
	buildUploadUrl,
	metadataToPipeString,
	USER_AGENT,
} from '../../cloudinary.utils';
import { CREDENTIAL_TYPE, OperationHandler } from '../types';

export const uploadFile: OperationHandler = async (ctx, i, creds) => {
	const binaryPropertyName = ctx.getNodeParameter('file', i) as string;
	const resourceType = ctx.getNodeParameter('resource_type_file', i) as string;
	const additionalFields = ctx.getNodeParameter('additionalFieldsFile', i, {}) as IDataObject;

	if (additionalFields.metadata) {
		additionalFields.metadata = metadataToPipeString(
			additionalFields.metadata as IDataObject | string,
		);
	}

	const binaryData = ctx.helpers.assertBinaryData(i, binaryPropertyName);
	const dataBuffer = await ctx.helpers.getBinaryDataBuffer(i, binaryPropertyName);

	const timestamp = Math.round(new Date().getTime() / 1000);
	const params: IDataObject = {
		timestamp,
		api_key: creds.apiKey,
		...additionalFields,
	};
	const signature = generateCloudinarySignature(params, creds.apiSecret);

	const fields: Record<string, string> = {
		api_key: creds.apiKey,
		timestamp: timestamp.toString(),
		signature,
	};
	for (const key in additionalFields) {
		fields[key] = additionalFields[key] as string;
	}

	const { body, boundary } = createMultipartBody(
		fields,
		dataBuffer,
		binaryData.fileName || 'file',
		binaryData.mimeType || 'application/octet-stream',
	);

	const options: IHttpRequestOptions = {
		method: 'POST',
		url: buildUploadUrl(creds.cloudName, resourceType),
		body,
		headers: {
			'Content-Type': `multipart/form-data; boundary=${boundary}`,
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
