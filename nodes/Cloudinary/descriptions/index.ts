import { INodeProperties } from 'n8n-workflow';
import { resourceProperties } from './resource';
import { uploadFields } from './upload.fields';
import { transformFields } from './transform.fields';
import { widgetFields } from './widget.fields';
import { updateAssetFields } from './updateAsset.fields';
import { assetFields } from './asset.fields';
import { searchFields } from './admin/search.fields';
import { getTagsFields } from './admin/getTags.fields';

export const cloudinaryProperties: INodeProperties[] = [
	...resourceProperties,
	...uploadFields,
	...transformFields,
	...widgetFields,
	...assetFields,
	...updateAssetFields,
	...searchFields,
	...getTagsFields,
];
