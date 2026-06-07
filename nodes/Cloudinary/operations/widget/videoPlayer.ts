import { IDataObject, NodeOperationError } from 'n8n-workflow';
import { OperationHandler } from '../types';
import { readTransformInput } from '../transform/shared';

/** Source types that deliver adaptive bitrate streaming via a streaming profile. */
const ADAPTIVE_STREAMING_TYPES = new Set(['hls', 'dash']);

/**
 * A transformation "pins a format" if it carries an explicit format selector (`f_`,
 * e.g. `f_auto:video` or `f_mp4`). Such a component forces a single progressive
 * (non-streaming) format, which is incompatible with the streaming profile an HLS/DASH
 * source type implies — Cloudinary rejects the combination with "Streaming profile not
 * supported for non-streaming formats". We scan per `/`-component so an `f_` qualifier
 * isn't missed when chained with others (e.g. `f_auto:video,vc_auto`).
 */
const pinsFormat = (transformation: string): boolean =>
	transformation
		.split('/')
		.some((component) => component.split(',').some((q) => /^f_/.test(q.trim())));

interface PlayerParams {
	publicId: string;
	deliveryType: string;
	autoplayMode: string;
	loop: boolean;
	muted: boolean;
	sourceTypes: string[];
	poster: string;
	transformation: string;
	fluid: boolean;
	width: number;
	height: number;
	aspectRatio: string;
	skin: string;
	baseColor: string;
	accentColor: string;
	textColor: string;
	fontFace: string;
	advanced: IDataObject;
}

export const videoPlayer: OperationHandler = async (ctx, i, creds) => {
	const { publicId, deliveryType } = readTransformInput(ctx, i);
	const p: PlayerParams = {
		publicId,
		deliveryType,
		autoplayMode: ctx.getNodeParameter('playerAutoplayMode', i, '') as string,
		loop: ctx.getNodeParameter('playerLoop', i, false) as boolean,
		muted: ctx.getNodeParameter('playerMuted', i, false) as boolean,
		sourceTypes: ctx.getNodeParameter('playerSourceTypes', i, []) as string[],
		poster: ctx.getNodeParameter('playerPoster', i, '') as string,
		transformation: ctx.getNodeParameter('playerTransformation', i, '') as string,
		fluid: ctx.getNodeParameter('playerFluid', i, false) as boolean,
		width: ctx.getNodeParameter('playerWidth', i, 0) as number,
		height: ctx.getNodeParameter('playerHeight', i, 0) as number,
		aspectRatio: ctx.getNodeParameter('playerAspectRatio', i, '') as string,
		skin: ctx.getNodeParameter('playerSkin', i, 'dark') as string,
		baseColor: ctx.getNodeParameter('playerBaseColor', i, '') as string,
		accentColor: ctx.getNodeParameter('playerAccentColor', i, '') as string,
		textColor: ctx.getNodeParameter('playerTextColor', i, '') as string,
		fontFace: ctx.getNodeParameter('playerFontFace', i, '') as string,
		advanced: ctx.getNodeParameter('playerAdvancedOptions', i, {}) as IDataObject,
	};

	// Fail fast on the streaming-profile vs format-selection conflict: an HLS/DASH source
	// type delivers via a streaming profile, which can't be combined with a transformation
	// that pins a progressive format (e.g. an Optimize step's `f_auto:video`). Left to the
	// player this surfaces as a cryptic in-browser "Streaming profile not supported for
	// non-streaming formats" error; catching it here points at the actual cause.
	const streamingType = p.sourceTypes.find((t) => ADAPTIVE_STREAMING_TYPES.has(t));
	if (streamingType && pinsFormat(p.transformation)) {
		throw new NodeOperationError(
			ctx.getNode(),
			`The transformation pins a delivery format (an "f_" component, e.g. f_auto:video), which is incompatible with the "${streamingType}" adaptive-streaming source type — Cloudinary rejects a streaming profile for a non-streaming format. Either remove the format selection from the transformation (e.g. drop the Optimize step) or remove "${streamingType}" from Source Types.`,
			{ itemIndex: i },
		);
	}

	const embedUrl = buildEmbedUrl(creds.cloudName, p);

	return [
		{
			embed_url: embedUrl,
			player_config: JSON.stringify(buildPlayerConfig(creds.cloudName, p), null, 2),
			public_id: publicId,
			resource_type: 'video',
			type: deliveryType,
		},
	];
};

// player[...] keys use camelCase, matching the embed-page examples in the Video
// Player docs. The embedder accepts snake_case equivalents too (verified in-browser:
// player[aspectRatio] and player[aspect_ratio] behave identically), so don't "fix"
// these to snake_case — both work and camelCase mirrors the documented examples.
function buildEmbedUrl(cloudName: string, p: PlayerParams): string {
	const q: string[] = [
		`cloud_name=${enc(cloudName)}`,
		`public_id=${enc(p.publicId)}`,
	];

	if (p.autoplayMode) q.push(`player[autoplayMode]=${enc(p.autoplayMode)}`);
	if (p.loop) q.push('player[loop]=true');
	if (p.muted) q.push('player[muted]=true');
	if (p.fluid) q.push('player[fluid]=true');
	if (p.width) q.push(`player[width]=${p.width}`);
	if (p.height) q.push(`player[height]=${p.height}`);
	if (p.aspectRatio) q.push(`player[aspectRatio]=${enc(p.aspectRatio)}`);
	if (p.skin && p.skin !== 'dark') q.push(`player[skin]=${enc(p.skin)}`);
	if (p.baseColor) q.push(`player[colors][base]=${enc(p.baseColor)}`);
	if (p.accentColor) q.push(`player[colors][accent]=${enc(p.accentColor)}`);
	if (p.textColor) q.push(`player[colors][text]=${enc(p.textColor)}`);
	if (p.fontFace) q.push(`player[fontFace]=${enc(p.fontFace)}`);

	p.sourceTypes.forEach((st, idx) => q.push(`source[sourceTypes][${idx}]=${enc(st)}`));

	if (p.poster) q.push(`source[poster]=${enc(p.poster)}`);

	// Apply the transformation to the VIDEO STREAM. The embed page parses the query
	// with `qs` into a nested object and hands the video config's `transformation` to
	// `new cloudinary.Transformation(obj)`, which takes a structured object — a raw
	// transformation string must therefore go under the `raw_transformation` key, NOT
	// as a bare `source[transformation]=<string>` value (verified against the embed
	// source in cloudinary-video-player-iframe + base-source.js, and in-browser: the
	// `raw_transformation` form blurs/crops the playing stream, the flat form is ignored).
	if (p.transformation) {
		q.push(`source[transformation][raw_transformation]=${enc(p.transformation)}`);
	}

	const adv = p.advanced;
	if (adv.controls === false) q.push('player[controls]=false');
	if (adv.playsinline) q.push('player[playsinline]=true');
	if (adv.bigPlayButton === false) q.push('player[bigPlayButton]=false');
	if (adv.pictureInPictureToggle) q.push('player[pictureInPictureToggle]=true');
	if (adv.chaptersButton) q.push('player[chaptersButton]=true');
	if (adv.seekThumbnails === false) q.push('player[seekThumbnails]=false');
	if (adv.hdr) q.push('player[hdr]=true');
	if (adv.floatingWhenNotVisible && adv.floatingWhenNotVisible !== 'disabled') {
		q.push(`player[floatingWhenNotVisible]=${enc(String(adv.floatingWhenNotVisible))}`);
	}

	return `https://player.cloudinary.com/embed/?${q.join('&')}`;
}

function buildPlayerConfig(cloudName: string, p: PlayerParams): IDataObject {
	const cfg: IDataObject = { cloudName, publicId: p.publicId };

	if (p.deliveryType && p.deliveryType !== 'upload') cfg.type = p.deliveryType;
	if (p.autoplayMode) cfg.autoplayMode = p.autoplayMode;
	if (p.loop) cfg.loop = true;
	if (p.muted) cfg.muted = true;
	if (p.fluid) cfg.fluid = true;
	if (p.width) cfg.width = p.width;
	if (p.height) cfg.height = p.height;
	if (p.aspectRatio) cfg.aspectRatio = p.aspectRatio;
	if (p.skin && p.skin !== 'dark') cfg.skin = p.skin;

	const colors: IDataObject = {};
	if (p.baseColor) colors.base = p.baseColor;
	if (p.accentColor) colors.accent = p.accentColor;
	if (p.textColor) colors.text = p.textColor;
	if (Object.keys(colors).length) cfg.colors = colors;

	if (p.fontFace) cfg.fontFace = p.fontFace;
	if (p.sourceTypes.length) cfg.sourceTypes = p.sourceTypes;
	if (p.poster) cfg.poster = p.poster;
	if (p.transformation) cfg.transformation = [{ raw_transformation: p.transformation }];

	const adv = p.advanced;
	if (adv.controls === false) cfg.controls = false;
	if (adv.playsinline) cfg.playsinline = true;
	if (adv.bigPlayButton === false) cfg.bigPlayButton = false;
	if (adv.pictureInPictureToggle) cfg.pictureInPictureToggle = true;
	if (adv.chaptersButton) cfg.chaptersButton = true;
	if (adv.seekThumbnails === false) cfg.seekThumbnails = false;
	if (adv.hdr) cfg.hdr = true;
	if (adv.floatingWhenNotVisible && adv.floatingWhenNotVisible !== 'disabled') {
		cfg.floatingWhenNotVisible = adv.floatingWhenNotVisible;
	}

	return cfg;
}

const enc = (v: string) => encodeURIComponent(v);
