import { IDataObject, NodeOperationError } from 'n8n-workflow';
import { joinTransformation } from '../../cloudinary.utils';
import { OperationHandler } from '../types';
import {
	buildComponents,
	buildTransformResult,
	convertComponents,
	cropComponents,
	optimizeComponents,
	padBackgroundSuffix,
	readTransformInput,
	resizeComponents,
	trimComponents,
} from './shared';

/**
 * Multi-Step Transformation: compound several steps into a single delivery URL,
 * mirroring n8n's built-in Edit Image "Multi Step" operation. The `transformSteps`
 * fixedCollection is an ordered, sortable list; each step contributes one or more
 * Cloudinary transformation components, which are chained with `/` and applied in
 * sequence. No API call is made — this is the "third flow" (pure URL construction).
 *
 * Each step delegates to the SAME component builder the matching standalone op uses
 * (see shared.ts), so the two never drift. `raw` is the escape hatch for any
 * component the builders don't cover.
 */
export const multiStep: OperationHandler = async (ctx, i, creds) => {
	const { publicId, deliveryType, version } = readTransformInput(ctx, i);
	const resourceType = ctx.getNodeParameter('multiStepResourceType', i, 'image') as string;
	const stepsData = ctx.getNodeParameter('transformSteps', i, {}) as IDataObject;
	const steps = (stepsData.step as IDataObject[] | undefined) ?? [];

	if (!steps.length) {
		throw new NodeOperationError(ctx.getNode(), 'Add at least one transformation step', {
			itemIndex: i,
		});
	}

	const components: string[] = [];
	// A Convert step sets the delivery format (URL extension); the last one wins.
	let format: string | undefined;

	steps.forEach((step, idx) => {
		const list = buildComponents(
			ctx,
			i,
			() => stepComponents(step, resourceType),
			`Step ${idx + 1}: `,
		);
		components.push(...list);
		if (step.stepType === 'convert') {
			format = String(step.format ?? '').trim() || format;
		}
	});

	return [
		buildTransformResult(creds, {
			resourceType,
			type: deliveryType,
			transformation: joinTransformation(components),
			publicId,
			format,
			version,
		}),
	];
};

const str = (v: unknown): string => String(v ?? '');
const num = (v: unknown): number => Number(v) || 0;

/** Map one step row to its transformation component(s) via the shared builders. */
function stepComponents(step: IDataObject, resourceType: string): string[] {
	switch (step.stepType as string) {
		case 'trim':
			return trimComponents({ start: str(step.start), end: str(step.end), duration: str(step.duration) });
		case 'resize':
			return resizeComponents({
				width: num(step.width),
				height: num(step.height),
				fit: str(step.fit) || 'limit',
				background: padBackgroundSuffix(str(step.padBackground), str(step.padBackgroundColor)),
			});
		case 'crop': {
			const cropBy = str(step.cropMode) || 'dimensions';
			return cropComponents({
				cropBy,
				width: cropBy === 'aspectRatio' ? num(step.cropAspectWidth) : num(step.cropWidth),
				height: num(step.cropHeight),
				aspectRatio: str(step.aspectRatio),
				focus: str(step.focus) || 'auto',
			});
		}
		case 'optimize':
			return optimizeComponents({ quality: str(step.quality) || 'auto', resourceType });
		case 'convert':
			return convertComponents(str(step.format));
		case 'raw': {
			const raw = str(step.raw).trim();
			if (!raw) {
				throw new Error('Raw step requires a transformation component');
			}
			return [raw];
		}
		default:
			throw new Error(`Unknown step type "${step.stepType}"`);
	}
}
