import * as React from 'react';
import { motion } from 'framer-motion';
import { Download, RotateCcw, CheckCircle, FileSpreadsheet, Sparkles, Loader2 } from 'lucide-react';
import { readShareTokenFromHash, decodeShareToken, clearShareHash } from './lib/share';
import { cn } from './lib/utils';

const LOGO_URL = 'https://files.taskade.com/space-files/5330b9a0-3e6b-46bd-969a-291a66892e08/original/Veralogix%20Group.png';
import { LandingPage } from './components/LandingPage';
import { UploadPage } from './components/UploadPage';
import { QuestionsPage } from './components/QuestionsPage';
import { SpreadsheetEditor } from './components/SpreadsheetEditor';
import { StepLayout } from './components/StepLayout';
import { AgentChatButton } from './components/AgentChat';
import { exportToXlsx, exportToCsv } from './lib/excel-export';
import { DATA_TYPE_ICONS } from './types';
import type { AppStep, AnalysisResult, SpreadsheetData } from './types';

const App: React.FC = function () {
  const [step, setStep] = React.useState<AppStep>('landing');
  const [rawInput, setRawInput] = React.useState('');
  const [fileName, setFileName] = React.useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = React.useState<AnalysisResult | null>(null);
  const [spreadsheetData, setSpreadsheetData] = React.useState<SpreadsheetData | null>(null);
  const [isDark, setIsDark] = React.useState(true);
  const [isLoadingShare, setIsLoadingShare] = React.useState(false);

  // On mount: check if a shared spreadsheet link is in the URL hash
  React.useEffect(() => {
    const token = readShareTokenFromHash();
    if (!token) return;
    setIsLoadingShare(true);
    decodeShareToken(token).then(data => {
      if (data) {
        setSpreadsheetData(data);
        setStep('editor');
        clearShareHash();
      }
      setIsLoadingShare(false);
    });
  }, []);

  React.useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const handleAnalyzed = (raw: string, file: string | null, result: AnalysisResult) => {
    setRawInput(raw);
    setFileName(file);
    setAnalysisResult(result);
    setStep('questions');
  };

  const handleGenerated = (data: SpreadsheetData) => {
    setSpreadsheetData(data);
    setStep('editor');
  };

  const handleBack = () => {
    if (step === 'questions') setStep('upload');
    else if (step === 'editor') setStep('questions');
    else if (step === 'export') setStep('editor');
    else if (step === 'upload') setStep('landing');
  };

  const handleGoToStep = (s: AppStep) => setStep(s);

  if (isLoadingShare) {
    return (
      <div className={cn(isDark ? 'dark' : '', 'min-h-screen bg-background flex flex-col items-center justify-center gap-4')}>
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Loader2 className="w-7 h-7 text-primary animate-spin" />
        </div>
        <p className="text-sm text-muted-foreground font-medium">Loading shared spreadsheet…</p>
      </div>
    );
  }

  if (step === 'landing') {
    return (
      <div className={isDark ? 'dark' : ''}>
        <LandingPage onGetStarted={() => setStep('upload')} />
        <AgentChatButton />
      </div>
    );
  }

  return (
    <div className={isDark ? 'dark' : ''}>
      <StepLayout
        step={step}
        onBack={handleBack}
        onGoToStep={handleGoToStep}
        isDark={isDark}
        onToggleTheme={() => setIsDark(d => !d)}
      >
        {step === 'upload' && (
          <UploadPage
            onAnalyzed={handleAnalyzed}
            onDocumentProcessed={(data, _sourceLabel) => {
              setSpreadsheetData(data);
              setStep('editor');
            }}
          />
        )}

        {step === 'questions' && analysisResult && (
          <QuestionsPage
            rawInput={rawInput}
            analysisResult={analysisResult}
            onGenerated={(data) => handleGenerated(data)}
          />
        )}

        {step === 'editor' && spreadsheetData && (
          <SpreadsheetEditor
            data={spreadsheetData}
            onDataChange={setSpreadsheetData}
            onExport={() => setStep('export')}
          />
        )}

        {step === 'export' && spreadsheetData && (
          <ExportPage
            data={spreadsheetData}
            onBack={() => setStep('editor')}
            onStartOver={() => {
              setRawInput(''); setFileName(null); setAnalysisResult(null); setSpreadsheetData(null);
              setStep('landing');
            }}
          />
        )}
      </StepLayout>
      <AgentChatButton />
    </div>
  );
};

// Export page component (defined inline)

function ExportPage({ data, onBack, onStartOver }: { data: SpreadsheetData; onBack: () => void; onStartOver: () => void }) {
  const [xlsxDone, setXlsxDone] = React.useState(false);
  const [csvDone, setCsvDone] = React.useState(false);
  const isMultiSheet = data.sheets.length > 1;

  const handleDownloadXlsx = () => {
    exportToXlsx(data);
    setXlsxDone(true);
  };

  const handleDownloadCsv = () => {
    exportToCsv(data);
    setCsvDone(true);
  };

  const anyDownloaded = xlsxDone || csvDone;

  return (
    <div className="max-w-lg mx-auto text-center">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}>
        <div className="flex flex-col items-center mb-6 gap-3">
          <img src={LOGO_URL} alt="Veralogix Group" className="h-8 w-auto object-contain opacity-80" />
          <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-primary" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Your Workbook is Ready!</h2>
        <p className="text-muted-foreground mb-8">
          {data.sheets.length} sheet{data.sheets.length !== 1 ? 's' : ''} &middot; {data.sheets.reduce((a, s) => a + s.rows.length, 0)} rows of data
        </p>

        {/* Sheet summary */}
        <div className="rounded-2xl border border-border bg-card p-4 mb-6 text-left">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">{DATA_TYPE_ICONS[data.dataType] || '🗂️'}</span>
            <h3 className="font-semibold text-foreground text-sm">{data.title}</h3>
          </div>
          <div className="space-y-2">
            {data.sheets.map(sheet => (
              <div key={sheet.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-primary" />
                  <span className="text-foreground font-medium">{sheet.name}</span>
                </div>
                <span className="text-muted-foreground text-xs">{sheet.rows.length} rows · {sheet.columns.length} cols</span>
              </div>
            ))}
          </div>
        </div>

        {/* Download buttons */}
        <div className="space-y-3 mb-4">
          {/* XLSX */}
          <motion.button
            onClick={handleDownloadXlsx}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full flex items-center justify-center gap-3 py-4 rounded-xl bg-primary text-primary-foreground font-bold text-base shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all"
          >
            {xlsxDone
              ? <><CheckCircle className="w-5 h-5" /> Downloaded .xlsx!</>
              : <><Download className="w-5 h-5" /> Download .xlsx (Excel)</>}
          </motion.button>

          {/* CSV */}
          <motion.button
            onClick={handleDownloadCsv}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl border border-border bg-card text-foreground font-semibold text-base hover:bg-muted hover:border-primary/40 transition-all"
          >
            {csvDone
              ? <><CheckCircle className="w-5 h-5 text-green-500" /> Downloaded CSV!</>
              : <><Download className="w-5 h-5 text-muted-foreground" /> Download .csv {isMultiSheet ? '(zip)' : ''}</>}
          </motion.button>

          {isMultiSheet && !csvDone && (
            <p className="text-xs text-muted-foreground -mt-1">
              Multiple sheets will be packaged as a .zip of CSV files
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button onClick={onBack}
            className="flex items-center justify-center gap-2 py-3 rounded-xl border border-border bg-card text-foreground text-sm font-medium hover:bg-muted transition-colors">
            <Sparkles className="w-4 h-4" /> Edit More
          </button>
          <button onClick={onStartOver}
            className="flex items-center justify-center gap-2 py-3 rounded-xl border border-border bg-card text-foreground text-sm font-medium hover:bg-muted transition-colors">
            <RotateCcw className="w-4 h-4" /> New Workbook
          </button>
        </div>

        {anyDownloaded && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 text-sm text-muted-foreground">
            Workbook downloaded. Open .xlsx in Excel or Google Sheets, .csv in any data tool.
          </motion.p>
        )}
        <p className="mt-8 text-xs text-muted-foreground/60">Veralogix Group · Internal Data Intelligence Tool</p>
      </motion.div>
    </div>
  );
}

export default App;
