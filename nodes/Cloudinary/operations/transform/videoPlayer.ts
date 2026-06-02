import { IDataObject } from 'n8n-workflow';
import { OperationHandler } from '../types';
import { readTransformInput } from './shared';

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

	// source[transformation] intentionally omitted: in the embed URL it applies to the
	// poster image only, not the video stream, so it would be misleading here.

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
