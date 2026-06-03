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
		const { ctx } = makeCtx({ params: { transformPublicId: 'v', playerAutoplayMode: 'always' } });
		const [out] = await videoPlayer(ctx, 0, testCreds);
		expect(out.embed_url).toContain('player[autoplayMode]=always');
	});

	it('omits autoplayMode from embed_url when blank', async () => {
		const { ctx } = makeCtx({ params: { transformPublicId: 'v', playerAutoplayMode: '' } });
		const [out] = await videoPlayer(ctx, 0, testCreds);
		expect(out.embed_url).not.toContain('player[autoplayMode]');
	});

	it('includes muted and loop flags in embed_url', async () => {
		const { ctx } = makeCtx({ params: { transformPublicId: 'v', playerMuted: true, playerLoop: true } });
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
				playerBaseColor: '#0071ba',
				playerAccentColor: '#db8226',
				playerTextColor: '#ffffff',
			},
		});
		const [out] = await videoPlayer(ctx, 0, testCreds);
		expect(out.embed_url).toContain('player[colors][base]=%230071ba');
		expect(out.embed_url).toContain('player[colors][accent]=%23db8226');
		expect(out.embed_url).toContain('player[colors][text]=%23ffffff');
	});

	it('omits transformation from embed_url', async () => {
		const { ctx } = makeCtx({ params: { transformPublicId: 'v', playerTransformation: 'q_auto,f_auto' } });
		const [out] = await videoPlayer(ctx, 0, testCreds);
		expect(out.embed_url).not.toContain('transformation');
	});

	it('includes transformation in player_config as raw_transformation array', async () => {
		const { ctx } = makeCtx({ params: { transformPublicId: 'v', playerTransformation: 'q_auto,f_auto' } });
		const [out] = await videoPlayer(ctx, 0, testCreds);
		const cfg = JSON.parse(out.player_config as string);
		expect(cfg.transformation).toEqual([{ raw_transformation: 'q_auto,f_auto' }]);
	});

	it('includes player[skin]=light for light skin, omits for default dark', async () => {
		const { ctx: ctxLight } = makeCtx({ params: { transformPublicId: 'v', playerSkin: 'light' } });
		const [outLight] = await videoPlayer(ctxLight, 0, testCreds);
		expect(outLight.embed_url).toContain('player[skin]=light');

		const { ctx: ctxDark } = makeCtx({ params: { transformPublicId: 'v', playerSkin: 'dark' } });
		const [outDark] = await videoPlayer(ctxDark, 0, testCreds);
		expect(outDark.embed_url).not.toContain('player[skin]');
	});

	it('includes player[fluid]=true when playerFluid is true', async () => {
		const { ctx } = makeCtx({ params: { transformPublicId: 'v', playerFluid: true } });
		const [out] = await videoPlayer(ctx, 0, testCreds);
		expect(out.embed_url).toContain('player[fluid]=true');
	});

	it('includes aspect ratio in embed_url, URL-encoded', async () => {
		const { ctx } = makeCtx({ params: { transformPublicId: 'v', playerFluid: true, playerAspectRatio: '9:16' } });
		const [out] = await videoPlayer(ctx, 0, testCreds);
		expect(out.embed_url).toContain('player[aspectRatio]=9%3A16');
	});

	it('includes width and height in embed_url', async () => {
		const { ctx } = makeCtx({ params: { transformPublicId: 'v', playerWidth: 800, playerHeight: 450 } });
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
			params: { transformPublicId: 'v', playerBaseColor: '#0071ba', playerAccentColor: '#db8226' },
		});
		const [out] = await videoPlayer(ctx, 0, testCreds);
		const cfg = JSON.parse(out.player_config as string);
		expect(cfg.colors).toEqual({ base: '#0071ba', accent: '#db8226' });
	});

	it('includes advanced controls=false in embed_url and player_config', async () => {
		const { ctx } = makeCtx({
			params: { transformPublicId: 'v', playerAdvancedOptions: { controls: false } },
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
});
