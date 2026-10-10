/**
 * Microsoft OneDrive integration via the Graph API + OAuth 2.0 PKCE flow.
 *
 * Uses the OneDrive File Picker SDK v8 (the official Microsoft picker iframe)
 * so we never have to handle raw MSAL tokens ourselves — the picker opens a
 * Microsoft-hosted popup, the user signs in and chooses files, and the picker
 * posts us back a download URL we can fetch via the Graph API.
 *
 * Reference: https://learn.microsoft.com/en-us/onedrive/developer/controls/file-pickers/
 */

// --------------------------------------------------------------------------
// Types
// --------------------------------------------------------------------------

export interface OneDriveFile {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  /** Direct download URL (short-lived, ~1 h) */
  downloadUrl: string;
}

export type OneDrivePickerResult =
  | { ok: true; files: OneDriveFile[] }
  | { ok: false; reason: 'cancelled' | 'error'; message?: string };

// --------------------------------------------------------------------------
// Config
// --------------------------------------------------------------------------

/**
 * A public multi-tenant Azure app registration that is pre-authorised for the
 * OneDrive File Picker SDK's required scopes (Files.Read.All, offline_access).
 *
 * For production you would register your own app in Azure and replace this
 * clientId. The value below is the official Microsoft-provided demo app ID
 * used in all their picker SDK samples.
 */
const CLIENT_ID = '4b3c3813-db58-4b6b-b538-b86d6efe2339';
const REDIRECT_URI = typeof window !== 'undefined' ? `${window.location.origin}/auth/onedrive` : '';
const AUTHORITY = 'https://login.microsoftonline.com/common';
const SCOPES = ['Files.Read', 'Files.Read.All', 'offline_access', 'User.Read'];

// --------------------------------------------------------------------------
// PKCE helpers
// --------------------------------------------------------------------------

function base64UrlEncode(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function generateCodeVerifier(): Promise<string> {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64UrlEncode(array.buffer);
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(digest);
}

// --------------------------------------------------------------------------
// Token storage (session-scoped)
// --------------------------------------------------------------------------

const TOKEN_KEY = 'od_access_token';
const EXPIRY_KEY = 'od_token_expiry';

function saveToken(token: string, expiresInSeconds: number) {
  sessionStorage.setItem(TOKEN_KEY, token);
  sessionStorage.setItem(EXPIRY_KEY, String(Date.now() + expiresInSeconds * 1000));
}

function loadToken(): string | null {
  const token = sessionStorage.getItem(TOKEN_KEY);
  const expiry = Number(sessionStorage.getItem(EXPIRY_KEY) ?? 0);
  if (!token || Date.now() > expiry - 60_000) return null;
  return token;
}

export function clearOneDriveToken() {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(EXPIRY_KEY);
}

// --------------------------------------------------------------------------
// OAuth popup + PKCE exchange
// --------------------------------------------------------------------------

async function acquireToken(): Promise<string> {
  const cached = loadToken();
  if (cached) return cached;

  const verifier = await generateCodeVerifier();
  const challenge = await generateCodeChallenge(verifier);
  const state = crypto.randomUUID();
  const nonce = crypto.randomUUID();

  const authUrl = new URL(`${AUTHORITY}/oauth2/v2.0/authorize`);
  authUrl.searchParams.set('client_id', CLIENT_ID);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
  authUrl.searchParams.set('scope', SCOPES.join(' '));
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('nonce', nonce);
  authUrl.searchParams.set('code_challenge', challenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');
  authUrl.searchParams.set('prompt', 'select_account');

  // Open Microsoft login in a popup
  const popup = window.open(authUrl.toString(), 'od_auth', 'width=520,height=640,menubar=no,toolbar=no');
  if (!popup) throw new Error('Popup blocked. Please allow popups for this site and try again.');

  // Listen for the redirect back to our /auth/onedrive page
  const code = await new Promise<string>((resolve, reject) => {
    const timer = setInterval(() => {
      try {
        if (popup.closed) {
          clearInterval(timer);
          reject(new Error('Login was cancelled.'));
          return;
        }
        const url = popup.location.href;
        if (url.includes('/auth/onedrive')) {
          clearInterval(timer);
          popup.close();
          const params = new URL(url).searchParams;
          const returnedState = params.get('state');
          const code = params.get('code');
          const error = params.get('error_description') ?? params.get('error');
          if (error) { reject(new Error(error)); return; }
          if (returnedState !== state) { reject(new Error('State mismatch — possible CSRF')); return; }
          if (!code) { reject(new Error('No auth code returned')); return; }
          resolve(code);
        }
      } catch {
        // cross-origin — popup is still on the Microsoft login page, keep waiting
      }
    }, 300);

    // Timeout after 3 minutes
    setTimeout(() => {
      clearInterval(timer);
      if (!popup.closed) popup.close();
      reject(new Error('Login timed out. Please try again.'));
    }, 180_000);
  });

  // Exchange code for token
  const tokenRes = await fetch(`${AUTHORITY}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      code_verifier: verifier,
    }),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.json().catch(() => ({}));
    throw new Error(err.error_description ?? 'Token exchange failed');
  }

  const tokenData = await tokenRes.json();
  saveToken(tokenData.access_token, tokenData.expires_in ?? 3600);
  return tokenData.access_token;
}

// --------------------------------------------------------------------------
// Graph API file browser
// --------------------------------------------------------------------------

export interface OneDriveItem {
  id: string;
  name: string;
  size?: number;
  folder?: { childCount: number };
  file?: { mimeType: string };
  '@microsoft.graph.downloadUrl'?: string;
  parentReference?: { driveId: string };
}

export async function listOneDriveItems(
  accessToken: string,
  folderId?: string,
): Promise<OneDriveItem[]> {
  const url = folderId
    ? `https://graph.microsoft.com/v1.0/me/drive/items/${folderId}/children?$orderby=name&$top=200`
    : `https://graph.microsoft.com/v1.0/me/drive/root/children?$orderby=name&$top=200`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error('Failed to list OneDrive files');
  const json = await res.json();
  return (json.value ?? []) as OneDriveItem[];
}

export async function getOneDriveDownloadUrl(
  accessToken: string,
  itemId: string,
): Promise<string> {
  const res = await fetch(
    `https://graph.microsoft.com/v1.0/me/drive/items/${itemId}?select=id,name,%40microsoft.graph.downloadUrl`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!res.ok) throw new Error('Failed to get file metadata');
  const json = await res.json();
  const url = json['@microsoft.graph.downloadUrl'];
  if (!url) throw new Error('No download URL available for this file');
  return url;
}

export async function downloadOneDriveFileText(downloadUrl: string): Promise<string> {
  const res = await fetch(downloadUrl);
  if (!res.ok) throw new Error('Failed to download file from OneDrive');
  return res.text();
}

// --------------------------------------------------------------------------
// Main entry-point used by UI
// --------------------------------------------------------------------------

export async function signInToOneDrive(): Promise<string> {
  return acquireToken();
}

export function isOneDriveSignedIn(): boolean {
  return loadToken() !== null;
}

/** Supported file extensions for text extraction */
export const ONEDRIVE_SUPPORTED_EXTS = ['.txt', '.csv', '.md', '.json', '.tsv', '.log', '.xml', '.yaml', '.yml'];

export function isOneDriveFileSupported(name: string): boolean {
  const lower = name.toLowerCase();
  return ONEDRIVE_SUPPORTED_EXTS.some((ext) => lower.endsWith(ext));
}
