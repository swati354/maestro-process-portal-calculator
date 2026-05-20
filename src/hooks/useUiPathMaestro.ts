/**
 * React Query hook for UiPath Maestro
 *
 * Provides methods to:
 * - Fetch Maestro processes
 * - Fetch process instances (all or by ID)
 * - Fetch BPMN diagrams
 * - Fetch execution history
 * - Control instances (pause, resume, cancel)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { MaestroProcesses, ProcessInstances } from '@uipath/uipath-typescript/maestro-processes';
import type {
	MaestroProcessGetAllResponse,
	ProcessInstanceGetResponse,
	ProcessInstanceOperationResponse,
	ProcessInstanceExecutionHistoryResponse,
	ProcessInstanceGetVariablesResponse,
	ProcessInstanceGetVariablesOptions
} from '@uipath/uipath-typescript/maestro-processes';

/**
 * Fetch all Maestro processes
 */
export function useUiPathMaestroProcesses(): UseQueryResult<MaestroProcessGetAllResponse[], Error> {
	const { sdk } = useAuth();

	return useQuery({
		queryKey: ['uipath', 'maestro', 'processes'],
		queryFn: async (): Promise<MaestroProcessGetAllResponse[]> => {
			try {
				const maestroProcesses = new MaestroProcesses(sdk);
				const result = await maestroProcesses.getAll();
				if (Array.isArray(result)) {
					return result;
				}
				return result.items || [];
			} catch (error) {
				console.error('Failed to fetch Maestro processes:', error);
				throw error;
			}
		},
		refetchInterval: 30000,
	});
}

/**
 * Fetch all Maestro process instances
 */
export function useUiPathMaestroInstances(): UseQueryResult<ProcessInstanceGetResponse[], Error> {
	const { sdk } = useAuth();

	return useQuery({
		queryKey: ['uipath', 'maestro', 'instances'],
		queryFn: async (): Promise<ProcessInstanceGetResponse[]> => {
			try {
				const processInstances = new ProcessInstances(sdk);
				const result = await processInstances.getAll();
				if (Array.isArray(result)) {
					return result;
				}
				return result.items || [];
			} catch (error) {
				console.error('Failed to fetch Maestro instances:', error);
				throw error;
			}
		},
		refetchInterval: 10000,
	});
}

/**
 * Mutation to pause a Maestro process instance
 */
export function usePauseMaestroInstance(): UseMutationResult<ProcessInstanceOperationResponse, Error, { instanceId: string; folderKey: string; comment?: string }> {
	const { sdk } = useAuth();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			instanceId,
			folderKey,
			comment,
		}: {
			instanceId: string;
			folderKey: string;
			comment?: string;
		}): Promise<ProcessInstanceOperationResponse> => {
			const processInstances = new ProcessInstances(sdk);
			const result = await processInstances.pause(
				instanceId,
				folderKey,
				comment ? { comment } : undefined
			);
			return result.data;
		},
		onSuccess: () => {
			toast.success('Maestro instance paused');
			queryClient.invalidateQueries({ queryKey: ['uipath', 'maestro', 'instances'] });
		},
		onError: (error: Error) => {
			toast.error(`Failed to pause instance: ${error.message}`);
		},
	});
}

/**
 * Mutation to resume a Maestro process instance
 */
export function useResumeMaestroInstance(): UseMutationResult<ProcessInstanceOperationResponse, Error, { instanceId: string; folderKey: string; comment?: string }> {
	const { sdk } = useAuth();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			instanceId,
			folderKey,
			comment,
		}: {
			instanceId: string;
			folderKey: string;
			comment?: string;
		}): Promise<ProcessInstanceOperationResponse> => {
			const processInstances = new ProcessInstances(sdk);
			const result = await processInstances.resume(
				instanceId,
				folderKey,
				comment ? { comment } : undefined
			);
			return result.data;
		},
		onSuccess: () => {
			toast.success('Maestro instance resumed');
			queryClient.invalidateQueries({ queryKey: ['uipath', 'maestro', 'instances'] });
		},
		onError: (error: Error) => {
			toast.error(`Failed to resume instance: ${error.message}`);
		},
	});
}

/**
 * Mutation to cancel a Maestro process instance
 */
export function useCancelMaestroInstance(): UseMutationResult<ProcessInstanceOperationResponse, Error, { instanceId: string; folderKey: string; comment?: string }> {
	const { sdk } = useAuth();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			instanceId,
			folderKey,
			comment,
		}: {
			instanceId: string;
			folderKey: string;
			comment?: string;
		}): Promise<ProcessInstanceOperationResponse> => {
			const processInstances = new ProcessInstances(sdk);
			const result = await processInstances.cancel(
				instanceId,
				folderKey,
				comment ? { comment } : undefined
			);
			return result.data;
		},
		onSuccess: () => {
			toast.success('Maestro instance cancelled');
			queryClient.invalidateQueries({ queryKey: ['uipath', 'maestro', 'instances'] });
		},
		onError: (error: Error) => {
			toast.error(`Failed to cancel instance: ${error.message}`);
		},
	});
}

/**
 * Fetch a single Maestro process instance by ID
 *
 * @param instanceId - The unique identifier of the process instance
 * @param folderKey - The folder key where the instance resides
 * @param options - Optional query options
 */
export function useUiPathMaestroInstanceById(
	instanceId: string | undefined,
	folderKey: string | undefined,
	options?: { enabled?: boolean }
): UseQueryResult<ProcessInstanceGetResponse, Error> {
	const { sdk } = useAuth();

	return useQuery({
		queryKey: ['uipath', 'maestro', 'instances', instanceId, folderKey],
		queryFn: async (): Promise<ProcessInstanceGetResponse> => {
			if (!instanceId || !folderKey) {
				throw new Error('Instance ID and folder key are required');
			}

			try {
				const processInstances = new ProcessInstances(sdk);
				const result = await processInstances.getById(instanceId, folderKey);
				return result;
			} catch (error) {
				console.error(`Failed to fetch Maestro instance ${instanceId}:`, error);
				throw error;
			}
		},
		enabled: options?.enabled !== false && !!instanceId && !!folderKey,
		refetchInterval: 5000,
	});
}

/**
 * Fetch BPMN diagram for a Maestro process instance
 *
 * Returns the BPMN XML diagram data for visualization.
 * The diagram shows the process flow with current execution status.
 *
 * @param instanceId - The unique identifier of the process instance
 * @param folderKey - The folder key where the instance resides
 * @param options - Optional query options
 */
export function useUiPathMaestroBpmnDiagram(
	instanceId: string | undefined,
	folderKey: string | undefined,
	options?: { enabled?: boolean }
): UseQueryResult<string, Error> {
	const { sdk } = useAuth();

	return useQuery({
		queryKey: ['uipath', 'maestro', 'bpmn', instanceId, folderKey],
		queryFn: async (): Promise<string> => {
			if (!instanceId || !folderKey) {
				throw new Error('Instance ID and folder key are required');
			}

			try {
				const processInstances = new ProcessInstances(sdk);
				const result = await processInstances.getBpmn(instanceId, folderKey);
				return result;
			} catch (error) {
				console.error(`Failed to fetch BPMN diagram for instance ${instanceId}:`, error);
				throw error;
			}
		},
		enabled: options?.enabled !== false && !!instanceId && !!folderKey,
		staleTime: 30000,
		refetchInterval: 10000,
	});
}

/**
 * Fetch execution history for a Maestro process instance
 *
 * Returns detailed execution history including all runs, activities, and status changes.
 * This is a separate API call from getting the instance itself.
 *
 * @param instanceId - The unique identifier of the process instance
 * @param options - Optional query options
 */
export function useUiPathMaestroExecutionHistory(
	instanceId: string | undefined,
	options?: { enabled?: boolean }
): UseQueryResult<ProcessInstanceExecutionHistoryResponse[], Error> {
	const { sdk } = useAuth();

	return useQuery({
		queryKey: ['uipath', 'maestro', 'execution-history', instanceId],
		queryFn: async (): Promise<ProcessInstanceExecutionHistoryResponse[]> => {
			if (!instanceId) {
				throw new Error('Instance ID is required');
			}

			try {
				const processInstances = new ProcessInstances(sdk);
				const result = await processInstances.getExecutionHistory(instanceId);
				return result;
			} catch (error) {
				console.error(`Failed to fetch execution history for instance ${instanceId}:`, error);
				throw error;
			}
		},
		enabled: options?.enabled !== false && !!instanceId,
		refetchInterval: 5000,
	});
}

/**
 * Fetch global variables for a Maestro process instance
 *
 * Returns all global variables associated with the process instance.
 * Variables can be filtered by parent element ID if needed.
 *
 * @param instanceId - The unique identifier of the process instance
 * @param folderKey - The folder key where the instance resides
 * @param variableOptions - Optional parameters for filtering variables (e.g., parentElementId)
 * @param queryOptions - Optional React Query options
 */
export function useUiPathMaestroVariables(
	instanceId: string | undefined,
	folderKey: string | undefined,
	variableOptions?: ProcessInstanceGetVariablesOptions,
	queryOptions?: { enabled?: boolean }
): UseQueryResult<ProcessInstanceGetVariablesResponse, Error> {
	const { sdk } = useAuth();

	return useQuery({
		queryKey: ['uipath', 'maestro', 'variables', instanceId, folderKey, variableOptions],
		queryFn: async (): Promise<ProcessInstanceGetVariablesResponse> => {
			if (!instanceId || !folderKey) {
				throw new Error('Instance ID and folder key are required');
			}

			try {
				const processInstances = new ProcessInstances(sdk);
				const result = await processInstances.getVariables(
					instanceId,
					folderKey,
					variableOptions
				);
				return result;
			} catch (error) {
				console.error(`Failed to fetch variables for instance ${instanceId}:`, error);
				throw error;
			}
		},
		enabled: queryOptions?.enabled !== false && !!instanceId && !!folderKey,
		refetchInterval: 10000,
	});
}
