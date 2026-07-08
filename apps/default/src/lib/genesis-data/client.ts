/**
 * Genesis Data SDK - read & write a Taskade project's rows (nodes) from a Genesis app,
 * natively (no iframe). Thin typed wrappers over the `/api/taskade/projects/:id/nodes`
 * gateway routes. All writes funnel through the backend's single OT write path.
 */
import { gatewayRequest, isEmptyString } from '../genesis-gateway';
import type { ClientOptions, GatewayResponse } from '../genesis-gateway';

/**
 * A serialized project row. `fieldValues` is keyed by the field's display name (e.g.
 * `Status`, `Email`); the field path is also available as a key. Read it via
 * `getFieldValue` / `getFieldNumber` from `./fields` - not by direct indexing.
 * `parentId` is the parent row id, or null for a top-level row. In a flat database
 * (the common case) EVERY row has `parentId: null`.
 */
export interface GenesisNode {
  id: string;
  fieldValues: Record<string, string>;
  parentId: string | null;
}

/**
 * Fields for a new row. Keys are field display names (e.g. `Status`); values are strings.
 * Pass `parentId` to nest the row under an existing one.
 */
export type NewNodeFields = Record<string, string> & { parentId?: string };

/**
 * Fetches ALL rows of a project as one FLAT array (children included). Use the array
 * as-is; NEVER filter by `parentId` to find data rows - in a flat database every row
 * has `parentId === null`, so `rows.filter((r) => r.parentId !== null)` returns nothing.
 *
 * @example
 * ```typescript
 * const rows = await getNodes('project-123');
 * ```
 */
export async function getNodes(projectId: string, options?: ClientOptions): Promise<GenesisNode[]> {
  if (isEmptyString(projectId)) {
    throw new Error('Project ID cannot be empty');
  }
  const data = await gatewayRequest<GatewayResponse<{ nodes: GenesisNode[] }>>(
    `/projects/${encodeURIComponent(projectId)}/nodes`,
    { method: 'GET' },
    options,
  );
  return data.payload?.nodes ?? [];
}

/**
 * Creates a new row in a project.
 *
 * @example
 * ```typescript
 * await createNode('project-123', { Name: 'Maria', Email: 'maria@acme.com', Status: 'New' });
 * ```
 */
export async function createNode(
  projectId: string,
  fields: NewNodeFields,
  options?: ClientOptions,
): Promise<void> {
  if (isEmptyString(projectId)) {
    throw new Error('Project ID cannot be empty');
  }
  await gatewayRequest(
    `/projects/${encodeURIComponent(projectId)}/nodes`,
    { method: 'POST', body: JSON.stringify(fields) },
    options,
  );
}

/**
 * Updates field values on an existing row. Only the provided fields are changed.
 */
export async function updateNode(
  projectId: string,
  nodeId: string,
  fields: Record<string, string>,
  options?: ClientOptions,
): Promise<void> {
  if (isEmptyString(projectId) || isEmptyString(nodeId)) {
    throw new Error('Project ID and node ID cannot be empty');
  }
  await gatewayRequest(
    `/projects/${encodeURIComponent(projectId)}/nodes/${encodeURIComponent(nodeId)}`,
    { method: 'PATCH', body: JSON.stringify(fields) },
    options,
  );
}

/**
 * Deletes a row from a project.
 */
export async function deleteNode(
  projectId: string,
  nodeId: string,
  options?: ClientOptions,
): Promise<void> {
  if (isEmptyString(projectId) || isEmptyString(nodeId)) {
    throw new Error('Project ID and node ID cannot be empty');
  }
  await gatewayRequest(
    `/projects/${encodeURIComponent(projectId)}/nodes/${encodeURIComponent(nodeId)}`,
    { method: 'DELETE' },
    options,
  );
}
