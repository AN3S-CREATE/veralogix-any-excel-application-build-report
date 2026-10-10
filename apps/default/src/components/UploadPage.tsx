import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, Clipboard, ArrowRight, X, AlertCircle, Loader2, ChevronDown, Cloud, Link2, FileSearch, Globe, Youtube, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';
import { analyzeData, processDocument, detectDocumentType } from '../lib/ai-service';
import type { AnalysisResult, SpreadsheetData } from '../types';
import { OneDrivePicker } from './OneDrivePicker';

interface UploadPageProps {
  onAnalyzed: (rawInput: string, fileName: string | null, result: AnalysisResult) => void;
  onDocumentProcessed?: (data: SpreadsheetData, sourceLabel: string) => void;
}

const DOC_TYPE_OPTIONS: Array<{
  value: 'file' | 'webpage' | 'youtube';
  label: string;
  icon: React.ReactNode;
  placeholder: string;
  hint: string;
}> = [
  { value: 'file', label: 'Document File', icon: <FileSearch className="w-4 h-4" />, placeholder: 'https://example.com/report.pdf', hint: 'PDF, Word (.docx), Excel (.xlsx), PowerPoint, CSV, TXT, Markdown' },
  { value: 'webpage', label: 'Webpage / Website', icon: <Globe className="w-4 h-4" />, placeholder: 'https://example.com/article', hint: 'Any public webpage — articles, docs, reports, dashboards' },
  { value: 'youtube', label: 'YouTube Video', icon: <Youtube className="w-4 h-4" />, placeholder: 'https://youtube.com/watch?v=...', hint: 'Transcribes the video and builds a spreadsheet from its content' },
];

const EXAMPLE_DATA = [
  {
    label: 'Meeting Notes',
    emoji: '📋',
    text: `Q3 Planning Meeting — May 8, 2026
Attendees: Sarah Chen (PM), Mike Rodriguez (Dev Lead), Emma Watson (Design), John Kim (Sales)

Agenda:
1. Q2 review
2. Feature roadmap discussion  
3. Budget approval

Action Items:
- Follow up with vendor on pricing (Owner: John Kim, Deadline: May 20, Priority: High)
- Prepare Q3 roadmap deck (Owner: Sarah Chen, Deadline: May 15, Priority: High)
- Design new onboarding flow (Owner: Emma Watson, Deadline: May 25, Priority: Medium)

Decisions Made:
- Delay Feature X to Q4 due to engineering capacity
- Approve $45,000 additional marketing budget
- Move to bi-weekly sprint cycles

Follow-ups:
- John to send pricing comparison by EOW
- Sarah to schedule Q3 kickoff all-hands`,
  },
  {
    label: 'Sales Data',
    emoji: '📈',
    text: `Sales Pipeline — May 2026

Lead: Alex Johnson | Company: Acme Corp | Email: alex@acme.com | Stage: Proposal | Value: $45,000 | Rep: John Smith | Close: June 15
Lead: Maria Garcia | Company: TechStart | Email: maria@techstart.io | Stage: Qualified | Value: $12,000 | Rep: Sarah Jones | Close: May 30
Lead: Robert Lee | Company: Global Inc | Email: robert@global.com | Stage: Negotiation | Value: $89,000 | Rep: Mike Chen | Close: July 1
Lead: Emily Chen | Company: StartupXYZ | Stage: Discovery | Value: $8,500 | Rep: John Smith | Close: August 1
Lead: David Kim | Company: FinTech Co | Stage: Closed Won | Value: $67,000 | Rep: Sarah Jones | Close: May 5

Monthly targets: May $200,000 | June $220,000
Current pipeline total: $221,500`,
  },
  {
    label: 'Expense Report',
    emoji: '💰',
    text: `April 2026 Business Expenses

Software subscriptions: Slack $85, Figma $45, GitHub $49, AWS $675, Notion $16 — Total: $870
Travel: Flight to NYC conference $650, Hotel 3 nights $550, Uber/cab $120 — Total: $1,320
Meals: Client dinner Acme Corp $340, Team lunch $89, Coffee meetings $45 — Total: $474
Office supplies: Stationery $89, Printer ink $45, Desk accessories $67 — Total: $201
Marketing: LinkedIn ads $500, Google ads $800, Design assets $150 — Total: $1,450

Monthly budget: $6,000
Total spent: $4,315
Remaining: $1,685`,
  },
];

export const UploadPage: React.FC<UploadPageProps> = ({ onAnalyzed, onDocumentProcessed }) => {
  const [activeTab, setActiveTab] = React.useState<'paste' | 'document'>('paste');
  const [rawText, setRawText] = React.useState('');
  const [fileName, setFileName] = React.useState<string | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const [isProcessingDoc, setIsProcessingDoc] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [showExamples, setShowExamples] = React.useState(false);
  const [showOneDrive, setShowOneDrive] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [fileSource, setFileSource] = React.useState<'local' | 'onedrive' | null>(null);
  const [docUrl, setDocUrl] = React.useState('');
  const [docType, setDocType] = React.useState<'file' | 'webpage' | 'youtube'>('file');

  React.useEffect(() => {
    if (docUrl.trim()) setDocType(detectDocumentType(docUrl.trim()));
  }, [docUrl]);

  const handleOneDriveFile = (text: string, name: string) => {
    setRawText(text);
    setFileName(name);
    setFileSource('onedrive');
    setError(null);
  };

  const handleFile = (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      setError('File is too large. Please use files under 5MB.');
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setRawText(text);
      setFileSource('local');
      setError(null);
    };
    reader.onerror = () => setError('Failed to read file. Please try pasting the content directly.');
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleAnalyze = async () => {
    const trimmed = rawText.trim();
    if (!trimmed || trimmed.length < 20) { setError('Please provide at least a few lines of data.'); return; }
    setIsAnalyzing(true); setError(null);
    try {
      const result = await analyzeData(trimmed);
      onAnalyzed(trimmed, fileName, result);
    } catch { setError('Analysis failed. Please try again.'); }
    finally { setIsAnalyzing(false); }
  };

  const handleProcessDocument = async () => {
    const url = docUrl.trim();
    if (!url || !url.startsWith('http')) { setError('Please enter a valid URL starting with http:// or https://'); return; }
    setIsProcessingDoc(true); setError(null);
    try {
      const data = await processDocument(url, docType);
      if (onDocumentProcessed) { onDocumentProcessed(data, url); }
      else { const rawJson = JSON.stringify(data); const result = await analyzeData(rawJson); onAnalyzed(rawJson, url.split('/').pop() ?? 'document', result); }
    } catch { setError('Failed to process the document. Make sure the URL is publicly accessible.'); }
    finally { setIsProcessingDoc(false); }
  };

  const currentDocOption = DOC_TYPE_OPTIONS.find(o => o.value === docType) ?? DOC_TYPE_OPTIONS[0];
  const isReady = rawText.trim().length >= 20;
  const isDocReady = docUrl.trim().length > 10 && docUrl.startsWith('http');

  return (
    <div className="max-w-3xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="mb-5 sm:mb-7 text-center">
          <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-2">Import Your Data</h2>
          <p className="text-sm text-muted-foreground">Paste text, upload a file, or let AI extract any document, webpage, or video</p>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 p-1 rounded-xl bg-muted mb-5 border border-border">
          {([
            { id: 'paste' as const, label: 'Paste or Upload', icon: <Clipboard className="w-4 h-4" /> },
            { id: 'document' as const, label: 'From URL / Document', icon: <Link2 className="w-4 h-4" /> },
          ]).map(tab => (
            <button key={tab.id} onClick={() => { setActiveTab(tab.id); setError(null); }}
              className={cn('flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-semibold transition-all',
                activeTab === tab.id ? 'bg-card shadow-sm text-foreground border border-border' : 'text-muted-foreground hover:text-foreground')}>
              {tab.icon}<span className="hidden sm:inline">{tab.label}</span><span className="sm:hidden">{tab.id === 'paste' ? 'Paste' : 'URL'}</span>
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
        {activeTab === 'document' && (
          <motion.div key="document" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.2 }}>
            {/* Doc type selector */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {DOC_TYPE_OPTIONS.map(opt => (
                <button key={opt.value} onClick={() => setDocType(opt.value)}
                  className={cn('flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-medium transition-all',
                    docType === opt.value ? 'bg-primary/10 border-primary/40 text-primary' : 'bg-card border-border text-muted-foreground hover:text-foreground hover:border-primary/30')}>
                  {opt.icon}<span className="text-center leading-tight">{opt.label}</span>
                </button>
              ))}
            </div>
            {/* URL input */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">{currentDocOption.label} URL</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">{currentDocOption.icon}</div>
                <input type="url" value={docUrl} onChange={e => setDocUrl(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && isDocReady) handleProcessDocument(); }}
                  placeholder={currentDocOption.placeholder}
                  className="w-full pl-10 pr-4 py-3.5 rounded-xl border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all" />
              </div>
              <p className="text-[11px] text-muted-foreground mt-1.5">✦ {currentDocOption.hint}</p>
            </div>
            {/* Capability cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-5">
              {[{ icon: '📄', title: 'Any Document', desc: 'PDF, Word, Excel, PowerPoint, CSV, Markdown' },
                { icon: '🌐', title: 'Any Webpage', desc: 'Articles, dashboards, reports, documentation' },
                { icon: '🎥', title: 'YouTube Videos', desc: 'Transcribes and structures video content' }].map(card => (
                <div key={card.title} className="flex flex-col gap-1 p-3 rounded-xl bg-muted/50 border border-border/50">
                  <span className="text-lg">{card.icon}</span>
                  <span className="text-xs font-semibold text-foreground">{card.title}</span>
                  <span className="text-[11px] text-muted-foreground">{card.desc}</span>
                </div>
              ))}
            </div>
            <div className="flex items-start gap-3 p-3 rounded-xl bg-primary/5 border border-primary/15 mb-5">
              <Sparkles className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div className="text-xs text-muted-foreground">
                <p className="font-semibold text-foreground mb-0.5">How it works</p>
                <p>AI extracts all text and data from your source, then GPT-5.4 transforms it into a structured multi-sheet spreadsheet — ready to download as .xlsx.</p>
              </div>
            </div>
            <AnimatePresence>
              {error && (<motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="flex items-start gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm mb-4">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />{error}</motion.div>)}
            </AnimatePresence>
            <motion.button onClick={handleProcessDocument} disabled={!isDocReady || isProcessingDoc}
              whileHover={isDocReady && !isProcessingDoc ? { scale: 1.01 } : {}} whileTap={isDocReady && !isProcessingDoc ? { scale: 0.99 } : {}}
              className={cn('w-full flex items-center justify-center gap-3 py-4 rounded-xl font-semibold text-base transition-all',
                isDocReady && !isProcessingDoc ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90' : 'bg-muted text-muted-foreground cursor-not-allowed')}>
              {isProcessingDoc ? <><Loader2 className="w-5 h-5 animate-spin" /> Extracting &amp; building spreadsheet…</>
                : <><Sparkles className="w-5 h-5" /> Extract &amp; Generate Spreadsheet <ArrowRight className="w-5 h-5" /></>}
            </motion.button>
            {isDocReady && !isProcessingDoc && <p className="text-center text-xs text-muted-foreground mt-3">AI extracts the content and builds a complete spreadsheet — no questions needed</p>}
          </motion.div>
        )}
        {activeTab === 'paste' && (
          <motion.div key="paste" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }} transition={{ duration: 0.2 }}>
        

        {/* Drop zone */}
        <div
          className={cn(
            'relative border-2 border-dashed rounded-2xl transition-all cursor-pointer mb-4',
            isDragging ? 'border-primary bg-primary/5 scale-[1.01]' : 'border-border hover:border-primary/50 bg-card'
          )}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => !rawText && fileRef.current?.click()}
        >
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            accept=".txt,.csv,.md,.json,.tsv"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />

          {rawText ? (
            <div className="p-3 sm:p-4">
              {fileName && (
                <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
                  {fileSource === 'onedrive'
                    ? <Cloud className="w-4 h-4 text-[#0078D4]" />
                    : <FileText className="w-4 h-4" />}
                  <span className="truncate">{fileName}</span>
                  {fileSource === 'onedrive' && (
                    <span className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[#0078D4]/15 text-[#0078D4] dark:text-[#5BA8FF]">OneDrive</span>
                  )}
                  <button onClick={(e) => { e.stopPropagation(); setFileName(null); setRawText(''); setFileSource(null); }}
                    className="ml-auto p-1 hover:bg-muted rounded-md transition-colors shrink-0">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              <textarea
                value={rawText}
                onChange={e => setRawText(e.target.value)}
                onClick={e => e.stopPropagation()}
                className="w-full h-48 sm:h-64 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                placeholder="Your data appears here..."
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground mt-1 pt-2 border-t border-border">
                <span>{charCount.toLocaleString()} characters</span>
                <button onClick={(e) => { e.stopPropagation(); setRawText(''); setFileName(null); setFileSource(null); }}
                  className="flex items-center gap-1 hover:text-foreground transition-colors">
                  <X className="w-3 h-3" /> Clear
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 sm:py-16 px-4 text-center">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <Upload className={cn('w-6 h-6 transition-colors', isDragging ? 'text-primary' : 'text-muted-foreground')} />
              </div>
              <h3 className="font-semibold text-foreground mb-1">Drop your file here</h3>
              <p className="text-sm text-muted-foreground mb-4">or click to browse · .txt, .csv, .md, .json supported</p>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <div className="h-px w-16 bg-border" />
                <span>OR</span>
                <div className="h-px w-16 bg-border" />
              </div>
              <div className="mt-4 flex flex-col sm:flex-row items-center gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); setRawText(' '); setTimeout(() => setRawText(''), 10); }}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-muted hover:bg-muted/70 text-sm font-medium text-foreground transition-colors"
                >
                  <Clipboard className="w-4 h-4" /> Paste text
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setShowOneDrive(true); }}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#0078D4]/40 bg-[#0078D4]/10 hover:bg-[#0078D4]/20 text-sm font-medium text-[#0078D4] dark:text-[#5BA8FF] transition-colors"
                >
                  <Cloud className="w-4 h-4" /> Import from OneDrive
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Examples */}
        <div className="mb-4">
          <button
            onClick={() => setShowExamples(!showExamples)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronDown className={cn('w-4 h-4 transition-transform', showExamples && 'rotate-180')} />
            Try an example
          </button>
          <AnimatePresence>
            {showExamples && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 mt-3">
                  {EXAMPLE_DATA.map((ex) => (
                    <button
                      key={ex.label}
                      onClick={() => { setRawText(ex.text); setFileName(null); setShowExamples(false); }}
                      className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-border bg-card hover:border-primary/50 hover:bg-primary/5 transition-all text-left"
                    >
                      <span className="text-2xl">{ex.emoji}</span>
                      <span className="text-xs font-medium text-foreground">{ex.label}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-start gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm mb-4"
            >
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Analyze button */}
        <motion.button
          onClick={handleAnalyze}
          disabled={!isReady || isAnalyzing}
          whileHover={isReady && !isAnalyzing ? { scale: 1.01 } : {}}
          whileTap={isReady && !isAnalyzing ? { scale: 0.99 } : {}}
          className={cn(
            'w-full flex items-center justify-center gap-3 py-4 rounded-xl font-semibold text-base transition-all',
            isReady && !isAnalyzing
              ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90'
              : 'bg-muted text-muted-foreground cursor-not-allowed'
          )}
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              AI is analyzing your data...
            </>
          ) : (
            <>
              Analyze with AI
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </motion.button>

        {isReady && !isAnalyzing && (
          <p className="text-center text-xs text-muted-foreground mt-3">AI will detect your data type and ask a few quick questions</p>
        )}
          </motion.div>
        )}
        </AnimatePresence>
      </motion.div>

      {showOneDrive && <OneDrivePicker onFileLoaded={handleOneDriveFile} onClose={() => setShowOneDrive(false)} />}
    </div>
  );
};
