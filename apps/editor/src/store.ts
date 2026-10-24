// What every screen shares: the workspace strip, and whether the session has ended.
import { ref } from 'vue';
import { SessionEnded, api } from './api.ts';
import type { WorkspaceState } from '../shared/api.ts';

export const workspace = ref<WorkspaceState | null>(null);
export const ended = ref(false);
export const problem = ref<string | null>(null);

/** The words for a failure; a refusal for want of the token ends the session. */
export function describeFailure(error: unknown): string {
  if (error instanceof SessionEnded) ended.value = true;
  return error instanceof Error ? error.message : String(error);
}

export async function refreshWorkspace(): Promise<void> {
  try {
    workspace.value = await api<WorkspaceState>('/api/state');
    problem.value = null;
  } catch (error) {
    problem.value = describeFailure(error);
  }
}
