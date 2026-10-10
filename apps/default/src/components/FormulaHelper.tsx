import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calculator, Hash, BarChart3, AlignLeft, ArrowUpDown, HelpCircle } from 'lucide-react';
import { cn } from '../lib/utils';

// ── Function registry ──────────────────────────────────────────────────────

export type FormulaFunction = {
  name: string;
  syntax: string;
  description: string;
  category: 'math' | 'statistical' | 'text' | 'logical';
  exampleResult: string;
};

export const FORMULA_FUNCTIONS: FormulaFunction[] = [
  {
    name: 'SUM', syntax: 'SUM(range)', description: 'Adds all numbers in a range',
    category: 'math', exampleResult: '=SUM(B2:B10) → 450',
  },
  {
    name: 'AVERAGE', syntax: 'AVERAGE(range)', description: 'Calculates the average of numbers in a range',
    category: 'statistical', exampleResult: '=AVERAGE(C2:C12) → 37.5',
  },
  {
    name: 'MIN', syntax: 'MIN(range)', description: 'Returns the smallest number in a range',
    category: 'statistical', exampleResult: '=MIN(D2:D20) → 12',
  },
  {
    name: 'MAX', syntax: 'MAX(range)', description: 'Returns the largest number in a range',
    category: 'statistical', exampleResult: '=MAX(E2:E20) → 89',
  },
  {
    name: 'COUNT', syntax: 'COUNT(range)', description: 'Counts cells that contain numbers',
    category: 'statistical', exampleResult: '=COUNT(A2:A100) → 42',
  },
  {
    name: 'COUNTA', syntax: 'COUNTA(range)', description: 'Counts all non-empty cells in a range',
    category: 'statistical', exampleResult: '=COUNTA(B2:B50) → 38',
  },
  {
    name: 'IF', syntax: 'IF(condition, trueValue, falseValue)', description: 'Returns one value if condition is true, another if false',
    category: 'logical', exampleResult: '=IF(B2>50, "High", "Low")',
  },
  {
    name: 'CONCAT', syntax: 'CONCAT(range)', description: 'Joins all values into one text string',
    category: 'text', exampleResult: '=CONCAT(A2:A5) → AliceBobCarolDan',
  },
  {
    name: 'UPPER', syntax: 'UPPER(text)', description: 'Converts text to uppercase',
    category: 'text', exampleResult: '=UPPER("hello") → HELLO',
  },
  {
    name: 'LOWER', syntax: 'LOWER(text)', description: 'Converts text to lowercase',
    category: 'text', exampleResult: '=LOWER("HELLO") → hello',
  },
  {
    name: 'TRIM', syntax: 'TRIM(text)', description: 'Removes extra spaces from text',
    category: 'text', exampleResult: '=TRIM("  hello  ") → hello',
  },
];

const CATEGORY_ICONS: Record<FormulaFunction['category'], React.ReactNode> = {
  math: <Calculator className="w-3 h-3" />,
  statistical: <BarChart3 className="w-3 h-3" />,
  text: <AlignLeft className="w-3 h-3" />,
  logical: <ArrowUpDown className="w-3 h-3" />,
};

const CATEGORY_LABELS: Record<FormulaFunction['category'], string> = {
  math: 'Math',
  statistical: 'Statistical',
  text: 'Text',
  logical: 'Logical',
};

// ── Component ──────────────────────────────────────────────────────────────

interface FormulaHelperProps {
  /** The current text being typed in the formula bar (the full content including = if present). */
  inputText: string;
  /** Called when the user clicks a suggestion — passes the function name. */
  onSelect: (functionName: string) => void;
  /** Whether the helper is visible (e.g. user typed = or is inside a function name). */
  visible: boolean;
}

export const FormulaHelper: React.FC<FormulaHelperProps> = ({ inputText, onSelect, visible }) => {
  const [selectedIdx, setSelectedIdx] = React.useState(0);

  const isFormula = inputText.startsWith('=');
  // Extract the current token after = and before any open paren
  const partial = isFormula ? inputText.slice(1).split('(')[0].trim() : '';

  const filtered = partial
    ? FORMULA_FUNCTIONS.filter(f => f.name.toLowerCase().startsWith(partial.toLowerCase()))
    : FORMULA_FUNCTIONS;

  // Reset selection when filtered list changes
  React.useEffect(() => { setSelectedIdx(0); }, [partial]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, filtered.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)); }
    if (e.key === 'Enter' && filtered[selectedIdx]) { e.preventDefault(); onSelect(filtered[selectedIdx].name); }
    if (e.key === 'Escape') { /* parent handles blur */ }
  };

  const hasItems = filtered.length > 0 && visible && isFormula;

  return (
    <AnimatePresence>
      {hasItems && (
        <motion.div
          initial={{ opacity: 0, y: -6, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.96 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="absolute left-0 right-0 top-full mt-1 z-50 bg-card border border-border rounded-xl shadow-xl overflow-hidden"
          onKeyDown={handleKeyDown}
        >
          {/* Header */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/50">
            <Hash className="w-3.5 h-3.5 text-primary" />
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
              Functions
            </span>
            <span className="text-[10px] text-muted-foreground/60 ml-auto">
              {partial ? `${filtered.length} match${filtered.length !== 1 ? 'es' : ''}` : `${filtered.length} available`}
            </span>
          </div>

          {/* List */}
          <div className="max-h-[280px] overflow-y-auto py-1" role="listbox">
            {filtered.map((fn, idx) => {
              const isSelected = idx === selectedIdx;
              return (
                <motion.button
                  key={fn.name}
                  role="option"
                  aria-selected={isSelected}
                  initial={false}
                  whileHover={{ backgroundColor: undefined }}
                  onClick={() => onSelect(fn.name)}
                  onMouseEnter={() => setSelectedIdx(idx)}
                  className={cn(
                    'w-full text-left px-3 py-2.5 flex items-start gap-3 transition-colors',
                    isSelected ? 'bg-primary/10' : 'hover:bg-muted/60',
                  )}
                >
                  {/* Icon + name */}
                  <div className="shrink-0 flex flex-col items-center gap-0.5 pt-0.5">
                    <span className="w-8 h-6 rounded-md bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary font-mono">
                      {fn.name}
                    </span>
                    <span className="text-muted-foreground/60">{CATEGORY_ICONS[fn.category]}</span>
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className={cn('text-xs font-bold font-mono', isSelected ? 'text-primary' : 'text-foreground')}>
                        {fn.name}
                      </span>
                      <span className="text-[10px] text-muted-foreground truncate font-mono">{fn.syntax}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{fn.description}</p>
                    <p className="text-[10px] text-muted-foreground/50 mt-1 font-mono">{fn.exampleResult}</p>
                  </div>

                  {/* Category badge */}
                  <span className="shrink-0 text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                    {CATEGORY_LABELS[fn.category]}
                  </span>
                </motion.button>
              );
            })}
          </div>

          {/* Footer hint */}
          <div className="flex items-center gap-3 px-3 py-2 border-t border-border bg-muted/30 text-[10px] text-muted-foreground">
            <span><kbd className="font-mono px-1 py-0.5 rounded bg-muted border border-border text-[10px]">↑↓</kbd> Navigate</span>
            <span><kbd className="font-mono px-1 py-0.5 rounded bg-muted border border-border text-[10px]">Enter</kbd> Insert</span>
            <span><kbd className="font-mono px-1 py-0.5 rounded bg-muted border border-border text-[10px]">Esc</kbd> Close</span>
            <span className="ml-auto flex items-center gap-1">
              <HelpCircle className="w-3 h-3" />
              Type <kbd className="font-mono px-1 py-0.5 rounded bg-muted border border-border text-[10px]">=</kbd> to start a formula
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
