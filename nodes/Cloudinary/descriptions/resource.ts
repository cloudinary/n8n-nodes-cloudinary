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
			},
			{
				name: 'Asset (Legacy)',
				value: 'updateAsset',
			},
			{
				name: 'Library',
				value: 'admin',
			},
			{
				name: 'Transform',
				value: 'transform',
			},
			{
				name: 'Upload',
				value: 'upload',
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
				description: 'Build a delivery URL that converts an image to another format',
				action: 'Convert an image format',
			},
			{
				name: 'Crop Image',
				value: 'cropImage',
				description: 'Build a delivery URL that crops an image to fixed dimensions or an aspect ratio',
				action: 'Crop an image',
			},
			{
				name: 'Custom Transformation',
				value: 'customTransformation',
				description: 'Build a delivery URL from a raw Cloudinary transformation string',
				action: 'Apply a custom transformation',
			},
			{
				name: 'Multi-Step Transformation',
				value: 'multiStep',
				description: 'Build a delivery URL that chains several transformation steps in order',
				action: 'Apply a multi step transformation',
			},
			{
				name: 'Optimize Image',
				value: 'optimizeImage',
				description: 'Build a delivery URL that auto-optimizes an image (format + quality)',
				action: 'Optimize an image',
			},
			{
				name: 'Optimize Video',
				value: 'optimizeVideo',
				description: 'Build a delivery URL that auto-optimizes a video (format/codec + quality)',
				action: 'Optimize a video',
			},
			{
				name: 'Resize Image',
				value: 'resizeImage',
				description: 'Build a delivery URL that resizes an image to a width and/or height',
				action: 'Resize an image',
			},
			{
				name: 'Trim Video',
				value: 'trimVideo',
				description: 'Build a delivery URL that trims a video to a start, end, and/or duration',
				action: 'Trim a video',
			},
			{
				name: 'Video Player',
				value: 'videoPlayer',
				description: 'Generate embed code and config for the Cloudinary Video Player',
				action: 'Generate a video player embed',
			},
			{
				name: 'Video Thumbnail',
				value: 'videoThumbnail',
				description: 'Build a delivery URL for a still image frame from a video',
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
				description: '(Legacy form, public_id only. For asset_id-based identification, use the new Asset resource.) Update structured metadata for an existing asset.',
				action: 'Update asset structured metadata',
			},
			{
				name: 'Update Asset Tags',
				value: 'updateTags',
				description: '(Legacy form, public_id only. For asset_id-based identification, use the new Asset resource.) Update tags for an existing asset.',
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
