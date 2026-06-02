import { IDataObject, ApplicationError } from 'n8n-workflow';
import { Cloudinary } from '@cloudinary/url-gen';
import { sha256 } from './sha256.utils';
import { CloudinaryCredentials } from './operations/types';
import { version as pkgVersion } from '../../package.json';

// sdkCode 'I' = n8n (Appendix C integrations, registered 2026-06-02).
// product 'B'  = Integrations (vs 'A' = Classic SDK).
const N8N_ANALYTICS = {
	sdkCode: 'I' as const,
	product: 'B' as const,
	sdkSemver: pkgVersion,
	techVersion: process.versions.node,
};

const CLOUDINARY_API_BASE = 'https://api.cloudinary.com/v1_1';

/** User-Agent sent on every Cloudinary request. */
export const USER_AGENT = `n8n-nodes-cloudinary/${pkgVersion}`;

/** Standard JSON headers (Content-Type + User-Agent) shared across handlers. */
export const jsonHeaders = (): Record<string, string> => ({
	'Content-Type': 'application/json',
	'User-Agent': USER_AGENT,
});

/** HTTP Basic auth pair for the Admin API (api_key:api_secret). */
export const basicAuth = (creds: CloudinaryCredentials): { username: string; password: string } => ({
	username: creds.apiKey,
	password: creds.apiSecret,
});

/**
 * Build the signed-upload endpoint URL for a given cloud and resource type.
 */
export const buildUploadUrl = (cloudName: string, resourceType: string): string =>
	`${CLOUDINARY_API_BASE}/${cloudName}/${resourceType}/upload`;

/**
 * Build the Admin API resource-update URL (used by tag/metadata updates).
 */
export const buildResourceUpdateUrl = (
	cloudName: string,
	resourceType: string,
	type: string,
	publicId: string,
): string => `${CLOUDINARY_API_BASE}/${cloudName}/resources/${resourceType}/${type}/${publicId}`;

/**
 * Build the Admin API resource URL keyed by the immutable asset_id. Used by the
 * asset_id-based endpoints (`GET`/`PUT /resources/:asset_id`).
 */
export const buildResourceByAssetIdUrl = (cloudName: string, assetId: string): string =>
	`${CLOUDINARY_API_BASE}/${cloudName}/resources/${assetId}`;

export interface DeliveryUrlOptions {
	cloudName: string;
	/** image | video | raw */
	resourceType: string;
	/** upload | private | authenticated | fetch | ... */
	type: string;
	publicId: string;
	/** Already-joined transformation string (see `joinTransformation`). May be empty. */
	transformation?: string;
	/** Target extension without the leading dot (e.g. `jpg`). */
	format?: string;
	/** Asset version; emitted as a `v<version>` path segment when present. */
	version?: string | number;
	/** Account is on a private CDN: host becomes `<cloud>-res.cloudinary.com`. */
	privateCdn?: boolean;
	/** Custom delivery hostname (CNAME / secure_distribution). Overrides the host. */
	secureDistribution?: string;
}

/**
 * Normalize a user-supplied custom delivery hostname (CNAME / secure_distribution):
 * strip any scheme and trailing slashes so we always control the `https://` prefix.
 */
const normalizeDeliveryHost = (host: string): string =>
	host
		.trim()
		.replace(/^https?:\/\//i, '')
		.replace(/\/+$/, '');

// Cloudinary instances are stateless config containers — cache them by delivery
// config so we don't re-allocate on every URL build.
const _cldInstances = new Map<string, Cloudinary>();

function getCloudinaryInstance(cloudName: string, privateCdn: boolean, cname: string): Cloudinary {
	const key = `${cloudName}|${privateCdn}|${cname}`;
	if (!_cldInstances.has(key)) {
		_cldInstances.set(key, new Cloudinary({
			cloud: { cloudName },
			url: {
				secure: true,
				// Disable the SDK default of prepending v1 to foldered public IDs;
				// callers pass explicit versions when needed.
				forceVersion: false,
				...(privateCdn && { privateCdn: true }),
				...(cname && { secureDistribution: cname }),
			},
		}));
	}
	return _cldInstances.get(key)!;
}

/**
 * The SDK encodes `?` and `=` in fetch source URLs but leaves `&` and `#` bare.
 * `&` would split the URL into query params at the CDN level; `#` would be stripped
 * as a fragment by browsers and HTTP clients before the request reaches Cloudinary.
 * Post-process the path portion of the SDK's output to encode them.
 */
const fixFetchUrl = (sdkUrl: string): string => {
	const qi = sdkUrl.indexOf('?_a=');
	const path = qi >= 0 ? sdkUrl.slice(0, qi) : sdkUrl;
	const query = qi >= 0 ? sdkUrl.slice(qi) : '';
	return path.replace(/[&#]/g, (c) => encodeURIComponent(c)) + query;
};

/**
 * Build a Cloudinary delivery URL via @cloudinary/url-gen — the "third flow"
 * that makes no API call. Handles shared / private-CDN / CNAME host routing and
 * appends the n8n analytics slug automatically (sdkCode I, product B).
 */
export const buildDeliveryUrl = (opts: DeliveryUrlOptions): string => {
	const {
		cloudName,
		resourceType,
		type,
		publicId,
		transformation,
		format,
		version,
		privateCdn = false,
		secureDistribution,
	} = opts;

	const cname = secureDistribution ? normalizeDeliveryHost(secureDistribution) : '';
	const cld = getCloudinaryInstance(cloudName, privateCdn, cname);

	const idWithFormat = format ? `${publicId}.${format}` : publicId;

	const asset = resourceType === 'video' ? cld.video(idWithFormat) : cld.image(idWithFormat);

	if (type && type !== 'upload') {
		asset.setDeliveryType(type);
	}
	if (transformation) {
		asset.addTransformation(transformation);
	}
	if (version !== undefined && version !== '') {
		asset.setVersion(version);
	}

	const url = asset.toURL({ trackedAnalytics: N8N_ANALYTICS });
	return type === 'fetch' ? fixFetchUrl(url) : url;
};

/**
 * Join transformation components into the slash-separated chain Cloudinary expects.
 * Commas separate qualifiers *within* a component (the caller's responsibility);
 * this joins components with `/` and drops empty/whitespace-only entries so callers
 * can pass conditional pieces (e.g. an optional optimize tail) without guarding.
 */
export const joinTransformation = (components: Array<string | undefined | null>): string =>
	components
		.map((c) => (c == null ? '' : c.trim()))
		.filter((c) => c.length > 0)
		.join('/');

/**
 * Build the Upload API tag-action URL: `POST /:resource_type/tags`. The mutation
 * itself is selected by the `command` body field (add | remove | remove_all | replace).
 * Signed auth (api_key + timestamp + signature) — not Basic.
 */
export const buildTagsActionUrl = (cloudName: string, resourceType: string): string =>
	`${CLOUDINARY_API_BASE}/${cloudName}/${resourceType}/tags`;

/**
 * Build the Admin API bulk-delete URL: `DELETE /resources/:resource_type/:type`.
 * Cloudinary's delete endpoint is always per-(resource_type, type) — there is no
 * asset_id-keyed delete shape, and the public_ids are passed in the query string.
 */
export const buildResourceDeleteUrl = (
	cloudName: string,
	resourceType: string,
	type: string,
): string => `${CLOUDINARY_API_BASE}/${cloudName}/resources/${resourceType}/${type}`;

/**
 * Split a comma-separated string of identifiers into a trimmed, empty-filtered
 * array. Used by bulk endpoints that accept "id1, id2, id3" from the user.
 */
export const splitCsvIds = (csv: string): string[] =>
	csv
		.split(',')
		.map((s) => s.trim())
		.filter((s) => s.length > 0);

// Cloudinary's structured-metadata format documents `=`, `"`, and `|` as the
// characters that must be backslash-escaped when they appear inside a value
// (https://cloudinary.com/documentation/image_upload_api_reference#metadata).
// Comma is NOT escaped — inside a list it's the element separator.
const escapeMetadataValue = (value: string): string => value.replace(/([=|"])/g, '\\$1');

/**
 * Convert a structured-metadata object (or JSON string) into the pipe-separated
 * `key=value|key=value` string Cloudinary expects. Array values become a
 * bracketed, comma-separated list of quoted strings (e.g. `color=["green","red"]`),
 * matching Cloudinary's multi-value field format. Delimiter characters (`=`, `"`,
 * `|`) are backslash-escaped inside every value — scalar and list element alike —
 * so a value containing them can't be misparsed as another field, pair, or list
 * boundary. Throws ApplicationError on invalid JSON input.
 */
export const metadataToPipeString = (input: IDataObject | string): string => {
	let metadata: IDataObject;
	try {
		metadata = typeof input === 'object' ? input : (JSON.parse(input) as IDataObject);
	} catch (error) {
		throw new ApplicationError('Invalid JSON for structured metadata');
	}
	return Object.keys(metadata)
		.map((key) => {
			const value = metadata[key];
			if (value === undefined || value === null) {
				return undefined;
			}
			if (Array.isArray(value)) {
				const items = value
					.map((item) => `"${escapeMetadataValue(String(item))}"`)
					.join(',');
				return `${key}=[${items}]`;
			}
			return `${key}=${escapeMetadataValue(String(value))}`;
		})
		.filter((pair): pair is string => pair !== undefined)
		.join('|');
};

/**
 * Generate Cloudinary signature for signed uploads
 */
export const generateCloudinarySignature = (params: IDataObject, apiSecret: string): string => {
	// Remove signature, api_key, and file from params for signature generation
	const { signature, api_key, file, ...paramsToSign } = params;

	// Sort parameters alphabetically and create query string
	const sortedParams = Object.keys(paramsToSign)
		.sort()
		.map((key) => `${key}=${paramsToSign[key]}`)
		.join('&');

	// Append API secret
	const stringToSign = `${sortedParams}${apiSecret}`;

	// Generate the digest using the pure-JS SHA-256 implementation
	return sha256(stringToSign);
}

/**
 * Create multipart form data without external dependencies
 */
export const createMultipartBody = (fields: Record<string, string>, fileData: Buffer, fileName: string, mimeType: string): { body: Buffer; boundary: string } => {
	const boundary = `----formdata-n8n-${Math.random().toString(16).slice(2)}`;
	const CRLF = '\r\n';
	
	let body = '';
	
	// Add text fields
	for (const [name, value] of Object.entries(fields)) {
		body += `--${boundary}${CRLF}`;
		body += `Content-Disposition: form-data; name="${name}"${CRLF}`;
		body += CRLF;
		body += value;
		body += CRLF;
	}
	
	// Add file field. Sanitize the filename: strip CR/LF (which would inject extra
	// multipart headers) and replace embedded double-quotes (which would close the
	// quoted filename attribute early) so a hostile or odd filename can't break framing.
	const safeFileName = fileName.replace(/[\r\n]/g, '').replace(/"/g, "'");
	body += `--${boundary}${CRLF}`;
	body += `Content-Disposition: form-data; name="file"; filename="${safeFileName}"${CRLF}`;
	body += `Content-Type: ${mimeType}${CRLF}`;
	body += CRLF;
	
	// Convert string part to buffer and concatenate with file data
	const textBuffer = Buffer.from(body, 'utf8');
	const endBuffer = Buffer.from(`${CRLF}--${boundary}--${CRLF}`, 'utf8');
	
	const finalBody = Buffer.concat([textBuffer, fileData, endBuffer]);
	
	return { body: finalBody, boundary };
}

/**
 * Build a Cloudinary search expression, auto-injecting a `resource_type:` clause
 * based on the user's selected resource types. The clause is skipped if the
 * input expression already contains a `resource_type:` (or `resource_type=`)
 * clause, or if all three resource types are selected (no filter needed).
 */
export const buildSearchExpression = (input: string, resourceTypes: string[]): string => {
	const hasResourceTypeClause = /\bresource_type\s*[:=]/i.test(input);
	if (hasResourceTypeClause || resourceTypes.length === 0 || resourceTypes.length >= 3) {
		return input;
	}
	const clause =
		resourceTypes.length === 1
			? `resource_type:${resourceTypes[0]}`
			: `resource_type:(${resourceTypes.join(' OR ')})`;
	return input ? `(${input}) AND ${clause}` : clause;
};

export interface CloudinaryErrorInfo {
	status: number | string | undefined;
	retryAfter: string | undefined;
	cloudinaryMessage: string | undefined;
}

/**
 * Extract status, Retry-After, and Cloudinary's error message from an n8n
 * httpRequestWithAuthentication error. Only handles shapes that n8n / the
 * Cloudinary server actually emit — no speculative fallbacks.
 */
export const extractCloudinaryError = (error: any): CloudinaryErrorInfo => {
	const status = (error?.httpCode ?? error?.statusCode ?? error?.response?.status) as
		| number
		| string
		| undefined;
	const headers = (error?.response?.headers ?? error?.cause?.response?.headers) as
		| Record<string, string>
		| undefined;
	const retryAfter = headers?.['retry-after'] ?? headers?.['Retry-After'];
	const cloudinaryMessage =
		(error?.response?.body?.error?.message as string | undefined) ??
		(error?.response?.data?.error?.message as string | undefined) ??
		(headers?.['x-cld-error'] as string | undefined);
	return { status, retryAfter, cloudinaryMessage };
}; 