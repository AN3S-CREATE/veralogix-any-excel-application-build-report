/**
 * Canonical field-access helpers for Genesis project rows - THE data path for generated
 * apps. Always read `fieldValues` through these helpers instead of indexing it directly;
 * they encode the gateway read contract:
 *
 * - `getNodes` returns EVERY row of the project as one FLAT array. In a flat database
 *   (the common case) every row has `parentId === null` - use the array as-is and NEVER
 *   filter by `parentId` to find data rows: `nodes.filter((n) => n.parentId !== null)`
 *   discards the entire database.
 * - Each field value is emitted under its stable field path (e.g. `/attributes/fields.1`)
 *   AND, when the field's display name is unique, that name too (e.g. `Status`). Some
 *   fields emit under only one key form, so pass every key you know (display name first,
 *   then field path) and let the helper fall back.
 * - Values are serialized primitives - usually strings, but some field types (e.g.
 *   Rating) arrive as numbers. Use `getFieldNumber` for numeric fields instead of
 *   trusting `typeof` or calling `Number()` by hand.
 */
import type { GenesisNode } from './client';

/**
 * Reads a field value with multi-key fallback: returns the value at the first key
 * present on the row, always as a string, or null when no key matches.
 *
 * @example
 * ```typescript
 * const status = getFieldValue(row, 'Status', '/attributes/fields.2');
 * ```
 */
export function getFieldValue(node: GenesisNode, ...fieldKeys: string[]): string | null {
  for (const fieldKey of fieldKeys) {
    // Typed as string, but some field types serialize to number/boolean at runtime.
    const value: unknown = node.fieldValues[fieldKey];
    if (value != null) {
      return typeof value === 'string' ? value : String(value);
    }
  }
  return null;
}

/**
 * Reads a numeric field with the same multi-key fallback, coerced via `Number()`.
 * Returns null (never NaN) for missing values, empty strings, and non-numeric text.
 *
 * @example
 * ```typescript
 * const kills = getFieldNumber(row, 'Kills', '/attributes/fields.3') ?? 0;
 * ```
 */
export function getFieldNumber(node: GenesisNode, ...fieldKeys: string[]): number | null {
  const raw = getFieldValue(node, ...fieldKeys);
  if (raw == null || raw.trim().length === 0) {
    // Guard: Number('') and Number('   ') are 0, not NaN.
    return null;
  }
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}
