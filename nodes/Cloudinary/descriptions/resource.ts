import { INodeProperties } from 'n8n-workflow';

export const resourceProperties: INodeProperties[] = [
	{
		displayName: 'Resource',
		name: 'resource',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'Upload',
				value: 'upload',
			},
			{
				name: 'Asset',
				value: 'updateAsset',
			},
			{
				name: 'Library',
				value: 'admin',
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
				name: 'Upload From URL',
				value: 'uploadUrl',
				description: 'Upload an asset from URL',
				action: 'Upload an asset from URL',
			},
			{
				name: 'Upload File',
				value: 'uploadFile',
				description: 'Upload an asset from file data',
				action: 'Upload an asset from file data',
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
				resource: ['updateAsset'],
			},
		},
		options: [
			{
				name: 'Get Asset',
				value: 'getAsset',
				description: 'Get details for a single asset by public ID',
				action: 'Get an asset',
			},
			{
				name: 'Update Asset Tags',
				value: 'updateTags',
				description: 'Update tags for an existing asset',
				action: 'Update asset tags',
			},
			{
				name: 'Update Asset Structured Metadata',
				value: 'updateMetadata',
				description: 'Update structured metadata for an existing asset',
				action: 'Update asset structured metadata',
			},
			{
				name: 'Search Assets',
				value: 'search',
				description: 'Search for assets using a Cloudinary search expression',
				action: 'Search assets',
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
				name: 'Get Tags',
				value: 'getTags',
				description: 'Get all tags for a specific resource type',
				action: 'Get tags for a resource type',
			},
			{
				name: 'Get Metadata Fields',
				value: 'getMetadataFields',
				description: 'Get all metadata fields definitions',
				action: 'Get metadata fields definitions',
			},
		],
		default: 'getTags',
	},
];
