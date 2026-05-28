import { INodeProperties } from 'n8n-workflow';

export const assetFields: INodeProperties[] = [
	{
		displayName: 'Asset ID',
		name: 'assetId',
		type: 'string',
		default: '',
		description: 'The immutable asset_id of the asset',
		required: true,
		displayOptions: {
			show: {
				resource: ['asset'],
				operation: ['getAsset', 'updateDisplayName', 'updateMetadata'],
			},
		},
	},
	{
		displayName: 'Asset ID',
		name: 'assetId',
		type: 'string',
		default: '',
		description: 'The immutable asset_id of the asset',
		required: true,
		displayOptions: {
			show: {
				resource: ['asset'],
				operation: ['updateTags'],
				tagMode: ['set'],
			},
		},
	},
	{
		displayName: 'Mode',
		name: 'tagMode',
		type: 'options',
		options: [
			{
				name: 'Set (Replace All Existing Tags)',
				value: 'set',
				description: "Replace the asset's tag list with the values you provide",
			},
			{
				name: 'Append (Add to Existing Tags)',
				value: 'append',
				description: 'Add the provided tags to the existing list — existing tags are preserved',
			},
		],
		default: 'set',
		description: 'How to apply the provided tags. Append uses the public_id-keyed Upload API.',
		displayOptions: {
			show: {
				resource: ['asset'],
				operation: ['updateTags'],
			},
		},
	},
	{
		displayName: 'Public ID(s)',
		name: 'tagAppendPublicIds',
		type: 'string',
		default: '',
		description:
			'Asset(s) to tag, by public ID. Paste a single public_id, several separated by commas, or wire up an expression — both single values and arrays from expressions are accepted. Cloudinary\'s tag-append endpoint is keyed on public_id; asset_id is not accepted here.',
		hint: 'A single public_id is fine — no commas needed. Expressions returning an array also work.',
		placeholder: 'docs/strawberry  or  docs/strawberry, docs/owl',
		required: true,
		displayOptions: {
			show: {
				resource: ['asset'],
				operation: ['updateTags'],
				tagMode: ['append'],
			},
		},
	},
	{
		displayName: 'Resource Type',
		name: 'tagAppendResourceType',
		type: 'options',
		options: [
			{ name: 'Image', value: 'image' },
			{ name: 'Video', value: 'video' },
			{ name: 'Raw', value: 'raw' },
		],
		default: 'image',
		description: 'The type of asset to tag',
		displayOptions: {
			show: {
				resource: ['asset'],
				operation: ['updateTags'],
				tagMode: ['append'],
			},
		},
	},
	{
		displayName: 'Type',
		name: 'tagAppendType',
		type: 'options',
		options: [
			{ name: 'Upload', value: 'upload' },
			{ name: 'Private', value: 'private' },
			{ name: 'Authenticated', value: 'authenticated' },
			{ name: 'Fetch', value: 'fetch' },
		],
		default: 'upload',
		description:
			'The "type" property of the asset (as returned by Cloudinary on the asset object). Must match — public_ids are scoped to (resource_type, type), so an asset stored as "authenticated" is invisible to the default "upload" lookup.',
		displayOptions: {
			show: {
				resource: ['asset'],
				operation: ['updateTags'],
				tagMode: ['append'],
			},
		},
	},
	{
		displayName: 'Public ID(s)',
		name: 'publicIds',
		type: 'string',
		default: '',
		description:
			'Asset(s) to delete, by public ID. Paste a single public_id, several separated by commas, or wire up an expression — both single values and arrays from expressions are accepted.',
		hint: 'A single public_id is fine — no commas needed. Expressions returning an array also work.',
		placeholder: 'docs/strawberry  or  docs/strawberry, docs/owl',
		required: true,
		displayOptions: {
			show: {
				resource: ['asset'],
				operation: ['deleteAssets'],
			},
		},
	},
	{
		displayName: 'Resource Type',
		name: 'resourceType',
		type: 'options',
		options: [
			{ name: 'Image', value: 'image' },
			{ name: 'Video', value: 'video' },
			{ name: 'Raw', value: 'raw' },
		],
		default: 'image',
		description: 'The type of asset to delete',
		displayOptions: {
			show: {
				resource: ['asset'],
				operation: ['deleteAssets'],
			},
		},
	},
	{
		displayName: 'Type',
		name: 'type',
		type: 'options',
		options: [
			{ name: 'Upload', value: 'upload' },
			{ name: 'Private', value: 'private' },
			{ name: 'Authenticated', value: 'authenticated' },
			{ name: 'Fetch', value: 'fetch' },
		],
		default: 'upload',
		description: 'The storage type of the asset',
		required: true,
		displayOptions: {
			show: {
				resource: ['asset'],
				operation: ['deleteAssets'],
			},
		},
	},
	{
		displayName: 'Delete Options',
		name: 'deleteOptions',
		type: 'collection',
		placeholder: 'Add Option',
		displayOptions: {
			show: {
				resource: ['asset'],
				operation: ['deleteAssets'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Invalidate CDN',
				name: 'invalidate',
				type: 'boolean',
				default: false,
				description: 'Whether to invalidate CDN cache copies of the deleted assets',
			},
			{
				displayName: 'Keep Original',
				name: 'keep_original',
				type: 'boolean',
				default: false,
				description:
					'Whether to keep the original asset and only delete its derived (transformed) versions',
			},
			{
				displayName: 'Next Cursor',
				name: 'next_cursor',
				type: 'string',
				default: '',
				description: 'Pagination cursor returned by a previous delete response for large batches',
			},
			{
				displayName: 'Transformations',
				name: 'transformations',
				type: 'string',
				default: '',
				description:
					'Comma-separated list of transformation strings; only the listed derived assets are deleted',
			},
		],
	},
	{
		displayName: 'Display Name',
		name: 'displayName',
		type: 'string',
		default: '',
		description: 'The new display name to set on the asset',
		required: true,
		displayOptions: {
			show: {
				resource: ['asset'],
				operation: ['updateDisplayName'],
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
				resource: ['asset'],
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
				resource: ['asset'],
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
				resource: ['asset'],
				operation: ['updateMetadata'],
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
		displayName: 'Update Fields',
		name: 'updateOptions',
		type: 'collection',
		placeholder: 'Add Option',
		displayOptions: {
			show: {
				resource: ['asset'],
				operation: ['updateTags'],
				tagMode: ['set'],
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
				resource: ['asset'],
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
