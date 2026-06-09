# Cloudinary node

Use the Cloudinary node to automate work in Cloudinary, and integrate Cloudinary with other applications. n8n has built-in support for a wide range of Cloudinary features, including uploading assets, managing tags, and updating metadata.

On this page, you'll find a list of operations the Cloudinary node supports.

## Operations

* Asset
	* Upload from URL/file
	* Update asset tags
	* Update asset metadata fields
	* Get tags
	* Get structured metadata definitions
	* Search assets
* Transform (builds a delivery URL — no API call)
	* Image: Optimize, Resize, Crop, Convert
	* Video: Optimize, Resize, Crop, Trim, Thumbnail
	* Custom Transformation (raw transformation string)
	* Compose: Combine Transformations (multi-step, in one node)
* Widget
	* Video Player (builds an embed URL + player config)

### Search assets

Uses the [Cloudinary Search API](https://cloudinary.com/documentation/search_api) to find assets by tag, folder, metadata, or any supported expression (e.g. `tags=cat AND uploaded_at>1d`, `folder:products/*`, `tags="back to school"`).

The node emits **one n8n item per matching asset**, so downstream nodes can map over results directly without a Split Out step.

- **Resource Types** — Cloudinary's Search API defaults to image-only when no `resource_type:` clause is in the expression. This node injects the clause automatically based on the Resource Types you select (defaults to `image`). To search across all types, select all three. If your expression already contains a `resource_type:` clause, the selection is ignored.
- **Return All** — when enabled, the node automatically paginates through Cloudinary's `next_cursor` until all matching assets have been returned. When disabled, only the first page (up to *Max Results*, capped at 500) is returned.
- **Rate limits** — the node surfaces `429`/`420` responses with a clear "rate limit exceeded" error including the server's `Retry-After`.
- **Eventual consistency** — newly uploaded assets may take a few seconds to appear in search results. Avoid searching for something you just uploaded in the same workflow without a delay.

### Transformations and chaining

A **transformation** is the instruction string Cloudinary applies when delivering an asset — for example `c_fill,w_400` (crop to 400px wide) or `f_auto/q_auto` (auto format and quality). Each Transform operation builds one and returns it on the output as **`transformation`**, alongside the finished `secure_url`.

Real edits usually need several transformations applied in sequence ("first crop, then optimize"). In Cloudinary's URL these are **components joined with `/`**, applied left to right — each acts on the output of the one before it. For example `c_fill,w_400/f_auto/q_auto` means *crop, then auto-format, then auto-quality*. There are three ways to build a chain with this node, from simplest to most flexible:

1. **One operation.** A single Transform op (e.g. *Image: Resize*) when one step is all you need.

2. **Combine Transformations (one node).** The *Compose → Combine Transformations* operation takes an ordered, reorderable list of steps and chains them inside a single node. Best when the whole recipe is known up front and lives in one place.

3. **Continue From Transformation (across nodes).** Every chainable Transform op has an optional **Continue From Transformation** field. This is the bridge that makes chaining work across separate nodes, and it relies on one property mapping:

   > The upstream op's **`transformation`** output → the downstream op's **Continue From Transformation** input.

   Wire it with an expression: set *Continue From Transformation* to `{{ $json.transformation }}`. The node prepends that incoming string before the current op's own transformation, so the two compound into one delivery URL. Example — a *Resize* node outputs `transformation: "c_fill,w_400"`; feed it into an *Optimize* node's *Continue From Transformation*, and the Optimize node delivers `c_fill,w_400/f_auto/q_auto`.

   This field is available on all single-purpose Transform ops. It is intentionally **not** offered on *Custom Transformation* (you already control the entire string there) or *Combine Transformations* (which chains its own steps internally).

**Tip:** *Resize* and *Crop* don't auto-optimize. To also get `f_auto/q_auto`, either add an *Optimize* step in *Combine Transformations*, or chain an *Optimize* node after them via *Continue From Transformation*.

### Video Player (Widget)

The *Widget → Video Player* operation builds a [Cloudinary Video Player](https://cloudinary.com/documentation/video_player_quickstart_guide) embed URL plus a player config. Its **Transformation** field applies to the **played video stream** (it accepts the same `transformation` string the Transform ops emit, so you can wire `{{ $json.transformation }}` here too). A few constraints worth knowing:

- **Use video-capable transforms.** Image-only effects (e.g. `e_grayscale`) are silently ignored on video and have no visible effect. See [video effects](https://cloudinary.com/documentation/video_effects_and_enhancements).
- **Adaptive streaming vs. format selection.** If you select an adaptive-streaming **Source Type** (HLS or MPEG-DASH), the transformation must **not** pin a delivery format (an `f_` component such as `f_auto:video`, which an *Optimize* step adds). The two are incompatible — Cloudinary can't apply a streaming profile to a fixed non-streaming format. The node detects this and fails with a clear message; for adaptive streaming, keep the transformation to resize/crop/trim only.
- **Aspect Ratio crops on top of your Transformation.** Setting an **Aspect Ratio** makes the player re-crop the video to those proportions using the **Crop Mode** field (*Smart*, *Fill*, or *Pad* — default *Smart*). With the default *Smart* mode, that re-crop can't be combined with a Transformation that already crops the video, and the player rejects it. The node fails fast with a clear message; to render either set *Crop Mode* to *Fill* or *Pad*, or clear *Aspect Ratio* and let your Transformation define the framing.

#### AI-generated content (captions, title, description, chapters)

The **AI-Generated Content** options let the player generate content on demand — no caption files to author. Toggle **Generate Captions** (auto-transcript shown as toggleable captions), **Generate Title**, **Generate Description**, and/or **Generate Chapters**. The player only generates what doesn't already exist, and transcript generation needs the video's audio to contain dialogue. These options are emitted into the `player_config` (the JS `player.source()` config), not the iframe embed URL. On most accounts these are **enabled by default** under *Settings → Security → Unsigned actions allowed* — so there's nothing to switch on. See the [Video Player customization docs](https://cloudinary.com/documentation/video_player_customization).

> **Translated subtitles need the Google Translate add-on.** The **Subtitle Languages** field (e.g. `es, fr-FR`) produces AI-*translated* subtitle tracks, which require the **Google Translate** add-on on your account. To enable it:
> 1. **Register for the add-on** on the [Cloudinary Add-ons page](https://console.cloudinary.com/settings/addons) (Console → *Settings → Add-ons*) — the free tier is enough to try it.
> 2. Allow it as an unsigned transformation: **Console → *Settings → Security*** → *Unsigned add-on transformations allowed* → enable **Google Translate**.
>
> Base captions (the *Generate Captions* toggle, single language) need **no** add-on — only translation into other languages does.

## Supported authentication methods

- API key & API secret

## Authentication 
### Using API key

To configure this credential, you'll need a [Cloudinary Account](https://cloudinary.com/users/register_free) and:

- A **Cloud name**
- An **API Key**
- An **API Secret**

If you're a user with a Master admin, Admin, or Technical admin role, you can find your API keys and other credentials on the API Keys page of the Cloudinary Console Settings:

1. Navigate to the API Keys pages in the [settings page](https://console.cloudinary.com/settings/api-keys).
2. Click on **+ Generate New API Key**.
3. Copy the API Key and API Secret.
4. From the top of the page copy the **Cloud name**.
5. Enter the cloud name, api key and api secret to your n8n credential.

#### Private CDN / custom delivery hostname (advanced)

Most users can skip this. If your organization is on a **Advanced plan** that uses a [private CDN distribution or a custom delivery hostname (CNAME)](https://cloudinary.com/documentation/advanced_url_delivery_options#private_cdns_and_custom_delivery_hostnames_cnames), enable **Private CDN** in the credential and enter your **Custom Delivery Hostname** so the node builds delivery URLs against your private distribution instead of the default `res.cloudinary.com`. Leave these off if you're unsure — they don't apply to standard accounts.


## Related resources

Refer to [Cloudinary's documentation](https://cloudinary.com/documentation/programmable_media_guides) for more information on this service.

