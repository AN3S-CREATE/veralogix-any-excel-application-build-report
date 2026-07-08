import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Sparkles, Plus, Trash2, Loader2, Check, RotateCcw, Info, ChevronUp, Wand2, Clock, Search, X, ChevronLeft, ChevronRight as ChevronRightIcon, Share2, FunctionSquare, Sigma, Equal } from 'lucide-react';
import { cn } from '../lib/utils';
import { reviseSpreadsheet, saveSession } from '../lib/ai-service';
import { exportToXlsx } from '../lib/excel-export';
import type { SpreadsheetData, SheetData } from '../types';
import { DATA_TYPE_ICONS, DATA_TYPE_LABELS } from '../types';
import { useSwipeSheet } from '../hooks/useSwipeSheet';
import { ShareModal } from './ShareModal';
import { FormulaHelper, FORMULA_FUNCTIONS } from './FormulaHelper';
import { isFormula, getCellDisplayValue } from '../lib/formula-engine';

interface SpreadsheetEditorProps {
  data: SpreadsheetData;
  onDataChange: (data: SpreadsheetData) => void;
  onExport: () => void;
}

// Splits text into matching / non-matching segments without regex
function getSegments(text: string, query: string): Array<{ part: string; match: boolean }> {
  if (!query) return [{ part: text, match: false }];
  const results: Array<{ part: string; match: boolean }> = [];
  const lo = text.toLowerCase();
  const lq = query.toLowerCase();
  let cursor = 0;
  while (cursor < text.length) {
    const idx = lo.indexOf(lq, cursor);
    if (idx === -1) { results.push({ part: text.slice(cursor), match: false }); break; }
    if (idx > cursor) results.push({ part: text.slice(cursor, idx), match: false });
    results.push({ part: text.slice(idx, idx + query.length), match: true });
    cursor = idx + query.length;
  }
  return results;
}

function EditableCell({
  value, onChange, isHeader, searchQuery, isChanged, onSelect, formulaDisplayValue, isSelected,
}: {
  value: string;
  onChange: (v: string) => void;
  isHeader?: boolean;
  searchQuery?: string;
  isChanged?: boolean;
  onSelect?: () => void;
  formulaDisplayValue?: string;
  isSelected?: boolean;
}) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(value);
  const hasFormula = isFormula(value);
  React.useEffect(() => { setDraft(value); }, [value]);
  const commit = () => { setEditing(false); if (draft !== value) onChange(draft); };

  if (editing) {
    return (
      <input
        autoFocus value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === 'Enter') { e.preventDefault(); commit(); }
          if (e.key === 'Escape') { setDraft(value); setEditing(false); }
        }}
        className={cn('w-full px-2 py-1 text-xs font-mono outline-none ring-2 ring-primary ring-inset bg-background', isHeader ? 'font-semibold' : '')}
        style={{ minWidth: 120 }}
        placeholder={hasFormula ? '=SUM(A2:A5)' : undefined}
      />
    );
  }

  const displayText = hasFormula ? (formulaDisplayValue ?? value) : value;
  const isErr = hasFormula && displayText === '#ERROR!';
  const segments = getSegments(displayText, searchQuery ?? '');

  return (
    <div className="relative w-full overflow-hidden" style={{ minWidth: 120 }}>
      <AnimatePresence>
        {isChanged && (
          <motion.div
            key="flash"
            initial={{ opacity: 0.7 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            className="absolute inset-0 bg-green-400/30 dark:bg-green-500/25 pointer-events-none z-10 rounded-sm"
          />
        )}
      </AnimatePresence>
      <div
        className={cn(
          'px-2 py-1.5 text-sm truncate cursor-text select-none transition-colors relative',
          isHeader ? 'font-semibold text-primary' : hasFormula ? 'font-mono text-xs' : 'text-foreground',
          hasFormula && !isSelected && !isErr ? 'text-blue-600 dark:text-blue-400' : '',
          isErr ? 'text-red-500 dark:text-red-400 font-semibold' : '',
          'hover:bg-primary/5',
          isSelected ? 'bg-primary/[0.07] ring-1 ring-inset ring-primary/25' : '',
          isChanged ? 'font-medium' : '',
        )}
        onClick={() => onSelect?.()}
        onDoubleClick={() => setEditing(true)}
        title={hasFormula ? `${value} → ${displayText}` : value}
      >
        {hasFormula && !isSelected && !isErr && (
          <FunctionSquare className="absolute left-0.5 top-1/2 -translate-y-1/2 w-3 h-3 text-blue-400/60 pointer-events-none" />
        )}
        {hasFormula && !isSelected ? (
          <span className={cn(isErr ? '' : 'pl-3.5')}>{displayText}</span>
        ) : hasFormula && isSelected ? (
          <span className="font-mono text-xs text-foreground">{value}</span>
        ) : displayText
          ? segments.map((seg, i) =>
              seg.match
                ? <mark key={i} className="bg-yellow-300/70 dark:bg-yellow-500/40 text-foreground rounded-sm px-0.5">{seg.part}</mark>
                : <React.Fragment key={i}>{seg.part}</React.Fragment>
            )
          : <span className="text-muted-foreground/40 italic text-xs">Empty</span>
        }
      </div>
    </div>
  );
}

type RevisionEntry = { prompt: string; timestamp: Date; };

export const SpreadsheetEditor: React.FC<SpreadsheetEditorProps> = ({ data, onDataChange, onExport }) => {
  const [activeSheet, setActiveSheet] = React.useState(0);
  const [revisionPrompt, setRevisionPrompt] = React.useState('');
  const [isRevising, setIsRevising] = React.useState(false);
  const [revisionError, setRevisionError] = React.useState<string | null>(null);
  const [revisionSuccess, setRevisionSuccess] = React.useState(false);
  const [revisionLog, setRevisionLog] = React.useState<RevisionEntry[]>([]);
  const [showLog, setShowLog] = React.useState(false);
  const [isSaved, setIsSaved] = React.useState(false);
  const [history, setHistory] = React.useState<SpreadsheetData[]>([data]);
  const [historyIdx, setHistoryIdx] = React.useState(0);
  const [filterQuery, setFilterQuery] = React.useState('');
  // Set of "sheetIdx:ri:ci" keys for cells that changed in the last revision
  const [changedCells, setChangedCells] = React.useState<Set<string>>(new Set());
  const [hoveredRow, setHoveredRow] = React.useState<number | null>(null);
  const [showStickyBtn, setShowStickyBtn] = React.useState(false);
  const [showShare, setShowShare] = React.useState(false);
  const [selectedCell, setSelectedCell] = React.useState<{ row: number; col: number } | null>(null);
  const filterInputRef = React.useRef<HTMLInputElement>(null);
  const formulaInputRef = React.useRef<HTMLInputElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const headerExportRef = React.useRef<HTMLButtonElement>(null);

  // ── Swipe-to-switch-sheet (mobile) ──────────────────────────────────────
  const gridRef = React.useRef<HTMLDivElement>(null);
  const [swipeHint, setSwipeHint] = React.useState<{
    label: string;
    direction: 'left' | 'right';
  } | null>(null);

  const handleSwipe = React.useCallback(
    (newIndex: number, direction: 'left' | 'right') => {
      setActiveSheet(newIndex);
      setSwipeHint({ label: data.sheets[newIndex]?.name ?? `Sheet ${newIndex + 1}`, direction });
      setTimeout(() => setSwipeHint(null), 1400);
    },
    [data.sheets],
  );

  useSwipeSheet(gridRef, {
    sheetCount: data.sheets.length,
    activeSheet,
    onSwipe: handleSwipe,
  });

  React.useEffect(() => { saveSession(data.title, data.dataType, '', data.sheets.length); }, []);
  // Clear filter and selection when sheet changes
  React.useEffect(() => { setFilterQuery(''); setSelectedCell(null); }, [activeSheet]);

  // Keyboard navigation for selected cell
  React.useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!selectedCell || sheet.rows.length === 0) return;
      const { row, col } = selectedCell;

      // If user is typing in the formula bar, don't intercept
      if (e.target === formulaInputRef.current) return;

      let nr = row;
      let nc = col;
      if (e.key === 'ArrowUp') nr = Math.max(0, row - 1);
      else if (e.key === 'ArrowDown') nr = Math.min(sheet.rows.length - 1, row + 1);
      else if (e.key === 'ArrowLeft') nc = Math.max(0, col - 1);
      else if (e.key === 'ArrowRight') nc = Math.min(sheet.columns.length - 1, col + 1);
      else if (e.key === 'Escape') { setSelectedCell(null); return; }
      else if (e.key === 'Enter' || e.key === 'F2') {
        formulaInputRef.current?.focus();
        formulaInputRef.current?.select();
        return;
      }
      else if (e.key === 'Tab') {
        e.preventDefault();
        nc = Math.min(sheet.columns.length - 1, col + 1);
        if (nc === col) { nr = Math.min(sheet.rows.length - 1, row + 1); nc = 0; }
        if (nr !== row || nc !== col) setSelectedCell({ row: nr, col: nc });
        return;
      }
      // Direct typing: jump to formula bar and start editing
      else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        const currentVal = sheet.rows[row]?.[col] ?? '';
        const newVal = e.key === '=' ? '=' : e.key;
        updateCell(row, col, newVal);
        setTimeout(() => {
          formulaInputRef.current?.focus();
          if (newVal.length === 1 && newVal !== '=') formulaInputRef.current?.setSelectionRange(1, 1);
        }, 30);
        return;
      }
      else return;
      e.preventDefault();
      if (nr !== row || nc !== col) setSelectedCell({ row: nr, col: nc });
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [selectedCell, sheet.rows.length, sheet.columns.length, sheet.rows]);

  // Show sticky FAB when the header download button scrolls out of view (mobile only)
  React.useEffect(() => {
    const btn = headerExportRef.current;
    if (!btn) return;
    const obs = new IntersectionObserver(
      ([entry]) => setShowStickyBtn(!entry.isIntersecting),
      { threshold: 0 },
    );
    obs.observe(btn);
    return () => obs.disconnect();
  }, []);

  const sheet = data.sheets[Math.min(activeSheet, data.sheets.length - 1)];

  const trimmed = filterQuery.trim().toLowerCase();
  // Precompute formula display values
  const formulaDisplayCache = React.useMemo(() => {
    return sheet.rows.map(row =>
      row.map(cell => {
        if (isFormula(cell)) return getCellDisplayValue(cell, sheet.rows);
        return null;
      })
    );
  }, [sheet.rows]);

  const selectedCellRaw = React.useMemo(() => {
    if (!selectedCell) return null;
    const row = sheet.rows[selectedCell.row];
    if (!row) return null;
    return { value: row[selectedCell.col] ?? '', hasFormula: isFormula(row[selectedCell.col] ?? '') };
  }, [selectedCell, sheet.rows]);

  const filteredRows: Array<{ row: string[]; originalIndex: number }> = React.useMemo(() => {
    if (!trimmed) return sheet.rows.map((row, i) => ({ row, originalIndex: i }));
    return sheet.rows
      .map((row, i) => ({ row, originalIndex: i }))
      .filter(({ row }) => row.some(cell => cell.toLowerCase().includes(trimmed)));
  }, [sheet.rows, trimmed]);

  const pushHistory = (newData: SpreadsheetData) => {
    const h = [...history.slice(0, historyIdx + 1), newData];
    setHistory(h); setHistoryIdx(h.length - 1); onDataChange(newData);
  };

  const updateSheet = (updated: SheetData) =>
    pushHistory({ ...data, sheets: data.sheets.map((s, i) => i === activeSheet ? updated : s) });

  const undo = () => { if (historyIdx > 0) { setHistoryIdx(historyIdx - 1); onDataChange(history[historyIdx - 1]); } };

  const updateCell = (ri: number, ci: number, v: string) =>
    updateSheet({ ...sheet, rows: sheet.rows.map((row, r) => r === ri ? row.map((c, ci2) => ci2 === ci ? v : c) : row) });

  const updateHeader = (ci: number, v: string) =>
    updateSheet({ ...sheet, columns: sheet.columns.map((c, i) => i === ci ? v : c) });

  const addRow = () => updateSheet({ ...sheet, rows: [...sheet.rows, new Array(sheet.columns.length).fill('')] });
  const removeRow = (ri: number) => updateSheet({ ...sheet, rows: sheet.rows.filter((_, i) => i !== ri) });
  const addColumn = () => updateSheet({ ...sheet, columns: [...sheet.columns, `Col ${sheet.columns.length + 1}`], rows: sheet.rows.map(r => [...r, '']) });

  const handleRevise = async () => {
    const prompt = revisionPrompt.trim();
    if (!prompt || isRevising) return;
    setIsRevising(true);
    setRevisionError(null);
    setRevisionSuccess(false);
    try {
      const revised = await reviseSpreadsheet(data, prompt);

      // Diff every sheet to find changed cells
      const changed = new Set<string>();
      revised.sheets.forEach((newSheet, si) => {
        const oldSheet = data.sheets[si];
        if (!oldSheet) return;
        // Check header columns
        newSheet.columns.forEach((col, ci) => {
          if (col !== (oldSheet.columns[ci] ?? '')) changed.add(`${si}:h:${ci}`);
        });
        // Check data rows
        newSheet.rows.forEach((row, ri) => {
          row.forEach((cell, ci) => {
            if (cell !== ((oldSheet.rows[ri] ?? [])[ci] ?? '')) changed.add(`${si}:${ri}:${ci}`);
          });
        });
      });
      setChangedCells(changed);
      // Fade-out lasts 1.2s; clear state cleanly after 2s
      setTimeout(() => setChangedCells(new Set()), 2000);

      pushHistory(revised);
      setRevisionLog(prev => [{ prompt, timestamp: new Date() }, ...prev]);
      setRevisionPrompt('');
      setRevisionSuccess(true);
      setTimeout(() => setRevisionSuccess(false), 3000);
    } catch {
      setRevisionError('Revision failed. Please try again.');
    } finally {
      setIsRevising(false);
    }
  };

  const handleExport = () => {
    exportToXlsx(data); setIsSaved(true); onExport();
    setTimeout(() => setIsSaved(false), 3000);
  };

  const suggestions = [
    { label: '📊 Add totals row', prompt: 'Add a summary row with totals at the bottom' },
    { label: '🔺 Sort by priority', prompt: 'Sort rows by priority with High first, then Medium, then Low' },
    { label: '✅ Add status column', prompt: 'Add a Status column with appropriate values' },
    { label: '🧹 Remove empty rows', prompt: 'Remove any empty or blank rows' },
    { label: '📅 Add dates', prompt: 'Add realistic date values to any date columns' },
    { label: '💡 Add notes column', prompt: 'Add a Notes column for additional context' },
  ];

  const canUndo = historyIdx > 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-base sm:text-lg">{DATA_TYPE_ICONS[data.dataType] || '🗂️'}</span>
            <h2 className="text-base sm:text-lg font-bold text-foreground truncate">{data.title}</h2>
          </div>
          {data.summary && (
            <p className="text-xs sm:text-sm text-muted-foreground flex items-start gap-1.5 line-clamp-2">
              <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />{data.summary}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={undo} disabled={!canUndo}
            className="p-2 rounded-lg border border-border bg-card hover:bg-muted transition-colors disabled:opacity-40" title="Undo last change">
            <RotateCcw className="w-4 h-4" />
          </button>
          <motion.button
            onClick={() => setShowShare(true)}
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            title="Share spreadsheet"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-card text-foreground text-xs sm:text-sm font-semibold hover:bg-muted transition-all"
          >
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">Share</span>
          </motion.button>
          <motion.button ref={headerExportRef} onClick={handleExport} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            className={cn('flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl font-semibold text-xs sm:text-sm transition-all shadow-md whitespace-nowrap',
              isSaved ? 'bg-green-500 text-white' : 'bg-primary text-primary-foreground shadow-primary/20 hover:bg-primary/90')}>
            {isSaved ? <><Check className="w-4 h-4" /> Downloaded!</> : <><Download className="w-4 h-4" /> <span className="hidden sm:inline">Download </span>.xlsx</>}
          </motion.button>
        </div>
      </div>

      {/* Sheet tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {data.sheets.map((s, i) => (
          <button key={i} onClick={() => setActiveSheet(i)}
            className={cn('px-3 py-1.5 rounded-t-lg text-sm font-medium border border-b-0 transition-all whitespace-nowrap',
              i === activeSheet ? 'bg-card border-border text-foreground shadow-sm' : 'bg-muted border-transparent text-muted-foreground hover:text-foreground')}>
            {s.name}
          </button>
        ))}
        {/* Swipe discovery hint — only shown on touch devices when >1 sheet */}
        {data.sheets.length > 1 && (
          <span className="lg:hidden ml-auto shrink-0 flex items-center gap-1 text-[10px] text-muted-foreground/60 pr-1 select-none">
            <ChevronLeft className="w-3 h-3" />swipe<ChevronRightIcon className="w-3 h-3" />
          </span>
        )}
      </div>

      {/* ── Search / Filter bar ── */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            ref={filterInputRef}
            type="text"
            value={filterQuery}
            onChange={e => setFilterQuery(e.target.value)}
            onKeyDown={e => e.key === 'Escape' && setFilterQuery('')}
            placeholder="Filter rows… type any keyword"
            className="w-full pl-9 pr-9 py-2 text-sm rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
          />
          <AnimatePresence>
            {filterQuery && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={() => { setFilterQuery(''); filterInputRef.current?.focus(); }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Live match badge */}
        <AnimatePresence>
          {trimmed && (
            <motion.span
              key="badge"
              initial={{ opacity: 0, x: 6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 6 }}
              className={cn(
                'shrink-0 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors',
                filteredRows.length > 0
                  ? 'bg-primary/10 text-primary border-primary/20'
                  : 'bg-destructive/10 text-destructive border-destructive/20'
              )}
            >
              {filteredRows.length} / {sheet.rows.length} rows
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* ── Formula Bar ── */}
      <div className="relative">
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-border bg-muted/40">
          {/* fx button */}
          <button
            onClick={() => {
              if (!selectedCell) return;
              const raw = sheet.rows[selectedCell.row]?.[selectedCell.col] ?? '';
              if (!raw.startsWith('=')) {
                updateCell(selectedCell.row, selectedCell.col, '=');
                setTimeout(() => formulaInputRef.current?.focus(), 50);
              }
            }}
            className={cn(
              'shrink-0 w-7 h-7 rounded-lg flex items-center justify-center border transition-all',
              selectedCellRaw?.hasFormula
                ? 'bg-primary/15 border-primary/30 text-primary'
                : 'bg-transparent border-transparent text-muted-foreground hover:text-primary hover:bg-primary/10',
            )}
            title="Insert function"
          >
            <Sigma className="w-3.5 h-3.5" />
          </button>

          {/* Cell reference indicator */}
          <span className={cn(
            'text-[11px] font-bold shrink-0 min-w-[2.5rem] text-center px-1.5 py-0.5 rounded-md border transition-colors',
            selectedCell
              ? 'bg-primary/10 border-primary/20 text-primary'
              : 'bg-transparent border-transparent text-muted-foreground/60',
          )}>
            {selectedCell
              ? `${String.fromCharCode(65 + selectedCell.col)}${selectedCell.row + 1}`
              : '—'}
          </span>

          {/* Formula/value input */}
          <div className="flex-1 min-w-0 flex items-center gap-2">
            {selectedCellRaw ? (
              <div className="flex-1 flex items-center gap-2 min-w-0">
                <input
                  ref={formulaInputRef}
                  value={selectedCellRaw.value}
                  onChange={e => {
                    if (!selectedCell) return;
                    updateCell(selectedCell.row, selectedCell.col, e.target.value);
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Escape') { setSelectedCell(null); formulaInputRef.current?.blur(); }
                    if (e.key === 'Enter') { formulaInputRef.current?.blur(); }
                  }}
                  placeholder="Enter value or formula (e.g. =SUM(A2:A10))"
                  className={cn(
                    'flex-1 min-w-0 bg-transparent text-sm px-1.5 py-0.5 rounded focus:outline-none focus:bg-background focus:ring-1 focus:ring-primary/30 transition-all',
                    selectedCellRaw.hasFormula
                      ? 'font-mono text-xs text-blue-600 dark:text-blue-400'
                      : 'text-foreground',
                  )}
                />
                {/* Computed result chip for formulas */}
                {selectedCellRaw.hasFormula && selectedCell && (
                  <span className="shrink-0 flex items-center gap-1 text-[11px] font-medium text-muted-foreground bg-background px-2 py-0.5 rounded-md border border-border">
                    <Equal className="w-3 h-3 text-green-500" />
                    <span className="font-mono text-green-600 dark:text-green-400 max-w-[140px] truncate">
                      {formulaDisplayCache[selectedCell.row]?.[selectedCell.col] ?? '#ERR'}
                    </span>
                  </span>
                )}
              </div>
            ) : (
              <span className="text-sm text-muted-foreground/50 px-1.5 select-none">
                Click a cell then type a value, or press <kbd className="font-mono text-[10px] px-1 py-0.5 rounded border border-border bg-background">=</kbd> to start a formula
              </span>
            )}
          </div>

          {/* Right-side indicator */}
          {selectedCellRaw?.hasFormula && (
            <span className="shrink-0 text-[9px] font-semibold uppercase tracking-wider text-primary/70 bg-primary/10 px-1.5 py-0.5 rounded select-none">
              fx
            </span>
          )}
        </div>

        {/* Formula helper popover */}
        <FormulaHelper
          inputText={selectedCellRaw?.value ?? ''}
          visible={!!(selectedCellRaw?.value.startsWith('='))}
          onSelect={(fnName) => {
            if (!selectedCell) return;
            const sanitized = fnName + '(';
            const currentVal = selectedCellRaw?.value ?? '';
            if (currentVal === '=') {
              updateCell(selectedCell.row, selectedCell.col, `=${sanitized}`);
            } else if (currentVal.startsWith('=')) {
              const afterEqual = currentVal.slice(1);
              // Replace the partial function name after =
              const parenIdx = afterEqual.indexOf('(');
              const prefix = afterEqual.slice(0, parenIdx > -1 ? parenIdx : afterEqual.length);
              const match = FORMULA_FUNCTIONS.find(f => f.name.toLowerCase().startsWith(prefix.toLowerCase()));
              if (match) {
                updateCell(selectedCell.row, selectedCell.col, `=${sanitized}${afterEqual.slice(match.name.length)}`);
              } else {
                updateCell(selectedCell.row, selectedCell.col, `=${sanitized}`);
              }
            }
            setTimeout(() => formulaInputRef.current?.focus(), 50);
          }}
        />
      </div>

      {/* Grid with revision overlay + swipe gesture */}
      <div className="relative">
        {/* Swipe sheet hint pill — mobile only */}
        <AnimatePresence>
          {swipeHint && (
            <motion.div
              key="swipe-hint"
              initial={{ opacity: 0, y: 8, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.92 }}
              transition={{ duration: 0.18 }}
              className="absolute top-2 left-1/2 -translate-x-1/2 z-30 lg:hidden pointer-events-none"
            >
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-foreground/90 dark:bg-background/90 backdrop-blur-sm shadow-lg border border-border text-xs font-semibold text-background dark:text-foreground whitespace-nowrap">
                {swipeHint.direction === 'right'
                  ? <ChevronLeft className="w-3.5 h-3.5 opacity-70" />
                  : null}
                {swipeHint.label}
                {swipeHint.direction === 'left'
                  ? <ChevronRightIcon className="w-3.5 h-3.5 opacity-70" />
                  : null}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={gridRef} className="border border-border rounded-xl bg-card overflow-auto shadow-sm max-h-[280px] sm:max-h-[380px]">
          <div className="min-w-max">
            {/* Header row */}
            <div className="flex border-b-2 border-border bg-muted/60 sticky top-0 z-10">
              <div className="w-12 min-w-[48px] border-r border-border px-2 py-2 flex items-center justify-center">
                <span className="text-xs text-muted-foreground font-mono">#</span>
              </div>
              {sheet.columns.map((col, ci) => (
                <div key={ci} className="border-r border-border flex items-center" style={{ minWidth: 140 }}>
                  <EditableCell
                    value={col}
                    onChange={v => updateHeader(ci, v)}
                    isHeader
                    searchQuery={trimmed}
                    isChanged={changedCells.has(`${activeSheet}:h:${ci}`)}
                    onSelect={() => setSelectedCell(null)}
                  />
                </div>
              ))}
              <button onClick={addColumn} disabled={!!trimmed} className="px-3 py-2 text-muted-foreground hover:text-primary hover:bg-primary/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors border-l border-border">
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Data rows (filtered) */}
            {filteredRows.length > 0
              ? filteredRows.map(({ row, originalIndex: ri }, displayIdx) => {
                  const isHovered = hoveredRow === ri;
                  return (
                    <div
                      key={ri}
                      onMouseEnter={() => setHoveredRow(ri)}
                      onMouseLeave={() => setHoveredRow(null)}
                      className={cn(
                        'flex border-b border-border group transition-all duration-150',
                        isHovered
                          ? 'bg-amber-50/60 dark:bg-amber-900/15'
                          : displayIdx % 2 === 0 ? 'bg-card' : 'bg-muted/20',
                      )}
                      style={{
                        boxShadow: isHovered
                          ? 'inset 3px 0 0 0 rgb(245 158 11 / 0.7)'
                          : 'inset 3px 0 0 0 transparent',
                        transition: 'background-color 150ms ease, box-shadow 150ms ease',
                      }}
                    >
                      {/* Row number gutter */}
                      <div
                        className={cn(
                          'w-12 min-w-[48px] border-r border-border flex items-center justify-center text-xs font-mono transition-all duration-150',
                          isHovered
                            ? 'bg-amber-100/70 dark:bg-amber-800/20 text-amber-700 dark:text-amber-400 font-semibold'
                            : 'bg-muted/30 text-muted-foreground',
                        )}
                      >
                        {ri + 1}
                      </div>
                      {row.map((cell, ci) => {
                        const isSel = selectedCell?.row === ri && selectedCell?.col === ci;
                        return (
                          <div key={ci} data-cell className="border-r border-border flex items-center" style={{ minWidth: 140 }}>
                            <EditableCell
                              value={cell}
                              onChange={v => updateCell(ri, ci, v)}
                              searchQuery={trimmed}
                              isChanged={changedCells.has(`${activeSheet}:${ri}:${ci}`)}
                              formulaDisplayValue={formulaDisplayCache[ri]?.[ci] ?? undefined}
                              isSelected={isSel}
                              onSelect={() => setSelectedCell({ row: ri, col: ci })}
                            />
                          </div>
                        );
                      })}
                      <button
                        onClick={() => removeRow(ri)}
                        disabled={!!trimmed}
                        className="px-2 opacity-0 group-hover:opacity-100 disabled:opacity-0 text-muted-foreground hover:text-destructive transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })
              : (
                /* No-match empty state */
                <div className="flex flex-col items-center justify-center py-12 text-center gap-2">
                  <Search className="w-7 h-7 text-muted-foreground/40" />
                  <p className="text-sm font-medium text-muted-foreground">No rows match "{filterQuery}"</p>
                  <button onClick={() => setFilterQuery('')} className="text-xs text-primary hover:underline">Clear filter</button>
                </div>
              )
            }

            {/* Add row (hidden when filtering) */}
            {!trimmed && (
              <div className="flex">
                <div className="w-12 min-w-[48px] border-r border-border bg-muted/10" />
                <button onClick={addRow} className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors">
                  <Plus className="w-4 h-4" /> Add row
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Revising overlay */}
        <AnimatePresence>
          {isRevising && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 rounded-xl bg-background/70 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-20"
            >
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Wand2 className="w-6 h-6 text-primary animate-pulse" />
              </div>
              <p className="text-sm font-semibold text-foreground">AI is revising your data…</p>
              <p className="text-xs text-muted-foreground max-w-[200px] text-center">"{revisionPrompt}"</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Status bar */}
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground bg-muted/30 border border-border rounded-lg px-3 py-1.5 flex-wrap">
        {/* Cell info */}
        {selectedCell ? (
          <span className="flex items-center gap-1.5">
            <span className="font-bold text-foreground bg-primary/10 px-1.5 py-0.5 rounded text-[10px]">
              {String.fromCharCode(65 + selectedCell.col)}{selectedCell.row + 1}
            </span>
            {selectedCellRaw?.hasFormula ? (
              <span className="flex items-center gap-1">
                <FunctionSquare className="w-3 h-3 text-blue-400" />
                <span className="font-mono text-[10px] text-blue-600 dark:text-blue-400 max-w-[200px] truncate">
                  {selectedCellRaw.value}
                </span>
                <span className="text-muted-foreground/50">→</span>
                <span className="font-mono text-[10px] font-medium text-green-600 dark:text-green-400">
                  {formulaDisplayCache[selectedCell.row]?.[selectedCell.col] ?? '#ERR'}
                </span>
              </span>
            ) : (
              <span className="font-medium text-foreground max-w-[200px] truncate">
                {selectedCellRaw?.value || '(empty)'}
              </span>
            )}
          </span>
        ) : (
          <span className="flex items-center gap-1">
            <Info className="w-3 h-3" />
            {trimmed
              ? <><strong className="text-foreground">{filteredRows.length}</strong> of {sheet.rows.length} rows</>
              : <>{sheet.rows.length} rows · {sheet.columns.length} cols · {data.sheets.length} sheets</>
            }
          </span>
        )}

        <span className="text-border/70 select-none">|</span>

        {/* Formula count */}
        {(() => {
          const formulaCount = sheet.rows.reduce((acc, row) =>
            acc + row.filter(c => isFormula(c)).length, 0);
          return (
            <span className="flex items-center gap-1">
              <Sigma className="w-3 h-3" />
              {formulaCount} formula{formulaCount !== 1 ? 's' : ''}
            </span>
          );
        })()}

        <span className="flex items-center gap-1 ml-auto text-[10px] text-muted-foreground/60">
          <kbd className="font-mono px-1 py-0.5 rounded bg-muted border border-border text-[9px]">=</kbd>formula
          <kbd className="font-mono px-1 py-0.5 rounded bg-muted border border-border text-[9px]">↑↓←→</kbd>navigate
          <kbd className="font-mono px-1 py-0.5 rounded bg-muted border border-border text-[9px]">Enter</kbd>edit
        </span>
      </div>

      {/* ── AI Revision Panel ── */}
      <motion.div
        layout
        className="border border-primary/20 rounded-2xl bg-card overflow-hidden shadow-sm"
      >
        {/* Panel header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-primary/5">
          <Sparkles className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground flex-1">AI Revision Assistant</h3>
          {revisionLog.length > 0 && (
            <button
              onClick={() => setShowLog(v => !v)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Clock className="w-3.5 h-3.5" />
              {revisionLog.length} applied
              <ChevronUp className={cn('w-3.5 h-3.5 transition-transform', showLog ? '' : 'rotate-180')} />
            </button>
          )}
        </div>

        <div className="p-4 space-y-3">
          {/* Revision log */}
          <AnimatePresence>
            {showLog && revisionLog.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="rounded-xl border border-border bg-muted/30 divide-y divide-border mb-1">
                  {revisionLog.map((entry, i) => (
                    <div key={i} className="flex items-start gap-2 px-3 py-2">
                      <Check className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-foreground truncate">"{entry.prompt}"</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {entry.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <button
                        onClick={() => setRevisionPrompt(entry.prompt)}
                        className="text-[10px] text-primary hover:underline shrink-0"
                      >
                        Reuse
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Suggestion chips */}
          <div className="flex flex-wrap gap-2">
            {suggestions.map(s => (
              <button
                key={s.prompt}
                onClick={() => { setRevisionPrompt(s.prompt); textareaRef.current?.focus(); }}
                className="px-2.5 py-1 rounded-lg bg-muted text-xs text-muted-foreground hover:text-foreground hover:bg-primary/10 hover:border-primary/30 border border-transparent transition-all"
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Textarea + Send */}
          <div className="flex flex-col gap-2">
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={revisionPrompt}
                onChange={e => setRevisionPrompt(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleRevise(); } }}
                rows={2}
                placeholder="Describe your changes… e.g. 'Add a Budget column', 'Sort by deadline', 'Add totals row'"
                className="w-full px-3 sm:px-4 py-3 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all resize-none"
              />
              <p className="hidden sm:block absolute bottom-2 right-3 text-[10px] text-muted-foreground pointer-events-none">
                ↵ to send · Shift+↵ newline
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <motion.button
                onClick={handleRevise}
                disabled={!revisionPrompt.trim() || isRevising}
                whileHover={revisionPrompt.trim() && !isRevising ? { scale: 1.02 } : {}}
                whileTap={revisionPrompt.trim() && !isRevising ? { scale: 0.98 } : {}}
                className={cn(
                  'flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm',
                  revisionPrompt.trim() && !isRevising
                    ? 'bg-primary text-primary-foreground shadow-primary/20 hover:bg-primary/90'
                    : 'bg-muted text-muted-foreground cursor-not-allowed'
                )}
              >
                {isRevising
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Revising…</>
                  : revisionSuccess
                    ? <><Check className="w-4 h-4" /> Applied!</>
                    : <><Wand2 className="w-4 h-4" /> Apply Revision</>
                }
              </motion.button>

              <AnimatePresence>
                {revisionSuccess && (
                  <motion.span
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-xs text-green-500 font-medium"
                  >
                    ✓ Spreadsheet updated
                  </motion.span>
                )}
                {revisionError && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-xs text-destructive"
                  >
                    {revisionError}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Share modal ── */}
      {showShare && <ShareModal data={data} onClose={() => setShowShare(false)} />}

      {/* ── Sticky mobile FAB — Download .xlsx ── */}
      <AnimatePresence>
        {showStickyBtn && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.92 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            className="sm:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-40 pointer-events-none"
          >
            <motion.button
              onClick={handleExport}
              whileTap={{ scale: 0.95 }}
              className={cn(
                'pointer-events-auto flex items-center gap-2.5 px-5 py-3.5 rounded-2xl font-bold text-sm shadow-2xl transition-colors',
                isSaved
                  ? 'bg-green-500 text-white shadow-green-500/30'
                  : 'bg-primary text-primary-foreground shadow-primary/35',
              )}
              style={{ backdropFilter: 'blur(8px)' }}
            >
              {isSaved
                ? <><Check className="w-4 h-4" /> Downloaded!</>
                : <><Download className="w-4 h-4" /> Download .xlsx</>
              }
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
