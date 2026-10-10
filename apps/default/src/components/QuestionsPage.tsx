import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, CheckCircle, ArrowRight, Loader2, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';
import { generateSpreadsheet } from '../lib/ai-service';
import type { AnalysisResult, SpreadsheetData, DataType } from '../types';
import { DATA_TYPE_LABELS, DATA_TYPE_COLORS, DATA_TYPE_ICONS } from '../types';

interface QuestionsPageProps {
  rawInput: string;
  analysisResult: AnalysisResult;
  onGenerated: (data: SpreadsheetData, answers: Record<string, string>) => void;
}

export const QuestionsPage: React.FC<QuestionsPageProps> = ({ rawInput, analysisResult, onGenerated }) => {
  const [answers, setAnswers] = React.useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [additionalNote, setAdditionalNote] = React.useState('');

  const { detectedType, confidence, summary, questions, suggestedSheets } = analysisResult;
  const answeredCount = Object.keys(answers).length;
  const totalRequired = Math.min(questions.length, 4);
  const allAnswered = answeredCount >= totalRequired;

  const handleAnswer = (questionId: string, option: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: option }));
  };

  const handleGenerate = async () => {
    const finalAnswers = { ...answers };
    if (additionalNote.trim()) {
      finalAnswers['additional'] = additionalNote.trim();
    }
    setIsGenerating(true);
    setError(null);
    try {
      const data = await generateSpreadsheet(rawInput, detectedType, finalAnswers);
      onGenerated(data, finalAnswers);
    } catch {
      setError('Failed to generate the spreadsheet. Please try again.');
      setIsGenerating(false);
    }
  };

  const typeColor = DATA_TYPE_COLORS[detectedType] || '#6366f1';
  const typeIcon = DATA_TYPE_ICONS[detectedType] || '🗂️';
  const typeLabel = DATA_TYPE_LABELS[detectedType] || 'Business Data';

  return (
    <div className="max-w-2xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>

        {/* Detection card */}
        <div className="rounded-2xl border border-border bg-card p-5 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
              style={{ background: `${typeColor}18` }}>
              {typeIcon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium px-2 py-0.5 rounded-full text-white"
                  style={{ background: typeColor }}>
                  {typeLabel}
                </span>
                <span className="text-xs text-muted-foreground">
                  {Math.round(confidence * 100)}% confidence
                </span>
              </div>
              <p className="text-sm text-foreground leading-relaxed">{summary}</p>
            </div>
          </div>

          {suggestedSheets.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground mb-2">Suggested sheets:</p>
              <div className="flex flex-wrap gap-2">
                {suggestedSheets.map(sheet => (
                  <span key={sheet} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-muted text-xs font-medium text-foreground">
                    <CheckCircle className="w-3 h-3 text-primary" />
                    {sheet}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Questions */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-foreground">A few quick questions</h2>
            <span className="text-sm text-muted-foreground">{answeredCount} / {totalRequired} answered</span>
          </div>

          {/* Progress bar */}
          <div className="h-1.5 bg-muted rounded-full mb-6">
            <motion.div
              className="h-full bg-primary rounded-full"
              animate={{ width: `${(answeredCount / totalRequired) * 100}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>

          <div className="space-y-5">
            {questions.map((q, qi) => (
              <motion.div
                key={q.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: qi * 0.08 }}
                className={cn('rounded-xl border transition-all', answers[q.id] ? 'border-primary/30 bg-primary/5' : 'border-border bg-card')}
              >
                <div className="p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <div className={cn('w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5',
                      answers[q.id] ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
                      {answers[q.id] ? <CheckCircle className="w-3.5 h-3.5" /> : qi + 1}
                    </div>
                    <p className="text-sm font-medium text-foreground">{q.question}</p>
                  </div>
                  <div className="pl-9 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {q.options.map(option => (
                      <button
                        key={option}
                        onClick={() => handleAnswer(q.id, option)}
                        className={cn(
                          'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm text-left transition-all',
                          answers[q.id] === option
                            ? 'border-primary bg-primary text-primary-foreground font-medium'
                            : 'border-border bg-background hover:border-primary/40 hover:bg-primary/5 text-foreground'
                        )}
                      >
                        <ChevronRight className={cn('w-3.5 h-3.5 shrink-0', answers[q.id] === option ? 'opacity-100' : 'opacity-30')} />
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Additional note */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-foreground mb-2">
            Anything else to add? <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <textarea
            value={additionalNote}
            onChange={e => setAdditionalNote(e.target.value)}
            placeholder="e.g. 'Include a column for priority scores' or 'Make it suitable for a board presentation'"
            className="w-full h-24 px-4 py-3 rounded-xl border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none transition-all"
          />
        </div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm mb-4"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Generate button */}
        <motion.button
          onClick={handleGenerate}
          disabled={!allAnswered || isGenerating}
          whileHover={allAnswered && !isGenerating ? { scale: 1.01 } : {}}
          whileTap={allAnswered && !isGenerating ? { scale: 0.99 } : {}}
          className={cn(
            'w-full flex items-center justify-center gap-2 sm:gap-3 py-3.5 sm:py-4 rounded-xl font-semibold text-sm sm:text-base transition-all',
            allAnswered && !isGenerating
              ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90'
              : 'bg-muted text-muted-foreground cursor-not-allowed'
          )}
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Generating your spreadsheet...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              Generate Spreadsheet
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </motion.button>

        {!allAnswered && (
          <p className="text-center text-xs text-muted-foreground mt-3">
            Answer at least {totalRequired} questions to generate your spreadsheet
          </p>
        )}

        {isGenerating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-6 space-y-2"
          >
            {['Parsing your raw data...', 'Structuring into sheets...', 'Populating with your content...', 'Applying formatting...'].map((step, i) => (
              <motion.div
                key={step}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.5 }}
                className="flex items-center gap-3 text-sm text-muted-foreground"
              >
                <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                {step}
              </motion.div>
            ))}
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};
