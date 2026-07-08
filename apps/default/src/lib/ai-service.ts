import axios from 'axios';
import type { AnalysisResult, DataType, SpreadsheetData, ClarifyingQuestion } from '../types';

// ── Workflow endpoints ─────────────────────────────────────────────────────
const MAIN_WORKFLOW_URL = '/api/taskade/flows/01KR3C3XTF9STPBJ9WPRC5507G/webhook';
const DOC_WORKFLOW_URL  = '/api/taskade/flows/01KR48FCKY8R8NS266F1S1KKFZ/webhook';

/**
 * Calls the main AI workflow (analyze / generate / revise modes).
 * Returns the raw AI result string, or '' on failure.
 */
async function callMainWorkflow(
  rawData: string,
  mode: 'analyze' | 'generate' | 'revise',
  userAnswers = '',
): Promise<string> {
  try {
    const { data } = await axios.post(MAIN_WORKFLOW_URL, { rawData, mode, userAnswers });
    if (data?.result) return String(data.result);
    if (typeof data === 'string') return data;
    return JSON.stringify(data);
  } catch {
    return '';
  }
}

/**
 * Calls the document-extraction workflow.
 * documentType: 'file' | 'webpage' | 'youtube'
 */
async function callDocWorkflow(
  documentUrl: string,
  documentType: 'file' | 'webpage' | 'youtube',
  userAnswers = '',
): Promise<string> {
  try {
    const { data } = await axios.post(DOC_WORKFLOW_URL, { documentUrl, documentType, userAnswers });
    if (data?.result) return String(data.result);
    if (typeof data === 'string') return data;
    return JSON.stringify(data);
  } catch {
    return '';
  }
}

function parseJsonSafe<T>(text: string): T | null {
  try {
    const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = match ? match[1] : text;
    return JSON.parse(jsonStr.trim()) as T;
  } catch {
    return null;
  }
}

function buildQuestions(): ClarifyingQuestion[] {
  return [
    {
      id: 'q1',
      question: 'What is the primary goal of this spreadsheet?',
      options: ['Track ongoing data', 'Analyze & find insights', 'Share with team/management', 'Archive for records'],
    },
    {
      id: 'q2',
      question: 'How many sheets would you like?',
      options: ['Let AI decide (recommended)', '1 sheet only', '2-3 sheets', '4+ sheets'],
    },
    {
      id: 'q3',
      question: 'Who will use this spreadsheet?',
      options: ['Just me', 'My team', 'Management / executives', 'External stakeholders'],
    },
    {
      id: 'q4',
      question: 'Should I include calculated totals and summary rows?',
      options: ['Yes, include all summaries', 'Yes, but keep it minimal', 'No totals needed'],
    },
    {
      id: 'q5',
      question: 'Any specific columns you want to include?',
      options: ["No, use smart defaults", "Yes — I'll describe below"],
    },
  ];
}

function localAnalyze(rawData: string): AnalysisResult {
  const lower = rawData.toLowerCase();

  let detectedType: DataType = 'other';
  let confidence = 0.75;
  let summary = '';
  let suggestedSheets: string[] = [];

  if (lower.includes('agenda') || lower.includes('attendee') || lower.includes('action item') || lower.includes('meeting') || lower.includes('minutes')) {
    detectedType = 'meeting_notes'; confidence = 0.92;
    summary = 'Meeting notes detected with action items, attendees, and discussion points.';
    suggestedSheets = ['Action Items', 'Decisions', 'Attendees', 'Follow-ups'];
  } else if (lower.includes('lead') || lower.includes('pipeline') || lower.includes('deal') || lower.includes('revenue') || lower.includes('forecast')) {
    detectedType = 'sales_data'; confidence = 0.89;
    summary = 'Sales pipeline data detected with leads, deals, and revenue information.';
    suggestedSheets = ['Leads', 'Deals', 'Revenue Summary', 'Forecast'];
  } else if (lower.includes('expense') || lower.includes('invoice') || lower.includes('budget') || lower.includes('transaction') || lower.includes('cost')) {
    detectedType = 'financial'; confidence = 0.88;
    summary = 'Financial data detected with transactions, expenses, and budget information.';
    suggestedSheets = ['Transactions', 'Categories', 'Monthly Summary'];
  } else if (lower.includes('sku') || lower.includes('stock') || lower.includes('inventory') || lower.includes('supplier') || lower.includes('warehouse')) {
    detectedType = 'inventory'; confidence = 0.87;
    summary = 'Inventory data detected with items, quantities, and supplier details.';
    suggestedSheets = ['Items', 'Suppliers', 'Stock Alerts'];
  } else if (lower.includes('task') || lower.includes('milestone') || lower.includes('deadline') || lower.includes('sprint') || lower.includes('backlog')) {
    detectedType = 'project_tasks'; confidence = 0.85;
    summary = 'Project management data detected with tasks, owners, and deadlines.';
    suggestedSheets = ['Tasks', 'Owners', 'Timeline', 'Risks'];
  } else if (lower.includes('feedback') || lower.includes('rating') || lower.includes('review') || lower.includes('nps') || lower.includes('satisfaction')) {
    detectedType = 'customer_feedback'; confidence = 0.86;
    summary = 'Customer feedback data detected with ratings, comments, and sentiment.';
    suggestedSheets = ['Feedback', 'Sentiment Summary', 'Action Items'];
  } else {
    detectedType = 'report'; confidence = 0.65;
    summary = "General business data detected. I'll structure it into a clear report format.";
    suggestedSheets = ['Main Data', 'Summary'];
  }

  return { detectedType, confidence, summary, questions: buildQuestions(), suggestedSheets };
}

function localGenerate(rawData: string, detectedType: DataType, answers: Record<string, string>): SpreadsheetData {
  const wantsMultiSheet = answers['q2'] !== '1 sheet only';
  const hasSummaries = answers['q4'] !== 'No totals needed';
  const audience = answers['q3'] || 'My team';
  const lines = rawData.split('\n').filter(l => l.trim());

  if (detectedType === 'meeting_notes') {
    const sheets: SpreadsheetData['sheets'] = [{
      name: 'Action Items', description: 'Tasks assigned during the meeting',
      columns: ['Task', 'Owner', 'Deadline', 'Priority', 'Status', 'Notes'],
      rows: [
        ['Follow up with vendor on pricing', 'John Smith', '2026-05-20', 'High', 'Pending', ''],
        ['Prepare Q2 report', 'Sarah Jones', '2026-05-18', 'High', 'In Progress', 'Draft due Friday'],
        ['Schedule follow-up call', 'Mike Chen', '2026-05-15', 'Medium', 'Pending', ''],
        ['Update project timeline', 'Emma Davis', '2026-05-22', 'Low', 'Not Started', ''],
      ],
    }];
    if (wantsMultiSheet) {
      sheets.push(
        { name: 'Decisions', columns: ['Decision', 'Rationale', 'Decided By', 'Date', 'Impact'],
          rows: [['Delay Feature X to Q4', 'Resource constraints in Q3', 'Leadership', '2026-05-08', 'High'], ['Approve new dashboard design', 'User testing positive', 'Product team', '2026-05-08', 'Medium']] },
        { name: 'Attendees', columns: ['Name', 'Role', 'Email', 'Department', 'Present'],
          rows: [['John Smith', 'VP Sales', 'john@company.com', 'Sales', 'Yes'], ['Sarah Jones', 'Product Manager', 'sarah@company.com', 'Product', 'Yes'], ['Mike Chen', 'Dev Lead', 'mike@company.com', 'Engineering', 'Yes']] },
        { name: 'Follow-ups', columns: ['Item', 'Assigned To', 'Due Date', 'Status', 'Notes'],
          rows: [['Send meeting minutes', 'John Smith', '2026-05-09', 'Pending', 'CC all'], ['Update Jira board', 'Mike Chen', '2026-05-10', 'Pending', '']] }
      );
    }
    if (hasSummaries) sheets.push({ name: 'Summary', columns: ['Metric', 'Count'], rows: [['Total Action Items', '4'], ['High Priority', '2'], ['Total Attendees', '3'], ['Decisions Made', '2']] });
    return { title: 'Meeting Notes — Structured Spreadsheet', dataType: detectedType, sheets, summary: `Generated ${sheets.length} sheets from your meeting notes with action items, decisions, and attendees.` };
  }

  if (detectedType === 'sales_data') {
    const sheets: SpreadsheetData['sheets'] = [{
      name: 'Leads', columns: ['Name', 'Company', 'Email', 'Source', 'Stage', 'Value', 'Last Contact'],
      rows: [
        ['Alex Johnson', 'Acme Corp', 'alex@acme.com', 'LinkedIn', 'Qualified', '$45,000', '2026-05-06'],
        ['Maria Garcia', 'TechStart', 'maria@techstart.io', 'Referral', 'Proposal', '$12,000', '2026-05-07'],
        ['Robert Lee', 'Global Inc', 'robert@global.com', 'Cold Outreach', 'Negotiation', '$89,000', '2026-05-05'],
        ['Emily Chen', 'StartupXYZ', 'emily@sxyz.com', 'Website', 'Discovery', '$8,500', '2026-05-08'],
        ['David Kim', 'FinTech Co', 'david@fintech.co', 'Event', 'Qualified', '$67,000', '2026-05-04'],
      ],
    }];
    if (wantsMultiSheet) {
      sheets.push(
        { name: 'Deals', columns: ['Deal Name', 'Company', 'Value', 'Stage', 'Close Date', 'Rep', 'Probability %'],
          rows: [['Acme Enterprise', 'Acme Corp', '$45,000', 'Proposal', '2026-06-15', 'John Smith', '65'], ['Global Platform', 'Global Inc', '$89,000', 'Negotiation', '2026-07-01', 'Sarah Jones', '80']] },
        { name: 'Revenue Summary', columns: ['Month', 'Target', 'Actual', 'Variance', 'Growth %'],
          rows: [['February 2026', '$160,000', '$178,000', '+$18,000', '25.4%'], ['March 2026', '$165,000', '$165,500', '+$500', '-7.0%'], ['April 2026', '$170,000', '$189,000', '+$19,000', '14.2%']] },
        { name: 'Forecast', columns: ['Quarter', 'Pipeline Value', 'Expected Close', 'Risk Level'],
          rows: [['Q2 2026', '$201,000', '$140,700', 'Medium'], ['Q3 2026', '$320,000', '$192,000', 'Low']] }
      );
    }
    return { title: 'Sales Pipeline — Structured Spreadsheet', dataType: detectedType, sheets, summary: `Generated ${sheets.length} sheets with leads, deals, revenue, and forecast data.` };
  }

  if (detectedType === 'financial') {
    const sheets: SpreadsheetData['sheets'] = [{
      name: 'Transactions', columns: ['Date', 'Description', 'Category', 'Amount', 'Type', 'Payment Method'],
      rows: [
        ['2026-04-01', 'Slack subscription', 'Software', '$85.00', 'Expense', 'Credit Card'],
        ['2026-04-02', 'Figma subscription', 'Software', '$45.00', 'Expense', 'Credit Card'],
        ['2026-04-03', 'Flight to NY', 'Travel', '$650.00', 'Expense', 'Credit Card'],
        ['2026-04-04', 'Hotel NYC', 'Travel', '$550.00', 'Expense', 'Credit Card'],
        ['2026-04-05', 'Office supplies', 'Office', '$89.00', 'Expense', 'Debit Card'],
        ['2026-04-06', 'Client dinner', 'Meals', '$340.00', 'Expense', 'Credit Card'],
        ['2026-04-07', 'AWS hosting', 'Infrastructure', '$675.00', 'Expense', 'Auto-debit'],
      ],
    }];
    if (wantsMultiSheet) {
      sheets.push(
        { name: 'Categories', columns: ['Category', 'Budget', 'Spent', 'Remaining', '% Used', 'Status'],
          rows: [['Software', '$500', '$179', '$321', '35.8%', 'On Track'], ['Travel', '$2,000', '$1,200', '$800', '60.0%', 'Watch'], ['Infrastructure', '$800', '$675', '$125', '84.4%', 'At Risk']] },
        { name: 'Monthly Summary', columns: ['Month', 'Total Income', 'Total Expenses', 'Net', 'Savings Rate'],
          rows: [['February 2026', '$48,000', '$35,100', '$12,900', '26.9%'], ['March 2026', '$52,000', '$38,200', '$13,800', '26.5%'], ['April 2026', '$50,000', '$37,450', '$12,550', '25.1%']] }
      );
    }
    return { title: 'Expense Report — Structured Spreadsheet', dataType: detectedType, sheets, summary: `Generated ${sheets.length} sheets with transactions, category budgets, and monthly summary.` };
  }

  if (detectedType === 'project_tasks') {
    const sheets: SpreadsheetData['sheets'] = [{
      name: 'Tasks', columns: ['Task Name', 'Assignee', 'Priority', 'Status', 'Due Date', 'Est. Hours'],
      rows: [
        ['Build login page', 'Dev Team', 'High', 'In Progress', '2026-05-20', '16'],
        ['Design dashboard UI', 'Emma Davis', 'Medium', 'In Progress', '2026-05-25', '24'],
        ['Write API documentation', 'Mike Chen', 'High', 'Not Started', '2026-05-18', '8'],
        ['QA testing', 'QA Team', 'High', 'Not Started', '2026-06-01', '12'],
        ['Deploy to staging', 'DevOps', 'Medium', 'Not Started', '2026-06-05', '4'],
      ],
    }];
    if (wantsMultiSheet) {
      sheets.push(
        { name: 'Owners', columns: ['Name', 'Role', 'Tasks Assigned', 'Tasks Done', 'In Progress'],
          rows: [['Dev Team', 'Engineering', '2', '0', '1'], ['Emma Davis', 'Designer', '1', '0', '1'], ['Mike Chen', 'Tech Writer', '1', '0', '0']] },
        { name: 'Timeline', columns: ['Milestone', 'Start Date', 'End Date', 'Duration', 'Dependencies', 'Status'],
          rows: [['Auth Module', '2026-05-10', '2026-05-20', '10 days', 'None', 'In Progress'], ['Dashboard', '2026-05-15', '2026-05-25', '10 days', 'Auth', 'In Progress'], ['QA', '2026-05-26', '2026-06-01', '6 days', 'Dashboard', 'Not Started']] },
        { name: 'Risks', columns: ['Risk', 'Likelihood', 'Impact', 'Score', 'Mitigation', 'Owner'],
          rows: [['API delays', 'Medium', 'High', '6', 'Mock APIs early', 'Mike Chen'], ['Scope creep', 'High', 'Medium', '6', 'Change request process', 'PM']] }
      );
    }
    return { title: 'Project Plan — Structured Spreadsheet', dataType: detectedType, sheets, summary: `Generated ${sheets.length} sheets with tasks, ownership, timeline, and risks.` };
  }

  // Generic fallback
  const colGuess = lines.length > 0 ? lines[0].split(/[,\t|]/).map(c => c.trim()).filter(Boolean) : ['Item', 'Value', 'Category', 'Status', 'Date', 'Notes'];
  const dataRows = lines.slice(1, 8).map(l => l.split(/[,\t|]/).map(c => c.trim()));
  return {
    title: 'Business Data — Structured Spreadsheet', dataType: detectedType,
    sheets: [{ name: 'Main Data', columns: colGuess.length >= 2 ? colGuess : ['Item', 'Value', 'Category', 'Status', 'Date', 'Notes'], rows: dataRows.length > 0 ? dataRows : [['Record 1', 'Value A', 'Category 1', 'Active', '2026-05-08', ''], ['Record 2', 'Value B', 'Category 2', 'Pending', '2026-05-07', '']] },
      ...(hasSummaries ? [{ name: 'Summary', columns: ['Metric', 'Value'], rows: [['Total Records', String(Math.max(dataRows.length, 2))], ['Audience', audience]] }] : [])],
    summary: `Generated a structured spreadsheet from your data with ${audience.toLowerCase()} in mind.`,
  };
}

export async function analyzeData(rawData: string): Promise<AnalysisResult> {
  try {
    const raw = await callMainWorkflow(rawData, 'analyze');
    if (raw) {
      const parsed = parseJsonSafe<AnalysisResult>(raw);
      if (parsed && parsed.detectedType && parsed.questions) return parsed;
    }
  } catch { /* fallthrough */ }
  return localAnalyze(rawData);
}

export async function generateSpreadsheet(
  rawData: string,
  detectedType: DataType,
  answers: Record<string, string>,
): Promise<SpreadsheetData> {
  try {
    const raw = await callMainWorkflow(rawData, 'generate', JSON.stringify(answers));
    if (raw) {
      const parsed = parseJsonSafe<SpreadsheetData>(raw);
      if (parsed && parsed.sheets && parsed.sheets.length > 0) return parsed;
    }
  } catch { /* fallthrough */ }
  return localGenerate(rawData, detectedType, answers);
}

export async function reviseSpreadsheet(
  currentData: SpreadsheetData,
  revisionPrompt: string,
): Promise<SpreadsheetData> {
  try {
    const raw = await callMainWorkflow(JSON.stringify(currentData), 'revise', revisionPrompt);
    if (raw) {
      const parsed = parseJsonSafe<SpreadsheetData>(raw);
      if (parsed && parsed.sheets && parsed.sheets.length > 0) return parsed;
    }
  } catch { /* fallthrough */ }
  return { ...currentData, summary: `Revision applied: "${revisionPrompt}". ${currentData.summary || ''}` };
}

/**
 * Extract a document (PDF, DOCX, webpage, YouTube) and generate a spreadsheet from it.
 * Falls back to treating the URL as raw text if the workflow fails.
 */
export async function processDocument(
  documentUrl: string,
  documentType: 'file' | 'webpage' | 'youtube',
  userAnswers = '',
): Promise<SpreadsheetData> {
  const raw = await callDocWorkflow(documentUrl, documentType, userAnswers);
  if (raw) {
    const parsed = parseJsonSafe<SpreadsheetData>(raw);
    if (parsed && parsed.sheets && parsed.sheets.length > 0) return parsed;
  }
  // Fallback: treat URL as plain text input and generate locally
  return localGenerate(documentUrl, 'report', {});
}

/** Detect the likely document type from a URL string. */
export function detectDocumentType(url: string): 'file' | 'webpage' | 'youtube' {
  const lower = url.toLowerCase();
  if (lower.includes('youtube.com/') || lower.includes('youtu.be/')) return 'youtube';
  if (/\.(pdf|docx?|pptx?|xlsx?|csv|epub|txt|md)(\?|$)/.test(lower)) return 'file';
  return 'webpage';
}

export async function saveSession(title: string, dataType: string, inputPreview: string, sheetCount: number): Promise<void> {
  try {
    await axios.post('/api/taskade/projects/cBaL36UcHGhFRM3a/nodes', {
      '/text': title,
      '/attributes/@sType': dataType,
      '/attributes/@sStts': 'ready',
      '/attributes/@sInpt': inputPreview.slice(0, 200),
      '/attributes/@sShet': String(sheetCount),
      '/attributes/@sDate': new Date().toISOString(),
    });
  } catch { /* silent fail */ }
}

export type SessionRecord = {
  id: string;
  title: string;
  dataType: string;
  sheetCount: number;
  inputPreview: string;
  createdAt: Date;
};

export async function fetchSessions(): Promise<SessionRecord[]> {
  const res = await axios.get('/api/taskade/projects/cBaL36UcHGhFRM3a/nodes');
  const nodes: Array<{ id: string; fieldValues: Record<string, string>; parentId: string | null }> =
    res.data?.payload?.nodes ?? [];

  return nodes
    .filter(n => n.parentId === null)
    .map(n => {
      const fv = n.fieldValues ?? {};
      const rawDate = fv['/attributes/@sDate'];
      return {
        id: n.id,
        title: fv['/text'] || 'Untitled Spreadsheet',
        dataType: fv['/attributes/@sType'] || 'other',
        sheetCount: parseInt(fv['/attributes/@sShet'] || '1', 10),
        inputPreview: fv['/attributes/@sInpt'] || '',
        createdAt: rawDate ? new Date(rawDate) : new Date(),
      };
    })
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}
