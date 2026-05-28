import { IDataObject, IHttpRequestOptions, NodeOperationError } from 'n8n-workflow';
import {
	basicAuth,
	buildResourceDeleteUrl,
	jsonHeaders,
	splitCsvIds,
} from '../../cloudinary.utils';
import { CREDENTIAL_TYPE, OperationHandler } from '../types';

export const deleteAssets: OperationHandler = async (ctx, i, creds) => {
	const resourceType = ctx.getNodeParameter('resourceType', i) as string;
	const type = ctx.getNodeParameter('type', i) as string;
	// Accept a single string, a CSV string, or an array (e.g. from an
	// n8n expression like `{{ $items().map(i => i.json.public_id) }}`).
	const rawPublicIds = ctx.getNodeParameter('publicIds', i) as string | string[];
	const deleteOptions = ctx.getNodeParameter('deleteOptions', i, {}) as IDataObject;

	const publicIds = Array.isArray(rawPublicIds)
		? rawPublicIds.map((s) => String(s).trim()).filter((s) => s.length > 0)
		: splitCsvIds(rawPublicIds);

	if (publicIds.length === 0) {
		throw new NodeOperationError(ctx.getNode(), 'No public IDs provided', {
			description: 'Provide at least one public_id (comma-separated for many).',
			itemIndex: i,
		});
	}

	// Cloudinary accepts `public_ids` as a comma-separated string or as
	// `public_ids[]=...` repeated keys. n8n's default `qs` serializer turns a
	// JS array into `public_ids[0]=...` (bracketed indices), which Cloudinary
	// rejects. Pre-joining to a CSV side-steps the serializer entirely and
	// matches the documented input shape.
	const qs: IDataObject = {
		public_ids: publicIds.join(','),
		...deleteOptions,
	};

	const options: IHttpRequestOptions = {
		method: 'DELETE',
		url: buildResourceDeleteUrl(creds.cloudName, resourceType, type),
		qs,
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
