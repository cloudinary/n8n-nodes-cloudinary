import { OperationHandler } from './types';
import { uploadUrl } from './upload/uploadUrl';
import { uploadFile } from './upload/uploadFile';
import { deleteAssets } from './updateAsset/deleteAssets';
import { getAsset } from './updateAsset/getAsset';
import { updateTags } from './updateAsset/updateTags';
import { updateMetadata } from './updateAsset/updateMetadata';
import { updateTags as assetUpdateTags } from './asset/updateTags';
import { updateMetadata as assetUpdateMetadata } from './asset/updateMetadata';
import { search } from './admin/search';
import { getTags } from './admin/getTags';
import { getMetadataFields } from './admin/getMetadataFields';
import { optimizeImage } from './transform/optimizeImage';
import { resizeImage } from './transform/resizeImage';
import { cropImage } from './transform/cropImage';
import { convertImage } from './transform/convertImage';
import { optimizeVideo } from './transform/optimizeVideo';
import { trimVideo } from './transform/trimVideo';
import { videoThumbnail } from './transform/videoThumbnail';
import { customTransformation } from './transform/customTransformation';
import { multiStep } from './transform/multiStep';
import { videoPlayer } from './widget/videoPlayer';

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
	'asset:search': search,
	'admin:getTags': getTags,
	'admin:getMetadataFields': getMetadataFields,
	'transform:optimizeImage': optimizeImage,
	'transform:resizeImage': resizeImage,
	'transform:cropImage': cropImage,
	'transform:convertImage': convertImage,
	'transform:optimizeVideo': optimizeVideo,
	'transform:trimVideo': trimVideo,
	'transform:videoThumbnail': videoThumbnail,
	'transform:customTransformation': customTransformation,
	'transform:combineTransformations': multiStep,
	'widget:videoPlayer': videoPlayer,
};
