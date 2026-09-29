import { IDataObject, IExecuteFunctions, NodeOperationError } from 'n8n-workflow';
import {
	GenerateImageRequest,
	GenerateImageResult,
	GeneratedAsset,
	IMAGE_DIMENSION_MAX,
	IMAGE_DIMENSION_MIN,
	ImageFormat,
	ImageSize,
	ModelSelection,
	REFERENCE_IMAGES_MAX,
	REFERENCE_IMAGES_MIN,
	ReferenceImage,
	Target,
	TaskResponse,
	isTaskResponse,
} from '../../mediaGeneration.client';

// ─────────────────────────────────────────────────────────────────────────────
// Request builders — map the flat n8n fields onto the spec's nested request
// objects. Pure (params → request fragment) and throw a plain Error on invalid
// input; `readGenerateRequest` turns that into the NodeOperationError handlers
// throw. Same split as the Transform component builders.
// ─────────────────────────────────────────────────────────────────────────────

/** `ModelSelection` from the Model selector (`modelSelection`) and its gated fields. */
export const modelSelection = (p: {
	mode: string;
	family: string;
	tier: string;
	id: string;
	preference: string;
}): ModelSelection | undefined => {
	switch (p.mode) {
		case 'family':
			if (!p.family) throw new Error('Model by family requires a family');
			return p.tier
				? ({ family: p.family, tier: p.tier } as ModelSelection)
				: ({ family: p.family } as ModelSelection);
		case 'id':
			if (!p.id) throw new Error('Model by ID requires a model ID');
			return { id: p.id } as ModelSelection;
		case 'auto':
			return p.preference
				? ({ mode: 'auto', preference: p.preference } as ModelSelection)
				: { mode: 'auto' };
		default:
			// Omitting `model` lets the service apply its documented default.
			return undefined;
	}
};

/** `ImageSize` from the Image Size selector (`imageSize`) and its gated fields. */
export const imageSize = (p: {
	mode: string;
	aspectRatio: string;
	resolution: string;
	width: number;
	height: number;
}): ImageSize | undefined => {
	switch (p.mode) {
		case 'aspectRatio': {
			if (!p.aspectRatio) throw new Error('Image size by aspect ratio requires an aspect ratio');
			const size: IDataObject = { aspect_ratio: p.aspectRatio };
			if (p.resolution) size.resolution = p.resolution;
			return size as unknown as ImageSize;
		}
		case 'dimensions': {
			for (const [label, value] of [
				['Width', p.width],
				['Height', p.height],
			] as const) {
				if (
					!Number.isInteger(value) ||
					value < IMAGE_DIMENSION_MIN ||
					value > IMAGE_DIMENSION_MAX
				) {
					throw new Error(
						`${label} must be a whole number of pixels between ${IMAGE_DIMENSION_MIN} and ${IMAGE_DIMENSION_MAX}`,
					);
				}
			}
			return { width: p.width, height: p.height };
		}
		default:
			return undefined;
	}
};

/**
 * `Target` from the Options collection. Omitted entirely when the user set nothing,
 * so the service applies its default (a managed asset with an auto-assigned public ID).
 */
export const target = (p: {
	targetType?: string;
	publicId?: string;
	uploadPreset?: string;
}): Target | undefined => {
	const publicId = (p.publicId ?? '').trim();
	const uploadPreset = (p.uploadPreset ?? '').trim();
	if (p.targetType === 'temporary') {
		if (publicId || uploadPreset) {
			throw new Error('Public ID and Upload Preset apply only to the Managed Asset storage target');
		}
		return { target_type: 'temporary' };
	}
	if (!p.targetType && !publicId && !uploadPreset) {
		return undefined;
	}
	const managed: IDataObject = { target_type: 'managed_asset' };
	if (publicId) managed.public_id = publicId;
	if (uploadPreset) managed.upload_preset = uploadPreset;
	return managed as unknown as Target;
};

/** `reference_images` from the Reference Images fixedCollection rows. */
export const referenceImages = (rows: IDataObject[]): ReferenceImage[] => {
	if (rows.length < REFERENCE_IMAGES_MIN || rows.length > REFERENCE_IMAGES_MAX) {
		throw new Error(
			`Add between ${REFERENCE_IMAGES_MIN} and ${REFERENCE_IMAGES_MAX} reference images (some models accept fewer)`,
		);
	}
	return rows.map((row, idx): ReferenceImage => {
		const n = idx + 1;
		if (row.source_type === 'managed_asset') {
			const assetId = String(row.asset_id ?? '').trim();
			if (!assetId) throw new Error(`Reference image ${n}: Asset ID is required`);
			return { source_type: 'managed_asset', asset_id: assetId };
		}
		const url = String(row.url ?? '').trim();
		if (!/^https:\/\//i.test(url)) {
			throw new Error(`Reference image ${n}: URL must be an HTTPS URL`);
		}
		return { source_type: 'url', url };
	});
};

/**
 * Run a builder, converting its plain validation Error into a NodeOperationError
 * attributed to the item.
 */
const build = <T>(ctx: IExecuteFunctions, i: number, fn: () => T): T => {
	try {
		return fn();
	} catch (error) {
		throw new NodeOperationError(ctx.getNode(), (error as Error).message, { itemIndex: i });
	}
};

/**
 * Read every field shared by the two generation operations into a
 * `GenerateImageRequest`. Only fields the user set are emitted, so the service's
 * documented defaults apply to the rest.
 */
export const readGenerateRequest = (
	ctx: IExecuteFunctions,
	i: number,
	modelIdParam: string,
): GenerateImageRequest => {
	const prompt = (ctx.getNodeParameter('prompt', i) as string).trim();
	if (!prompt) {
		throw new NodeOperationError(ctx.getNode(), 'Prompt is required', { itemIndex: i });
	}
	const options = ctx.getNodeParameter('generateOptions', i, {}) as IDataObject;

	const body: GenerateImageRequest = { prompt };

	const model = build(ctx, i, () =>
		modelSelection({
			mode: ctx.getNodeParameter('modelSelection', i, 'default') as string,
			family: ctx.getNodeParameter('modelFamily', i, '') as string,
			tier: ctx.getNodeParameter('modelTier', i, '') as string,
			id: ctx.getNodeParameter(modelIdParam, i, '') as string,
			preference: ctx.getNodeParameter('modelPreference', i, '') as string,
		}),
	);
	if (model) body.model = model;

	const size = build(ctx, i, () =>
		imageSize({
			mode: ctx.getNodeParameter('imageSize', i, 'default') as string,
			aspectRatio: ctx.getNodeParameter('imageSizeAspectRatio', i, '') as string,
			resolution: ctx.getNodeParameter('imageSizeResolution', i, '') as string,
			width: ctx.getNodeParameter('imageSizeWidth', i, 0) as number,
			height: ctx.getNodeParameter('imageSizeHeight', i, 0) as number,
		}),
	);
	if (size) body.image_size = size;

	const storageTarget = build(ctx, i, () =>
		target({
			targetType: options.target_type as string | undefined,
			publicId: options.public_id as string | undefined,
			uploadPreset: options.upload_preset as string | undefined,
		}),
	);
	if (storageTarget) body.target = storageTarget;

	if (options.format) body.format = options.format as ImageFormat;
	// 0 is a valid seed, so test presence rather than truthiness.
	if (options.seed !== undefined && options.seed !== null && options.seed !== '') {
		body.seed = Number(options.seed);
	}
	if (options.async === true) body.async = true;
	const notificationUrl = String(options.notification_url ?? '').trim();
	if (notificationUrl) body.notification_url = notificationUrl;

	return body;
};

// ─────────────────────────────────────────────────────────────────────────────
// Output shaping
// ─────────────────────────────────────────────────────────────────────────────

/**
 * One n8n item per generated asset, with `storage` flattened to the top level so
 * the API-named keys (`public_id`, `asset_id`, `secure_url`, `resource_type`,
 * `type`, `version`) pipe straight into Transform / Asset ops. `extra` carries
 * envelope fields (request_id, limits, task_id, …) onto every item.
 */
const flattenAssets = (assets: GeneratedAsset[], extra: IDataObject): IDataObject[] =>
	assets.map(({ storage, ...media }) => ({
		...(storage as unknown as IDataObject),
		...(media as unknown as IDataObject),
		...extra,
	}));

const withDefined = (o: IDataObject): IDataObject =>
	Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));

/**
 * Shape a generation or task response for n8n. With `simplify` off, the raw API
 * body is returned as a single item. With it on:
 *   - completed (sync 200, or a completed task) → one flattened item per asset;
 *   - accepted / pending / processing / failed task → one item with the task fields.
 */
export const shapeGenerationOutput = (
	response: GenerateImageResult | TaskResponse,
	simplify: boolean,
): IDataObject[] => {
	if (!simplify) return [response as unknown as IDataObject];

	if (isTaskResponse(response)) {
		const { task_id, status, result, limits } = response.data!;
		const envelope = withDefined({ task_id, status, limits, request_id: response.request_id });
		if (status === 'completed' && result?.assets?.length) {
			return flattenAssets(result.assets, envelope);
		}
		return [envelope];
	}

	const assets = response.data?.assets ?? [];
	const envelope = withDefined({ limits: response.limits, request_id: response.request_id });
	return assets.length ? flattenAssets(assets, envelope) : [envelope];
};
