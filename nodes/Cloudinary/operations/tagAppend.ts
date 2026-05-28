import { IDataObject, IHttpRequestOptions, NodeOperationError } from 'n8n-workflow';
import type { IExecuteFunctions } from 'n8n-workflow';
import {
	buildTagsActionUrl,
	generateCloudinarySignature,
	splitCsvIds,
	USER_AGENT,
} from '../cloudinary.utils';
import { CREDENTIAL_TYPE, CloudinaryCredentials } from './types';

/**
 * Shared `Append Tags` request used by both `asset:updateTags` and
 * `updateAsset:updateTags` when the user selects `tagMode: 'append'`. Hits the
 * Upload API tag-action endpoint (`POST /:resource_type/tags`) with `command=add`
 * — a signed flow (api_key + timestamp + signature), not Basic auth, and keyed
 * on public_id (no asset_id variant exists).
 */
export const appendTags = async (
	ctx: IExecuteFunctions,
	i: number,
	creds: CloudinaryCredentials,
): Promise<IDataObject[]> => {
	const rawPublicIds = ctx.getNodeParameter('tagAppendPublicIds', i) as string | string[];
	const resourceType = ctx.getNodeParameter('tagAppendResourceType', i, 'image') as string;
	const type = ctx.getNodeParameter('tagAppendType', i, 'upload') as string;
	const tags = ctx.getNodeParameter('tags', i) as string;

	const publicIds = Array.isArray(rawPublicIds)
		? rawPublicIds.map((s) => String(s).trim()).filter((s) => s.length > 0)
		: splitCsvIds(rawPublicIds);

	if (publicIds.length === 0) {
		throw new NodeOperationError(ctx.getNode(), 'No public IDs provided', {
			description: 'Provide at least one public_id (comma-separated for many).',
			itemIndex: i,
		});
	}

	const timestamp = Math.round(new Date().getTime() / 1000);
	const params: IDataObject = {
		command: 'add',
		public_ids: publicIds.join(','),
		tag: tags,
		type,
		timestamp,
		api_key: creds.apiKey,
	};
	params.signature = generateCloudinarySignature(params, creds.apiSecret);

	const options: IHttpRequestOptions = {
		method: 'POST',
		url: buildTagsActionUrl(creds.cloudName, resourceType),
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
