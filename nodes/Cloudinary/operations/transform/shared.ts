import { IDataObject, IExecuteFunctions, NodeOperationError } from 'n8n-workflow';
import { buildDeliveryUrl, joinTransformation } from '../../cloudinary.utils';
import { CloudinaryCredentials } from '../types';

/**
 * Identity + delivery options shared by every Transform operation: the public ID,
 * the `Additional Options` collection (delivery type, version), and the optional
 * `Continue From Transformation` string (a transformation piped from a previous
 * step, prepended before this op's own components — see buildTransformResult).
 */
export interface TransformInput {
	publicId: string;
	deliveryType: string;
	version: string;
	continueFrom: string;
}

export const readTransformInput = (ctx: IExecuteFunctions, i: number): TransformInput => {
	const publicId = ctx.getNodeParameter('transformPublicId', i) as string;
	const deliveryType = ctx.getNodeParameter('type', i, 'upload') as string;
	const additional = ctx.getNodeParameter('transformAdditionalOptions', i, {}) as IDataObject;
	// Only the chainable ops surface this field; for the rest it reads as '' (no-op).
	const continueFrom = ctx.getNodeParameter('continueFromTransformation', i, '') as string;
	return {
		publicId,
		deliveryType: deliveryType || 'upload',
		version: (additional.version as string) || '',
		continueFrom: continueFrom.trim(),
	};
};

/**
 * Build the standard delivery-URL result JSON every transform handler returns.
 * No API call is made — this is the "third flow" (pure URL construction). The
 * `url`/`secure_url` shape mirrors Cloudinary's upload response for familiarity.
 */
export const buildTransformResult = (
	creds: CloudinaryCredentials,
	params: {
		resourceType: string;
		type: string;
		transformation: string;
		publicId: string;
		format?: string;
		version?: string;
		// A transformation piped from a previous step (the `Continue From
		// Transformation` field). Prepended before this op's own transformation so the
		// two compound, e.g. `c_fill,w_400` + `f_auto/q_auto` → `c_fill,w_400/f_auto/q_auto`.
		// Empty (the default for non-chainable ops) leaves the transformation untouched.
		continueFrom?: string;
	},
): IDataObject => {
	const transformation = joinTransformation([
		params.continueFrom || undefined,
		params.transformation,
	]);
	// The format becomes the delivery URL's trailing extension, and is meaningful only
	// for stored-asset types: their public_id is opaque, so the extension is what
	// selects the delivered representation. The op's explicit format (Convert/Thumbnail)
	// wins; otherwise we recover one baked into a dotted public_id (see the "doubled
	// extension" note). For fetch/social sources the public_id is a remote URL /
	// external id that already carries its own extension, and any conversion rides in
	// the transformation (e.g. f_webp) — so we append nothing, because suffixing would
	// corrupt the source identifier. This keeps one invariant: `result.format` is set
	// iff the URL carries a trailing `.<format>`, and the two always agree.
	const effectiveFormat = STORED_ASSET_TYPES.has(params.type)
		? params.format || trailingMediaFormat(params.publicId)
		: undefined;

	const secureUrl = buildDeliveryUrl({
		cloudName: creds.cloudName,
		resourceType: params.resourceType,
		type: params.type,
		transformation,
		publicId: params.publicId,
		format: effectiveFormat || undefined,
		version: params.version || undefined,
		privateCdn: creds.privateCdn,
		secureDistribution: creds.secureDistribution,
	});

	const result: IDataObject = {
		secure_url: secureUrl,
		resource_type: params.resourceType,
		type: params.type,
		public_id: params.publicId,
		transformation,
	};
	if (effectiveFormat) {
		result.format = effectiveFormat;
	}
	if (params.version) {
		result.version = params.version;
	}
	return result;
};

/** Map the quality selector value to a `q_auto[:level]` qualifier. */
export const qualityQualifier = (quality: string): string =>
	quality === 'auto' ? 'q_auto' : `q_auto:${quality}`;

// ─────────────────────────────────────────────────────────────────────────────
// Transformation component builders — the single source of truth for the
// transformation each operation emits. A builder is pure (params → component
// list) and throws a plain Error on invalid input; it is shared by the standalone
// transform ops (one builder per op) AND the Multi-Step op (one builder per step),
// so adding/changing transformation logic in one place updates both. Each builder
// returns the component(s) that `joinTransformation` chains with `/`. See the
// "Keep Multi-Step in sync" note in CLAUDE.md.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * `[b_<background>,]c_<fit>,w_,h_` — resize to a width and/or height. The optional
 * `background` is meaningful only for the pad fit modes (`pad`/`lpad`/`mpad`), which
 * fill the area around the image; it is the raw `b_` suffix (`auto`, `blurred`, a
 * named color like `white`, or `rgb:RRGGBB`). Empty leaves Cloudinary's default
 * (black) padding. It is ignored for non-pad modes, which never pad.
 */
export const resizeComponents = (p: {
	width: number;
	height: number;
	fit: string;
	background?: string;
}): string[] => {
	if (!p.width && !p.height) {
		throw new Error('Resize requires a width and/or a height');
	}
	const qualifiers: string[] = [];
	const background = (p.background ?? '').trim();
	if (background && PAD_FIT_MODES.has(p.fit)) qualifiers.push(`b_${background}`);
	qualifiers.push(`c_${p.fit}`);
	if (p.width) qualifiers.push(`w_${p.width}`);
	if (p.height) qualifiers.push(`h_${p.height}`);
	return [qualifiers.join(',')];
};

/** Fit modes that pad the area around the image, so a background color applies. */
const PAD_FIT_MODES = new Set(['pad', 'lpad', 'mpad']);

/**
 * Resolve the Pad Background UI (a mode selector + an optional color string) into the
 * raw `b_` suffix `resizeComponents` expects, shared by the standalone Resize op and
 * the Multi-Step resize step so they stay in sync. Returns '' for the default (black)
 * padding, which emits no `b_` qualifier. A hex value (with or without a leading `#`)
 * is encoded as `rgb:RRGGBB`; a named color (`white`, `lightblue`) passes through.
 */
export const padBackgroundSuffix = (mode: string, color: string): string => {
	if (mode === 'auto') return 'auto';
	if (mode === 'blurred') return 'blurred';
	if (mode === 'color') {
		const value = color.trim().replace(/^#/, '');
		if (!value) return '';
		return /^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(value) ? `rgb:${value}` : value;
	}
	return '';
};

/**
 * `c_fill,g_<focus>,w_,h_` (or `ar_`), or `b_gen_fill[:prompt_…],c_pad,…` when
 * generative fill is on — crop to dimensions or an aspect ratio.
 */
export const cropComponents = (p: {
	cropBy: string;
	width: number;
	height: number;
	aspectRatio: string;
	focus: string;
	genFill?: boolean;
	genFillPrompt?: string;
}): string[] => {
	const dimensions: string[] = [];
	if (p.cropBy === 'aspectRatio') {
		const aspectRatio = p.aspectRatio.trim();
		if (!aspectRatio) {
			throw new Error('Crop by aspect ratio requires an aspect ratio (e.g. 16:9)');
		}
		dimensions.push(`ar_${aspectRatio}`);
		if (p.width) dimensions.push(`w_${p.width}`);
	} else {
		if (!p.width && !p.height) {
			throw new Error('Crop requires a width and/or a height');
		}
		if (p.width) dimensions.push(`w_${p.width}`);
		if (p.height) dimensions.push(`h_${p.height}`);
	}

	let mode: string[];
	if (p.genFill) {
		const prompt = (p.genFillPrompt ?? '').trim();
		const background = prompt ? `b_gen_fill:prompt_${encodeURIComponent(prompt)}` : 'b_gen_fill';
		mode = [background, 'c_pad'];
	} else {
		mode = ['c_fill', `g_${p.focus}`];
	}
	return [[...mode, ...dimensions].join(',')];
};

/** `so_,eo_,du_` — trim by any combination of start, end, and duration. */
export const trimComponents = (p: { start: string; end: string; duration: string }): string[] => {
	const qualifiers: string[] = [];
	const start = p.start.trim();
	const end = p.end.trim();
	const duration = p.duration.trim();
	if (start) qualifiers.push(`so_${start}`);
	if (end) qualifiers.push(`eo_${end}`);
	if (duration) qualifiers.push(`du_${duration}`);
	if (!qualifiers.length) {
		throw new Error('Trim requires at least one of start, end, or duration');
	}
	return [qualifiers.join(',')];
};

/** `f_auto[:video]` + `q_auto[:level]` — auto format/codec and quality. */
export const optimizeComponents = (p: { quality: string; resourceType: string }): string[] => [
	p.resourceType === 'video' ? 'f_auto:video' : 'f_auto',
	qualityQualifier(p.quality),
];

/** `f_<fmt>` — convert/deliver as a specific format. */
export const convertComponents = (format: string): string[] => {
	const fmt = format.trim();
	if (!fmt) {
		throw new Error('Convert requires a target format');
	}
	return [`f_${fmt}`];
};

/**
 * Run a component builder, converting its plain validation Error into the
 * NodeOperationError the handlers throw (with `itemIndex`, and an optional prefix
 * such as `Step 2: ` for Multi-Step). Keeps validation logic in the builders while
 * preserving the node-aware errors callers expect.
 */
export const buildComponents = (
	ctx: IExecuteFunctions,
	i: number,
	build: () => string[],
	prefix = '',
): string[] => {
	try {
		return build();
	} catch (error) {
		throw new NodeOperationError(ctx.getNode(), `${prefix}${(error as Error).message}`, {
			itemIndex: i,
		});
	}
};

// ─────────────────────────────────────────────────────────────────────────────
// The "doubled extension" delivery encoding — DO NOT collapse it, it is correct.
//
// A delivery URL like `.../my_image1234.png.png` looks like a duplication bug. It
// is not. In a Cloudinary delivery URL the public_id and the format are two
// independent fields joined with a dot: the public_id is an OPAQUE identifier (the
// dot in `my_image1234.png` is just part of the string, with no filename/extension
// meaning) and the format is a SEPARATE trailing extension that selects the
// delivered representation. Cloudinary does not check whether the id already ends
// in the requested extension — keeping the two decoupled is what lets one asset be
// delivered as .jpg / .webp / .avif by changing only the format while the id stays
// constant.
//
// Consequence for us: when a public_id was stored WITH its extension baked in
// (`my_image1234.png`), the correct URL is `my_image1234.png` + `.` + `png` =
// `my_image1234.png.png`. If we omit the format, Cloudinary parses the id's OWN
// trailing `.png` as the format, looks up `my_image1234` instead, and 404s.
//
// The named transform ops carry no `format` field (only the bare public_id reaches
// us), so we recover the format from the public_id's trailing media extension below
// and let `buildTransformResult` re-append it. `f_auto` still overrides this for
// content negotiation, so optimization is unaffected by the forced extension.
//
// This set is the allow-list of extensions we treat as a recoverable `format`.
// ─────────────────────────────────────────────────────────────────────────────
const MEDIA_FORMAT_EXTENSIONS = new Set([
	// image
	'jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'bmp', 'tiff', 'tif', 'ico', 'svg', 'heic', 'heif', 'jxl',
	// video
	'mp4', 'webm', 'mov', 'avi', 'mkv', 'ogv', 'm4v', '3gp', 'wmv', 'mpeg', 'mpg', 'flv', 'm3u8', 'ts',
	// audio
	'mp3', 'aac', 'wav', 'ogg', 'flac', 'm4a', 'aiff', 'wma',
	// document
	'pdf',
]);

/**
 * If a public_id's final path segment ends in a known media format extension,
 * return that extension (lowercased); otherwise undefined. Folder dots are ignored
 * (only the last segment is inspected).
 */
export const trailingMediaFormat = (publicId: string): string | undefined => {
	const lastSegment = publicId.slice(publicId.lastIndexOf('/') + 1);
	const dot = lastSegment.lastIndexOf('.');
	if (dot <= 0 || dot === lastSegment.length - 1) {
		return undefined;
	}
	const ext = lastSegment.slice(dot + 1).toLowerCase();
	return MEDIA_FORMAT_EXTENSIONS.has(ext) ? ext : undefined;
};

/**
 * Delivery types whose public_id is a stored Cloudinary asset we own, so the format
 * is delivered as the URL's trailing extension (see the "doubled extension" note).
 * For `fetch` and social sources (facebook, twitter, gravatar, youtube, …) the
 * "public_id" is instead a remote URL or external profile ID whose trailing dotted
 * segment is part of the source itself — appending any extension there would corrupt
 * it (e.g. a fetch URL would be delivered as `.../fetch/https://example.com/photo.jpg.jpg`,
 * or a conversion as `.../fetch/f_webp/https://example.com/photo.webp`). So the format
 * suffix is gated to this set; other types carry conversion only via the transformation
 * (e.g. `f_webp`) and pass their identifier through untouched.
 */
const STORED_ASSET_TYPES = new Set(['upload', 'private', 'authenticated']);
