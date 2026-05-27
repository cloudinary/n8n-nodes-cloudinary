import { IDataObject, IHttpRequestOptions, NodeOperationError } from 'n8n-workflow';
import { basicAuth, buildSearchExpression, extractCloudinaryError, jsonHeaders } from '../../cloudinary.utils';
import { CREDENTIAL_TYPE, OperationHandler } from '../types';

export const search: OperationHandler = async (ctx, i, creds) => {
	const expressionInput = ctx.getNodeParameter('searchExpression', i, '') as string;
	const resourceTypes = ctx.getNodeParameter('searchResourceTypes', i, ['image']) as string[];
	const returnAll = ctx.getNodeParameter('searchReturnAll', i, false) as boolean;
	const additionalFields = ctx.getNodeParameter('searchAdditionalFields', i, {}) as IDataObject;

	const perPage = returnAll ? 500 : (ctx.getNodeParameter('searchMaxResults', i, 50) as number);
	const expression = buildSearchExpression(expressionInput, resourceTypes);

	const baseBody: IDataObject = {};
	if (expression) {
		baseBody.expression = expression;
	}
	if (additionalFields.sortField) {
		const direction = (additionalFields.sortDirection as string) || 'desc';
		baseBody.sort_by = [{ [additionalFields.sortField as string]: direction }];
	}
	if (Array.isArray(additionalFields.with_field) && additionalFields.with_field.length > 0) {
		baseBody.with_field = additionalFields.with_field;
	}

	const searchUrl = `https://api.cloudinary.com/v1_1/${creds.cloudName}/resources/search`;
	let nextCursor: string | undefined = additionalFields.next_cursor as string | undefined;
	let remaining = perPage;
	let pageCount = 0;
	const results: IDataObject[] = [];

	do {
		const pageSize = returnAll ? 500 : Math.min(remaining, 500);
		const body: IDataObject = {
			...baseBody,
			max_results: pageSize,
		};
		if (nextCursor) {
			body.next_cursor = nextCursor;
		}

		const options: IHttpRequestOptions = {
			method: 'POST',
			url: searchUrl,
			body,
			json: true,
			headers: jsonHeaders(),
			auth: basicAuth(creds),
		};

		let response: IDataObject;
		try {
			response = (await ctx.helpers.httpRequestWithAuthentication.call(
				ctx,
				CREDENTIAL_TYPE,
				options,
			)) as IDataObject;
		} catch (error) {
			const { status, retryAfter, cloudinaryMessage } = extractCloudinaryError(error);

			if (status === 420 || status === 429 || status === '420' || status === '429') {
				const suffix = retryAfter ? ` Retry after ${retryAfter} seconds.` : '';
				throw new NodeOperationError(ctx.getNode(), 'Cloudinary Search rate limit exceeded', {
					description: `The Search endpoint has a lower hourly limit than other Admin endpoints (~100/hour on free plans).${suffix} Narrow your expression or run less frequently.`,
					itemIndex: i,
				});
			}

			if (
				(status === 400 || status === '400') &&
				cloudinaryMessage?.toLowerCase().startsWith('query error')
			) {
				throw new NodeOperationError(ctx.getNode(), 'Invalid search expression', {
					description: `${cloudinaryMessage}. Check for unclosed quotes, unbalanced parentheses, or typos in field names. See the Expression syntax link in the field hint.`,
					itemIndex: i,
				});
			}

			if (cloudinaryMessage) {
				throw new NodeOperationError(ctx.getNode(), 'Cloudinary search failed', {
					description: cloudinaryMessage,
					itemIndex: i,
				});
			}
			throw error;
		}

		const resources = Array.isArray(response.resources)
			? (response.resources as IDataObject[])
			: [];
		results.push(...resources);

		nextCursor = response.next_cursor as string | undefined;
		pageCount += 1;
		if (!returnAll) {
			remaining -= resources.length;
			if (remaining <= 0) break;
		}
		// Safety cap to avoid runaway loops on misbehaving cursors
		if (pageCount > 1000) break;
	} while (returnAll && nextCursor);

	return results;
};
