/**
 * Lightweight OAuth callback page rendered at /auth/onedrive.
 *
 * Microsoft redirects here after login. This page has no UI —
 * the parent popup window's polling loop reads the URL, extracts
 * the `code` param, and closes this window.
 *
 * We just show a brief "Signing you in…" message in case the user
 * manually navigated here or the popup takes a moment to close.
 */
import * as React from 'react';
import { Cloud, Loader2 } from 'lucide-react';

export const OneDriveAuthCallback: React.FC = () => {
  React.useEffect(() => {
    // The opener polls popup.location.href and closes us automatically.
    // As a fallback, try to close ourselves after 3 seconds.
    const t = setTimeout(() => {
      try { window.close(); } catch { /* cross-origin sandboxed */ }
    }, 3000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 text-foreground">
      <div className="w-14 h-14 rounded-2xl bg-[#0078D4]/10 flex items-center justify-center">
        <Cloud className="w-7 h-7 text-[#0078D4]" />
      </div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        Signing you in to OneDrive…
      </div>
      <p className="text-xs text-muted-foreground/50">This window will close automatically.</p>
    </div>
  );
};
