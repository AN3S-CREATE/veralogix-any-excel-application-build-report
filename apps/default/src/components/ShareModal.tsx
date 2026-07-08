import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Check, ExternalLink, Link2, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { encodeShareLink } from '../lib/share';
import type { SpreadsheetData } from '../types';

interface ShareModalProps {
  data: SpreadsheetData;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ data, onClose }) => {
  const [link, setLink] = React.useState<string | null>(null);
  const [isGenerating, setIsGenerating] = React.useState(true);
  const [copied, setCopied] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    let cancelled = false;
    setIsGenerating(true);
    encodeShareLink(data)
      .then(url => { if (!cancelled) { setLink(url); setIsGenerating(false); } })
      .catch(() => { if (!cancelled) { setError('Failed to generate share link.'); setIsGenerating(false); } });
    return () => { cancelled = true; };
  }, [data]);

  const handleCopy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback: select the input text
      inputRef.current?.select();
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        />

        {/* Sheet (mobile slides up, desktop scales in) */}
        <motion.div
          className="relative w-full sm:max-w-md bg-card border border-border sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden"
          initial={{ opacity: 0, y: 40, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
        >
          {/* Drag handle (mobile) */}
          <div className="flex justify-center pt-3 pb-1 sm:hidden">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Link2 className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-foreground">Share Spreadsheet</h2>
                <p className="text-[10px] text-muted-foreground leading-none mt-0.5">Anyone with this link can view the data</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Body */}
          <div className="px-5 py-5 space-y-4">
            {/* Spreadsheet info card */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border">
              <span className="text-xl shrink-0">📊</span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{data.title}</p>
                <p className="text-[11px] text-muted-foreground">
                  {data.sheets.length} sheet{data.sheets.length !== 1 ? 's' : ''} ·{' '}
                  {data.sheets.reduce((n, s) => n + s.rows.length, 0)} rows
                </p>
              </div>
            </div>

            {/* Link field */}
            {error ? (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />{error}
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Share link</label>
                <div className="flex gap-2">
                  <div className="relative flex-1 min-w-0">
                    {isGenerating ? (
                      <div className="flex items-center gap-2 h-10 px-3 rounded-xl border border-border bg-background text-xs text-muted-foreground">
                        <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                        Generating link…
                      </div>
                    ) : (
                      <input
                        ref={inputRef}
                        readOnly
                        value={link ?? ''}
                        onClick={() => inputRef.current?.select()}
                        className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-text font-mono truncate"
                      />
                    )}
                  </div>

                  <motion.button
                    onClick={handleCopy}
                    disabled={isGenerating || !link}
                    whileHover={link ? { scale: 1.04 } : {}}
                    whileTap={link ? { scale: 0.96 } : {}}
                    className={cn(
                      'shrink-0 flex items-center gap-1.5 px-4 h-10 rounded-xl text-sm font-semibold transition-all',
                      copied
                        ? 'bg-green-500 text-white'
                        : isGenerating || !link
                        ? 'bg-muted text-muted-foreground cursor-not-allowed'
                        : 'bg-primary text-primary-foreground hover:bg-primary/90',
                    )}
                  >
                    <AnimatePresence mode="wait" initial={false}>
                      {copied ? (
                        <motion.span
                          key="check"
                          initial={{ opacity: 0, scale: 0.7 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.7 }}
                          className="flex items-center gap-1.5"
                        >
                          <Check className="w-4 h-4" /> Copied!
                        </motion.span>
                      ) : (
                        <motion.span
                          key="copy"
                          initial={{ opacity: 0, scale: 0.7 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.7 }}
                          className="flex items-center gap-1.5"
                        >
                          <Copy className="w-4 h-4" /> Copy
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.button>
                </div>

                {/* Open in new tab */}
                {link && (
                  <motion.a
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" /> Open in new tab to preview
                  </motion.a>
                )}
              </div>
            )}

            {/* Note */}
            <p className="text-[11px] text-muted-foreground/60 leading-relaxed">
              The full spreadsheet is encoded in the link — no account required to view. The link is valid as long as it's shared.
            </p>
          </div>

          {/* Footer */}
          <div className="px-5 pb-5">
            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              Done
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
