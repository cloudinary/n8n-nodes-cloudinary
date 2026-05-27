import {
	INodeType,
	INodeTypeDescription,
	NodeConnectionType,
	IExecuteFunctions,
	INodeExecutionData,
	NodeOperationError,
} from 'n8n-workflow';
import { cloudinaryProperties } from './descriptions';
import { operationHandlers } from './operations';
import { CREDENTIAL_TYPE, CloudinaryCredentials } from './operations/types';

export class Cloudinary implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Cloudinary',
		name: 'cloudinary',
		icon: 'file:cloudinary.svg',
		group: ['Cloudinary'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		// Read by both humans (node tooltip in the editor) and LLMs (tool schema when this
		// node is invoked via an AI Agent — see `usableAsTool` below). Keep it concise,
		// imperative, and capability-focused so agents pick the right operation.
		// https://docs.n8n.io/advanced-ai/examples/understand-tools/
		description: 'Upload assets, manage tags and metadata, and search your Cloudinary media library',
		documentationUrl: 'https://cloudinary.com/documentation/n8n_integration',
		usableAsTool: true,
		defaults: {
			name: 'Cloudinary',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		credentials: [
			{
				name: CREDENTIAL_TYPE,
				required: true,
			},
		],
		properties: cloudinaryProperties,
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const credentials = await this.getCredentials(CREDENTIAL_TYPE);
		const creds: CloudinaryCredentials = {
			cloudName: credentials.cloudName as string,
			apiKey: credentials.apiKey as string,
			apiSecret: credentials.apiSecret as string,
		};

		for (let i = 0; i < items.length; i++) {
			try {
				const resource = this.getNodeParameter('resource', i) as string;
				const operation = this.getNodeParameter('operation', i) as string;

				const handler = operationHandlers[`${resource}:${operation}`];
				if (!handler) {
					throw new NodeOperationError(
						this.getNode(),
						`Unsupported operation: ${resource}/${operation}`,
						{ itemIndex: i },
					);
				}

				const results = await handler(this, i, creds);
				for (const json of results) {
					returnData.push({ json, pairedItem: i });
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: error.message,
						},
						pairedItem: i,
					});
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
