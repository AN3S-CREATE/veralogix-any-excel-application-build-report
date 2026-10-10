import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileSpreadsheet, Sparkles, Upload, Download, Clock, ArrowRight, CheckCircle, BarChart2, Users, ClipboardList, Package, FileText, TrendingUp } from 'lucide-react';
import { cn } from '../lib/utils';
import { RecentSessions } from './RecentSessions';

const LOGO_URL = 'https://files.taskade.com/space-files/5330b9a0-3e6b-46bd-969a-291a66892e08/original/Veralogix%20Group.png';

interface LandingPageProps {
  onGetStarted: () => void;
}

const tools = [
  {
    icon: ClipboardList,
    label: 'Meeting Minutes',
    desc: 'Paste raw meeting notes — get action items, decisions and follow-ups organised into sheets.',
    color: 'text-[#A8CF45]',
    bg: 'bg-[#A8CF45]/10',
  },
  {
    icon: TrendingUp,
    label: 'Sales & Pipeline',
    desc: 'Drop in CRM exports or deal notes and receive a structured leads & forecast workbook.',
    color: 'text-[#7D9C33]',
    bg: 'bg-[#7D9C33]/10',
  },
  {
    icon: FileText,
    label: 'Expense Reports',
    desc: 'Convert receipts, transaction lists or ad-hoc notes into categorised expense sheets.',
    color: 'text-[#BAD96B]',
    bg: 'bg-[#BAD96B]/15',
  },
  {
    icon: Users,
    label: 'HR & Staffing',
    desc: 'Organise headcount, onboarding checklists and shift rosters from any raw source.',
    color: 'text-[#455C08]',
    bg: 'bg-[#455C08]/10',
  },
  {
    icon: Package,
    label: 'Inventory',
    desc: 'Turn stock lists, supplier emails or warehouse notes into tracked inventory sheets.',
    color: 'text-[#A8CF45]',
    bg: 'bg-[#A8CF45]/10',
  },
  {
    icon: BarChart2,
    label: 'Project Tracking',
    desc: 'Convert project briefs or task dumps into timeline-ready workbooks with owners and statuses.',
    color: 'text-[#7D9C33]',
    bg: 'bg-[#7D9C33]/10',
  },
];

const steps = [
  { icon: Upload, step: '01', label: 'Paste or Upload', desc: 'Drop any raw text, copy-pasted data, or upload a file.' },
  { icon: Sparkles, step: '02', label: 'AI Structures It', desc: 'Our AI asks a few clarifying questions then maps your data.' },
  { icon: FileSpreadsheet, step: '03', label: 'Review & Edit', desc: 'Preview and tweak your multi-sheet workbook live in the browser.' },
  { icon: Download, step: '04', label: 'Export', desc: 'Download as .xlsx or .csv — ready for Excel or Google Sheets.' },
];

type LandingTab = 'tools' | 'recent';

export const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted }) => {
  const [activeTab, setActiveTab] = React.useState<LandingTab>('tools');

  return (
    <div className="min-h-screen bg-background">
      {/* ── Nav ── */}
      <nav className="border-b border-border/60 bg-background/90 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <img
              src={LOGO_URL}
              alt="Veralogix Group"
              className="h-6 sm:h-8 w-auto object-contain"
              style={{ filter: 'none' }}
            />
          </div>
          {/* Tool label */}
          <span className="hidden md:block text-xs font-semibold uppercase tracking-widest text-muted-foreground border border-border rounded-full px-3 py-1">
            Data Intelligence Tool
          </span>
          <motion.button
            onClick={onGetStarted}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs sm:text-sm font-semibold hover:bg-primary/90 transition-colors veralogix-glow-sm whitespace-nowrap"
          >
            <Sparkles className="w-3.5 h-3.5" />
            New Spreadsheet
          </motion.button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="max-w-6xl mx-auto px-3 sm:px-6 pt-10 sm:pt-16 pb-10 sm:pb-12">
        <div className="flex flex-col lg:flex-row items-center gap-8 sm:gap-12">
          {/* Left copy */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.55 }}
            className="flex-1 text-left w-full"
          >
            {/* Department badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/25 text-primary text-xs font-semibold mb-4 sm:mb-6 uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              Internal Operations
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground mb-4 sm:mb-5 leading-tight">
              Turn Raw Data Into<br />
              <span className="gradient-text">Structured Workbooks</span>
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground max-w-lg mb-6 sm:mb-8 leading-relaxed">
              Paste any business data — notes, reports, exports — and the Veralogix AI engine produces a
              clean, multi-sheet Excel file in seconds. No manual formatting required.
            </p>
            <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3">
              <motion.button
                onClick={onGetStarted}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all veralogix-glow"
              >
                <Sparkles className="w-4 h-4" />
                Generate Spreadsheet
                <ArrowRight className="w-4 h-4" />
              </motion.button>
              <span className="text-xs text-muted-foreground text-center sm:text-left">Internal use only · No data leaves the platform</span>
            </div>
          </motion.div>

          {/* Right — preview card */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.55, delay: 0.1 }}
            className="flex-1 w-full max-w-lg overflow-hidden"
          >
            <div className="rounded-2xl border border-border bg-card shadow-xl overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 bg-muted/60 border-b border-border">
                <div className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/70" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#A8CF45]/80" />
                <span className="ml-2 text-xs text-muted-foreground font-mono">Veralogix · Data Tool</span>
              </div>
              <div className="p-4 overflow-x-auto">
                <div className="flex gap-1.5 mb-3">
                  {['Action Items', 'Decisions', 'Owners'].map((t, i) => (
                    <div key={t} className={cn('px-3 py-1 rounded-t-lg text-[11px] font-semibold border border-b-0',
                      i === 0 ? 'bg-card border-border text-[#7D9C33]' : 'bg-muted border-transparent text-muted-foreground')}>
                      {t}
                    </div>
                  ))}
                </div>
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr style={{ background: 'rgba(168,207,69,0.10)' }}>
                      {['Task', 'Owner', 'Due', 'Priority'].map(h => (
                        <th key={h} className="px-3 py-2 font-bold border border-border" style={{ color: '#7D9C33' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['Q2 Strategy Review', 'A. Nkosi', '2026-06-01', 'High'],
                      ['Vendor Onboarding', 'B. Patel', '2026-05-28', 'Medium'],
                      ['Budget Reconciliation', 'C. Dlamini', '2026-05-22', 'High'],
                    ].map((row, i) => (
                      <tr key={i} className={i % 2 === 0 ? 'bg-card' : 'bg-muted/25'}>
                        {row.map((cell, j) => (
                          <td key={j} className="px-3 py-2 border border-border text-foreground/80">
                            {j === 3 ? (
                              <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-semibold',
                                cell === 'High'
                                  ? 'text-white'
                                  : 'text-[#455C08] bg-[#BAD96B]/30')}
                                style={cell === 'High' ? { background: '#7D9C33' } : {}}>
                                {cell}
                              </span>
                            ) : cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Tab switcher ── */}
      <div className="max-w-6xl mx-auto px-3 sm:px-6 mb-5 sm:mb-6">
        <div className="flex items-center gap-1 p-1 rounded-xl bg-muted border border-border">
          <button
            onClick={() => setActiveTab('tools')}
            className={cn('flex items-center justify-center gap-1.5 sm:gap-2 flex-1 px-3 sm:px-5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all',
              activeTab === 'tools' ? 'bg-background text-foreground shadow-sm border border-border' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" /> Supported Workflows
          </button>
          <button
            onClick={() => setActiveTab('recent')}
            className={cn('flex items-center justify-center gap-1.5 sm:gap-2 flex-1 px-3 sm:px-5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all',
              activeTab === 'recent' ? 'bg-background text-foreground shadow-sm border border-border' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Clock className="w-3.5 h-3.5" /> Recent Sessions
          </button>
        </div>
      </div>

      {/* ── Tab content ── */}
      <div className="max-w-6xl mx-auto px-3 sm:px-6 pb-10 sm:pb-12">
        <AnimatePresence mode="wait">
          {activeTab === 'recent' ? (
            <motion.div key="recent" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }}>
              <RecentSessions onGetStarted={onGetStarted} />
            </motion.div>
          ) : (
            <motion.div key="tools" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {tools.map((tool, i) => (
                  <motion.button
                    key={i}
                    onClick={onGetStarted}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    className="text-left bg-card border border-border rounded-2xl p-4 sm:p-5 hover:border-primary/50 hover:shadow-md transition-all group"
                  >
                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-3 sm:mb-4 transition-transform group-hover:scale-105', tool.bg)}>
                      <tool.icon className={cn('w-5 h-5', tool.color)} />
                    </div>
                    <h3 className="font-semibold text-foreground mb-1.5 flex items-center gap-2 text-sm sm:text-base">
                      {tool.label}
                      <ArrowRight className="w-3.5 h-3.5 text-primary opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all" />
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{tool.desc}</p>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── How it works ── */}
      <section className="bg-muted/40 border-y border-border py-10 sm:py-16">
        <div className="max-w-6xl mx-auto px-3 sm:px-6">
          <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-6 sm:mb-10 text-center">How It Works</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
            {steps.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.09 }}
                className="relative bg-card rounded-2xl p-4 sm:p-5 border border-border shadow-sm"
              >
                <span className="absolute top-3 right-3 text-3xl sm:text-4xl font-black" style={{ color: 'rgba(168,207,69,0.12)' }}>{s.step}</span>
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-primary/10 flex items-center justify-center mb-3 sm:mb-4">
                  <s.icon className="w-4 h-4 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground text-xs sm:text-sm mb-1">{s.label}</h3>
                <p className="hidden sm:block text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA strip ── */}
      <section className="max-w-6xl mx-auto px-3 sm:px-6 py-10 sm:py-14 text-center">
        <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-3">Ready to process your data?</h2>
        <p className="text-muted-foreground mb-7 text-sm">Structured workbooks from any raw input — in under a minute.</p>
        <motion.button
          onClick={onGetStarted}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="inline-flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-3.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm sm:text-base shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all veralogix-glow"
        >
          <Sparkles className="w-4 h-4" /> Generate Spreadsheet
        </motion.button>
      </section>

      {/* ── Footer ── */}
      <footer className="py-6 border-t border-border">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <img src={LOGO_URL} alt="Veralogix Group" className="h-6 w-auto object-contain opacity-70" />
          <p className="text-xs text-muted-foreground">Internal Data Intelligence Tool · Powered by Veralogix AI</p>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <CheckCircle className="w-3.5 h-3.5 text-primary" /> Data stays on-platform
          </div>
        </div>
      </footer>
    </div>
  );
};
