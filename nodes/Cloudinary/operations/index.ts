import { OperationHandler } from './types';
import { uploadUrl } from './upload/uploadUrl';
import { uploadFile } from './upload/uploadFile';
import { deleteAssets } from './updateAsset/deleteAssets';
import { getAsset } from './updateAsset/getAsset';
import { updateTags } from './updateAsset/updateTags';
import { updateMetadata } from './updateAsset/updateMetadata';
import { updateDisplayName } from './updateAsset/updateDisplayName';
import { updateTags as assetUpdateTags } from './asset/updateTags';
import { updateMetadata as assetUpdateMetadata } from './asset/updateMetadata';
import { search } from './admin/search';
import { getTags } from './admin/getTags';
import { getMetadataFields } from './admin/getMetadataFields';

/**
 * Maps `${resource}:${operation}` to its handler. Add a new operation by
 * dropping a file in operations/<resource>/ and registering it here.
 */
export const operationHandlers: Record<string, OperationHandler> = {
	'upload:uploadUrl': uploadUrl,
	'upload:uploadFile': uploadFile,
	'updateAsset:updateTags': updateTags,
	'updateAsset:updateMetadata': updateMetadata,
	'asset:getAsset': getAsset,
	'asset:deleteAssets': deleteAssets,
	'asset:updateTags': assetUpdateTags,
	'asset:updateMetadata': assetUpdateMetadata,
	'asset:updateDisplayName': updateDisplayName,
	'asset:search': search,
	'admin:getTags': getTags,
	'admin:getMetadataFields': getMetadataFields,
};
