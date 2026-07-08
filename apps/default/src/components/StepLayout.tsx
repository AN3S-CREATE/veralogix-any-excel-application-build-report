import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Moon, Sun, ChevronLeft, CheckCircle2,
  Upload, Sparkles, FileSpreadsheet, Download,
  Menu, X, PanelLeftClose, PanelLeftOpen,
} from 'lucide-react';
import { cn } from '../lib/utils';
import type { AppStep } from '../types';

const LOGO_URL = 'https://files.taskade.com/space-files/5330b9a0-3e6b-46bd-969a-291a66892e08/original/Veralogix%20Group.png';

/* ── Dimensions ─────────────────────────────────────────────────── */
const SIDEBAR_EXPANDED  = 240;
const SIDEBAR_COLLAPSED = 56;

/* ── Brand tokens ───────────────────────────────────────────────── */
const VX = {
  salad:   '#A8CF45',
  juneBud: '#BAD96B',
  onion:   '#7D9C33',
  verdan:  '#455C08',
  shaft:   '#252224',
};

interface StepLayoutProps {
  step: AppStep;
  onBack?: () => void;
  onGoToStep?: (step: AppStep) => void;
  isDark: boolean;
  onToggleTheme: () => void;
  children: React.ReactNode;
}

const STEPS: {
  id: AppStep;
  label: string;
  desc: string;
  icon: React.FC<{ className?: string; style?: React.CSSProperties }>;
}[] = [
  { id: 'upload',    label: 'Upload Data',   desc: 'Paste or upload your raw data',      icon: Upload },
  { id: 'questions', label: 'AI Questions',  desc: 'Clarify structure and format',        icon: Sparkles },
  { id: 'editor',    label: 'Edit Workbook', desc: 'Review and refine your spreadsheet',  icon: FileSpreadsheet },
  { id: 'export',    label: 'Export',        desc: 'Download .xlsx or .csv',              icon: Download },
];

function getStepIndex(step: AppStep): number {
  return STEPS.findIndex(s => s.id === step);
}

/* ─────────────────────────────────────────────────────────────────
   Sidebar
───────────────────────────────────────────────────────────────── */
interface SidebarProps {
  currentIdx: number;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onGoToStep?: (step: AppStep) => void;
  isDark: boolean;
  onToggleTheme: () => void;
  onBack?: () => void;
}

function Sidebar({
  currentIdx,
  collapsed,
  onToggleCollapse,
  onGoToStep,
  isDark,
  onToggleTheme,
  onBack,
}: SidebarProps) {
  return (
    <aside className="flex flex-col h-full overflow-hidden select-none" style={{ background: VX.shaft }}>

      {/* ── Logo / header ── */}
      <div
        className="relative flex items-center border-b shrink-0"
        style={{
          borderColor: 'rgba(168,207,69,0.12)',
          height: 72,
          padding: collapsed ? '0 12px' : '0 20px',
          justifyContent: collapsed ? 'center' : 'flex-start',
          transition: 'padding 0.28s ease',
        }}
      >
        <AnimatePresence mode="wait">
          {collapsed ? (
            /* Collapsed — globe icon mark only */
            <motion.div
              key="mark"
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
              transition={{ duration: 0.18 }}
              className="flex items-center justify-center w-8 h-8 rounded-lg"
              style={{ background: 'rgba(168,207,69,0.10)' }}
              title="Veralogix Group"
            >
              {/* Small "V" lettermark */}
              <span
                className="font-black text-base leading-none"
                style={{ color: VX.salad, fontFamily: 'sans-serif' }}
              >
                V
              </span>
            </motion.div>
          ) : (
            /* Expanded — full logo */
            <motion.div
              key="logo"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-1.5 w-full"
            >
              <div
                className="rounded-xl px-3 py-2 flex items-center justify-center"
                style={{ background: 'rgba(168,207,69,0.08)' }}
              >
                <img
                  src={LOGO_URL}
                  alt="Veralogix Group"
                  className="h-7 w-auto object-contain"
                  style={{ filter: 'brightness(0) invert(1)' }}
                />
              </div>
              <p
                className="text-center text-[10px] font-semibold uppercase tracking-widest"
                style={{ color: VX.onion }}
              >
                Data Intelligence Tool
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Step list ── */}
      <nav className="flex-1 py-4 overflow-y-auto" style={{ padding: collapsed ? '16px 8px' : '24px 12px' }}>
        {/* Section label — only when expanded */}
        <AnimatePresence>
          {!collapsed && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="px-3 mb-3 text-[10px] font-bold uppercase tracking-widest"
              style={{ color: 'rgba(186,217,107,0.45)' }}
            >
              Workflow Steps
            </motion.p>
          )}
        </AnimatePresence>

        <div className="space-y-1">
          {STEPS.map((s, i) => {
            const isDone      = i < currentIdx;
            const isCurrent   = i === currentIdx;
            const isPending   = i > currentIdx;
            const isClickable = isDone && onGoToStep;

            return (
              <div key={s.id} className="relative">
                {/* Connector line (expanded only) */}
                {!collapsed && i < STEPS.length - 1 && (
                  <div
                    className="absolute w-px"
                    style={{
                      left: 27,
                      top: 44,
                      height: 18,
                      background: isDone
                        ? `linear-gradient(to bottom, ${VX.onion}, ${VX.onion}60)`
                        : 'rgba(255,255,255,0.08)',
                      transition: 'background 0.4s',
                    }}
                  />
                )}

                <button
                  onClick={isClickable ? () => onGoToStep!(s.id) : undefined}
                  disabled={isPending || (!isClickable && !isCurrent)}
                  title={collapsed ? s.label : undefined}
                  className={cn(
                    'w-full flex items-center rounded-xl text-left transition-all duration-200',
                    collapsed ? 'justify-center px-0 py-2' : 'gap-3 px-3 py-2.5',
                    isCurrent   ? 'cursor-default'
                    : isClickable ? 'hover:bg-white/5 cursor-pointer'
                    : 'cursor-default opacity-50',
                  )}
                  style={isCurrent && !collapsed ? {
                    background: 'rgba(168,207,69,0.12)',
                    boxShadow: `inset 3px 0 0 0 ${VX.salad}`,
                  } : isCurrent && collapsed ? {
                    background: 'rgba(168,207,69,0.15)',
                    borderRadius: 10,
                  } : {}}
                >
                  {/* Orb */}
                  <div
                    className="flex-shrink-0 flex items-center justify-center rounded-lg transition-all duration-200"
                    style={{
                      width: 32,
                      height: 32,
                      background: isDone
                        ? VX.verdan
                        : isCurrent
                        ? VX.salad
                        : 'rgba(255,255,255,0.06)',
                      boxShadow: isCurrent ? `0 0 12px ${VX.salad}55` : 'none',
                    }}
                  >
                    {isDone ? (
                      <CheckCircle2 className="w-4 h-4" style={{ color: VX.juneBud }} />
                    ) : (
                      <s.icon className="w-4 h-4" style={{ color: isCurrent ? VX.verdan : 'rgba(255,255,255,0.3)' }} />
                    )}
                  </div>

                  {/* Labels — hidden when collapsed */}
                  <AnimatePresence>
                    {!collapsed && (
                      <motion.div
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{ duration: 0.2 }}
                        className="min-w-0 flex-1 overflow-hidden"
                      >
                        <p
                          className="text-sm font-semibold leading-tight truncate"
                          style={{
                            color: isDone ? VX.juneBud : isCurrent ? '#fff' : 'rgba(255,255,255,0.35)',
                          }}
                        >
                          {s.label}
                        </p>
                        <p
                          className="text-[11px] leading-snug truncate mt-0.5"
                          style={{ color: isCurrent ? 'rgba(186,217,107,0.7)' : 'rgba(255,255,255,0.22)' }}
                        >
                          {s.desc}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Badges — expanded only */}
                  {!collapsed && isDone && (
                    <span
                      className="ml-auto flex-shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded"
                      style={{ background: `${VX.verdan}99`, color: VX.juneBud }}
                    >
                      DONE
                    </span>
                  )}
                  {!collapsed && isCurrent && (
                    <span className="ml-auto flex-shrink-0 relative flex h-2 w-2">
                      <span
                        className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60"
                        style={{ background: VX.salad }}
                      />
                      <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: VX.salad }} />
                    </span>
                  )}

                  {/* Collapsed — current dot indicator */}
                  {collapsed && isCurrent && (
                    <span
                      className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                      style={{ background: VX.salad }}
                    />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </nav>

      {/* ── Bottom controls ── */}
      <div
        className="shrink-0 border-t"
        style={{
          borderColor: 'rgba(168,207,69,0.10)',
          padding: collapsed ? '12px 8px' : '12px',
        }}
      >
        {/* Back */}
        {onBack && (
          <button
            onClick={onBack}
            title={collapsed ? 'Back' : undefined}
            className={cn(
              'w-full flex items-center rounded-xl text-sm transition-all hover:bg-white/5 mb-1',
              collapsed ? 'justify-center px-0 py-2.5' : 'gap-2 px-3 py-2.5',
            )}
            style={{ color: 'rgba(255,255,255,0.45)' }}
          >
            <ChevronLeft className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span>Back</span>}
          </button>
        )}

        {/* Theme */}
        <button
          onClick={onToggleTheme}
          title={collapsed ? (isDark ? 'Light mode' : 'Dark mode') : undefined}
          className={cn(
            'w-full flex items-center rounded-xl text-sm transition-all hover:bg-white/5 mb-2',
            collapsed ? 'justify-center px-0 py-2.5' : 'gap-2 px-3 py-2.5',
          )}
          style={{ color: 'rgba(255,255,255,0.45)' }}
        >
          {isDark
            ? <><Sun className="w-4 h-4 flex-shrink-0" />{!collapsed && <span>Light Mode</span>}</>
            : <><Moon className="w-4 h-4 flex-shrink-0" />{!collapsed && <span>Dark Mode</span>}</>
          }
        </button>

        {/* ── Collapse toggle ── */}
        <button
          onClick={onToggleCollapse}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={cn(
            'w-full flex items-center rounded-xl text-sm transition-all',
            collapsed ? 'justify-center px-0 py-2.5' : 'gap-2 px-3 py-2.5',
          )}
          style={{
            color: VX.salad,
            background: 'rgba(168,207,69,0.07)',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(168,207,69,0.13)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(168,207,69,0.07)')}
        >
          {collapsed
            ? <PanelLeftOpen  className="w-4 h-4 flex-shrink-0" />
            : <><PanelLeftClose className="w-4 h-4 flex-shrink-0" /><span>Collapse</span></>
          }
        </button>
      </div>
    </aside>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Main layout
───────────────────────────────────────────────────────────────── */
export const StepLayout: React.FC<StepLayoutProps> = ({
  step, onBack, onGoToStep, isDark, onToggleTheme, children,
}) => {
  const currentIdx = getStepIndex(step);
  const [mobileOpen,  setMobileOpen]  = React.useState(false);
  const [collapsed,   setCollapsed]   = React.useState<boolean>(() => {
    try { return localStorage.getItem('vx_sidebar_collapsed') === 'true'; } catch { return false; }
  });
  const [showTooltip, setShowTooltip] = React.useState<boolean>(() => {
    try { return localStorage.getItem('vx_sidebar_tooltip_seen') !== 'true'; } catch { return false; }
  });

  // Close mobile drawer on step change
  React.useEffect(() => { setMobileOpen(false); }, [step]);

  // Auto-dismiss tooltip after 4 s
  React.useEffect(() => {
    if (!showTooltip) return;
    const t = setTimeout(dismissTooltip, 4000);
    return () => clearTimeout(t);
  }, [showTooltip]);

  const dismissTooltip = () => {
    setShowTooltip(false);
    try { localStorage.setItem('vx_sidebar_tooltip_seen', 'true'); } catch {}
  };

  // Persist sidebar state
  const toggleCollapsed = () => {
    dismissTooltip();
    setCollapsed(v => {
      const next = !v;
      try { localStorage.setItem('vx_sidebar_collapsed', String(next)); } catch {}
      return next;
    });
  };

  const sidebarWidth = collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED;

  const sidebarProps: SidebarProps = {
    currentIdx,
    collapsed,
    onToggleCollapse: toggleCollapsed,
    onGoToStep,
    isDark,
    onToggleTheme,
    onBack,
  };

  return (
    <div className="min-h-screen bg-background flex">

      {/* ── Desktop sidebar — animated width ── */}
      <motion.div
        className="hidden lg:flex flex-col fixed top-0 left-0 h-full z-40 overflow-hidden"
        animate={{ width: sidebarWidth }}
        transition={{ type: 'spring', stiffness: 320, damping: 34 }}
        style={{ background: VX.shaft }}
      >
        <Sidebar {...sidebarProps} />
      </motion.div>

      {/* ── Floating sidebar toggle tab (desktop) ── */}
      <motion.div
        className="hidden lg:block fixed z-50"
        animate={{ left: sidebarWidth }}
        transition={{ type: 'spring', stiffness: 320, damping: 34 }}
        style={{ top: '50%', transform: 'translateY(-50%)' }}
      >
        {/* Tooltip bubble */}
        <AnimatePresence>
          {showTooltip && (
            <motion.div
              initial={{ opacity: 0, x: -6, scale: 0.92 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -6, scale: 0.92 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="absolute pointer-events-none"
              style={{ left: 28, top: '50%', transform: 'translateY(-50%)', whiteSpace: 'nowrap' }}
            >
              {/* Arrow */}
              <div
                className="absolute"
                style={{
                  left: -5,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 0,
                  height: 0,
                  borderTop: '5px solid transparent',
                  borderBottom: '5px solid transparent',
                  borderRight: `5px solid ${VX.shaft}`,
                }}
              />
              <div
                className="rounded-lg px-3 py-2 text-xs font-medium shadow-xl flex items-center gap-1.5"
                style={{
                  background: VX.shaft,
                  color: 'rgba(255,255,255,0.75)',
                  border: `1px solid rgba(168,207,69,0.22)`,
                  boxShadow: `0 4px 20px rgba(0,0,0,0.4), 0 0 0 1px rgba(168,207,69,0.08)`,
                }}
              >
                <span style={{ color: VX.salad }}>←</span>
                Collapse for more space
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* The tab button itself */}
        <motion.button
          className="flex items-center justify-center rounded-r-xl shadow-lg focus:outline-none"
          onClick={toggleCollapsed}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{
            width: 20,
            height: 56,
            background: VX.shaft,
            borderTop: `1px solid rgba(168,207,69,0.18)`,
            borderRight: `1px solid rgba(168,207,69,0.18)`,
            borderBottom: `1px solid rgba(168,207,69,0.18)`,
            color: VX.salad,
          }}
          whileHover={{ width: 26, background: '#2e2b2c' }}
          whileTap={{ scale: 0.93 }}
        >
          <motion.div
            animate={{ rotate: collapsed ? 0 : 180 }}
            transition={{ duration: 0.25 }}
            className="flex items-center justify-center"
          >
            <ChevronLeft className="w-3.5 h-3.5" style={{ color: VX.salad }} />
          </motion.div>
        </motion.button>
      </motion.div>

      {/* ── Mobile topbar ── */}
      <div
        className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 h-14"
        style={{ background: VX.shaft, borderBottom: '1px solid rgba(168,207,69,0.12)' }}
      >
        <img
          src={LOGO_URL}
          alt="Veralogix Group"
          className="h-6 w-auto object-contain"
          style={{ filter: 'brightness(0) invert(1)' }}
        />
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleTheme}
            className="p-1.5 rounded-lg"
            style={{ color: 'rgba(255,255,255,0.5)' }}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setMobileOpen(v => !v)}
            className="p-1.5 rounded-lg"
            style={{ color: 'rgba(255,255,255,0.5)' }}
          >
            {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* ── Mobile drawer ── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="lg:hidden fixed inset-0 z-40 bg-black/60"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              key="drawer"
              initial={{ x: -SIDEBAR_EXPANDED }}
              animate={{ x: 0 }}
              exit={{ x: -SIDEBAR_EXPANDED }}
              transition={{ type: 'spring', stiffness: 340, damping: 32 }}
              className="lg:hidden fixed top-0 left-0 h-full z-50 overflow-hidden"
              style={{ width: SIDEBAR_EXPANDED, background: VX.shaft }}
            >
              {/* Mobile drawer always shows expanded sidebar */}
              <Sidebar {...sidebarProps} collapsed={false} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Desktop content — slides with sidebar ── */}
      <motion.div
        className="hidden lg:block flex-1 min-h-screen"
        animate={{ marginLeft: sidebarWidth }}
        transition={{ type: 'spring', stiffness: 320, damping: 34 }}
      >
        <main className="px-6 xl:px-10 py-8 pb-28">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28 }}
          >
            {children}
          </motion.div>
        </main>
      </motion.div>

      {/* ── Mobile content ── */}
      <div className="lg:hidden flex-1 pt-14">
        <main className="px-3 sm:px-5 py-5 pb-24">
          <motion.div
            key={`${step}-m`}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28 }}
          >
            {children}
          </motion.div>
        </main>
      </div>

      {/* ── Mobile bottom step indicator ── */}
      <div
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around px-2 py-2 border-t"
        style={{ background: VX.shaft, borderColor: 'rgba(168,207,69,0.14)' }}
      >
        {STEPS.map((s, i) => {
          const isDone    = i < getStepIndex(step);
          const isCurrent = i === getStepIndex(step);
          return (
            <button
              key={s.id}
              disabled={!isDone}
              onClick={isDone && onGoToStep ? () => onGoToStep(s.id) : undefined}
              className="flex flex-col items-center gap-0.5 flex-1 py-1 px-1 transition-all"
            >
              <div
                className="flex items-center justify-center rounded-lg transition-all"
                style={{
                  width: 30, height: 30,
                  background: isDone ? VX.verdan : isCurrent ? VX.salad : 'rgba(255,255,255,0.06)',
                  boxShadow: isCurrent ? `0 0 10px ${VX.salad}55` : 'none',
                }}
              >
                {isDone
                  ? <CheckCircle2 className="w-3.5 h-3.5" style={{ color: VX.juneBud }} />
                  : <s.icon className="w-3.5 h-3.5" style={{ color: isCurrent ? VX.verdan : 'rgba(255,255,255,0.28)' }} />
                }
              </div>
              <span
                className="text-[9px] font-semibold leading-tight text-center truncate w-full"
                style={{ color: isCurrent ? '#fff' : isDone ? VX.juneBud : 'rgba(255,255,255,0.28)' }}
              >
                {s.label}
              </span>
            </button>
          );
        })}
      </div>

    </div>
  );
};
