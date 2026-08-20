import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class CloudinaryApi implements ICredentialType {
	name = 'cloudinaryApi';
	displayName = 'Cloudinary API';
	documentationUrl = 'https://cloudinary.com/documentation/developer_onboarding_faq_find_credentials';
	properties: INodeProperties[] = [
		{
			// A notice is the only credential-modal affordance for setup guidance: n8n has no
			// generic click-to-call button (buttonConfig.action only supports AI code generation),
			// so onboarding has to be a link out. Notice displayName is exempt from the
			// title-case lint rule, which is why this reads as prose. n8n sanitizes notice
			// content down to <a>/<ul>/<li>, so no other markup survives.
			displayName:
				'Need an account? <a href="https://cloudinary.com/users/register_free" target="_blank">Create a free Cloudinary account</a>, then copy your cloud name, API key, and API secret from the <a href="https://console.cloudinary.com/settings/api-keys" target="_blank">API Keys page</a>. Just trying things out? Ask an agent to run \'npx @cloudinary/cloud\' for instant credentials via a <a href="https://cloudinary.com/documentation/claimable_cloud_provisioning" target="_blank">Claimable Cloud</a> — until you claim it, delivery URLs only work from the IP addresses you register, and the cloud expires after 24 hours.',
			name: 'setupNotice',
			type: 'notice',
			default: '',
		},
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
