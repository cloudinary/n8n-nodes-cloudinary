import { INodeProperties, INodePropertyOptions } from 'n8n-workflow';
import {
	ASPECT_RATIOS,
	IMAGE_DIMENSION_MAX,
	IMAGE_DIMENSION_MIN,
	IMAGE_TO_IMAGE_MODEL_IDS,
	MODEL_PREFERENCES,
	REFERENCE_IMAGES_MAX,
	RESOLUTIONS,
	TEXT_TO_IMAGE_MODEL_IDS,
} from '../mediaGeneration.client';

// Fields for the Generate resource (Media Generation API). The spec's nested
// request objects (`model`, `image_size`, `target`) are flattened into a mode
// selector plus gated fields; the `…Selection`/`imageSize…`/`model…` names are
// ours (the API has no flat equivalent). Leaf fields that map 1:1 onto a request
// property keep the API name (`prompt`, `format`, `seed`, `public_id`, …).

const GENERATE_OPS = ['textToImage', 'imageToImage'];

const showFor = (operation: string[], extra: Record<string, unknown[]> = {}) => ({
	show: { resource: ['generate'], operation, ...extra },
});

// Option arrays built from the client's spec constants, so a spec change is one
// edit in mediaGeneration.client.ts. Model IDs are shown verbatim — they're what
// the docs and the response's `model.id` use.
const modelIdOptions = (ids: readonly string[]): INodePropertyOptions[] =>
	ids.map((id) => ({ name: id, value: id }));

const MODEL_FAMILY_OPTIONS: INodePropertyOptions[] = [
	{
		name: 'FLUX',
		value: 'flux',
		description: 'Photorealistic images (FLUX.2 Klein 9B / FLUX.2 Pro)',
	},
	{
		name: 'GPT Image',
		value: 'gpt-image',
		description: 'Campaign and marketing images (GPT Image 1 Mini / GPT Image 2)',
	},
	{
		name: 'Ideogram',
		value: 'ideogram',
		description: 'Realism, text rendering, and artistic generation (Ideogram V4)',
	},
	{
		name: 'Nano Banana',
		value: 'nano-banana',
		description: 'General purpose generation (Nano Banana 1 / Nano Banana 2)',
	},
	{
		name: 'Recraft',
		value: 'recraft',
		description: 'Vector and illustration (Recraft V3 / Recraft V4)',
	},
];

const MODEL_PREFERENCE_DESCRIPTIONS: Record<string, string> = {
	balanced: 'Quality and cost weighted equally',
	quality: 'Quality only; cost is not weighed',
	economy: 'Cost first, quality second',
	balanced_fast: 'Balanced, favoring models that finish within ~30 seconds',
	quality_fast: 'Quality, favoring models that finish within ~30 seconds',
	economy_fast: 'Economy, favoring models that finish within ~30 seconds',
};
const MODEL_PREFERENCE_OPTIONS: INodePropertyOptions[] = MODEL_PREFERENCES.map((value) => ({
	name: value
		.split('_')
		.map((w) => w[0].toUpperCase() + w.slice(1))
		.join(' - '),
	value,
	description: MODEL_PREFERENCE_DESCRIPTIONS[value],
}));

const ASPECT_RATIO_OPTIONS: INodePropertyOptions[] = ASPECT_RATIOS.map((value) => ({
	name: value,
	value,
}));

const RESOLUTION_DESCRIPTIONS: Record<string, string> = {
	'0.5K': '~512 px on the longest edge',
	'1K': '~1024 px on the longest edge',
	'2K': '~2048 px on the longest edge',
	'4K': '~4096 px on the longest edge',
};
const RESOLUTION_OPTIONS: INodePropertyOptions[] = RESOLUTIONS.map((value) => ({
	name: value,
	value,
	description: RESOLUTION_DESCRIPTIONS[value],
}));

export const generateFields: INodeProperties[] = [
	// ── Prompt ──────────────────────────────────────────────────────────────────
	{
		displayName: 'Prompt',
		name: 'prompt',
		type: 'string',
		typeOptions: { rows: 4 },
		default: '',
		required: true,
		placeholder: 'A photorealistic sunset over a mountain lake',
		description: 'The text description of the image to generate (up to 16,384 characters)',
		displayOptions: showFor(['textToImage']),
	},
	{
		displayName: 'Prompt',
		name: 'prompt',
		type: 'string',
		typeOptions: { rows: 4 },
		default: '',
		required: true,
		placeholder: 'Place the product from [1] on a marble kitchen counter, soft morning light',
		description:
			'The edit instruction. Refer to reference images by position: [1], [2], and so on.',
		displayOptions: showFor(['imageToImage']),
	},

	// ── Reference images (image-to-image) ──────────────────────────────────────
	{
		displayName: 'Reference Images',
		name: 'reference_images',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true, sortable: true, maxAllowedFields: REFERENCE_IMAGES_MAX },
		placeholder: 'Add Reference Image',
		default: {},
		required: true,
		description: `Up to ${REFERENCE_IMAGES_MAX} images that steer the generation, in order. Some models accept fewer (Recraft V3 and MAI edit models accept 1; Grok Imagine and Qwen Image edit models accept 3).`,
		displayOptions: showFor(['imageToImage']),
		options: [
			{
				displayName: 'Reference Image',
				name: 'reference_image',
				values: [
					{
						displayName: 'Source Type',
						name: 'source_type',
						type: 'options',
						options: [
							{ name: 'URL', value: 'url', description: 'An external image by HTTPS URL' },
							{
								name: 'Managed Asset',
								value: 'managed_asset',
								description: 'An asset in this Cloudinary product environment, by asset ID',
							},
						],
						default: 'url',
					},
					{
						displayName: 'URL',
						name: 'url',
						type: 'string',
						default: '',
						placeholder: 'https://example.com/product.png',
						description: 'HTTPS URL of the reference image',
						displayOptions: { show: { source_type: ['url'] } },
					},
					{
						displayName: 'Asset ID',
						name: 'asset_id',
						type: 'string',
						default: '',
						placeholder: '0d6f8e1c2b3a4d5e6f7a8b9c0d1e2f3a',
						description: 'The asset_id of the reference image (not its public ID)',
						displayOptions: { show: { source_type: ['managed_asset'] } },
					},
				],
			},
		],
	},

	// ── Model ───────────────────────────────────────────────────────────────────
	{
		displayName: 'Model',
		name: 'modelSelection',
		type: 'options',
		options: [
			{
				name: 'Default',
				value: 'default',
				description:
					'Use the service default (Nano Banana 2, or its edit model for reference images)',
			},
			{
				name: 'By Family and Tier',
				value: 'family',
				description: 'Pick a model family and quality tier; stable as models are upgraded',
			},
			{ name: 'By Model ID', value: 'id', description: 'Pin one exact model' },
			{
				name: 'Auto',
				value: 'auto',
				description: 'Let the service choose a model for each request',
			},
		],
		default: 'default',
		displayOptions: showFor(GENERATE_OPS),
	},
	{
		displayName: 'Model Family',
		name: 'modelFamily',
		type: 'options',
		options: MODEL_FAMILY_OPTIONS,
		default: 'nano-banana',
		displayOptions: showFor(GENERATE_OPS, { modelSelection: ['family'] }),
	},
	{
		displayName: 'Model Tier',
		name: 'modelTier',
		type: 'options',
		options: [
			{ name: 'Standard', value: 'standard' },
			{ name: 'Premium', value: 'premium' },
		],
		default: 'standard',
		displayOptions: showFor(GENERATE_OPS, { modelSelection: ['family'] }),
	},
	{
		displayName: 'Model ID',
		name: 'textToImageModelId',
		type: 'options',
		options: modelIdOptions(TEXT_TO_IMAGE_MODEL_IDS),
		default: 'nano-banana-2',
		displayOptions: showFor(['textToImage'], { modelSelection: ['id'] }),
	},
	{
		displayName: 'Model ID',
		name: 'imageToImageModelId',
		type: 'options',
		options: modelIdOptions(IMAGE_TO_IMAGE_MODEL_IDS),
		default: 'nano-banana-2-edit',
		description: 'Only edit models accept reference images',
		displayOptions: showFor(['imageToImage'], { modelSelection: ['id'] }),
	},
	{
		displayName: 'Preference',
		name: 'modelPreference',
		type: 'options',
		options: MODEL_PREFERENCE_OPTIONS,
		default: 'balanced',
		description: 'What the automatic model choice optimizes for',
		displayOptions: showFor(GENERATE_OPS, { modelSelection: ['auto'] }),
	},

	// ── Image size ──────────────────────────────────────────────────────────────
	{
		displayName: 'Image Size',
		name: 'imageSize',
		type: 'options',
		options: [
			{ name: 'Model Default', value: 'default' },
			{
				name: 'Aspect Ratio',
				value: 'aspectRatio',
				description:
					'An aspect ratio and resolution tier, matched to the nearest size the model supports (portable across models)',
			},
			{ name: 'Exact Dimensions', value: 'dimensions', description: 'Width and height in pixels' },
		],
		default: 'default',
		displayOptions: showFor(GENERATE_OPS),
	},
	{
		displayName: 'Aspect Ratio',
		name: 'imageSizeAspectRatio',
		type: 'options',
		options: ASPECT_RATIO_OPTIONS,
		default: '1:1',
		description: 'Output aspect ratio, width to height',
		displayOptions: showFor(GENERATE_OPS, { imageSize: ['aspectRatio'] }),
	},
	{
		displayName: 'Resolution',
		name: 'imageSizeResolution',
		type: 'options',
		options: RESOLUTION_OPTIONS,
		default: '1K',
		displayOptions: showFor(GENERATE_OPS, { imageSize: ['aspectRatio'] }),
	},
	{
		displayName: 'Width',
		name: 'imageSizeWidth',
		type: 'number',
		typeOptions: { minValue: IMAGE_DIMENSION_MIN, maxValue: IMAGE_DIMENSION_MAX },
		default: 1024,
		description: 'Output width in pixels',
		displayOptions: showFor(GENERATE_OPS, { imageSize: ['dimensions'] }),
	},
	{
		displayName: 'Height',
		name: 'imageSizeHeight',
		type: 'number',
		typeOptions: { minValue: IMAGE_DIMENSION_MIN, maxValue: IMAGE_DIMENSION_MAX },
		default: 1024,
		description: 'Output height in pixels',
		displayOptions: showFor(GENERATE_OPS, { imageSize: ['dimensions'] }),
	},

	// ── Task ID (get task) ──────────────────────────────────────────────────────
	{
		displayName: 'Task ID',
		name: 'task_id',
		type: 'string',
		default: '',
		required: true,
		description:
			'The task_id returned by an async generation (map it from the previous node output)',
		displayOptions: showFor(['getTask']),
	},

	// ── Options ─────────────────────────────────────────────────────────────────
	{
		displayName: 'Options',
		name: 'generateOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: showFor(GENERATE_OPS),
		options: [
			{
				displayName: 'Async',
				name: 'async',
				type: 'boolean',
				default: false,
				description:
					'Whether to return immediately with a task_id instead of waiting for the image. Poll it with the Get Generation Task operation, or receive a webhook at the Notification URL.',
			},
			{
				displayName: 'Format',
				name: 'format',
				type: 'options',
				options: [
					{ name: 'JPEG', value: 'jpeg' },
					{ name: 'PNG', value: 'png' },
					{ name: 'WebP', value: 'webp' },
				],
				default: 'png',
				description:
					'Output image format. Mapped to the closest format the model supports (WebP falls back to PNG on some models).',
			},
			{
				displayName: 'Notification URL',
				name: 'notification_url',
				type: 'string',
				default: '',
				placeholder: 'https://example.com/webhook',
				description:
					'Webhook URL notified when an async generation completes (only used with Async on)',
			},
			{
				displayName: 'Public ID',
				name: 'public_id',
				type: 'string',
				default: '',
				description:
					'Public ID to store the generated image under (Managed Asset storage only). Auto-assigned when empty.',
			},
			{
				displayName: 'Seed',
				name: 'seed',
				type: 'number',
				typeOptions: { minValue: 0 },
				default: 0,
				description:
					'Seed for reproducible generation. Supported by FLUX, Nano Banana, Ideogram, and Qwen Image 3; ignored by other models.',
			},
			{
				displayName: 'Storage',
				name: 'target_type',
				type: 'options',
				options: [
					{
						name: 'Managed Asset',
						value: 'managed_asset',
						description: 'Store as a permanent asset in your media library',
					},
					{
						name: 'Temporary',
						value: 'temporary',
						description: 'Store as a short-lived file; the output URL expires (see expires_at)',
					},
				],
				default: 'managed_asset',
				description: 'Where to store the generated image',
			},
			{
				displayName: 'Upload Preset',
				name: 'upload_preset',
				type: 'string',
				default: '',
				description:
					'Upload preset to apply (Managed Asset storage only). Uses the product environment default when empty.',
			},
		],
	},

	// ── Output ──────────────────────────────────────────────────────────────────
	{
		displayName: 'Simplify',
		name: 'simplify',
		type: 'boolean',
		default: true,
		description:
			'Whether to return one item per generated image with its storage fields (public_id, asset_id, secure_url, …) at the top level, instead of the raw API response',
		displayOptions: showFor(['textToImage', 'imageToImage', 'getTask']),
	},
];
