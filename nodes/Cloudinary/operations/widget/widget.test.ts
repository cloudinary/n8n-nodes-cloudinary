import { describe, it, expect } from 'vitest';
import { videoPlayer } from './videoPlayer';
import { makeCtx, testCreds } from '../testHelpers';

// videoPlayer builds an iframe embed URL + a self-hosted player_config JSON and makes
// NO HTTP call, so tests assert the returned JSON, not a request spy. makeCtx supplies
// the only surface the handler touches (getNodeParameter + getNode).

const HOST = 'https://res.cloudinary.com/demo';

describe('widget:videoPlayer', () => {
	it('returns embed_url, player_config, and identity fields', async () => {
		const { ctx } = makeCtx({ params: { transformPublicId: 'my-video' } });
		const [out] = await videoPlayer(ctx, 0, testCreds);
		expect(out.embed_url).toContain('cloud_name=demo');
		expect(out.embed_url).toContain('public_id=my-video');
		expect(typeof out.player_config).toBe('string');
		expect(out.public_id).toBe('my-video');
		expect(out.resource_type).toBe('video');
		expect(out.type).toBe('upload');
	});

	it('includes autoplayMode in embed_url when set', async () => {
		const { ctx } = makeCtx({ params: { transformPublicId: 'v', playerPlayback: { autoplayMode: 'always' } } });
		const [out] = await videoPlayer(ctx, 0, testCreds);
		expect(out.embed_url).toContain('player[autoplayMode]=always');
	});

	it('omits autoplayMode from embed_url when blank', async () => {
		const { ctx } = makeCtx({ params: { transformPublicId: 'v', playerPlayback: { autoplayMode: '' } } });
		const [out] = await videoPlayer(ctx, 0, testCreds);
		expect(out.embed_url).not.toContain('player[autoplayMode]');
	});

	it('includes muted and loop flags in embed_url', async () => {
		const { ctx } = makeCtx({ params: { transformPublicId: 'v', playerPlayback: { muted: true, loop: true } } });
		const [out] = await videoPlayer(ctx, 0, testCreds);
		expect(out.embed_url).toContain('player[muted]=true');
		expect(out.embed_url).toContain('player[loop]=true');
	});

	it('includes source types as indexed source[sourceTypes] params', async () => {
		const { ctx } = makeCtx({ params: { transformPublicId: 'v', playerSourceTypes: ['hls', 'mp4'] } });
		const [out] = await videoPlayer(ctx, 0, testCreds);
		expect(out.embed_url).toContain('source[sourceTypes][0]=hls');
		expect(out.embed_url).toContain('source[sourceTypes][1]=mp4');
	});

	it('includes colors in embed_url, URL-encoded', async () => {
		const { ctx } = makeCtx({
			params: {
				transformPublicId: 'v',
				playerAppearance: { baseColor: '#0071ba', accentColor: '#db8226', textColor: '#ffffff' },
			},
		});
		const [out] = await videoPlayer(ctx, 0, testCreds);
		expect(out.embed_url).toContain('player[colors][base]=%230071ba');
		expect(out.embed_url).toContain('player[colors][accent]=%23db8226');
		expect(out.embed_url).toContain('player[colors][text]=%23ffffff');
	});

	it('applies transformation to the video stream via source[transformation][raw_transformation]', async () => {
		// The embed page feeds the value to new cloudinary.Transformation(obj), so a raw
		// string must ride under raw_transformation to reach the video stream (a flat
		// source[transformation]=<string> is ignored). Verified in-browser with e_blur:1000.
		const { ctx } = makeCtx({
			params: { transformPublicId: 'v', playerTransformation: 'c_fill,w_400/f_auto' },
		});
		const [out] = await videoPlayer(ctx, 0, testCreds);
		expect(out.embed_url).toContain(
			`source[transformation][raw_transformation]=${encodeURIComponent('c_fill,w_400/f_auto')}`,
		);
	});

	it('omits source[transformation] from embed_url when transformation is blank', async () => {
		const { ctx } = makeCtx({ params: { transformPublicId: 'v' } });
		const [out] = await videoPlayer(ctx, 0, testCreds);
		expect(out.embed_url).not.toContain('source[transformation]');
	});

	it('throws when a format-pinning transformation is combined with an HLS source type', async () => {
		const { ctx } = makeCtx({
			params: {
				transformPublicId: 'samples/elephants',
				playerSourceTypes: ['hls', 'mp4'],
				playerTransformation: 'f_auto:video/q_auto/c_fill,ar_9:16,w_768',
			},
		});
		await expect(videoPlayer(ctx, 0, testCreds)).rejects.toThrow(/streaming profile|adaptive-streaming/i);
	});

	it('throws for a DASH source type too, naming the offending source type', async () => {
		const { ctx } = makeCtx({
			params: {
				transformPublicId: 'v',
				playerSourceTypes: ['dash'],
				playerTransformation: 'f_webm/c_scale,w_640',
			},
		});
		await expect(videoPlayer(ctx, 0, testCreds)).rejects.toThrow(/dash/i);
	});

	it('allows crop/trim transforms with HLS (no format pinned)', async () => {
		const { ctx } = makeCtx({
			params: {
				transformPublicId: 'v',
				playerSourceTypes: ['hls'],
				playerTransformation: 'c_fill,ar_9:16,w_768/so_5,eo_30',
			},
		});
		const [out] = await videoPlayer(ctx, 0, testCreds);
		expect(out.embed_url).toContain('source[sourceTypes][0]=hls');
		expect(out.embed_url).toContain(
			`source[transformation][raw_transformation]=${encodeURIComponent('c_fill,ar_9:16,w_768/so_5,eo_30')}`,
		);
	});

	it('allows a format-pinning transform with only progressive source types', async () => {
		const { ctx } = makeCtx({
			params: {
				transformPublicId: 'v',
				playerSourceTypes: ['mp4', 'webm'],
				playerTransformation: 'f_auto:video/q_auto',
			},
		});
		const [out] = await videoPlayer(ctx, 0, testCreds);
		expect(out.embed_url).toContain(
			`source[transformation][raw_transformation]=${encodeURIComponent('f_auto:video/q_auto')}`,
		);
	});

	it('includes transformation in player_config as raw_transformation array', async () => {
		const { ctx } = makeCtx({ params: { transformPublicId: 'v', playerTransformation: 'q_auto,f_auto' } });
		const [out] = await videoPlayer(ctx, 0, testCreds);
		const cfg = JSON.parse(out.player_config as string);
		expect(cfg.transformation).toEqual([{ raw_transformation: 'q_auto,f_auto' }]);
	});

	it('includes player[skin]=light for light skin, omits for default dark', async () => {
		const { ctx: ctxLight } = makeCtx({ params: { transformPublicId: 'v', playerAppearance: { skin: 'light' } } });
		const [outLight] = await videoPlayer(ctxLight, 0, testCreds);
		expect(outLight.embed_url).toContain('player[skin]=light');

		const { ctx: ctxDark } = makeCtx({ params: { transformPublicId: 'v', playerAppearance: { skin: 'dark' } } });
		const [outDark] = await videoPlayer(ctxDark, 0, testCreds);
		expect(outDark.embed_url).not.toContain('player[skin]');
	});

	it('includes player[fluid]=true when playerFluid is true', async () => {
		const { ctx } = makeCtx({ params: { transformPublicId: 'v', playerLayout: { fluid: true } } });
		const [out] = await videoPlayer(ctx, 0, testCreds);
		expect(out.embed_url).toContain('player[fluid]=true');
	});

	it('includes aspect ratio in embed_url, URL-encoded', async () => {
		const { ctx } = makeCtx({ params: { transformPublicId: 'v', playerLayout: { fluid: true, aspectRatio: '9:16' } } });
		const [out] = await videoPlayer(ctx, 0, testCreds);
		expect(out.embed_url).toContain('player[aspectRatio]=9%3A16');
	});

	it('throws when an aspect ratio + default smart crop is combined with a transformation', async () => {
		// The player merges its smart-crop gravity into the source transformation, which
		// Cloudinary rejects ("g_auto must be in a transformation component by itself").
		const { ctx } = makeCtx({
			params: {
				transformPublicId: 'samples/elephants',
				playerLayout: { aspectRatio: '9:16' },
				playerTransformation: 'f_auto:video/q_auto/so_5,eo_30',
			},
		});
		await expect(videoPlayer(ctx, 0, testCreds)).rejects.toThrow(/component by itself|Crop Mode/i);
	});

	it('does not throw for aspect ratio + transformation when Crop Mode is Fill', async () => {
		const { ctx } = makeCtx({
			params: {
				transformPublicId: 'v',
				playerLayout: { aspectRatio: '9:16', cropMode: 'fill' },
				playerTransformation: 'f_auto:video/q_auto/so_5,eo_30',
			},
		});
		const [out] = await videoPlayer(ctx, 0, testCreds);
		expect(out.embed_url).toContain('source[cropMode]=fill');
	});

	it('does not throw for an aspect ratio with no transformation (smart crop alone is fine)', async () => {
		const { ctx } = makeCtx({ params: { transformPublicId: 'v', playerLayout: { aspectRatio: '9:16' } } });
		const [out] = await videoPlayer(ctx, 0, testCreds);
		expect(out.embed_url).toContain('player[aspectRatio]=9%3A16');
	});

	it('does not throw for a transformation with no aspect ratio', async () => {
		const { ctx } = makeCtx({
			params: { transformPublicId: 'v', playerTransformation: 'f_auto:video/q_auto/so_5,eo_30' },
		});
		const [out] = await videoPlayer(ctx, 0, testCreds);
		expect(out.embed_url).toContain('source[transformation][raw_transformation]');
	});

	it('includes source[cropMode] in embed_url for a non-default mode with an aspect ratio', async () => {
		const { ctx } = makeCtx({
			params: { transformPublicId: 'v', playerLayout: { aspectRatio: '16:9', cropMode: 'fill' } },
		});
		const [out] = await videoPlayer(ctx, 0, testCreds);
		expect(out.embed_url).toContain('source[cropMode]=fill');
		const cfg = JSON.parse(out.player_config as string);
		expect(cfg.cropMode).toBe('fill');
	});

	it('omits cropMode when it is the default smart mode', async () => {
		const { ctx } = makeCtx({
			params: { transformPublicId: 'v', playerLayout: { aspectRatio: '16:9', cropMode: 'smart' } },
		});
		const [out] = await videoPlayer(ctx, 0, testCreds);
		expect(out.embed_url).not.toContain('cropMode');
		const cfg = JSON.parse(out.player_config as string);
		expect(cfg.cropMode).toBeUndefined();
	});

	it('omits cropMode when no aspect ratio is set, even if a mode is chosen', async () => {
		// cropMode only takes effect alongside aspectRatio, so it would be inert without one.
		const { ctx } = makeCtx({
			params: { transformPublicId: 'v', playerLayout: { aspectRatio: '', cropMode: 'pad' } },
		});
		const [out] = await videoPlayer(ctx, 0, testCreds);
		expect(out.embed_url).not.toContain('cropMode');
		const cfg = JSON.parse(out.player_config as string);
		expect(cfg.cropMode).toBeUndefined();
	});

	it('includes width and height in embed_url', async () => {
		const { ctx } = makeCtx({ params: { transformPublicId: 'v', playerLayout: { width: 800, height: 450 } } });
		const [out] = await videoPlayer(ctx, 0, testCreds);
		expect(out.embed_url).toContain('player[width]=800');
		expect(out.embed_url).toContain('player[height]=450');
	});

	it('player_config is valid JSON with cloudName and publicId', async () => {
		const { ctx } = makeCtx({ params: { transformPublicId: 'my-video' } });
		const [out] = await videoPlayer(ctx, 0, testCreds);
		const cfg = JSON.parse(out.player_config as string);
		expect(cfg.cloudName).toBe('demo');
		expect(cfg.publicId).toBe('my-video');
	});

	it('player_config includes colors object for set color fields', async () => {
		const { ctx } = makeCtx({
			params: { transformPublicId: 'v', playerAppearance: { baseColor: '#0071ba', accentColor: '#db8226' } },
		});
		const [out] = await videoPlayer(ctx, 0, testCreds);
		const cfg = JSON.parse(out.player_config as string);
		expect(cfg.colors).toEqual({ base: '#0071ba', accent: '#db8226' });
	});

	it('includes controls=false (Playback) in embed_url and player_config', async () => {
		const { ctx } = makeCtx({
			params: { transformPublicId: 'v', playerPlayback: { controls: false } },
		});
		const [out] = await videoPlayer(ctx, 0, testCreds);
		expect(out.embed_url).toContain('player[controls]=false');
		const cfg = JSON.parse(out.player_config as string);
		expect(cfg.controls).toBe(false);
	});

	it('includes non-upload delivery type in player_config but not embed_url', async () => {
		const { ctx } = makeCtx({ params: { transformPublicId: 'v', type: 'authenticated' } });
		const [out] = await videoPlayer(ctx, 0, testCreds);
		const cfg = JSON.parse(out.player_config as string);
		expect(cfg.type).toBe('authenticated');
		expect(out.embed_url).not.toContain('authenticated');
	});

	it('includes poster in embed_url as source[poster] and in player_config', async () => {
		const posterUrl = `${HOST}/video/upload/so_auto/clip.jpg`;
		const { ctx } = makeCtx({ params: { transformPublicId: 'v', playerPoster: posterUrl } });
		const [out] = await videoPlayer(ctx, 0, testCreds);
		expect(out.embed_url).toContain(`source[poster]=${encodeURIComponent(posterUrl)}`);
		const cfg = JSON.parse(out.player_config as string);
		expect(cfg.poster).toBe(posterUrl);
	});

	it('omits source[poster] from embed_url when poster is blank', async () => {
		const { ctx } = makeCtx({ params: { transformPublicId: 'v', playerPoster: '' } });
		const [out] = await videoPlayer(ctx, 0, testCreds);
		expect(out.embed_url).not.toContain('source[poster]');
	});

	// ── AI-generated content (player_config only; never embed-URL params) ──────────
	it('emits AI captions as a textTracks.captions entry with no url', async () => {
		const { ctx } = makeCtx({
			params: { transformPublicId: 'v', playerAiOptions: { generateCaptions: true } },
		});
		const [out] = await videoPlayer(ctx, 0, testCreds);
		const cfg = JSON.parse(out.player_config as string);
		expect(cfg.textTracks.captions).toEqual({ label: 'English (auto)', default: true });
		expect(cfg.textTracks.captions.url).toBeUndefined();
		// AI options are JS-config-only and must never leak into the embed URL.
		expect(out.embed_url).not.toContain('textTracks');
	});

	it('uses a custom captions label when provided', async () => {
		const { ctx } = makeCtx({
			params: {
				transformPublicId: 'v',
				playerAiOptions: { generateCaptions: true, captionsLabel: 'EN' },
			},
		});
		const [out] = await videoPlayer(ctx, 0, testCreds);
		const cfg = JSON.parse(out.player_config as string);
		expect(cfg.textTracks.captions.label).toBe('EN');
	});

	it('emits translated subtitle tracks for comma-separated language codes', async () => {
		const { ctx } = makeCtx({
			params: {
				transformPublicId: 'v',
				playerAiOptions: { generateCaptions: true, subtitleLanguages: 'es, fr-FR' },
			},
		});
		const [out] = await videoPlayer(ctx, 0, testCreds);
		const cfg = JSON.parse(out.player_config as string);
		expect(cfg.textTracks.subtitles).toEqual([
			{ label: 'es', language: 'es' },
			{ label: 'fr-FR', language: 'fr-FR' },
		]);
	});

	it('omits subtitles when no languages are given', async () => {
		const { ctx } = makeCtx({
			params: { transformPublicId: 'v', playerAiOptions: { generateCaptions: true } },
		});
		const [out] = await videoPlayer(ctx, 0, testCreds);
		const cfg = JSON.parse(out.player_config as string);
		expect(cfg.textTracks.subtitles).toBeUndefined();
	});

	it('emits title, description, and chapters flags when enabled', async () => {
		const { ctx } = makeCtx({
			params: {
				transformPublicId: 'v',
				playerAiOptions: { generateTitle: true, generateDescription: true, generateChapters: true },
			},
		});
		const [out] = await videoPlayer(ctx, 0, testCreds);
		const cfg = JSON.parse(out.player_config as string);
		expect(cfg.title).toBe(true);
		expect(cfg.description).toBe(true);
		expect(cfg.chapters).toBe(true);
	});

	it('emits no AI keys when the AI options are left empty', async () => {
		const { ctx } = makeCtx({ params: { transformPublicId: 'v' } });
		const [out] = await videoPlayer(ctx, 0, testCreds);
		const cfg = JSON.parse(out.player_config as string);
		expect(cfg.textTracks).toBeUndefined();
		expect(cfg.title).toBeUndefined();
		expect(cfg.description).toBeUndefined();
		expect(cfg.chapters).toBeUndefined();
		expect(cfg.chaptersButton).toBeUndefined();
	});

	it('shows the chapters button when chapters are generated (default on)', async () => {
		const { ctx } = makeCtx({
			params: { transformPublicId: 'v', playerAiOptions: { generateChapters: true, chaptersButton: true } },
		});
		const [out] = await videoPlayer(ctx, 0, testCreds);
		const cfg = JSON.parse(out.player_config as string);
		expect(cfg.chapters).toBe(true);
		expect(cfg.chaptersButton).toBe(true);
	});

	it('does not emit the chapters button without generated chapters', async () => {
		// The button is gated on Generate Chapters in the UI; the handler also guards it,
		// so a stray chaptersButton can't surface a button with no chapters source.
		const { ctx } = makeCtx({
			params: { transformPublicId: 'v', playerAiOptions: { chaptersButton: true } },
		});
		const [out] = await videoPlayer(ctx, 0, testCreds);
		const cfg = JSON.parse(out.player_config as string);
		expect(cfg.chapters).toBeUndefined();
		expect(cfg.chaptersButton).toBeUndefined();
	});
});
