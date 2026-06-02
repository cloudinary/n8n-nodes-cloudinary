import { INodeProperties } from 'n8n-workflow';

export const resourceProperties: INodeProperties[] = [
	{
		displayName: 'Resource',
		name: 'resource',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'Asset',
				value: 'asset',
				description: 'Work with existing assets by asset ID: get, search, delete, update tags/metadata/display name',
			},
			{
				name: 'Asset (Legacy, by Public ID)',
				value: 'updateAsset',
				description: 'Deprecated — prefer the Asset resource. Public-ID-based tag and metadata updates.',
			},
			{
				name: 'Library',
				value: 'admin',
				description: 'Account-level lookups: list tags and structured-metadata field definitions',
			},
			{
				name: 'Transform',
				value: 'transform',
				description: 'Build delivery and transformation URLs for images and videos (no upload, no API call)',
			},
			{
				name: 'Upload',
				value: 'upload',
				description: 'Upload new assets from a URL or binary file data',
			},
		],
		default: 'upload',
	},
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['upload'],
			},
		},
		options: [
			{
				name: 'Upload File',
				value: 'uploadFile',
				description: 'Upload an asset from file data',
				action: 'Upload an asset from file data',
			},
			{
				name: 'Upload From URL',
				value: 'uploadUrl',
				description: 'Upload an asset from URL',
				action: 'Upload an asset from URL',
			},
		],
		default: 'uploadUrl',
	},
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['transform'],
			},
		},
		options: [
			{
				name: 'Convert Image Format',
				value: 'convertImage',
				description: 'Build a delivery URL that converts an image to another format. Outputs secure_url and a reusable transformation string.',
				action: 'Convert an image format',
			},
			{
				name: 'Crop Image',
				value: 'cropImage',
				description: 'Build a delivery URL that crops an image to fixed dimensions or an aspect ratio. Outputs secure_url and a reusable transformation string.',
				action: 'Crop an image',
			},
			{
				name: 'Custom Transformation',
				value: 'customTransformation',
				description: 'Build a delivery URL from a raw Cloudinary transformation string. Outputs secure_url and a reusable transformation string.',
				action: 'Apply a custom transformation',
			},
			{
				name: 'Multi-Step Transformation',
				value: 'multiStep',
				description: 'Build a delivery URL that chains several transformation steps in order. Outputs secure_url and a reusable transformation string.',
				action: 'Apply a multi step transformation',
			},
			{
				name: 'Optimize Image',
				value: 'optimizeImage',
				description: 'Build a delivery URL that auto-optimizes an image (format + quality). Outputs secure_url and a reusable transformation string.',
				action: 'Optimize an image',
			},
			{
				name: 'Optimize Video',
				value: 'optimizeVideo',
				description: 'Build a delivery URL that auto-optimizes a video (format/codec + quality). Outputs secure_url and a reusable transformation string.',
				action: 'Optimize a video',
			},
			{
				name: 'Resize Image',
				value: 'resizeImage',
				description: 'Build a delivery URL that resizes an image to a width and/or height. Outputs secure_url and a reusable transformation string.',
				action: 'Resize an image',
			},
			{
				name: 'Trim Video',
				value: 'trimVideo',
				description: 'Build a delivery URL that trims a video to a start, end, and/or duration. Outputs secure_url and a reusable transformation string.',
				action: 'Trim a video',
			},
			{
				name: 'Video Player',
				value: 'videoPlayer',
				description: 'Generate embed code and config for the Cloudinary Video Player. Outputs embed_url and a player_config JSON string.',
				action: 'Generate a video player embed',
			},
			{
				name: 'Video Thumbnail',
				value: 'videoThumbnail',
				description: 'Build a delivery URL for a still image frame from a video. Outputs secure_url and a reusable transformation string.',
				action: 'Generate a video thumbnail',
			},
		],
		default: 'optimizeImage',
	},
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['asset'],
			},
		},
		options: [
			{
				name: 'Delete Assets',
				value: 'deleteAssets',
				description: 'Delete one or more assets by public ID',
				action: 'Delete assets',
			},
			{
				name: 'Get Asset',
				value: 'getAsset',
				description: 'Get details for a single asset by asset ID',
				action: 'Get an asset',
			},
			{
				name: 'Search Assets',
				value: 'search',
				description: 'Search for assets using a Cloudinary search expression',
				action: 'Search assets',
			},
			{
				name: 'Update Asset Display Name',
				value: 'updateDisplayName',
				description: 'Update the display name of an asset by asset ID',
				action: 'Update asset display name',
			},
			{
				name: 'Update Asset Structured Metadata',
				value: 'updateMetadata',
				description: 'Update structured metadata for an asset by asset ID',
				action: 'Update asset structured metadata',
			},
			{
				name: 'Update Asset Tags',
				value: 'updateTags',
				description: 'Update tags for an asset by asset ID',
				action: 'Update asset tags',
			},
		],
		default: 'getAsset',
	},
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['updateAsset'],
			},
		},
		options: [
			{
				name: 'Update Asset Structured Metadata',
				value: 'updateMetadata',
				description: 'Deprecated — use the Asset resource instead. Update structured metadata for an existing asset by public ID.',
				action: 'Update asset structured metadata',
			},
			{
				name: 'Update Asset Tags',
				value: 'updateTags',
				description: 'Deprecated — use the Asset resource instead. Update tags for an existing asset by public ID.',
				action: 'Update asset tags',
			},
		],
		default: 'updateTags',
	},
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['admin'],
			},
		},
		options: [
			{
				name: 'Get Metadata Fields',
				value: 'getMetadataFields',
				description: 'Get all metadata fields definitions',
				action: 'Get metadata fields definitions',
			},
			{
				name: 'Get Tags',
				value: 'getTags',
				description: 'Get all tags for a specific resource type',
				action: 'Get tags for a resource type',
			},
		],
		default: 'getTags',
	},
];
