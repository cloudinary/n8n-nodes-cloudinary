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
				operation: ['updateMetadata'],
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
				operation: ['updateTags'],
				tagMode: ['set'],
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
				operation: ['updateMetadata'],
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
		description: 'How to apply the provided tags. Append uses Cloudinary\'s tag-action endpoint.',
		displayOptions: {
			show: {
				resource: ['updateAsset'],
				operation: ['updateTags'],
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
				resource: ['updateAsset'],
				operation: ['updateTags'],
				tagMode: ['append'],
			},
		},
	},
	{
		displayName: 'Public ID(s)',
		name: 'tagAppendPublicIds',
		type: 'string',
		default: '',
		description:
			'Asset(s) to tag, by public ID. Paste a single public_id, several separated by commas, or wire up an expression — both single values and arrays from expressions are accepted.',
		hint: 'A single public_id is fine — no commas needed. Expressions returning an array also work.',
		placeholder: 'docs/strawberry  or  docs/strawberry, docs/owl',
		required: true,
		displayOptions: {
			show: {
				resource: ['updateAsset'],
				operation: ['updateTags'],
				tagMode: ['append'],
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
				resource: ['updateAsset'],
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
];
