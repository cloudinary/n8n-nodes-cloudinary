import { INodeProperties } from 'n8n-workflow';

// Widget resource — Cloudinary embeds/widgets that build a URL with no API call
// (the "third flow" — see CLAUDE.md). The Video Player op emits an iframe embed URL
// and a self-hosted `player_config` JSON. The shared Public ID + Type identity fields
// live in transform.fields.ts (gated on resource:['transform','widget']) so they are
// not duplicated here.
//
// UI shape: a few essentials stay top-level (Transformation, Source Types); everything
// else is grouped into purpose-named, collapsed `collection` fields — Playback,
// Size & Layout, Appearance, AI-Generated Content, Player Features — so the form stays
// approachable instead of a flat wall of 19 controls. n8n collections can only gate
// their inner fields on OTHER fields in the SAME collection, so co-dependent controls
// (Fluid→Width/Height, Aspect Ratio→Crop Mode, Generate Captions→Label/Languages) are
// deliberately kept together. videoPlayer.ts reads each collection as one object.

const SHOW = { show: { resource: ['widget'], operation: ['videoPlayer'] } };

export const widgetFields: INodeProperties[] = [
	// ── Essentials (top-level) ──────────────────────────────────────────────────
	{
		displayName: 'Transformation',
		name: 'playerTransformation',
		type: 'string',
		default: '',
		placeholder: 'e.g. c_fill,w_640,h_360/e_blur:500',
		description: 'Cloudinary transformation string applied to the played video stream — in both the iframe embed URL and the player_config output. Use video-capable transforms (resize/crop, trim, e_blur, e_fade, vc_, etc.). Image-only effects such as e_grayscale are silently ignored on video, so they have no visible effect here; the poster image is a separate source and is not affected by this field. See the video effects reference: https://cloudinary.com/documentation/video_effects_and_enhancements.',
		displayOptions: SHOW,
	},
	{
		displayName: 'Poster',
		name: 'playerPoster',
		type: 'string',
		default: '',
		description: 'URL of the still image shown before playback starts. Leave empty to use a frame from the video. Tip: wire in a Video: Thumbnail step\'s secure_url to use a specific frame.',
		displayOptions: SHOW,
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
		description: 'The video formats the player can request, in fallback order (the player picks the first one the viewer\'s browser supports). Leave empty to let the player choose automatically. Tip: HLS and MPEG-DASH are adaptive streaming — for the smoothest playback, pick one of those plus MP4 as a fallback. Note: HLS/MPEG-DASH cannot be combined with a Transformation that pins a format (an f_ component such as f_auto:video, e.g. from an Optimize step) — keep the Transformation to resize/crop/trim only when using them.',
		displayOptions: SHOW,
	},

	// ── Playback ──────────────────────────────────────────────────────────────
	{
		displayName: 'Playback',
		name: 'playerPlayback',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		description: 'How and when the video plays',
		displayOptions: SHOW,
		// Ordered by relevance (autoplay/sound/loop first), not alphabetically.
		// eslint-disable-next-line n8n-nodes-base/node-param-collection-type-unsorted-items
		options: [
			{
				displayName: 'Autoplay Mode',
				name: 'autoplayMode',
				type: 'options',
				options: [
					{ name: 'Never', value: '', description: 'Do not autoplay (player default)' },
					{ name: 'Always', value: 'always', description: 'Autoplay as soon as the player loads' },
					{ name: 'On Scroll', value: 'on-scroll', description: 'Autoplay when the player scrolls into view' },
				],
				default: '',
				description: 'When the video should start playing automatically. Most browsers require the player to be muted for autoplay to work.',
			},
			{
				displayName: 'Muted',
				name: 'muted',
				type: 'boolean',
				default: false,
				description: 'Whether the player starts muted',
			},
			{
				displayName: 'Loop',
				name: 'loop',
				type: 'boolean',
				default: false,
				description: 'Whether the video restarts from the beginning when it ends',
			},
			{
				displayName: 'Plays Inline',
				name: 'playsinline',
				type: 'boolean',
				default: false,
				description: 'Whether to prevent the player from entering fullscreen automatically on iOS when playback starts',
			},
			{
				displayName: 'Show Controls',
				name: 'controls',
				type: 'boolean',
				default: true,
				description: 'Whether to show the built-in playback controls (play, pause, volume, fullscreen, etc.)',
			},
			{
				displayName: 'Big Play Button',
				name: 'bigPlayButton',
				type: 'boolean',
				default: true,
				description: 'Whether to show a larger central play button when the video is paused',
			},
		],
	},

	// ── Size & Layout ───────────────────────────────────────────────────────────
	{
		displayName: 'Size & Layout',
		name: 'playerLayout',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		description: 'The player\'s dimensions and shape',
		displayOptions: SHOW,
		// Ordered Fluid → Width/Height → Aspect Ratio → Crop Mode so the dependent
		// fields read top-down; not alphabetized.
		// eslint-disable-next-line n8n-nodes-base/node-param-collection-type-unsorted-items
		options: [
			{
				displayName: 'Fluid',
				name: 'fluid',
				type: 'boolean',
				default: false,
				description: 'Whether the player resizes responsively to fill its container. When on, Width and Height are replaced by an aspect-ratio CSS style.',
			},
			{
				displayName: 'Width',
				name: 'width',
				type: 'number',
				default: 0,
				description: 'Player width in pixels. Leave 0 for the default (640 px).',
				displayOptions: { show: { fluid: [false] } },
			},
			{
				displayName: 'Height',
				name: 'height',
				type: 'number',
				default: 0,
				description: 'Player height in pixels. Leave 0 for the default (360 px).',
				displayOptions: { show: { fluid: [false] } },
			},
			{
				displayName: 'Aspect Ratio',
				name: 'aspectRatio',
				type: 'options',
				options: [
					{ name: '1:1', value: '1:1' },
					{ name: '16:9', value: '16:9' },
					{ name: '9:16', value: '9:16' },
					{ name: 'Default', value: '' },
				],
				default: '',
				description: 'Player aspect ratio. Leave unset to use the video\'s natural dimensions.',
			},
			{
				displayName: 'Crop Mode',
				name: 'cropMode',
				type: 'options',
				options: [
					{ name: 'Smart', value: 'smart', description: 'Keep the most important content in view (player default)' },
					{ name: 'Fill', value: 'fill', description: 'Cover the frame, cropping as needed' },
					{ name: 'Pad', value: 'pad', description: 'Fit the whole video within the frame and add padding' },
				],
				default: 'smart',
				description: 'How the player resizes the video to the chosen Aspect Ratio. Only relevant when Aspect Ratio is set (applies to progressive delivery, not adaptive streaming). If your Transformation already crops the video to a shape, applying an Aspect Ratio here crops it a second time — leave Aspect Ratio unset to keep just your transformation\'s framing. See https://cloudinary.com/documentation/video_player_customization.',
				displayOptions: { show: { aspectRatio: ['1:1', '16:9', '9:16'] } },
			},
		],
	},

	// ── AI-Generated Content (the flagship capability) ───────────────────────────
	{
		displayName: 'AI-Generated Content',
		name: 'playerAiOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		description:
			'Have the Cloudinary Video Player generate captions, a title, a description, and chapter markers from the video using AI — no files to author. Generation happens the first time the content is requested in the browser, only for content that does not already exist, and the result is cached. It requires the video audio to contain dialogue. These options affect the generated player config, not the preview embed URL. Learn more: https://cloudinary.com/documentation/video_player_customization.',
		displayOptions: SHOW,
		// Ordered for readability, not alphabetized: the captions toggle leads, with its
		// dependent Label and translation Languages grouped right under it, then the
		// title/description toggles, then chapters + its dependent button.
		// eslint-disable-next-line n8n-nodes-base/node-param-collection-type-unsorted-items
		options: [
			{
				displayName: 'Generate Captions',
				name: 'generateCaptions',
				type: 'boolean',
				default: false,
				description:
					'Whether to auto-generate captions from the spoken audio, shown as a track the viewer can toggle on or off. The captions are in the video\'s original spoken language — to also offer captions translated into other languages, use Subtitle Languages below.',
			},
			{
				displayName: 'Captions Label',
				name: 'captionsLabel',
				type: 'string',
				default: 'English (auto)',
				description:
					'The name shown for the auto-generated captions track in the player\'s captions menu. Set this to match the video\'s spoken language (e.g. "English", "Español").',
				displayOptions: { show: { generateCaptions: [true] } },
			},
			{
				displayName: 'Subtitle Languages',
				name: 'subtitleLanguages',
				type: 'string',
				default: '',
				placeholder: 'e.g. es, fr-FR, de',
				description:
					'Optional. Leave empty for captions in the original language only. To also offer the captions translated into other languages, enter target language codes separated by commas — each adds a translated subtitle track the viewer can pick. Translation requires the Google Translate add-on on your account (register at https://console.cloudinary.com/settings/addons, then enable it under Settings → Security → Unsigned add-on transformations). Captions in the original language need no add-on.',
				displayOptions: { show: { generateCaptions: [true] } },
			},
			{
				displayName: 'Generate Title',
				name: 'generateTitle',
				type: 'boolean',
				default: false,
				description: 'Whether to show an AI-generated title for the video in the player',
			},
			{
				displayName: 'Generate Description',
				name: 'generateDescription',
				type: 'boolean',
				default: false,
				description: 'Whether to show an AI-generated description for the video in the player',
			},
			{
				displayName: 'Generate Chapters',
				name: 'generateChapters',
				type: 'boolean',
				default: false,
				description:
					'Whether to auto-generate chapter markers so viewers can jump between sections of the video',
			},
			{
				displayName: 'Show Chapters Button',
				name: 'chaptersButton',
				type: 'boolean',
				default: true,
				description:
					'Whether to show the chapters button in the player, which opens the list of chapters so viewers can navigate. Shown only when Generate Chapters is on; turn off to keep the chapters available without surfacing the button.',
				displayOptions: { show: { generateChapters: [true] } },
			},
		],
	},

	// ── Appearance ────────────────────────────────────────────────────────────
	{
		displayName: 'Appearance',
		name: 'playerAppearance',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		description: 'The player\'s theme, colors, and font',
		displayOptions: SHOW,
		// Skin first (it sets the baseline), then the color/font overrides; not alphabetized.
		// eslint-disable-next-line n8n-nodes-base/node-param-collection-type-unsorted-items
		options: [
			{
				displayName: 'Skin',
				name: 'skin',
				type: 'options',
				options: [
					{ name: 'Dark', value: 'dark' },
					{ name: 'Light', value: 'light' },
				],
				default: 'dark',
				description: 'Player theme',
			},
			{
				displayName: 'Base Color',
				name: 'baseColor',
				type: 'color',
				default: '',
				description: 'Player base (background) color, as a hex value',
			},
			{
				displayName: 'Accent Color',
				name: 'accentColor',
				type: 'color',
				default: '',
				description: 'Player accent (highlight) color, as a hex value',
			},
			{
				displayName: 'Text Color',
				name: 'textColor',
				type: 'color',
				default: '',
				description: 'Player text color, as a hex value',
			},
			{
				displayName: 'Font Face',
				name: 'fontFace',
				type: 'string',
				default: '',
				description: 'The font applied to player text elements (titles, descriptions, recommendations, time counter). Accepts a Google Font name.',
			},
		],
	},

	// ── Player Features (niche UI toggles) ───────────────────────────────────────
	{
		displayName: 'Player Features',
		name: 'playerFeatures',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		description: 'Optional interface controls and capabilities to switch on',
		displayOptions: SHOW,
		options: [
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
				displayName: 'Seek Thumbnails',
				name: 'seekThumbnails',
				type: 'boolean',
				default: true,
				description: 'Whether to show thumbnail previews when seeking with the seek bar',
			},
		],
	},
];
