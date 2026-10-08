import { NodeOperationError } from 'n8n-workflow';
import { TASK_ID_PATTERN, getGenerationTask, noticesText } from '../../mediaGeneration.client';
import { OperationHandler } from '../types';
import { shapeGenerationOutput } from './shared';

/**
 * Get the status of an async generation task
 * (`GET /generate/{cloud_name}/tasks/{task_id}`). Once `completed`, the simplified
 * output is the generated asset(s), same shape as a synchronous generation. A
 * `failed` task throws, so Continue On Fail / the error output handle it.
 */
export const getTask: OperationHandler = async (ctx, i, creds) => {
	const taskId = (ctx.getNodeParameter('task_id', i) as string).trim();
	const simplify = ctx.getNodeParameter('simplify', i, true) as boolean;

	if (!TASK_ID_PATTERN.test(taskId)) {
		throw new NodeOperationError(ctx.getNode(), 'Invalid task ID', {
			description: 'A task ID is the lowercase hex `task_id` returned by an async generation.',
			itemIndex: i,
		});
	}

	const response = await getGenerationTask(ctx, i, creds, taskId);
	if (response.data?.status === 'failed') {
		const description = [
			noticesText(response.notices),
			response.request_id ? `Request ID: ${response.request_id}` : '',
		]
			.filter(Boolean)
			.join(' ');
		throw new NodeOperationError(ctx.getNode(), `Generation task ${taskId} failed`, {
			description: description || undefined,
			itemIndex: i,
		});
	}
	return shapeGenerationOutput(response, simplify);
};
