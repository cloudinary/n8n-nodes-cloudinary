import { INodeProperties } from 'n8n-workflow';

export const searchFields: INodeProperties[] = [
	{
		displayName: 'Expression',
		name: 'searchExpression',
		type: 'string',
		default: '',
		description:
			'Cloudinary search expression. Examples: <code>tags=cat AND uploaded_at>1d</code>, <code>folder:products/*</code>, <code>tags="back to school"</code> (quote values with spaces). Leave empty to match all assets. <a href="https://cloudinary.com/documentation/admin_api#expression_fields" target="_blank">Full expression syntax →</a>',
		displayOptions: {
			show: {
				resource: ['admin'],
				operation: ['search'],
			},
		},
	},
	{
		displayName: 'Resource Types',
		name: 'searchResourceTypes',
		type: 'multiOptions',
		options: [
			{ name: 'Image', value: 'image' },
			{ name: 'Raw', value: 'raw' },
			{ name: 'Video', value: 'video' },
		],
		default: ['image'],
		description:
			'Resource types to search. Cloudinary defaults to image-only — select Video and/or Raw to include them. Ignored if your Expression already contains <code>resource_type:</code>.',
		displayOptions: {
			show: {
				resource: ['admin'],
				operation: ['search'],
			},
		},
	},
	{
		displayName: 'Return All',
		name: 'searchReturnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all matching assets by automatically paginating through results',
		displayOptions: {
			show: {
				resource: ['admin'],
				operation: ['search'],
			},
		},
	},
	{
		displayName: 'Max Results',
		name: 'searchMaxResults',
		type: 'number',
		default: 50,
		description: 'Maximum number of assets to return (1-500). Ignored when Return All is enabled.',
		typeOptions: {
			minValue: 1,
			maxValue: 500,
		},
		displayOptions: {
			show: {
				resource: ['admin'],
				operation: ['search'],
				searchReturnAll: [false],
			},
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'searchAdditionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				resource: ['admin'],
				operation: ['search'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Next Cursor',
				name: 'next_cursor',
				type: 'string',
				default: '',
				description: 'Pagination cursor returned by a previous search response',
			},
			{
				displayName: 'Sort By Field',
				name: 'sortField',
				type: 'string',
				default: 'created_at',
				description:
					'Field to sort results by (e.g. <code>created_at</code>, <code>public_id</code>, <code>uploaded_at</code>)',
			},
			{
				displayName: 'Sort Direction',
				name: 'sortDirection',
				type: 'options',
				options: [
					{ name: 'Ascending', value: 'asc' },
					{ name: 'Descending', value: 'desc' },
				],
				default: 'desc',
				description: 'Sort direction for the Sort By Field',
			},
			{
				displayName: 'With Field',
				name: 'with_field',
				type: 'multiOptions',
				options: [
					{ name: 'Context', value: 'context' },
					{ name: 'Tags', value: 'tags' },
				],
				default: [],
				description:
					'Extra attributes to include for each returned asset. By default the search response omits these to keep payloads small. Enable <b>Tags</b> to get each asset\'s tag list, or <b>Context</b> to get its contextual key-value metadata (e.g. alt text, captions) — useful when you want to filter or branch on those values downstream without a second lookup.',
			},
		],
	},
];
