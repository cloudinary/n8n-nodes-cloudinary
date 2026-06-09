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
	cropMode: string;
	skin: string;
	baseColor: string;
	accentColor: string;
	textColor: string;
	fontFace: string;
	advanced: IDataObject;
	ai: IDataObject;
}

export const videoPlayer: OperationHandler = async (ctx, i, creds) => {
	const { publicId, deliveryType } = readTransformInput(ctx, i);

	// Controls are grouped into purpose-named collections in the UI (see widget.fields.ts).
	// Read each collection once, then pull values with defaults. `playback` and `features`
	// are merged into a single `advanced` bag because buildEmbedUrl/buildPlayerConfig key
	// off the same toggle names regardless of which UI group they now live in.
	const playback = ctx.getNodeParameter('playerPlayback', i, {}) as IDataObject;
	const layout = ctx.getNodeParameter('playerLayout', i, {}) as IDataObject;
	const appearance = ctx.getNodeParameter('playerAppearance', i, {}) as IDataObject;
	const features = ctx.getNodeParameter('playerFeatures', i, {}) as IDataObject;
	const ai = ctx.getNodeParameter('playerAiOptions', i, {}) as IDataObject;
	const num = (v: unknown, d: number): number => (v === undefined ? d : Number(v) || 0);

	const p: PlayerParams = {
		publicId,
		deliveryType,
		autoplayMode: (playback.autoplayMode as string) ?? '',
		loop: (playback.loop as boolean) ?? false,
		muted: (playback.muted as boolean) ?? false,
		sourceTypes: ctx.getNodeParameter('playerSourceTypes', i, []) as string[],
		poster: ctx.getNodeParameter('playerPoster', i, '') as string,
		transformation: ctx.getNodeParameter('playerTransformation', i, '') as string,
		fluid: (layout.fluid as boolean) ?? false,
		width: num(layout.width, 0),
		height: num(layout.height, 0),
		aspectRatio: (layout.aspectRatio as string) ?? '',
		cropMode: (layout.cropMode as string) ?? 'smart',
		skin: (appearance.skin as string) ?? 'dark',
		baseColor: (appearance.baseColor as string) ?? '',
		accentColor: (appearance.accentColor as string) ?? '',
		textColor: (appearance.textColor as string) ?? '',
		fontFace: (appearance.fontFace as string) ?? '',
		// buildEmbedUrl/buildPlayerConfig read controls/playsinline/bigPlayButton (Playback)
		// alongside pictureInPictureToggle/seekThumbnails/hdr/floating (Features). The chapters
		// button lives in the AI group (gated on Generate Chapters) since it has no purpose
		// without a chapters source, so it's read from `ai` below.
		advanced: {
			controls: playback.controls,
			playsinline: playback.playsinline,
			bigPlayButton: playback.bigPlayButton,
			pictureInPictureToggle: features.pictureInPictureToggle,
			chaptersButton: ai.generateChapters ? ai.chaptersButton : undefined,
			seekThumbnails: features.seekThumbnails,
			hdr: features.hdr,
			floatingWhenNotVisible: features.floatingWhenNotVisible,
		},
		ai,
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

	// Fail fast on the aspect-ratio smart-crop vs source-transformation conflict. When an
	// Aspect Ratio is set, the player merges its own crop into the source transformation
	// (per the Video Player docs: "if you define transformations for both the source and
	// the player, the transformation definitions get merged"). The default Smart crop adds
	// an auto-gravity component, and the merge places it incorrectly — the player rejects it
	// with "g_auto must be in a transformation component by itself". Fill/Pad crop without
	// auto-gravity, so they merge cleanly; only Smart (the default) breaks.
	if (p.aspectRatio && p.cropMode === 'smart' && p.transformation) {
		throw new NodeOperationError(
			ctx.getNode(),
			`The player crops to the "${p.aspectRatio}" Aspect Ratio using the default Smart crop, and that gets merged into your Transformation in a way Cloudinary rejects ("g_auto must be in a transformation component by itself"). Either set Crop Mode to Fill or Pad (they crop without the smart gravity that conflicts), or clear the Aspect Ratio and let your Transformation define the framing.`,
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
	// cropMode is a source-level option that only takes effect alongside aspectRatio, and
	// `smart` is the player's own default — emit only when an aspect ratio is set and the
	// user picked a non-default mode, so default URLs stay clean (cf. skin/autoplayMode).
	if (p.aspectRatio && p.cropMode && p.cropMode !== 'smart') {
		q.push(`source[cropMode]=${enc(p.cropMode)}`);
	}
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
	if (p.aspectRatio && p.cropMode && p.cropMode !== 'smart') cfg.cropMode = p.cropMode;
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

	// On-demand AI generation — emitted into player_config only (these are JS player.source()
	// options, not iframe URL params). The player generates each only if it doesn't already
	// exist, returning a 202 while it works. See the customization docs.
	const ai = p.ai;
	if (ai.generateTitle) cfg.title = true;
	if (ai.generateDescription) cfg.description = true;
	if (ai.generateChapters) cfg.chapters = true;
	if (ai.generateCaptions) {
		const textTracks: IDataObject = {
			// No `url` → the player auto-generates the transcript for captions.
			captions: { label: String(ai.captionsLabel || 'English (auto)'), default: true },
		};
		// Each language code becomes an auto-translated subtitle track (no `url`). Translation
		// requires the Google Translate add-on — see the field description and docs.
		const langs = String(ai.subtitleLanguages || '')
			.split(',')
			.map((l) => l.trim())
			.filter(Boolean);
		if (langs.length) {
			textTracks.subtitles = langs.map((language) => ({ label: language, language }));
		}
		cfg.textTracks = textTracks;
	}

	return cfg;
}

const enc = (v: string) => encodeURIComponent(v);
