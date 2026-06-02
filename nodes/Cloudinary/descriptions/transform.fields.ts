import { INodeProperties } from 'n8n-workflow';

// All Transform operations build a Cloudinary *delivery URL* and make no API call
// (the "third flow" — see CLAUDE.md). Fields are gated by resource:'transform' plus
// the operation. Field names mirror the Cloudinary API's response property names where
// one exists (`type`, matching the API's `type` and the existing asset/updateAsset
// fields). Transform-specific knobs that have no API counterpart use `transform`-/
// op-prefixed names to stay unambiguous.

const ALL_TRANSFORM_OPS = [
	'optimizeImage',
	'resizeImage',
	'cropImage',
	'convertImage',
	'optimizeVideo',
	'trimVideo',
	'videoThumbnail',
	'customTransformation',
	'multiStep',
	'videoPlayer',
];

// Delivery-URL ops only — excludes videoPlayer, which builds an embed URL (not a
// delivery URL) and has no use for the version/CDN-cache-bust Additional Option.
const DELIVERY_URL_OPS = ALL_TRANSFORM_OPS.filter((op) => op !== 'videoPlayer');

const QUALITY_OPTIONS = [
	{ name: 'Auto (Recommended)', value: 'auto', description: 'Let Cloudinary choose the best quality/size trade-off' },
	{ name: 'Auto - Best', value: 'best', description: 'Higher quality, larger files' },
	{ name: 'Auto - Good', value: 'good', description: 'Balanced quality' },
	{ name: 'Auto - Eco', value: 'eco', description: 'Smaller files, slightly lower quality' },
	{ name: 'Auto - Low', value: 'low', description: 'Smallest files, lowest quality' },
];

export const transformFields: INodeProperties[] = [
	// ── Shared identity (all transform operations) ───────────────────────────
	{
		displayName: 'Public ID',
		name: 'transformPublicId',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'folder/sample',
		description:
			'Public ID of the asset, including any folder path and without the file extension',
		displayOptions: {
			show: {
				resource: ['transform'],
				operation: ALL_TRANSFORM_OPS,
			},
		},
	},
	{
		displayName: 'Type',
		name: 'type',
		type: 'options',
		options: [
			{ name: 'Animoto', value: 'animoto' },
			{ name: 'Authenticated', value: 'authenticated' },
			{ name: 'Dailymotion', value: 'dailymotion' },
			{ name: 'Facebook', value: 'facebook' },
			{ name: 'Fetch (Remote URL)', value: 'fetch' },
			{ name: 'Gravatar', value: 'gravatar' },
			{ name: 'Hulu', value: 'hulu' },
			{ name: 'Private', value: 'private' },
			{ name: 'Twitter (by ID)', value: 'twitter' },
			{ name: 'Twitter (by Name)', value: 'twitter_name' },
			{ name: 'Upload (Public)', value: 'upload' },
			{ name: 'Vimeo', value: 'vimeo' },
			{ name: 'WorldStarHipHop', value: 'worldstarhiphop' },
			{ name: 'YouTube', value: 'youtube' },
		],
		default: 'upload',
		description: 'Cloudinary delivery type, which becomes the URL path segment (e.g. image/upload/sample, image/facebook/&lt;ID&gt;, video/fetch/&lt;URL&gt;). Note: private and authenticated assets — and, depending on your account settings, social profile sources (Facebook, Twitter, Gravatar) — require a signed URL, which is not supported yet.',
		displayOptions: {
			show: {
				resource: ['transform'],
				operation: ALL_TRANSFORM_OPS,
			},
		},
	},

	// ── Optimize Image ───────────────────────────────────────────────────────
	{
		displayName: 'Quality',
		name: 'imageQuality',
		type: 'options',
		options: QUALITY_OPTIONS,
		default: 'auto',
		description: 'Automatic quality level. Format is always auto-selected (f_auto).',
		displayOptions: {
			show: { resource: ['transform'], operation: ['optimizeImage'] },
		},
	},

	// ── Resize Image ─────────────────────────────────────────────────────────
	{
		displayName: 'Width',
		name: 'resizeWidth',
		type: 'number',
		default: 0,
		typeOptions: { minValue: 0 },
		description: 'Target width in pixels. Leave 0 to size by height only.',
		displayOptions: {
			show: { resource: ['transform'], operation: ['resizeImage'] },
		},
	},
	{
		displayName: 'Height',
		name: 'resizeHeight',
		type: 'number',
		default: 0,
		typeOptions: { minValue: 0 },
		description: 'Target height in pixels. Leave 0 to size by width only.',
		displayOptions: {
			show: { resource: ['transform'], operation: ['resizeImage'] },
		},
	},
	{
		displayName: 'Fit',
		name: 'resizeFit',
		type: 'options',
		options: [
			{ name: 'Limit (Never Upscale)', value: 'limit', description: 'Resize down to fit within the dimensions; never enlarges' },
			{ name: 'Fit (Fit Within)', value: 'fit', description: 'Fit within the dimensions, may enlarge, keeps full image' },
			{ name: 'Scale (Exact)', value: 'scale', description: 'Force exact dimensions; may distort if both are set' },
		],
		default: 'limit',
		description: 'How the image is fitted to the requested dimensions',
		displayOptions: {
			show: { resource: ['transform'], operation: ['resizeImage'] },
		},
	},

	// ── Crop Image ───────────────────────────────────────────────────────────
	{
		displayName: 'Crop By',
		name: 'cropBy',
		type: 'options',
		options: [
			{ name: 'Dimensions', value: 'dimensions', description: 'Crop to an exact width and height' },
			{ name: 'Aspect Ratio', value: 'aspectRatio', description: 'Crop to an aspect ratio (e.g. 16:9)' },
		],
		default: 'dimensions',
		displayOptions: {
			show: { resource: ['transform'], operation: ['cropImage'] },
		},
	},
	{
		displayName: 'Width',
		name: 'cropWidth',
		type: 'number',
		default: 0,
		typeOptions: { minValue: 0 },
		description: 'Target width in pixels',
		displayOptions: {
			show: { resource: ['transform'], operation: ['cropImage'], cropBy: ['dimensions'] },
		},
	},
	{
		displayName: 'Height',
		name: 'cropHeight',
		type: 'number',
		default: 0,
		typeOptions: { minValue: 0 },
		description: 'Target height in pixels',
		displayOptions: {
			show: { resource: ['transform'], operation: ['cropImage'], cropBy: ['dimensions'] },
		},
	},
	{
		displayName: 'Aspect Ratio',
		name: 'cropAspectRatio',
		type: 'string',
		default: '',
		placeholder: '16:9',
		description: 'Aspect ratio as width:height (e.g. 16:9) or a decimal (e.g. 1.5).',
		displayOptions: {
			show: { resource: ['transform'], operation: ['cropImage'], cropBy: ['aspectRatio'] },
		},
	},
	{
		displayName: 'Width',
		name: 'cropAspectWidth',
		type: 'number',
		default: 0,
		typeOptions: { minValue: 0 },
		description: 'Optional target width in pixels; height is derived from the aspect ratio',
		displayOptions: {
			show: { resource: ['transform'], operation: ['cropImage'], cropBy: ['aspectRatio'] },
		},
	},
	{
		displayName: 'Focus',
		name: 'cropFocus',
		type: 'options',
		options: [
			{ name: 'Auto (Smart)', value: 'auto', description: 'Automatically detect the most important region' },
			{ name: 'Face', value: 'face', description: 'Center the crop on a detected face' },
			{ name: 'Center', value: 'center', description: 'Center the crop on the middle of the image' },
		],
		default: 'auto',
		description: 'Which part of the image to keep in focus when cropping',
		displayOptions: {
			show: { resource: ['transform'], operation: ['cropImage'] },
		},
	},
	{
		displayName: 'Generative Fill',
		name: 'cropGenerativeFill',
		type: 'boolean',
		default: false,
		description:
			'Whether to extend (pad) the image with AI-generated content to reach the target shape instead of cropping. This is a generative AI effect that costs extra transformation credits, applies to non-transparent images only, and may render asynchronously on first request.',
		displayOptions: {
			show: { resource: ['transform'], operation: ['cropImage'] },
		},
	},
	{
		displayName: 'Generative Fill Prompt',
		name: 'cropGenerativeFillPrompt',
		type: 'string',
		default: '',
		placeholder: 'a sandy beach',
		description: 'Optional text prompt guiding the generated fill content',
		displayOptions: {
			show: {
				resource: ['transform'],
				operation: ['cropImage'],
				cropGenerativeFill: [true],
			},
		},
	},

	// ── Convert Image ────────────────────────────────────────────────────────
	{
		displayName: 'Target Format',
		name: 'convertFormat',
		type: 'options',
		options: [
			{ name: 'AVIF', value: 'avif' },
			{ name: 'GIF', value: 'gif' },
			{ name: 'JPG', value: 'jpg' },
			{ name: 'PNG', value: 'png' },
			{ name: 'WebP', value: 'webp' },
		],
		default: 'webp',
		description: 'Format to convert the image to',
		displayOptions: {
			show: { resource: ['transform'], operation: ['convertImage'] },
		},
	},

	// ── Optimize Video ───────────────────────────────────────────────────────
	{
		displayName: 'Quality',
		name: 'videoQuality',
		type: 'options',
		options: QUALITY_OPTIONS,
		default: 'auto',
		description:
			'Automatic quality level. Format and codec are auto-selected for the requesting browser (f_auto:video).',
		displayOptions: {
			show: { resource: ['transform'], operation: ['optimizeVideo'] },
		},
	},

	// ── Trim Video ───────────────────────────────────────────────────────────
	{
		displayName: 'Start Offset',
		name: 'trimStart',
		type: 'string',
		default: '',
		placeholder: '2.5',
		description: 'Start time in seconds (e.g. 2.5). Maps to so_.',
		displayOptions: {
			show: { resource: ['transform'], operation: ['trimVideo'] },
		},
	},
	{
		displayName: 'End Offset',
		name: 'trimEnd',
		type: 'string',
		default: '',
		placeholder: '10',
		description: 'End time in seconds (e.g. 10). Maps to eo_.',
		displayOptions: {
			show: { resource: ['transform'], operation: ['trimVideo'] },
		},
	},
	{
		displayName: 'Duration',
		name: 'trimDuration',
		type: 'string',
		default: '',
		placeholder: '5',
		description: 'Clip duration in seconds (e.g. 5). Maps to du_. Any combination of start/end/duration is allowed.',
		displayOptions: {
			show: { resource: ['transform'], operation: ['trimVideo'] },
		},
	},

	// ── Video Thumbnail ──────────────────────────────────────────────────────
	{
		displayName: 'Frame',
		name: 'thumbnailFrameMode',
		type: 'options',
		options: [
			{ name: 'Auto', value: 'auto', description: 'Let Cloudinary pick a representative frame (so_auto)' },
			{ name: 'Specific Time', value: 'time', description: 'Grab the frame at a specific timestamp' },
		],
		default: 'auto',
		displayOptions: {
			show: { resource: ['transform'], operation: ['videoThumbnail'] },
		},
	},
	{
		displayName: 'Timestamp',
		name: 'thumbnailTimestamp',
		type: 'string',
		default: '',
		placeholder: '2.5',
		description: 'Timestamp in seconds to grab the frame from (e.g. 2.5)',
		displayOptions: {
			show: {
				resource: ['transform'],
				operation: ['videoThumbnail'],
				thumbnailFrameMode: ['time'],
			},
		},
	},
	{
		displayName: 'Image Format',
		name: 'thumbnailFormat',
		type: 'options',
		options: [
			{ name: 'JPG', value: 'jpg' },
			{ name: 'PNG', value: 'png' },
			{ name: 'WebP', value: 'webp' },
			{ name: 'GIF', value: 'gif' },
		],
		default: 'jpg',
		description: 'Format of the generated thumbnail image',
		displayOptions: {
			show: { resource: ['transform'], operation: ['videoThumbnail'] },
		},
	},
	{
		displayName: 'Base Transformation',
		name: 'thumbnailBaseTransformation',
		type: 'string',
		default: '',
		placeholder: 'c_fill,w_800,h_600',
		// `$json` is the n8n expression variable — correctly lowercase. The
		// miscased-json rule is a false positive here; its autofix would rewrite it
		// to `$JSON`, which is undefined in n8n and breaks the example. Keep lowercase.
		// eslint-disable-next-line n8n-nodes-base/node-param-description-miscased-json
		description: 'Cloudinary transformation string prepended before the frame selector. Use <code>{{ $json.transformation }}</code> to chain from a previous step. Accepts a raw transformation string (e.g. <code>c_fill,w_800,h_600</code>).',
		displayOptions: {
			show: { resource: ['transform'], operation: ['videoThumbnail'] },
		},
	},

	// ── Custom Transformation ────────────────────────────────────────────────
	{
		displayName: 'Resource Type',
		name: 'customResourceType',
		type: 'options',
		options: [
			{ name: 'Image', value: 'image' },
			{ name: 'Video', value: 'video' },
		],
		default: 'image',
		description: 'The type of asset the transformation targets',
		displayOptions: {
			show: { resource: ['transform'], operation: ['customTransformation'] },
		},
	},
	{
		displayName: 'Transformation',
		name: 'customTransformationString',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'c_fill,g_auto,w_400,h_300/f_auto/q_auto',
		description:
			'Raw Cloudinary transformation string, used verbatim. Components are separated by "/" and qualifiers within a component by ",".',
		displayOptions: {
			show: { resource: ['transform'], operation: ['customTransformation'] },
		},
	},
	{
		displayName: 'Format',
		name: 'customFormat',
		type: 'string',
		default: '',
		placeholder: 'jpg',
		description: 'Optional delivery format (file extension), without the leading dot',
		displayOptions: {
			show: { resource: ['transform'], operation: ['customTransformation'] },
		},
	},

	// ── Video Player ─────────────────────────────────────────────────────────
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
			show: { resource: ['transform'], operation: ['videoPlayer'] },
		},
	},
	{
		displayName: 'Muted',
		name: 'playerMuted',
		type: 'boolean',
		default: false,
		description: 'Whether the player starts muted',
		displayOptions: {
			show: { resource: ['transform'], operation: ['videoPlayer'] },
		},
	},
	{
		displayName: 'Loop',
		name: 'playerLoop',
		type: 'boolean',
		default: false,
		description: 'Whether the video restarts from the beginning when it ends',
		displayOptions: {
			show: { resource: ['transform'], operation: ['videoPlayer'] },
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
			show: { resource: ['transform'], operation: ['videoPlayer'] },
		},
	},
	{
		displayName: 'Poster',
		name: 'playerPoster',
		type: 'string',
		default: '',
		description: 'URL of the still image shown before playback starts. Leave empty to use a frame from the video.',
		displayOptions: {
			show: { resource: ['transform'], operation: ['videoPlayer'] },
		},
	},
	{
		displayName: 'Transformation',
		name: 'playerTransformation',
		type: 'string',
		default: '',
		description: 'Cloudinary transformation string applied to the video source in the self-hosted player (player_config output). Note: not included in the iframe embed URL — the Cloudinary player iframe does not support video-level transformations via URL parameters.',
		displayOptions: {
			show: { resource: ['transform'], operation: ['videoPlayer'] },
		},
	},
	{
		displayName: 'Fluid',
		name: 'playerFluid',
		type: 'boolean',
		default: false,
		description: 'Whether the player resizes responsively to fill its container. When on, Width and Height are replaced by an aspect-ratio CSS style.',
		displayOptions: {
			show: { resource: ['transform'], operation: ['videoPlayer'] },
		},
	},
	{
		displayName: 'Width',
		name: 'playerWidth',
		type: 'number',
		default: 0,
		description: 'Player width in pixels. Leave 0 for the default (640 px).',
		displayOptions: {
			show: { resource: ['transform'], operation: ['videoPlayer'], playerFluid: [false] },
		},
	},
	{
		displayName: 'Height',
		name: 'playerHeight',
		type: 'number',
		default: 0,
		description: 'Player height in pixels. Leave 0 for the default (360 px).',
		displayOptions: {
			show: { resource: ['transform'], operation: ['videoPlayer'], playerFluid: [false] },
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
			show: { resource: ['transform'], operation: ['videoPlayer'] },
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
			show: { resource: ['transform'], operation: ['videoPlayer'] },
		},
	},
	{
		displayName: 'Base Color',
		name: 'playerBaseColor',
		type: 'color',
		default: '',
		description: 'Player base (background) color, as a hex value',
		displayOptions: {
			show: { resource: ['transform'], operation: ['videoPlayer'] },
		},
	},
	{
		displayName: 'Accent Color',
		name: 'playerAccentColor',
		type: 'color',
		default: '',
		description: 'Player accent (highlight) color, as a hex value',
		displayOptions: {
			show: { resource: ['transform'], operation: ['videoPlayer'] },
		},
	},
	{
		displayName: 'Text Color',
		name: 'playerTextColor',
		type: 'color',
		default: '',
		description: 'Player text color, as a hex value',
		displayOptions: {
			show: { resource: ['transform'], operation: ['videoPlayer'] },
		},
	},
	{
		displayName: 'Font Face',
		name: 'playerFontFace',
		type: 'string',
		default: '',
		description: 'The font applied to player text elements (titles, descriptions, recommendations, time counter). Accepts a Google Font name.',
		displayOptions: {
			show: { resource: ['transform'], operation: ['videoPlayer'] },
		},
	},
	{
		displayName: 'Advanced Player Options',
		name: 'playerAdvancedOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: { resource: ['transform'], operation: ['videoPlayer'] },
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

	// ── Multi-Step Transformation ────────────────────────────────────────────
	{
		displayName: 'Resource Type',
		name: 'multiStepResourceType',
		type: 'options',
		options: [
			{ name: 'Image', value: 'image' },
			{ name: 'Video', value: 'video' },
		],
		default: 'image',
		description: 'The type of asset the steps target. Determines the URL path and whether Optimize emits f_auto or f_auto:video.',
		displayOptions: {
			show: { resource: ['transform'], operation: ['multiStep'] },
		},
	},
	{
		displayName: 'Steps',
		name: 'transformSteps',
		type: 'fixedCollection',
		placeholder: 'Add Step',
		typeOptions: { multipleValues: true, sortable: true },
		default: {},
		description:
			'Transformation steps applied in order. Each step becomes one chained Cloudinary component (drag to reorder).',
		displayOptions: {
			show: { resource: ['transform'], operation: ['multiStep'] },
		},
		options: [
			{
				displayName: 'Step',
				name: 'step',
				values: [
					{
						displayName: 'Action',
						name: 'stepType',
						type: 'options',
						options: [
							{
								name: 'Convert Format',
								value: 'convert',
								description: 'Set the delivery format (f_&lt;fmt&gt;\t+\textension)',
							},
							{
								name: 'Crop',
								value: 'crop',
								description: 'Crop to dimensions or an aspect ratio (c_fill)',
							},
							{
								name: 'Optimize',
								value: 'optimize',
								description: 'Auto format	+	quality (f_auto[:video ],q_auto)',
							},
							{
								name: 'Raw Component',
								value: 'raw',
								description: 'A verbatim transformation component',
							},
							{
								name: 'Resize',
								value: 'resize',
								description: 'Resize to a width and/or height (c_&lt;fit&gt;)',
							},
							{
								name: 'Trim (Video)',
								value: 'trim',
								description: 'Trim by start/end/duration (so_/eo_/du_)',
							},
					],
						default: 'optimize',
						description: 'The transformation this step applies',
					},
					{
						displayName: 'Aspect Ratio',
						name: 'aspectRatio',
						type: 'string',
						default: '',
						placeholder: '9:16',
						description: 'Aspect ratio as width:height (e.g. 9:16) or a decimal (e.g. 1.5).',
					},
					{
						displayName: 'Component',
						name: 'raw',
						type: 'string',
						default: '',
						placeholder: 'e_grayscale',
						description: 'A raw Cloudinary transformation component, used verbatim (qualifiers separated by commas)',
					},
					{
						displayName: 'Crop By',
						name: 'cropMode',
						type: 'options',
						options: [
							{
								name: 'Dimensions',
								value: 'dimensions',
							},
							{
								name: 'Aspect Ratio',
								value: 'aspectRatio',
							},
					],
						default: 'dimensions',
					},
					{
						displayName: 'Duration',
						name: 'duration',
						type: 'string',
						default: '',
						placeholder: '10',
						description: 'Clip duration in seconds (du_)',
					},
					{
						displayName: 'End Offset',
						name: 'end',
						type: 'string',
						default: '',
						placeholder: '15',
						description: 'End time in seconds (eo_)',
					},
					{
						displayName: 'Fit',
						name: 'fit',
						type: 'options',
						options: [
							{
								name: 'Limit (Never Upscale)',
								value: 'limit',
							},
							{
								name: 'Fit (Fit Within)',
								value: 'fit',
							},
							{
								name: 'Scale (Exact)',
								value: 'scale',
							},
					],
						default: 'limit',
						description: 'How the asset is fitted to the requested dimensions',
					},
					{
						displayName: 'Focus',
						name: 'focus',
						type: 'options',
						options: [
							{
								name: 'Auto (Smart)',
								value: 'auto',
							},
							{
								name: 'Face',
								value: 'face',
							},
							{
								name: 'Center',
								value: 'center',
							},
					],
						default: 'auto',
						description: 'Which region to keep when cropping (g_)',
					},
					{
						displayName: 'Height',
						name: 'height',
						type: 'number',
						default: 0,
						description: 'Target height in pixels. Leave 0 to size by width only.',
					},
					{
						displayName: 'Height',
						name: 'cropHeight',
						type: 'number',
						default: 0,
						description: 'Target height in pixels',
					},
					{
						displayName: 'Quality',
						name: 'quality',
						type: 'options',
						default: '',
						description: 'Automatic quality level (q_auto[:level])',
					},
					{
						displayName: 'Start Offset',
						name: 'start',
						type: 'string',
						default: '',
						placeholder: '0',
						description: 'Start time in seconds (so_)',
					},
					{
						displayName: 'Target Format',
						name: 'format',
						type: 'string',
						default: '',
						placeholder: 'webp',
						description: 'Delivery format (file extension), without the leading dot',
					},
					{
						displayName: 'Width',
						name: 'width',
						type: 'number',
						default: 0,
						description: 'Target width in pixels. Leave 0 to size by height only.',
					},
					{
						displayName: 'Width',
						name: 'cropWidth',
						type: 'number',
						default: 0,
						description: 'Target width in pixels',
					},
					{
						displayName: 'Width',
						name: 'cropAspectWidth',
						type: 'number',
						default: 0,
						description: 'Optional target width in pixels;	height is derived from the aspect ratio',
					},
			],
			},
		],
	},

	// ── Shared additional options (delivery-URL operations only) ────────────────
	{
		displayName: 'Additional Options',
		name: 'transformAdditionalOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: ['transform'],
				operation: DELIVERY_URL_OPS,
			},
		},
		options: [
			{
				displayName: 'Version',
				name: 'version',
				type: 'string',
				default: '',
				placeholder: '1234567890',
				description: 'Asset version, emitted as a v&lt;version&gt; segment to bust CDN caches',
			},
		],
	},
];
