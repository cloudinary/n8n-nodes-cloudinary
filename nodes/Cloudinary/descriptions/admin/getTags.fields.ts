import { INodeProperties } from 'n8n-workflow';

export const getTagsFields: INodeProperties[] = [
	{
		displayName: 'Resource Type',
		name: 'getTagsResourceType',
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
		description: 'The type of resource to get tags for',
		required: true,
		displayOptions: {
			show: {
				resource: ['admin'],
				operation: ['getTags'],
			},
		},
	},
	{
		displayName: 'Prefix',
		name: 'tagsPrefix',
		type: 'string',
		default: '',
		description: 'Filter tags that start with this prefix',
		displayOptions: {
			show: {
				resource: ['admin'],
				operation: ['getTags'],
			},
		},
	},
	{
		displayName: 'Max Results',
		name: 'tagsMaxResults',
		type: 'number',
		default: 100,
		description: 'Maximum number of tags to return (1-500)',
		typeOptions: {
			minValue: 1,
			maxValue: 500,
		},
		displayOptions: {
			show: {
				resource: ['admin'],
				operation: ['getTags'],
			},
		},
	},
];
