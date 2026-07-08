export type DataType =
  | 'meeting_notes'
  | 'sales_data'
  | 'financial'
  | 'inventory'
  | 'project_tasks'
  | 'customer_feedback'
  | 'report'
  | 'other';

export interface ClarifyingQuestion {
  id: string;
  question: string;
  options: string[];
}

export interface FormulaHint {
  cell: string;
  formula: string;
  description: string;
}

export interface SheetData {
  name: string;
  description?: string;
  columns: string[];
  rows: string[][];
  formulas?: FormulaHint[];
}

export interface SpreadsheetData {
  title: string;
  dataType: DataType;
  sheets: SheetData[];
  summary?: string;
}

export interface AnalysisResult {
  detectedType: DataType;
  confidence: number;
  summary: string;
  questions: ClarifyingQuestion[];
  suggestedSheets: string[];
}

export type AppStep = 'landing' | 'upload' | 'questions' | 'editor' | 'export';

export interface AppState {
  step: AppStep;
  rawInput: string;
  fileName: string | null;
  analysisResult: AnalysisResult | null;
  userAnswers: Record<string, string>;
  spreadsheetData: SpreadsheetData | null;
  isLoading: boolean;
  error: string | null;
  sessionId: string | null;
}

export const DATA_TYPE_LABELS: Record<DataType, string> = {
  meeting_notes: 'Meeting Notes',
  sales_data: 'Sales Data',
  financial: 'Financial Data',
  inventory: 'Inventory',
  project_tasks: 'Project / Tasks',
  customer_feedback: 'Customer Feedback',
  report: 'Report',
  other: 'Other',
};

export const DATA_TYPE_COLORS: Record<DataType, string> = {
  meeting_notes: '#6366f1',
  sales_data: '#10b981',
  financial: '#f59e0b',
  inventory: '#3b82f6',
  project_tasks: '#8b5cf6',
  customer_feedback: '#ec4899',
  report: '#14b8a6',
  other: '#94a3b8',
};

export const DATA_TYPE_ICONS: Record<DataType, string> = {
  meeting_notes: '📋',
  sales_data: '📈',
  financial: '💰',
  inventory: '📦',
  project_tasks: '✅',
  customer_feedback: '⭐',
  report: '📄',
  other: '🗂️',
};
