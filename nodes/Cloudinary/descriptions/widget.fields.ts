import { INodeProperties } from 'n8n-workflow';

// Widget resource — Cloudinary embeds/widgets that build a URL with no API call
// (the "third flow" — see CLAUDE.md). The Video Player op emits an iframe embed URL
// and a self-hosted `player_config` JSON. The shared Public ID + Type identity fields
// live in transform.fields.ts (gated on resource:['transform','widget']) so they are
// not duplicated here.

export const widgetFields: INodeProperties[] = [
	{
		displayName: 'Autoplay Mode',
		name: 'playerAutoplayMode',
		type: 'options',
		options: [
			{ name: 'Never', value: '', description: 'Do not autoplay (player default)' },
			{ name: 'Always', value: 'always', description: 'Autoplay as soon as the player loads' },
			{ name: 'On Scroll', value: 'on-scroll', description: 'Autoplay when the player scrolls into view' },
		],
		default: '',
		description: 'When the video should start playing automatically. Most browsers require the player to be muted for autoplay to work.',
		displayOptions: {
			show: { resource: ['widget'], operation: ['videoPlayer'] },
		},
	},
	{
		displayName: 'Muted',
		name: 'playerMuted',
		type: 'boolean',
		default: false,
		description: 'Whether the player starts muted',
		displayOptions: {
			show: { resource: ['widget'], operation: ['videoPlayer'] },
		},
	},
	{
		displayName: 'Loop',
		name: 'playerLoop',
		type: 'boolean',
		default: false,
		description: 'Whether the video restarts from the beginning when it ends',
		displayOptions: {
			show: { resource: ['widget'], operation: ['videoPlayer'] },
		},
	},
	{
		displayName: 'Source Types',
		name: 'playerSourceTypes',
		type: 'multiOptions',
		options: [
			{ name: 'Auto', value: 'auto', description: 'Let the player pick the best available format' },
			{ name: 'HLS', value: 'hls', description: 'HTTP Live Streaming (adaptive bitrate)' },
			{ name: 'MP4', value: 'mp4', description: 'Progressive MP4' },
			{ name: 'MPEG-DASH', value: 'dash', description: 'Dynamic Adaptive Streaming over HTTP' },
			{ name: 'Ogg', value: 'ogg', description: 'Progressive Ogg' },
			{ name: 'WebM', value: 'webm', description: 'Progressive WebM' },
		],
		default: [],
		description: 'Preferred delivery formats in fallback order. Leave empty to use the player\'s default format selection.',
		displayOptions: {
			show: { resource: ['widget'], operation: ['videoPlayer'] },
		},
	},
	{
		displayName: 'Poster',
		name: 'playerPoster',
		type: 'string',
		default: '',
		description: 'URL of the still image shown before playback starts. Leave empty to use a frame from the video.',
		displayOptions: {
			show: { resource: ['widget'], operation: ['videoPlayer'] },
		},
	},
	{
		displayName: 'Transformation',
		name: 'playerTransformation',
		type: 'string',
		default: '',
		description: 'Cloudinary transformation string applied to the video source in the self-hosted player (player_config output). Note: not included in the iframe embed URL — the Cloudinary player iframe does not support video-level transformations via URL parameters.',
		displayOptions: {
			show: { resource: ['widget'], operation: ['videoPlayer'] },
		},
	},
	{
		displayName: 'Fluid',
		name: 'playerFluid',
		type: 'boolean',
		default: false,
		description: 'Whether the player resizes responsively to fill its container. When on, Width and Height are replaced by an aspect-ratio CSS style.',
		displayOptions: {
			show: { resource: ['widget'], operation: ['videoPlayer'] },
		},
	},
	{
		displayName: 'Width',
		name: 'playerWidth',
		type: 'number',
		default: 0,
		description: 'Player width in pixels. Leave 0 for the default (640 px).',
		displayOptions: {
			show: { resource: ['widget'], operation: ['videoPlayer'], playerFluid: [false] },
		},
	},
	{
		displayName: 'Height',
		name: 'playerHeight',
		type: 'number',
		default: 0,
		description: 'Player height in pixels. Leave 0 for the default (360 px).',
		displayOptions: {
			show: { resource: ['widget'], operation: ['videoPlayer'], playerFluid: [false] },
		},
	},
	{
		displayName: 'Aspect Ratio',
		name: 'playerAspectRatio',
		type: 'options',
		options: [
			{ name: '1:1', value: '1:1' },
			{ name: '16:9', value: '16:9' },
			{ name: '9:16', value: '9:16' },
			{ name: 'Default', value: '' },
		],
		default: '',
		description: 'Player aspect ratio. Leave unset to use the video\'s natural dimensions.',
		displayOptions: {
			show: { resource: ['widget'], operation: ['videoPlayer'] },
		},
	},
	{
		displayName: 'Skin',
		name: 'playerSkin',
		type: 'options',
		options: [
			{ name: 'Dark', value: 'dark' },
			{ name: 'Light', value: 'light' },
		],
		default: 'dark',
		description: 'Player theme',
		displayOptions: {
			show: { resource: ['widget'], operation: ['videoPlayer'] },
		},
	},
	{
		displayName: 'Base Color',
		name: 'playerBaseColor',
		type: 'color',
		default: '',
		description: 'Player base (background) color, as a hex value',
		displayOptions: {
			show: { resource: ['widget'], operation: ['videoPlayer'] },
		},
	},
	{
		displayName: 'Accent Color',
		name: 'playerAccentColor',
		type: 'color',
		default: '',
		description: 'Player accent (highlight) color, as a hex value',
		displayOptions: {
			show: { resource: ['widget'], operation: ['videoPlayer'] },
		},
	},
	{
		displayName: 'Text Color',
		name: 'playerTextColor',
		type: 'color',
		default: '',
		description: 'Player text color, as a hex value',
		displayOptions: {
			show: { resource: ['widget'], operation: ['videoPlayer'] },
		},
	},
	{
		displayName: 'Font Face',
		name: 'playerFontFace',
		type: 'string',
		default: '',
		description: 'The font applied to player text elements (titles, descriptions, recommendations, time counter). Accepts a Google Font name.',
		displayOptions: {
			show: { resource: ['widget'], operation: ['videoPlayer'] },
		},
	},
	{
		displayName: 'Advanced Player Options',
		name: 'playerAdvancedOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: { resource: ['widget'], operation: ['videoPlayer'] },
		},
		options: [
			{
				displayName: 'Big Play Button',
				name: 'bigPlayButton',
				type: 'boolean',
				default: true,
				description: 'Whether to show a larger central play button when the video is paused',
			},
			{
				displayName: 'Chapters Button',
				name: 'chaptersButton',
				type: 'boolean',
				default: false,
				description: 'Whether to show the chapters button, which opens a list of chapters',
			},
			{
				displayName: 'Floating When Not Visible',
				name: 'floatingWhenNotVisible',
				type: 'options',
				options: [
					{ name: 'Disabled', value: 'disabled' },
					{ name: 'Left', value: 'left' },
					{ name: 'Right', value: 'right' },
				],
				default: 'disabled',
				description: 'Whether the player should float into a mini-player corner when scrolled out of view',
			},
			{
				displayName: 'HDR',
				name: 'hdr',
				type: 'boolean',
				default: false,
				description: 'Whether to deliver HDR video when the viewer\'s device and browser support it',
			},
			{
				displayName: 'Picture In Picture Toggle',
				name: 'pictureInPictureToggle',
				type: 'boolean',
				default: false,
				description: 'Whether to show the picture-in-picture toggle, letting users view the video in a floating window',
			},
			{
				displayName: 'Plays Inline',
				name: 'playsinline',
				type: 'boolean',
				default: false,
				description: 'Whether to prevent the player from entering fullscreen automatically on iOS when playback starts',
			},
			{
				displayName: 'Seek Thumbnails',
				name: 'seekThumbnails',
				type: 'boolean',
				default: true,
				description: 'Whether to show thumbnail previews when seeking with the seek bar',
			},
			{
				displayName: 'Show Controls',
				name: 'controls',
				type: 'boolean',
				default: true,
				description: 'Whether to show the built-in playback controls (play, pause, volume, fullscreen, etc.)',
			},
		],
	},
];
