import { describe, it, expect } from 'vitest';
import type { IDataObject } from 'n8n-workflow';
import { Cloudinary } from './Cloudinary.node';
import { makeCtx } from './operations/testHelpers';

const node = new Cloudinary();

describe('Cloudinary.execute dispatch', () => {
	it('routes resource:operation to the matching handler and wraps results with pairedItem', async () => {
		const { ctx, http } = makeCtx({
			params: { resource: 'admin', operation: 'getMetadataFields' },
		});
		http.mockResolvedValue({ fields: [] });

		const [out] = await node.execute.call(ctx);

		expect(out).toEqual([{ json: { fields: [] }, pairedItem: 0 }]);
		expect(http).toHaveBeenCalledTimes(1);
	});

	it('throws on an unsupported resource:operation pair', async () => {
		const { ctx } = makeCtx({ params: { resource: 'admin', operation: 'nope' } });

		await expect(node.execute.call(ctx)).rejects.toThrow('Unsupported operation: admin/nope');
	});

	it('pushes a per-item error instead of throwing when continueOnFail is true', async () => {
		const { ctx, http } = makeCtx({
			params: { resource: 'admin', operation: 'getMetadataFields' },
			continueOnFail: true,
		});
		http.mockRejectedValue(new Error('boom'));

		const [out] = await node.execute.call(ctx);

		expect(out).toEqual([{ json: { error: 'boom' }, pairedItem: 0 }]);
	});

	it('processes every input item', async () => {
		const { ctx, http } = makeCtx({
			params: { resource: 'admin', operation: 'getMetadataFields' },
			items: [{ json: {} }, { json: {} }, { json: {} }] as IDataObject[] as never,
		});
		http.mockResolvedValue({ ok: true });

		const [out] = await node.execute.call(ctx);

		expect(http).toHaveBeenCalledTimes(3);
		expect(out).toHaveLength(3);
		expect(out.map((r) => r.pairedItem)).toEqual([0, 1, 2]);
	});
});
