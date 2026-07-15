import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class CloudinaryApi implements ICredentialType {
	name = 'cloudinaryApi';
	displayName = 'Cloudinary API';
	documentationUrl = 'https://cloudinary.com/documentation/image_upload_api_reference';
	properties: INodeProperties[] = [
		{
			displayName: 'Cloud Name',
			name: 'cloudName',
			type: 'string',
			default: '',
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
		},
		{
			displayName: 'API Secret',
			name: 'apiSecret',
			type: 'string',
			default: '',
			typeOptions: { password: true },
		},
		{
			displayName: 'Private CDN',
			name: 'privateCdn',
			type: 'boolean',
			default: false,
			description:
				'Whether your account delivers from a private CDN distribution (<cloud>-res.cloudinary.com). Only affects the delivery URLs built by Transform operations.',
		},
		{
			displayName: 'Custom Delivery Hostname',
			name: 'secureDistribution',
			type: 'string',
			default: '',
			placeholder: 'assets.example.com',
			description:
				'Custom delivery hostname (CNAME) for your private CDN account. Leave empty to use the default <cloud>-res.cloudinary.com subdomain.',
			displayOptions: { show: { privateCdn: [true] } },
		},
		{
			displayName: 'Send Usage Analytics',
			name: 'analytics',
			type: 'boolean',
			default: true,
			description:
				'Whether to append a query parameter that passes n8n usage information (_a) to the delivery URLs built by Transform operations. This data is used in aggregate form to help Cloudinary improve future versions of the Cloudinary n8n integration. No individual data is collected and this data cannot be used to identify end users in any way. Because this adds a small tag to the end of each URL, the URLs differ slightly from the plain version — so if later steps in your workflow store, compare, or reuse the exact URL, turn this off to keep them unchanged.',
		},
	];

	// This tells how this credential is authenticated
	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			auth: {
				username: '={{$credentials.apiKey}}',
				password: '={{$credentials.apiSecret}}',
			},
		},
	};

	// The block below tells how this credential can be tested
	test: ICredentialTestRequest = {
		request: {
			baseURL: '=https://api.cloudinary.com/v1_1/{{$credentials?.cloudName}}',
			url: '/ping',
		},
	};
}
