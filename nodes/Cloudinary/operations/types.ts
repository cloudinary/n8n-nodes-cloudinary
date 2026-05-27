import { IDataObject, IExecuteFunctions } from 'n8n-workflow';

export const CREDENTIAL_TYPE = 'cloudinaryApi';

export interface CloudinaryCredentials {
	cloudName: string;
	apiKey: string;
	apiSecret: string;
}

/**
 * A single resource+operation handler. Receives the execution context, the
 * current item index, and the resolved credentials; returns zero or more JSON
 * objects. The dispatch loop in execute() wraps each into an INodeExecutionData
 * with the correct pairedItem, so handlers stay free of n8n output plumbing.
 */
export type OperationHandler = (
	ctx: IExecuteFunctions,
	i: number,
	creds: CloudinaryCredentials,
) => Promise<IDataObject[]>;
