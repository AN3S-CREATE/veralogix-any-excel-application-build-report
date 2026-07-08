import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileSpreadsheet, Clock, Layers, RefreshCw, Sparkles, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { fetchSessions } from '../lib/ai-service';
import type { SessionRecord } from '../lib/ai-service';

const TYPE_META: Record<string, { emoji: string; label: string; color: string }> = {
  meeting_notes: { emoji: '📋', label: 'Meeting Notes',   color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  sales_data:    { emoji: '📈', label: 'Sales Data',      color: 'bg-green-500/10 text-green-400 border-green-500/20' },
  financial:     { emoji: '💰', label: 'Financial',       color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
  inventory:     { emoji: '📦', label: 'Inventory',       color: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
  project_tasks: { emoji: '✅', label: 'Project Tasks',   color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  customer_feedback: { emoji: '⭐', label: 'Feedback',   color: 'bg-pink-500/10 text-pink-400 border-pink-500/20' },
  report:        { emoji: '📊', label: 'Report',          color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
  other:         { emoji: '🗂️', label: 'Spreadsheet',    color: 'bg-muted text-muted-foreground border-border' },
};

function getMeta(type: string) {
  return TYPE_META[type] ?? TYPE_META['other'];
}

function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins  < 1)  return 'Just now';
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days  < 7)  return `${days}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// Skeleton card
function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 animate-pulse">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-muted" />
          <div>
            <div className="h-4 w-36 bg-muted rounded mb-2" />
            <div className="h-3 w-20 bg-muted/60 rounded" />
          </div>
        </div>
        <div className="h-5 w-16 bg-muted rounded-full" />
      </div>
      <div className="h-3 w-full bg-muted/50 rounded mb-1.5" />
      <div className="h-3 w-2/3 bg-muted/40 rounded" />
    </div>
  );
}

interface RecentSessionsProps {
  onGetStarted: () => void;
}

export const RecentSessions: React.FC<RecentSessionsProps> = ({ onGetStarted }) => {
  const [sessions, setSessions] = React.useState<SessionRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await fetchSessions();
      setSessions(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  return (
    <div className="w-full">
      {/* Header row */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-foreground">Recent Spreadsheets</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {loading ? 'Loading…' : error ? 'Could not load sessions' : `${sessions.length} session${sessions.length !== 1 ? 's' : ''} found`}
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="p-2 rounded-lg border border-border bg-card hover:bg-muted transition-colors disabled:opacity-40"
          title="Refresh"
        >
          <RefreshCw className={cn('w-4 h-4 text-muted-foreground', loading && 'animate-spin')} />
        </button>
      </div>

      {/* Skeleton */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2, 3, 4, 5].map(i => <SkeletonCard key={i} />)}
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
            <AlertCircle className="w-7 h-7 text-destructive" />
          </div>
          <p className="font-semibold text-foreground mb-1">Failed to load sessions</p>
          <p className="text-sm text-muted-foreground mb-6">Check your connection and try again.</p>
          <button onClick={load} className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
            Retry
          </button>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && sessions.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center mb-5">
            <FileSpreadsheet className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">No sessions yet</h3>
          <p className="text-sm text-muted-foreground max-w-xs mb-8 leading-relaxed">
            Your generated spreadsheets will appear here. Create your first one to get started.
          </p>
          <motion.button
            onClick={onGetStarted}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow-md shadow-primary/20 hover:bg-primary/90 transition-all"
          >
            <Sparkles className="w-4 h-4" />
            Create Your First Spreadsheet
          </motion.button>
        </motion.div>
      )}

      {/* Grid */}
      {!loading && !error && sessions.length > 0 && (
        <AnimatePresence>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sessions.map((session, i) => {
              const meta = getMeta(session.dataType);
              return (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.3 }}
                  className="group rounded-2xl border border-border bg-card hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200 p-5 flex flex-col gap-3"
                >
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 text-xl">
                        {meta.emoji}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-foreground text-sm leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                          {session.title}
                        </h3>
                        <span className={cn('inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium border', meta.color)}>
                          {meta.label}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Input preview */}
                  {session.inputPreview && (
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {session.inputPreview}
                    </p>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between mt-auto pt-2 border-t border-border/60">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Layers className="w-3.5 h-3.5" />
                      {session.sheetCount} sheet{session.sheetCount !== 1 ? 's' : ''}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="w-3.5 h-3.5" />
                      {timeAgo(session.createdAt)}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </AnimatePresence>
      )}

      {/* Create new CTA (when sessions exist) */}
      {!loading && !error && sessions.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-8 flex justify-center"
        >
          <button
            onClick={onGetStarted}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-primary/30 bg-primary/5 text-primary text-sm font-semibold hover:bg-primary/10 transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            Create New Spreadsheet
          </button>
        </motion.div>
      )}
    </div>
  );
};
