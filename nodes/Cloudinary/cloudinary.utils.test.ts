import { describe, it, expect } from 'vitest';
import type { IDataObject } from 'n8n-workflow';
import {
	buildSearchExpression,
	createMultipartBody,
	extractCloudinaryError,
	generateCloudinarySignature,
	metadataToPipeString,
	buildUploadUrl,
	buildResourceByAssetIdUrl,
	buildResourceDeleteUrl,
	buildResourceUpdateUrl,
	splitCsvIds,
} from './cloudinary.utils';

describe('buildSearchExpression', () => {
	it('returns input unchanged when all three resource types are selected', () => {
		expect(buildSearchExpression('tags=cat', ['image', 'video', 'raw'])).toBe('tags=cat');
	});

	it('returns input unchanged when resource types array is empty', () => {
		expect(buildSearchExpression('tags=cat', [])).toBe('tags=cat');
	});

	it('returns just the clause when input is empty and one resource type is selected', () => {
		expect(buildSearchExpression('', ['image'])).toBe('resource_type:image');
	});

	it('wraps the input and ANDs a single resource_type clause', () => {
		expect(buildSearchExpression('tags=cat', ['video'])).toBe(
			'(tags=cat) AND resource_type:video',
		);
	});

	it('builds an OR-grouped clause for two resource types', () => {
		expect(buildSearchExpression('tags=cat', ['image', 'video'])).toBe(
			'(tags=cat) AND resource_type:(image OR video)',
		);
	});

	it('skips injection when input already has a resource_type: clause', () => {
		expect(buildSearchExpression('resource_type:video AND tags=cat', ['image'])).toBe(
			'resource_type:video AND tags=cat',
		);
	});

	it('skips injection when input already has a resource_type= clause', () => {
		expect(buildSearchExpression('resource_type=raw', ['image'])).toBe('resource_type=raw');
	});

	it('detects resource_type clause case-insensitively', () => {
		expect(buildSearchExpression('Resource_Type:video', ['image'])).toBe('Resource_Type:video');
	});

	it('does not match resource_type as a substring of another field name', () => {
		expect(buildSearchExpression('my_resource_type_extra:foo', ['image'])).toBe(
			'(my_resource_type_extra:foo) AND resource_type:image',
		);
	});
});

// buildSearchExpression does NO syntax validation — it treats the expression as
// opaque text. Malformed input must pass through unchanged (or wrapped verbatim);
// rejecting/repairing it is the Cloudinary server's job, surfaced by the search
// handler's 400 "query error" branch. These guard against someone later adding
// naive validation or escaping here that would silently alter user queries.
describe('buildSearchExpression with malformed expressions', () => {
	it('does not throw on any broken expression', () => {
		for (const broken of ['(tags=cat', 'tags="open', 'tags=cat AND', 'tags=', 'AND OR ()']) {
			expect(() => buildSearchExpression(broken, ['image'])).not.toThrow();
		}
	});

	it('wraps an unbalanced-parenthesis expression verbatim and still appends the clause', () => {
		expect(buildSearchExpression('(tags=cat', ['image'])).toBe(
			'((tags=cat) AND resource_type:image',
		);
	});

	it('preserves an unclosed quote without escaping or closing it', () => {
		expect(buildSearchExpression('tags="back to school', ['video'])).toBe(
			'(tags="back to school) AND resource_type:video',
		);
	});

	it('preserves a trailing boolean operator', () => {
		expect(buildSearchExpression('tags=cat AND', ['image'])).toBe(
			'(tags=cat AND) AND resource_type:image',
		);
	});

	it('wraps an empty-value clause (tags=) rather than dropping it', () => {
		expect(buildSearchExpression('tags=', ['image'])).toBe('(tags=) AND resource_type:image');
	});

	it('passes a broken expression through unchanged when no clause is added (3 types)', () => {
		expect(buildSearchExpression('(tags=cat', ['image', 'video', 'raw'])).toBe('(tags=cat');
	});

	it('passes a broken expression through unchanged when no resource types are selected', () => {
		expect(buildSearchExpression('tags="open', [])).toBe('tags="open');
	});

	it('still skips clause injection when a broken expression contains a resource_type clause', () => {
		expect(buildSearchExpression('resource_type:video AND (tags=cat', ['image'])).toBe(
			'resource_type:video AND (tags=cat',
		);
	});
});

describe('extractCloudinaryError', () => {
	it('reads status from httpCode', () => {
		expect(extractCloudinaryError({ httpCode: 400 }).status).toBe(400);
	});

	it('reads status from statusCode when httpCode is missing', () => {
		expect(extractCloudinaryError({ statusCode: 420 }).status).toBe(420);
	});

	it('reads status from response.status when both above are missing', () => {
		expect(extractCloudinaryError({ response: { status: 429 } }).status).toBe(429);
	});

	it('returns undefined status when nothing provides it', () => {
		expect(extractCloudinaryError({}).status).toBeUndefined();
	});

	it('extracts cloudinaryMessage from response.body.error.message', () => {
		const err = { response: { body: { error: { message: 'Query Error (at position 54)' } } } };
		expect(extractCloudinaryError(err).cloudinaryMessage).toBe('Query Error (at position 54)');
	});

	it('falls back to response.data.error.message', () => {
		const err = { response: { data: { error: { message: 'Resource not found' } } } };
		expect(extractCloudinaryError(err).cloudinaryMessage).toBe('Resource not found');
	});

	it('uses x-cld-error header as last resort', () => {
		const err = { response: { headers: { 'x-cld-error': 'Invalid API key' } } };
		expect(extractCloudinaryError(err).cloudinaryMessage).toBe('Invalid API key');
	});

	it('prefers body.error.message over data.error.message and header', () => {
		const err = {
			response: {
				body: { error: { message: 'from body' } },
				data: { error: { message: 'from data' } },
				headers: { 'x-cld-error': 'from header' },
			},
		};
		expect(extractCloudinaryError(err).cloudinaryMessage).toBe('from body');
	});

	it('reads retry-after header (lowercase)', () => {
		const err = { response: { headers: { 'retry-after': '60' } } };
		expect(extractCloudinaryError(err).retryAfter).toBe('60');
	});

	it('reads Retry-After header (canonical case)', () => {
		const err = { response: { headers: { 'Retry-After': '120' } } };
		expect(extractCloudinaryError(err).retryAfter).toBe('120');
	});

	it('returns undefined retryAfter when header is absent', () => {
		expect(extractCloudinaryError({ response: { headers: {} } }).retryAfter).toBeUndefined();
	});

	it('returns undefined cloudinaryMessage when no known shape is present', () => {
		const err = { response: { body: { unrelated: 'data' } } };
		expect(extractCloudinaryError(err).cloudinaryMessage).toBeUndefined();
	});

	it('reads headers from cause.response.headers fallback', () => {
		const err = { cause: { response: { headers: { 'retry-after': '30' } } } };
		expect(extractCloudinaryError(err).retryAfter).toBe('30');
	});
});

describe('generateCloudinarySignature', () => {
	it('excludes signature, api_key, and file fields from the signed payload', () => {
		const withExcluded = generateCloudinarySignature(
			{ timestamp: 1234567890, public_id: 'sample', api_key: 'should-be-ignored', file: 'http://example.com/a.jpg', signature: 'old' },
			'secret',
		);
		const withoutExcluded = generateCloudinarySignature(
			{ timestamp: 1234567890, public_id: 'sample' },
			'secret',
		);
		expect(withExcluded).toBe(withoutExcluded);
	});

	it('sorts parameters alphabetically (order-independent)', () => {
		const a = generateCloudinarySignature({ timestamp: 1, public_id: 'x' }, 'secret');
		const b = generateCloudinarySignature({ public_id: 'x', timestamp: 1 }, 'secret');
		expect(a).toBe(b);
	});

	it('produces a different signature when api_secret changes', () => {
		const a = generateCloudinarySignature({ timestamp: 1 }, 'secret-a');
		const b = generateCloudinarySignature({ timestamp: 1 }, 'secret-b');
		expect(a).not.toBe(b);
	});

	it('produces a 64-char hex SHA-256 digest', () => {
		const sig = generateCloudinarySignature({ timestamp: 1, public_id: 'x' }, 'secret');
		expect(sig).toMatch(/^[a-f0-9]{64}$/);
	});
});

describe('metadataToPipeString', () => {
	it('joins scalar key/value pairs with pipes', () => {
		expect(metadataToPipeString({ a: '1', b: '2' })).toBe('a=1|b=2');
	});

	it('renders array values as a bracketed list of quoted strings', () => {
		expect(metadataToPipeString({ colors: ['red', 'blue'] })).toBe('colors=["red","blue"]');
	});

	it('quotes numeric array elements as strings', () => {
		expect(metadataToPipeString({ sizes: [1, 2] } as unknown as IDataObject)).toBe(
			'sizes=["1","2"]',
		);
	});

	it('renders an empty array as empty brackets', () => {
		expect(metadataToPipeString({ tags: [] })).toBe('tags=[]');
	});

	it('parses a JSON string input', () => {
		expect(metadataToPipeString('{"a":"1","b":"2"}')).toBe('a=1|b=2');
	});

	it('returns an empty string for an empty object', () => {
		expect(metadataToPipeString({})).toBe('');
	});

	it('throws on invalid JSON string input', () => {
		expect(() => metadataToPipeString('{not valid}')).toThrow('Invalid JSON for structured metadata');
	});

	it('escapes the pipe delimiter in a scalar value', () => {
		expect(metadataToPipeString({ note: 'a|b' })).toBe('note=a\\|b');
	});

	it('escapes the equals delimiter in a scalar value', () => {
		expect(metadataToPipeString({ eq: 'x=y' })).toBe('eq=x\\=y');
	});

	it('escapes both delimiters and keeps following pairs separable', () => {
		expect(metadataToPipeString({ a: 'one=two|three', b: 'ok' })).toBe('a=one\\=two\\|three|b=ok');
	});

	it('escapes double quotes in a scalar value', () => {
		expect(metadataToPipeString({ q: 'say "hi"' })).toBe('q=say \\"hi\\"');
	});

	it('escapes the delimiters (= | ") inside array elements and quote-wraps them', () => {
		expect(metadataToPipeString({ tags: ['a|b', 'c=d', 'e"f'] })).toBe(
			'tags=["a\\|b","c\\=d","e\\"f"]',
		);
	});

	it('keeps following pairs separable when an array element contains a pipe', () => {
		expect(metadataToPipeString({ a: ['x|y'], b: 'ok' })).toBe('a=["x\\|y"]|b=ok');
	});

	it('skips null and undefined values rather than emitting key=null', () => {
		expect(metadataToPipeString({ a: '1', b: null, c: undefined, d: '2' } as IDataObject)).toBe(
			'a=1|d=2',
		);
	});

	it('stringifies non-string scalars (numbers, booleans)', () => {
		expect(metadataToPipeString({ n: 5, flag: true } as unknown as IDataObject)).toBe(
			'n=5|flag=true',
		);
	});
});

describe('createMultipartBody', () => {
	const decode = (fields: Record<string, string>, name: string) =>
		createMultipartBody(fields, Buffer.from('data'), name, 'image/png').body.toString('utf8');

	it('sets the filename in the Content-Disposition of the file part', () => {
		expect(decode({}, 'photo.png')).toContain(
			'Content-Disposition: form-data; name="file"; filename="photo.png"',
		);
	});

	it('strips CR/LF from the filename so it cannot inject extra headers', () => {
		const body = decode({}, 'a\r\nContent-Type: text/html\r\n.png');
		expect(body).toContain('filename="aContent-Type: text/html.png"');
		// the injected sequence must not appear as its own header line
		expect(body).not.toContain('\r\nContent-Type: text/html\r\n');
	});

	it('replaces embedded double-quotes so they cannot close the filename attribute', () => {
		expect(decode({}, 'a".png')).toContain('filename="a\'.png"');
	});
});

describe('buildUploadUrl', () => {
	it('builds the signed-upload endpoint for a cloud and resource type', () => {
		expect(buildUploadUrl('demo', 'image')).toBe(
			'https://api.cloudinary.com/v1_1/demo/image/upload',
		);
	});
});

describe('buildResourceUpdateUrl', () => {
	it('builds the Admin API resource-update URL', () => {
		expect(buildResourceUpdateUrl('demo', 'image', 'upload', 'sample')).toBe(
			'https://api.cloudinary.com/v1_1/demo/resources/image/upload/sample',
		);
	});
});

describe('buildResourceByAssetIdUrl', () => {
	it('builds the Admin API asset_id-keyed resource URL', () => {
		expect(buildResourceByAssetIdUrl('demo', 'abc123')).toBe(
			'https://api.cloudinary.com/v1_1/demo/resources/abc123',
		);
	});
});

describe('buildResourceDeleteUrl', () => {
	it('builds the per-(resource_type, type) bulk-delete URL', () => {
		expect(buildResourceDeleteUrl('demo', 'image', 'upload')).toBe(
			'https://api.cloudinary.com/v1_1/demo/resources/image/upload',
		);
	});
});

describe('splitCsvIds', () => {
	it('splits, trims, and drops empty entries', () => {
		expect(splitCsvIds('a, b ,c')).toEqual(['a', 'b', 'c']);
		expect(splitCsvIds(' , a, , b,')).toEqual(['a', 'b']);
		expect(splitCsvIds('')).toEqual([]);
		expect(splitCsvIds('solo')).toEqual(['solo']);
	});
});
