import { INodeProperties } from 'n8n-workflow';

export const uploadFields: INodeProperties[] = [
	{
		displayName: 'URL',
		name: 'url',
		type: 'string',
		default: '',
		description: 'URL of the image to upload',
		required: true,
		displayOptions: {
			show: {
				resource: ['upload'],
				operation: ['uploadUrl'],
			},
		},
	},
	{
		displayName: 'Resource Type',
		name: 'resource_type',
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
		description: 'The type of asset to upload',
		displayOptions: {
			show: {
				resource: ['upload'],
				operation: ['uploadUrl'],
			},
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				resource: ['upload'],
				operation: ['uploadUrl'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Folder',
				name: 'folder',
				type: 'string',
				default: '',
				description: 'Folder name where the asset will be stored',
			},
			{
				displayName: 'Public ID',
				name: 'public_id',
				type: 'string',
				default: '',
				description: 'The public ID of the resource',
			},
			{
				displayName: 'Structured Metadata',
				name: 'metadata',
				type: 'json',
				default: '{}',
				description:
					'Structured metadata to attach to the asset as JSON. Example: {"field1": "value1", "field2": "value2"}.',
			},
			{
				displayName: 'Tags',
				name: 'tags',
				type: 'string',
				default: '',
				description: 'A comma-separated list of tag names to assign to the asset',
			},
			{
				displayName: 'Upload Preset',
				name: 'upload_preset',
				type: 'string',
				default: '',
				description: 'Name of an upload preset that you defined for your Cloudinary account',
			},
		],
	},
	{
		displayName: 'File',
		name: 'file',
		type: 'string',
		typeOptions: {
			propertyType: 'binary',
		},
		default: 'data',
		description: 'The file to upload',
		required: true,
		displayOptions: {
			show: {
				resource: ['upload'],
				operation: ['uploadFile'],
			},
		},
	},
	{
		displayName: 'Resource Type',
		name: 'resource_type_file',
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
		description: 'The type of asset to upload',
		displayOptions: {
			show: {
				resource: ['upload'],
				operation: ['uploadFile'],
			},
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFieldsFile',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				resource: ['upload'],
				operation: ['uploadFile'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Folder',
				name: 'folder',
				type: 'string',
				default: '',
				description: 'Folder name where the asset will be stored',
			},
			{
				displayName: 'Public ID',
				name: 'public_id',
				type: 'string',
				default: '',
				description: 'The public ID of the resource',
			},
			{
				displayName: 'Structured Metadata',
				name: 'metadata',
				type: 'json',
				default: '{}',
				description:
					'Structured metadata to attach to the asset as JSON. Example: {"field1": "value1", "field2": "value2"}.',
			},
			{
				displayName: 'Tags',
				name: 'tags',
				type: 'string',
				default: '',
				description: 'A comma-separated list of tag names to assign to the asset',
			},
			{
				displayName: 'Upload Preset',
				name: 'upload_preset',
				type: 'string',
				default: '',
				description: 'Name of an upload preset that you defined for your Cloudinary account',
			},
		],
	},
];
