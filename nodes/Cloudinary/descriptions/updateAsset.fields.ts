import { INodeProperties } from 'n8n-workflow';

export const updateAssetFields: INodeProperties[] = [
	{
		displayName: 'Asset ID',
		name: 'assetId',
		type: 'string',
		default: '',
		description: 'The immutable asset_id of the asset',
		required: true,
		displayOptions: {
			show: {
				resource: ['updateAsset'],
				operation: ['getAsset'],
			},
		},
	},
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
	{
		displayName: 'Options',
		name: 'getOptions',
		type: 'collection',
		placeholder: 'Add Option',
		displayOptions: {
			show: {
				resource: ['updateAsset'],
				operation: ['getAsset'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Accessibility Analysis',
				name: 'accessibility_analysis',
				type: 'boolean',
				default: false,
				description: 'Whether to include accessibility analysis data in the response',
			},
			{
				displayName: 'Colors',
				name: 'colors',
				type: 'boolean',
				default: false,
				description: 'Whether to include the predominant colors and color histogram of the asset',
			},
			{
				displayName: 'Coordinates',
				name: 'coordinates',
				type: 'boolean',
				default: false,
				description: 'Whether to include custom and detected coordinates (e.g. faces, custom crop regions)',
			},
			{
				displayName: 'Derived Next Cursor',
				name: 'derived_next_cursor',
				type: 'string',
				default: '',
				description: 'Pagination cursor for retrieving additional derived assets beyond the first page',
			},
			{
				displayName: 'Faces',
				name: 'faces',
				type: 'boolean',
				default: false,
				description: 'Whether to include coordinates of detected faces',
			},
			{
				displayName: 'Image Metadata',
				name: 'image_metadata',
				type: 'boolean',
				default: false,
				description: 'Whether to include IPTC, XMP, and EXIF metadata extracted from the asset',
			},
			{
				displayName: 'Pages',
				name: 'pages',
				type: 'boolean',
				default: false,
				description: 'Whether to include the number of pages in multi-page assets (e.g. PDF, animated GIF, TIFF)',
			},
			{
				displayName: 'Perceptual Hash (pHash)',
				name: 'phash',
				type: 'boolean',
				default: false,
				description: 'Whether to include the perceptual hash (pHash) of the uploaded asset',
			},
		],
	},
];
