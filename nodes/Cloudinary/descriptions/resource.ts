import { INodeProperties } from 'n8n-workflow';

export const resourceProperties: INodeProperties[] = [
	{
		displayName: 'Resource',
		name: 'resource',
		type: 'options',
		noDataExpression: true,
		// Order is curated for usefulness, not alphabetized: the primary Upload and
		// Transform flows lead, and the deprecated legacy resource sinks to the bottom.
		// eslint-disable-next-line n8n-nodes-base/node-param-options-type-unsorted-items
		options: [
			{
				name: 'Upload',
				value: 'upload',
				description: 'Upload new assets from a URL or binary file data',
			},
			{
				name: 'Transform',
				value: 'transform',
				description: 'Build delivery and transformation URLs for images and videos (no upload, no API call)',
			},
			{
				name: 'Asset',
				value: 'asset',
				description: 'Work with existing assets by asset ID: get, search, delete, update tags/metadata',
			},
			{
				name: 'Widget',
				value: 'widget',
				description: 'Generate Cloudinary widgets and embeds, such as the Video Player (no upload, no API call)',
			},
			{
				name: 'Library',
				value: 'admin',
				description: 'Account-level lookups: list tags and structured-metadata field definitions',
			},
			{
				name: 'Asset (Legacy, by Public ID)',
				value: 'updateAsset',
				description: 'Deprecated — prefer the Asset resource. Public-ID-based tag and metadata updates.',
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
		// Each name/action is prefixed with a category ("Compose:"/"Image:"/"Video:") so the
		// alphabetical lint rule clusters them into groups in both the operation dropdown
		// and the Add-action panel. "Compose" sorts before "Image"/"Video", so the flagship
		// Combine Transformations leads the list. name and action are kept identical so both
		// surfaces read the same; that requires disabling the sentence-case action rule,
		// which would otherwise strip the colon and lower-case the label.
		/* eslint-disable n8n-nodes-base/node-param-operation-option-action-miscased */
		options: [
			{
				name: 'Compose: Combine Transformations',
				value: 'combineTransformations',
				description: 'Build a delivery URL that chains several transformation steps in order. Outputs secure_url and a reusable transformation string.',
				action: 'Compose: Combine Transformations',
			},
			{
				name: 'Compose: Custom Transformation String',
				value: 'customTransformation',
				description: 'Build a delivery URL from a raw Cloudinary transformation string. Outputs secure_url and a reusable transformation string.',
				action: 'Compose: Custom Transformation String',
			},
			{
				name: 'Image: Convert Format',
				value: 'convertImage',
				description: 'Build a delivery URL that converts an image to another format. Outputs secure_url and a reusable transformation string.',
				action: 'Image: Convert Format',
			},
			{
				name: 'Image: Crop',
				value: 'cropImage',
				description: 'Build a delivery URL that crops an image to fixed dimensions or an aspect ratio. Outputs secure_url and a reusable transformation string.',
				action: 'Image: Crop',
			},
			{
				name: 'Image: Optimize',
				value: 'optimizeImage',
				description: 'Build a delivery URL that auto-optimizes an image (format + quality). Outputs secure_url and a reusable transformation string.',
				action: 'Image: Optimize',
			},
			{
				name: 'Image: Resize',
				value: 'resizeImage',
				description: 'Build a delivery URL that resizes an image to a width and/or height. Outputs secure_url and a reusable transformation string.',
				action: 'Image: Resize',
			},
			{
				name: 'Video: Optimize',
				value: 'optimizeVideo',
				description: 'Build a delivery URL that auto-optimizes a video (format/codec + quality). Outputs secure_url and a reusable transformation string.',
				action: 'Video: Optimize',
			},
			{
				name: 'Video: Thumbnail',
				value: 'videoThumbnail',
				description: 'Build a delivery URL for a still image frame from a video. Outputs secure_url and a reusable transformation string.',
				action: 'Video: Thumbnail',
			},
			{
				name: 'Video: Trim',
				value: 'trimVideo',
				description: 'Build a delivery URL that trims a video to a start, end, and/or duration. Outputs secure_url and a reusable transformation string.',
				action: 'Video: Trim',
			},
		],
		/* eslint-enable n8n-nodes-base/node-param-operation-option-action-miscased */
		default: 'optimizeImage',
	},
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['widget'],
			},
		},
		options: [
			{
				name: 'Video Player',
				value: 'videoPlayer',
				description: 'Generate embed code and config for the Cloudinary Video Player. Outputs embed_url and a player_config JSON string.',
				action: 'Generate a video player embed',
			},
		],
		default: 'videoPlayer',
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
