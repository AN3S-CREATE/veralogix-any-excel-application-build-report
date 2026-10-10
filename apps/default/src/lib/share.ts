/**
 * Share-link encoding/decoding for SpreadsheetData.
 *
 * Strategy: JSON → UTF-8 bytes → compress with CompressionStream (deflate-raw)
 * → base64url → stored in the URL hash as `#s=<token>`
 *
 * Falls back to plain base64 (no compression) in environments where
 * CompressionStream is unavailable.
 */

import type { SpreadsheetData } from '../types';

const HASH_PREFIX = 's=';

// ── Compression helpers ────────────────────────────────────────────────────

async function compress(input: string): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(input);

  if (typeof CompressionStream !== 'undefined') {
    const cs = new CompressionStream('deflate-raw');
    const writer = cs.writable.getWriter();
    writer.write(bytes);
    writer.close();
    const chunks: Uint8Array[] = [];
    const reader = cs.readable.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    const total = chunks.reduce((n, c) => n + c.length, 0);
    const out = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) { out.set(chunk, offset); offset += chunk.length; }
    return out;
  }

  // Fallback: no compression
  return bytes;
}

async function decompress(data: Uint8Array, compressed: boolean): Promise<string> {
  if (compressed && typeof DecompressionStream !== 'undefined') {
    const ds = new DecompressionStream('deflate-raw');
    const writer = ds.writable.getWriter();
    writer.write(data);
    writer.close();
    const chunks: Uint8Array[] = [];
    const reader = ds.readable.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    const total = chunks.reduce((n, c) => n + c.length, 0);
    const out = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) { out.set(chunk, offset); offset += chunk.length; }
    return new TextDecoder().decode(out);
  }
  return new TextDecoder().decode(data);
}

// ── base64url helpers ──────────────────────────────────────────────────────

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(str: string): Uint8Array {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// ── Public API ─────────────────────────────────────────────────────────────

/** Encodes SpreadsheetData into a shareable URL (uses current page origin + hash). */
export async function encodeShareLink(data: SpreadsheetData): Promise<string> {
  const json = JSON.stringify(data);
  const supportsCompression = typeof CompressionStream !== 'undefined';
  const bytes = await compress(json);
  // Prepend 1-byte version flag: 0x01 = compressed, 0x00 = plain
  const payload = new Uint8Array(1 + bytes.length);
  payload[0] = supportsCompression ? 0x01 : 0x00;
  payload.set(bytes, 1);
  const token = toBase64Url(payload);
  const url = new URL(window.location.href);
  url.hash = `${HASH_PREFIX}${token}`;
  // Strip any existing query params that belong to the app (keep it clean)
  return url.toString();
}

/** Decodes a share token (from hash) back to SpreadsheetData. Returns null on failure. */
export async function decodeShareToken(token: string): Promise<SpreadsheetData | null> {
  try {
    const payload = fromBase64Url(token);
    const compressed = payload[0] === 0x01;
    const data = payload.slice(1);
    const json = await decompress(data, compressed);
    const parsed = JSON.parse(json) as SpreadsheetData;
    if (!parsed.sheets || !parsed.title) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Reads the share token from the current window hash, if present. */
export function readShareTokenFromHash(): string | null {
  const hash = window.location.hash.slice(1); // strip leading #
  if (!hash.startsWith(HASH_PREFIX)) return null;
  return hash.slice(HASH_PREFIX.length) || null;
}

/** Clears the share token from the URL hash without a page reload. */
export function clearShareHash(): void {
  history.replaceState(null, '', window.location.pathname + window.location.search);
}
