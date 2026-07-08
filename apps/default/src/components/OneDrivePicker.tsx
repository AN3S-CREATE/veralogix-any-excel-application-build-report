import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Folder, FileText, Loader2, ChevronRight, LogOut, AlertCircle, Search, ArrowLeft, Cloud } from 'lucide-react';
import { cn } from '../lib/utils';
import {
  signInToOneDrive,
  listOneDriveItems,
  getOneDriveDownloadUrl,
  downloadOneDriveFileText,
  clearOneDriveToken,
  isOneDriveSignedIn,
  isOneDriveFileSupported,
  ONEDRIVE_SUPPORTED_EXTS,
  type OneDriveItem,
} from '../lib/onedrive';

interface OneDrivePickerProps {
  onFileLoaded: (text: string, fileName: string) => void;
  onClose: () => void;
}

interface BreadcrumbEntry {
  id: string | null;
  name: string;
}

function formatSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const OneDrivePicker: React.FC<OneDrivePickerProps> = ({ onFileLoaded, onClose }) => {
  const [accessToken, setAccessToken] = React.useState<string | null>(null);
  const [items, setItems] = React.useState<OneDriveItem[]>([]);
  const [breadcrumbs, setBreadcrumbs] = React.useState<BreadcrumbEntry[]>([{ id: null, name: 'My Files' }]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isDownloading, setIsDownloading] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState('');
  const [signedIn, setSignedIn] = React.useState(isOneDriveSignedIn());

  React.useEffect(() => {
    if (signedIn) handleSignIn();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadItems = async (token: string, folderId: string | null) => {
    setIsLoading(true);
    setError(null);
    try {
      const results = await listOneDriveItems(token, folderId ?? undefined);
      setItems(results);
    } catch (e: any) {
      setError(e.message ?? 'Failed to list files');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = await signInToOneDrive();
      setAccessToken(token);
      setSignedIn(true);
      await loadItems(token, null);
    } catch (e: any) {
      setError(e.message ?? 'Sign-in failed');
      setIsLoading(false);
    }
  };

  const handleSignOut = () => {
    clearOneDriveToken();
    setAccessToken(null);
    setSignedIn(false);
    setItems([]);
    setBreadcrumbs([{ id: null, name: 'My Files' }]);
    setError(null);
  };

  const openFolder = async (item: OneDriveItem) => {
    if (!accessToken) return;
    setBreadcrumbs(prev => [...prev, { id: item.id, name: item.name }]);
    setSearch('');
    await loadItems(accessToken, item.id);
  };

  const navigateTo = async (crumb: BreadcrumbEntry, index: number) => {
    if (!accessToken) return;
    setBreadcrumbs(prev => prev.slice(0, index + 1));
    setSearch('');
    await loadItems(accessToken, crumb.id);
  };

  const handlePickFile = async (item: OneDriveItem) => {
    if (!accessToken) return;
    if (!isOneDriveFileSupported(item.name)) {
      setError(`Unsupported file type. Supported: ${ONEDRIVE_SUPPORTED_EXTS.join(', ')}`);
      return;
    }
    setIsDownloading(item.id);
    setError(null);
    try {
      const url = await getOneDriveDownloadUrl(accessToken, item.id);
      const text = await downloadOneDriveFileText(url);
      onFileLoaded(text, item.name);
      onClose();
    } catch (e: any) {
      setError(e.message ?? 'Failed to download file');
    } finally {
      setIsDownloading(null);
    }
  };

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(i => i.name.toLowerCase().includes(q));
  }, [items, search]);

  const sorted = React.useMemo(
    () => [...filtered].sort((a, b) => {
      if (a.folder && !b.folder) return -1;
      if (!a.folder && b.folder) return 1;
      return a.name.localeCompare(b.name);
    }),
    [filtered],
  );

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      >
        <motion.div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        />
        <motion.div
          className="relative w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          style={{ maxHeight: 'min(600px, calc(100dvh - 2rem))' }}
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
        >
          {/* ── Header ── */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#0078D4]/15 flex items-center justify-center">
                <Cloud className="w-4 h-4 text-[#0078D4]" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-foreground">Microsoft OneDrive</h2>
                {signedIn && <p className="text-[10px] text-muted-foreground leading-none mt-0.5">Choose a file to import</p>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {signedIn && (
                <button onClick={handleSignOut} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                  <LogOut className="w-3.5 h-3.5" /> Sign out
                </button>
              )}
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* ── Not signed in ── */}
          {!signedIn && (
            <div className="flex flex-col items-center justify-center px-6 py-12 text-center gap-5 flex-1">
              <div className="w-16 h-16 rounded-2xl bg-[#0078D4]/10 flex items-center justify-center">
                <Cloud className="w-8 h-8 text-[#0078D4]" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">Connect your OneDrive</h3>
                <p className="text-sm text-muted-foreground">Sign in with your Microsoft account to browse and import files directly from your OneDrive.</p>
              </div>
              {error && (
                <div className="w-full flex items-start gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs text-left">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />{error}
                </div>
              )}
              <motion.button
                onClick={handleSignIn}
                disabled={isLoading}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                className="flex items-center gap-2.5 px-6 py-3 rounded-xl bg-[#0078D4] text-white font-semibold text-sm shadow-lg shadow-[#0078D4]/25 hover:bg-[#006CBE] transition-colors disabled:opacity-60"
              >
                {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</> : <><Cloud className="w-4 h-4" /> Sign in with Microsoft</>}
              </motion.button>
              <p className="text-[10px] text-muted-foreground/60">A Microsoft login popup will open. Supported: {ONEDRIVE_SUPPORTED_EXTS.join(', ')}</p>
            </div>
          )}


          {/* ── Signed in — file browser ── */}
          {signedIn && (
            <>
              {/* Breadcrumbs + search */}
              <div className="px-4 py-2.5 border-b border-border shrink-0 space-y-2">
                <div className="flex items-center gap-1 overflow-x-auto text-xs text-muted-foreground">
                  {breadcrumbs.map((crumb, idx) => (
                    <React.Fragment key={idx}>
                      {idx > 0 && <ChevronRight className="w-3 h-3 shrink-0 opacity-40" />}
                      <button
                        onClick={() => navigateTo(crumb, idx)}
                        className={cn(
                          'shrink-0 hover:text-foreground transition-colors rounded px-1 py-0.5',
                          idx === breadcrumbs.length - 1 ? 'text-foreground font-medium' : 'hover:underline',
                        )}
                      >
                        {crumb.name}
                      </button>
                    </React.Fragment>
                  ))}
                </div>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Filter files…"
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground placeholder:text-muted-foreground"
                  />
                  {search && (
                    <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2">
                      <X className="w-3 h-3 text-muted-foreground" />
                    </button>
                  )}
                </div>
              </div>

              {error && (
                <div className="mx-4 mt-3 flex items-start gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs shrink-0">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />{error}
                </div>
              )}

              {/* File list */}
              <div className="flex-1 overflow-y-auto px-3 py-2">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
                    <Loader2 className="w-6 h-6 animate-spin text-[#0078D4]" />
                    <span className="text-sm">Loading files…</span>
                  </div>
                ) : sorted.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
                    <Folder className="w-8 h-8 opacity-30" />
                    <span className="text-sm">{search ? 'No files match your search' : 'This folder is empty'}</span>
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    {breadcrumbs.length > 1 && !search && (
                      <button
                        onClick={() => navigateTo(breadcrumbs[breadcrumbs.length - 2], breadcrumbs.length - 2)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-sm"
                      >
                        <ArrowLeft className="w-4 h-4 shrink-0" />
                        <span className="italic text-xs">Go back</span>
                      </button>
                    )}
                    {sorted.map(item => {
                      const isFolder = !!item.folder;
                      const supported = !isFolder && isOneDriveFileSupported(item.name);
                      const unsupported = !isFolder && !supported;
                      const downloading = isDownloading === item.id;
                      return (
                        <motion.button
                          key={item.id}
                          onClick={() => isFolder ? openFolder(item) : handlePickFile(item)}
                          disabled={unsupported || !!isDownloading}
                          whileHover={!unsupported && !isDownloading ? { x: 2 } : {}}
                          className={cn(
                            'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left group',
                            unsupported ? 'opacity-40 cursor-not-allowed'
                              : isDownloading && !downloading ? 'opacity-50 cursor-wait'
                              : 'hover:bg-muted cursor-pointer',
                          )}
                        >
                          <div className={cn(
                            'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                            isFolder ? 'bg-yellow-400/15 text-yellow-500' : 'bg-primary/10 text-primary',
                          )}>
                            {downloading ? <Loader2 className="w-4 h-4 animate-spin" />
                              : isFolder ? <Folder className="w-4 h-4" />
                              : <FileText className="w-4 h-4" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={cn('text-sm font-medium truncate', unsupported ? 'text-muted-foreground' : 'text-foreground')}>
                              {item.name}
                            </p>
                            <p className="text-[10px] text-muted-foreground leading-none mt-0.5">
                              {isFolder ? `${item.folder?.childCount ?? 0} items`
                                : unsupported ? 'Unsupported format'
                                : formatSize(item.size)}
                            </p>
                          </div>
                          {isFolder && <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground shrink-0 transition-colors" />}
                          {downloading && <span className="text-[10px] text-primary shrink-0">Importing…</span>}
                        </motion.button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="px-5 py-3 border-t border-border text-[10px] text-muted-foreground/50 shrink-0 text-center">
                Supported: {ONEDRIVE_SUPPORTED_EXTS.join(' · ')}
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
