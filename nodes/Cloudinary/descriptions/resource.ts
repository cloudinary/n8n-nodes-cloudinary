import { INodeProperties, INodePropertyOptions } from 'n8n-workflow';

// Order is curated for usefulness, not alphabetized: the primary Upload and
// Transform flows lead, and the deprecated legacy resource sinks to the bottom.
// Kept as a named const: the alphabetize lint rule only inspects inline array
// literals, so the curated order stands without a suppression comment.
const RESOURCE_OPTIONS: INodePropertyOptions[] = [
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
		name: 'Generate',
		value: 'generate',
		description: 'Generate images with AI from a text prompt or reference images (requires the Image Generation add-on)',
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
];

// Each name and action is prefixed with a category ("Compose:"/"Image:"/"Video:")
// so entries cluster into groups in the operation dropdown and the Add-action
// panel. "Compose" sorts before "Image"/"Video", so the flagship Combine
// Transformations leads the list. Kept as a named const: the action sentence-case
// rule strips colons (no separator char passes it), but it only inspects inline
// array literals, so the prefixed labels stand without a suppression comment.
const TRANSFORM_OPERATION_OPTIONS: INodePropertyOptions[] = [
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
		name: 'Video: Crop',
		value: 'cropVideo',
		description: 'Build a delivery URL that crops a video to fixed dimensions or an aspect ratio. Outputs secure_url and a reusable transformation string.',
		action: 'Video: Crop',
	},
	{
		name: 'Video: Optimize',
		value: 'optimizeVideo',
		description: 'Build a delivery URL that auto-optimizes a video (format/codec + quality). Outputs secure_url and a reusable transformation string.',
		action: 'Video: Optimize',
	},
	{
		name: 'Video: Resize',
		value: 'resizeVideo',
		description: 'Build a delivery URL that resizes a video to a width and/or height. Outputs secure_url and a reusable transformation string.',
		action: 'Video: Resize',
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
];

export const resourceProperties: INodeProperties[] = [
	{
		displayName: 'Resource',
		name: 'resource',
		type: 'options',
		noDataExpression: true,
		options: RESOURCE_OPTIONS,
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
		options: TRANSFORM_OPERATION_OPTIONS,
		default: 'optimizeImage',
	},
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['generate'],
			},
		},
		options: [
			{
				name: 'Generate Image From Reference Images',
				value: 'imageToImage',
				description: 'Generate an image guided by up to 4 reference images and a prompt (restyle, variants, try-on, edit). Outputs the stored image\'s public_id, asset_id, and secure_url.',
				action: 'Generate an image from reference images',
			},
			{
				name: 'Generate Image From Text',
				value: 'textToImage',
				description: 'Generate an image from a text prompt using an AI model. Outputs the stored image\'s public_id, asset_id, and secure_url.',
				action: 'Generate an image from text',
			},
			{
				name: 'Get Generation Task',
				value: 'getTask',
				description: 'Get the status of an async generation task, and its image(s) once completed',
				action: 'Get a generation task',
			},
		],
		default: 'textToImage',
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
				action: 'Generate a video player',
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
