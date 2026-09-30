import { IExecuteFunctions, IHttpRequestOptions, JsonObject, NodeApiError } from 'n8n-workflow';
import { basicAuth, jsonHeaders } from './cloudinary.utils';
import { CREDENTIAL_TYPE, CloudinaryCredentials } from './operations/types';

// ─────────────────────────────────────────────────────────────────────────────
// Media Generation API client.
//
// Hand-written against the OpenAPI spec in CloudinaryLtd/media_generation
// (`app/schema/schema.yml`, OpenAPI 3.0.3, info.version 1.0.0, "Image Generation
// API"). Types mirror `components.schemas` one-to-one — a schema `oneOf` becomes a
// TS union, and property names stay snake_case as on the wire. No code generator:
// the package forbids runtime deps, and the surface is three endpoints. When the
// spec changes, update the matching type/constant here and cite the schema name.
//
// Auth is HTTP Basic (api_key:api_secret) — the same as the Admin API flow — but
// against the `/v2` base, not `/v1_1`.
// ─────────────────────────────────────────────────────────────────────────────

const MEDIA_GENERATION_API_BASE = 'https://api.cloudinary.com/v2';

// ── Model selection (`ModelSelection` = ModelByFamily | ModelById | ModelAuto) ──

/** `ModelByFamily.family` */
export const MODEL_FAMILIES = ['flux', 'recraft', 'gpt-image', 'nano-banana', 'ideogram'] as const;
export type ModelFamily = (typeof MODEL_FAMILIES)[number];

/** `ModelByFamily.tier` */
export const MODEL_TIERS = ['standard', 'premium'] as const;
export type ModelTier = (typeof MODEL_TIERS)[number];

/** `ModelAuto.preference` */
export const MODEL_PREFERENCES = [
	'balanced',
	'quality',
	'economy',
	'balanced_fast',
	'quality_fast',
	'economy_fast',
] as const;
export type ModelPreference = (typeof MODEL_PREFERENCES)[number];

/** `ModelById.id` values selectable on `text_to_image` (the non-`-edit` models). */
export const TEXT_TO_IMAGE_MODEL_IDS = [
	'nano-banana-1',
	'nano-banana-2',
	'nano-banana-2-lite',
	'flux-2-klein-9b',
	'flux-2-pro',
	'flux-2-flash',
	'recraft-v3',
	'recraft-v4',
	'gpt-image-1-mini',
	'gpt-image-2',
	'gpt-image-2.5-flare',
	'gpt-image-2.5-sunburst',
	'muse-image',
	'mai-image-2.5',
	'mai-image-2.5-pro',
	'seedream-5-pro',
	'grok-imagine-image',
	'recraft-v4.1-utility',
	'recraft-v4.1-utility-pro',
	'seedream-5-lite',
	'grok-imagine-image-2.0-low',
	'qwen-image-3',
	'ideogram-v4-base',
	'ideogram-v4-turbo',
] as const;

/** `ModelById.id` values selectable on `image_to_image` (the `-edit` models). */
export const IMAGE_TO_IMAGE_MODEL_IDS = [
	'nano-banana-1-edit',
	'nano-banana-2-edit',
	'nano-banana-2-lite-edit',
	'flux-2-klein-9b-edit',
	'flux-2-pro-edit',
	'flux-2-flash-edit',
	'recraft-v3-edit',
	'gpt-image-1-mini-edit',
	'gpt-image-2-edit',
	'gpt-image-2.5-flare-edit',
	'gpt-image-2.5-sunburst-edit',
	'muse-image-edit',
	'mai-image-2.5-edit',
	'mai-image-2.5-pro-edit',
	'seedream-5-pro-edit',
	'grok-imagine-image-edit',
	'seedream-5-lite-edit',
	'grok-imagine-image-2.0-low-edit',
	'qwen-image-3-edit',
] as const;

export type ModelId =
	| (typeof TEXT_TO_IMAGE_MODEL_IDS)[number]
	| (typeof IMAGE_TO_IMAGE_MODEL_IDS)[number];

export interface ModelByFamily {
	family: ModelFamily;
	tier?: ModelTier;
}
export interface ModelById {
	id: ModelId;
}
export interface ModelAuto {
	mode: 'auto';
	preference?: ModelPreference;
}
export type ModelSelection = ModelByFamily | ModelById | ModelAuto;

// ── Size (`ImageSize` = DimensionsImageSize | DeclarativeImageSize) ──

/** `DeclarativeImageSize.aspect_ratio` */
export const ASPECT_RATIOS = ['1:1', '16:9', '9:16', '4:3', '3:4'] as const;
export type AspectRatio = (typeof ASPECT_RATIOS)[number];

/** `DeclarativeImageSize.resolution` */
export const RESOLUTIONS = ['0.5K', '1K', '2K', '4K'] as const;
export type Resolution = (typeof RESOLUTIONS)[number];

/** `DimensionsImageSize` bounds (both edges). */
export const IMAGE_DIMENSION_MIN = 64;
export const IMAGE_DIMENSION_MAX = 4096;

export interface DimensionsImageSize {
	width: number;
	height: number;
}
export interface DeclarativeImageSize {
	aspect_ratio: AspectRatio;
	resolution?: Resolution;
}
export type ImageSize = DimensionsImageSize | DeclarativeImageSize;

/** `ImageFormat` */
export const IMAGE_FORMATS = ['jpeg', 'png', 'webp'] as const;
export type ImageFormat = (typeof IMAGE_FORMATS)[number];

// ── Target (`Target`, discriminated by `target_type`) ──

export interface ManagedAssetTarget {
	target_type: 'managed_asset';
	public_id?: string;
	upload_preset?: string;
}
export interface TemporaryTarget {
	target_type: 'temporary';
}
export type Target = ManagedAssetTarget | TemporaryTarget;

// ── Reference images (`ReferenceImage`, discriminated by `source_type`) ──

/** `ImageToImageRequest.reference_images` bounds (the platform max; models may accept fewer). */
export const REFERENCE_IMAGES_MIN = 1;
export const REFERENCE_IMAGES_MAX = 4;

export interface ManagedAssetReference {
	source_type: 'managed_asset';
	asset_id: string;
}
export interface UrlReference {
	source_type: 'url';
	url: string;
}
export type ReferenceImage = ManagedAssetReference | UrlReference;

// ── Requests ──

/** `GenerateImageRequest` — body of `POST /generate/{cloud_name}/text_to_image`. */
export interface GenerateImageRequest {
	prompt: string;
	model?: ModelSelection;
	image_size?: ImageSize;
	format?: ImageFormat;
	target?: Target;
	seed?: number | null;
	async?: boolean;
	notification_url?: string;
}

/** `ImageToImageRequest` — body of `POST /generate/{cloud_name}/image_to_image`. */
export interface ImageToImageRequest extends GenerateImageRequest {
	reference_images: ReferenceImage[];
}

// ── Responses ──

export interface ManagedAssetStorage {
	storage_type: 'managed_asset';
	secure_url: string;
	asset_id?: string;
	public_id: string;
	resource_type: 'image' | 'video' | 'raw';
	type: string;
	version: number;
}
export interface TemporaryStorage {
	storage_type: 'temporary';
	secure_url: string;
	expires_at: string;
}
/** `Storage` — mirrors the request `target`. */
export type Storage = ManagedAssetStorage | TemporaryStorage;

/**
 * `Model` — the model that produced a result. `family`/`tier` are `none` for a model
 * outside the family/tier taxonomy (not enums: treat any value as possible); key on `id`.
 */
export interface Model {
	family: string;
	tier: string;
	id: string;
}

/** `GeneratedAsset` — media fields are populated once the generation completes. */
export interface GeneratedAsset {
	storage: Storage;
	format?: ImageFormat;
	width?: number;
	height?: number;
	bytes?: number;
	model?: Model;
	seed?: number | null;
	created_at?: string;
}

export interface GeneratedAssets {
	assets: GeneratedAsset[];
}

export interface AddonQuota {
	type: 'image_generation';
	used_by_request: number | null;
	remaining: number | null;
	limit: number | null;
}
export interface Limits {
	addons_quota?: AddonQuota[];
}

// ── Notices (`Notices`, `x-experimental`) ──

/** `Notice.severity` */
export const NOTICE_SEVERITIES = ['info', 'warning', 'blocking'] as const;
export type NoticeSeverity = (typeof NOTICE_SEVERITIES)[number];

/**
 * `Notice` — plain-text guidance on a response envelope (quota alerts, adjustments
 * made to fit the model, …). `blocking` means the request was not served and the
 * text says what unblocks it. The wording may change between releases, so show or
 * follow `text` as-is — never match on it.
 */
export interface Notice {
	severity: NoticeSeverity;
	text: string;
}
/** `Notices` — root-level on every envelope; omitted when there is nothing to say. */
export type Notices = Notice[];

/** `GenerateImageResult` — the 200 (synchronous) generation response. */
export interface GenerateImageResult {
	data?: GeneratedAssets;
	limits?: Limits;
	notices?: Notices;
	request_id: string;
}

/** `TaskStatus` */
export const TASK_STATUSES = ['pending', 'processing', 'completed', 'failed'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

/** `Task` — an async generation task; `result` is set once `status` is `completed`. */
export interface Task {
	task_id: string;
	status: TaskStatus;
	result?: GeneratedAssets | null;
	limits?: Limits;
}

/** `TaskResponse` — the 202 (async accepted) response and the `GET /tasks/{task_id}` body. */
export interface TaskResponse {
	data?: Task;
	notices?: Notices;
	request_id: string;
}

/** `TaskResponse.task_id` path-parameter pattern. */
export const TASK_ID_PATTERN = /^[a-f0-9]{1,256}$/;

/** `ErrorCategory` */
export type ErrorCategory = 'user_error' | 'auth_error' | 'server_error' | 'rate_limit_error';

/** `ErrorResponse` (and `RateLimitedResponse`, which adds `limits`). */
export interface MediaGenerationErrorResponse {
	error?: {
		category?: ErrorCategory;
		code?: string;
		message?: string;
		details?: Record<string, unknown>;
	};
	limits?: Limits;
	notices?: Notices;
	request_id?: string;
}

/**
 * A generation endpoint answers 200 with the finished result, or 202 with a task
 * when the request set `async: true`. The two bodies differ only in `data`'s shape,
 * so the `task_id` inside it is the discriminator.
 */
export const isTaskResponse = (
	response: GenerateImageResult | TaskResponse,
): response is TaskResponse => typeof (response.data as Task | undefined)?.task_id === 'string';

// ── Endpoints ──

export const buildMediaGenerationUrl = (cloudName: string, path: string): string =>
	`${MEDIA_GENERATION_API_BASE}/generate/${cloudName}/${path}`;

/** `generate_image` — `POST /generate/{cloud_name}/text_to_image`. */
export const generateImage = async (
	ctx: IExecuteFunctions,
	i: number,
	creds: CloudinaryCredentials,
	body: GenerateImageRequest,
): Promise<GenerateImageResult | TaskResponse> =>
	await request(ctx, i, creds, {
		method: 'POST',
		url: buildMediaGenerationUrl(creds.cloudName, 'text_to_image'),
		body,
	});

/** `generate_image_from_images` — `POST /generate/{cloud_name}/image_to_image`. */
export const generateImageFromImages = async (
	ctx: IExecuteFunctions,
	i: number,
	creds: CloudinaryCredentials,
	body: ImageToImageRequest,
): Promise<GenerateImageResult | TaskResponse> =>
	await request(ctx, i, creds, {
		method: 'POST',
		url: buildMediaGenerationUrl(creds.cloudName, 'image_to_image'),
		body,
	});

/** `get_generation_task_status` — `GET /generate/{cloud_name}/tasks/{task_id}`. */
export const getGenerationTask = async (
	ctx: IExecuteFunctions,
	i: number,
	creds: CloudinaryCredentials,
	taskId: string,
): Promise<TaskResponse> =>
	await request(ctx, i, creds, {
		method: 'GET',
		url: buildMediaGenerationUrl(creds.cloudName, `tasks/${taskId}`),
	});

const request = async <T>(
	ctx: IExecuteFunctions,
	i: number,
	creds: CloudinaryCredentials,
	options: Pick<IHttpRequestOptions, 'method' | 'url' | 'body'>,
): Promise<T> => {
	try {
		return (await ctx.helpers.httpRequestWithAuthentication.call(ctx, CREDENTIAL_TYPE, {
			...options,
			json: true,
			headers: jsonHeaders(),
			auth: basicAuth(creds),
		})) as T;
	} catch (error) {
		throw toNodeApiError(ctx, i, error);
	}
};

// ── Errors ──

/**
 * Read the spec's `ErrorResponse` body off an n8n HTTP error. `httpRequestWithAuthentication`
 * throws a NodeApiError, which keeps the HTTP response body (`response.data`) as
 * `context.data` and the status as `httpCode`; a raw HTTP error carries it on `response`.
 */
export const extractMediaGenerationError = (
	error: any,
): { status: number | undefined; body: MediaGenerationErrorResponse | undefined } => {
	const status =
		Number(error?.httpCode ?? error?.statusCode ?? error?.response?.status) || undefined;
	const raw = error?.response?.body ?? error?.response?.data ?? error?.context?.data;
	let body: MediaGenerationErrorResponse | undefined;
	if (typeof raw === 'string') {
		try {
			body = JSON.parse(raw) as MediaGenerationErrorResponse;
		} catch {
			body = undefined;
		}
	} else if (raw && typeof raw === 'object') {
		body = raw as MediaGenerationErrorResponse;
	}
	return { status, body };
};

/** Actionable next step per status, for the error's description. */
const hintFor = (
	status: number | undefined,
	body: MediaGenerationErrorResponse | undefined,
): string => {
	switch (status) {
		case 401:
			return 'Check the API key and secret in the Cloudinary credential.';
		case 403:
			return 'The account may not have the Image Generation add-on enabled, or the credential lacks read permission on a reference asset.';
		case 404:
			return 'The task or reference asset was not found. Task IDs expire; reference assets must exist in this product environment.';
		case 429: {
			const quota = body?.limits?.addons_quota?.[0];
			const usage =
				quota && quota.remaining !== null && quota.limit !== null
					? ` (${quota.remaining} of ${quota.limit} quota units remaining)`
					: '';
			return `Generation quota or rate limit exceeded${usage}. Retry later or upgrade the Image Generation add-on.`;
		}
		case 502:
			return 'The selected model is temporarily unavailable. Retry, or pick a different model.';
		default:
			return '';
	}
};

/** Notices joined into one line, each tagged with its severity. */
export const noticesText = (notices: Notices | undefined): string =>
	(notices ?? [])
		.filter((n) => n?.text)
		.map((n) => `[${n.severity}] ${n.text}`)
		.join(' ');

const toNodeApiError = (ctx: IExecuteFunctions, i: number, error: unknown): NodeApiError => {
	const { status, body } = extractMediaGenerationError(error);
	const apiError = body?.error;
	if (!apiError?.message) {
		// Not a spec-shaped error body (network failure, proxy page, …) — keep n8n's own.
		return new NodeApiError(ctx.getNode(), error as JsonObject, { itemIndex: i });
	}
	const message = apiError.code ? `${apiError.code}: ${apiError.message}` : apiError.message;
	// The service's own notices are more specific than our per-status hint (a quota-wall
	// notice says *not* to retry, where the generic 429 hint says to), so they replace it.
	const notices = noticesText(body?.notices);
	const description = [
		notices || hintFor(status, body),
		apiError.details ? `Details: ${JSON.stringify(apiError.details)}` : '',
		body?.request_id ? `Request ID: ${body.request_id}` : '',
	]
		.filter(Boolean)
		.join(' ');
	// `new NodeApiError(node, err)` returns `err` untouched when it already is one (which
	// is what httpRequestWithAuthentication throws), dropping any options passed — so
	// rewrite an existing NodeApiError in place and only construct for other errors.
	if (error instanceof NodeApiError) {
		error.message = message;
		error.description = description || null;
		if (status) error.httpCode = String(status);
		return error;
	}
	return new NodeApiError(ctx.getNode(), error as JsonObject, {
		message,
		description: description || undefined,
		httpCode: status ? String(status) : undefined,
		itemIndex: i,
	});
};
