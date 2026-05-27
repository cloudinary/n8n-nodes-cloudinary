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

### Search assets

Uses the [Cloudinary Search API](https://cloudinary.com/documentation/search_api) to find assets by tag, folder, metadata, or any supported expression (e.g. `tags=cat AND uploaded_at>1d`, `folder:products/*`, `tags="back to school"`).

The node emits **one n8n item per matching asset**, so downstream nodes can map over results directly without a Split Out step.

- **Resource Types** — Cloudinary's Search API defaults to image-only when no `resource_type:` clause is in the expression. This node injects the clause automatically based on the Resource Types you select (defaults to `image`). To search across all types, select all three. If your expression already contains a `resource_type:` clause, the selection is ignored.
- **Return All** — when enabled, the node automatically paginates through Cloudinary's `next_cursor` until all matching assets have been returned. When disabled, only the first page (up to *Max Results*, capped at 500) is returned.
- **Rate limits** — the node surfaces `429`/`420` responses with a clear "rate limit exceeded" error including the server's `Retry-After`.
- **Eventual consistency** — newly uploaded assets may take a few seconds to appear in search results. Avoid searching for something you just uploaded in the same workflow without a delay.

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


## Related resources

Refer to [Cloudinary's documentation](https://cloudinary.com/documentation/programmable_media_guides) for more information on this service.

