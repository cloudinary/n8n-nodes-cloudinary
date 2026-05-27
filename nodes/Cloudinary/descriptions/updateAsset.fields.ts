import { INodeProperties } from 'n8n-workflow';

export const updateAssetFields: INodeProperties[] = [
	{
		displayName: 'Public ID',
		name: 'publicId',
		type: 'string',
		default: '',
		description: 'The public ID of the asset to update',
		required: true,
		displayOptions: {
			show: {
				resource: ['updateAsset'],
				operation: ['updateTags', 'updateMetadata'],
			},
		},
	},
	{
		displayName: 'Resource Type',
		name: 'resourceType',
		type: 'options',
		options: [
			{
				name: 'Image',
				value: 'image',
			},
			{
				name: 'Video',
				value: 'video',
			},
			{
				name: 'Raw',
				value: 'raw',
			},
		],
		default: 'image',
		description: 'The type of asset to update',
		displayOptions: {
			show: {
				resource: ['updateAsset'],
				operation: ['updateTags', 'updateMetadata'],
			},
		},
	},
	{
		displayName: 'Type',
		name: 'type',
		type: 'options',
		options: [
			{
				name: 'Upload',
				value: 'upload',
			},
			{
				name: 'Private',
				value: 'private',
			},
			{
				name: 'Authenticated',
				value: 'authenticated',
			},
			{
				name: 'Fetch',
				value: 'fetch',
			},
		],
		default: 'upload',
		description: 'The storage type of the asset',
		required: true,
		displayOptions: {
			show: {
				resource: ['updateAsset'],
				operation: ['updateTags', 'updateMetadata'],
			},
		},
	},
	{
		displayName: 'Tags',
		name: 'tags',
		type: 'string',
		default: '',
		description: 'A comma-separated list of tag names to assign to the asset',
		required: true,
		displayOptions: {
			show: {
				resource: ['updateAsset'],
				operation: ['updateTags'],
			},
		},
	},
	{
		displayName: 'Structured Metadata',
		name: 'structuredMetadata',
		type: 'json',
		default: '{}',
		description:
			'Structured metadata to attach to the asset as JSON. Example: {"field1": "value1", "field2": "value2"}.',
		required: true,
		displayOptions: {
			show: {
				resource: ['updateAsset'],
				operation: ['updateMetadata'],
			},
		},
	},
	{
		displayName: 'Update Fields',
		name: 'updateOptions',
		type: 'collection',
		placeholder: 'Add Option',
		displayOptions: {
			show: {
				resource: ['updateAsset'],
				operation: ['updateTags', 'updateMetadata'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Invalidate CDN',
				name: 'invalidate',
				type: 'boolean',
				default: false,
				description: 'Whether to invalidate CDN cache copies of the asset',
			},
		],
	},
];
