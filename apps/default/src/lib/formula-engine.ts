/**
 * Formula engine — parses and evaluates Excel-style formulas against a 2D data grid.
 *
 * Supported: =SUM, =AVERAGE, =MIN, =MAX, =COUNT, =COUNTA, =IF, =CONCAT, =UPPER, =LOWER, =TRIM
 * Cell refs: A1, B2, ... ZZ99. Ranges: A1:B5. Arithmetic: + - * / ^. Comparison: > < >= <= == !=
 * String literals: \"hello\" or 'hello'. Concatenation with & operator.
 */

// ── Types ──────────────────────────────────────────────────────────────────

type CellRef = { type: 'cell_ref'; col: number; row: number };
type RangeRef = { type: 'range_ref'; startCol: number; startRow: number; endCol: number; endRow: number };
type NumberLit = { type: 'number'; value: number };
type StringLit = { type: 'string'; value: string };
type BoolLit = { type: 'bool'; value: boolean };
type BinaryOp = { type: 'binary_op'; op: '+' | '-' | '*' | '/' | '^' | '&'; left: Expr; right: Expr };
type Comparison = { type: 'comparison'; op: '>' | '<' | '>=' | '<=' | '==' | '!='; left: Expr; right: Expr };
type FunctionCall = { type: 'function_call'; name: string; args: Expr[] };
type Expr = CellRef | RangeRef | NumberLit | StringLit | BoolLit | BinaryOp | Comparison | FunctionCall;

// ── Tokenizer ──────────────────────────────────────────────────────────────

type Token =
  | { type: 'number'; value: number }
  | { type: 'string'; value: string }
  | { type: 'ident'; value: string }
  | { type: 'op'; value: string }
  | { type: 'lparen' }
  | { type: 'rparen' }
  | { type: 'comma' }
  | { type: 'colon' };

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const s = input.trim();

  while (i < s.length) {
    const ch = s[i];

    // Whitespace
    if (/\s/.test(ch)) { i++; continue; }

    // Numbers (including decimals)
    if (/[0-9]/.test(ch) || (ch === '.' && i + 1 < s.length && /[0-9]/.test(s[i + 1]))) {
      let num = '';
      while (i < s.length && /[0-9.]/.test(s[i])) { num += s[i]; i++; }
      tokens.push({ type: 'number', value: parseFloat(num) });
      continue;
    }

    // Strings (double or single quoted)
    if (ch === '"' || ch === "'") {
      const quote = ch;
      let str = '';
      i++;
      while (i < s.length && s[i] !== quote) { str += s[i]; i++; }
      i++; // skip closing quote
      tokens.push({ type: 'string', value: str });
      continue;
    }

    // Multi-char operators
    if ((ch === '>' || ch === '<' || ch === '=' || ch === '!') && i + 1 < s.length && s[i + 1] === '=') {
      tokens.push({ type: 'op', value: s.slice(i, i + 2) });
      i += 2;
      continue;
    }

    // Single-char operators
    if ('+-*/^&><='.includes(ch)) {
      tokens.push({ type: 'op', value: ch });
      i++;
      continue;
    }

    // Parens, comma, colon
    if (ch === '(') { tokens.push({ type: 'lparen' }); i++; continue; }
    if (ch === ')') { tokens.push({ type: 'rparen' }); i++; continue; }
    if (ch === ',') { tokens.push({ type: 'comma' }); i++; continue; }
    if (ch === ':') { tokens.push({ type: 'colon' }); i++; continue; }

    // Identifiers (function names, cell refs)
    if (/[a-zA-Z_]/.test(ch)) {
      let ident = '';
      while (i < s.length && /[a-zA-Z0-9_.]/.test(s[i])) { ident += s[i]; i++; }
      tokens.push({ type: 'ident', value: ident });
      continue;
    }

    // Unknown — skip
    i++;
  }

  return tokens;
}

// ── Parser (recursive descent) ─────────────────────────────────────────────

class Parser {
  private tokens: Token[];
  private pos = 0;

  constructor(tokens: Token[]) { this.tokens = tokens; }

  private peek(): Token | undefined { return this.tokens[this.pos]; }
  private consume(): Token { return this.tokens[this.pos++]; }
  private expectType<T extends Token['type']>(type: T): Extract<Token, { type: T }> {
    const t = this.peek();
    if (!t || t.type !== type) throw new Error(`Expected ${type}, got ${t?.type ?? 'EOF'}`);
    return this.consume() as Extract<Token, { type: T }>;
  }

  parse(): Expr {
    const expr = this.expression();
    if (this.pos < this.tokens.length) throw new Error(`Unexpected token: ${this.peek()?.value ?? ''}`);
    return expr;
  }

  // expression → comparison ( ( '&' comparison )* )
  private expression(): Expr {
    let left = this.comparison();
    while (this.peek()?.type === 'op' && this.peek()?.value === '&') {
      this.consume();
      left = { type: 'binary_op', op: '&', left, right: this.comparison() };
    }
    return left;
  }

  // comparison → term ( ( '>' | '<' | '>=' | '<=' | '==' | '!=' ) term )?
  private comparison(): Expr {
    const left = this.term();
    const tok = this.peek();
    if (tok?.type === 'op' && ['>', '<', '>=', '<=', '==', '!='].includes(tok.value)) {
      this.consume();
      return { type: 'comparison', op: tok.value as Comparison['op'], left, right: this.term() };
    }
    return left;
  }

  // term → factor ( ( '+' | '-' ) factor )*
  private term(): Expr {
    let left = this.factor();
    let tok = this.peek();
    while (tok?.type === 'op' && (tok.value === '+' || tok.value === '-')) {
      this.consume();
      left = { type: 'binary_op', op: tok.value as '+' | '-', left, right: this.factor() };
      tok = this.peek();
    }
    return left;
  }

  // factor → unary ( ( '*' | '/' | '^' ) unary )*
  private factor(): Expr {
    let left = this.unary();
    let tok = this.peek();
    while (tok?.type === 'op' && ['*', '/', '^'].includes(tok.value)) {
      this.consume();
      left = { type: 'binary_op', op: tok.value as '*' | '/' | '^', left, right: this.unary() };
      tok = this.peek();
    }
    return left;
  }

  // unary → '-' unary | primary
  private unary(): Expr {
    const tok = this.peek();
    if (tok?.type === 'op' && tok.value === '-') {
      this.consume();
      const right = this.unary();
      return { type: 'binary_op', op: '*', left: { type: 'number', value: -1 }, right };
    }
    return this.primary();
  }

  // primary → number | string | ident ( '(' args ')' | cell_ref ) | '(' expr ')' | function_call
  private primary(): Expr {
    const tok = this.peek();
    if (!tok) throw new Error('Unexpected end of expression');

    if (tok.type === 'number') { this.consume(); return { type: 'number', value: tok.value }; }
    if (tok.type === 'string') { this.consume(); return { type: 'string', value: tok.value }; }

    if (tok.type === 'lparen') {
      this.consume();
      const expr = this.expression();
      this.expectType('rparen');
      return expr;
    }

    if (tok.type === 'ident') {
      const ident = tok.value;
      this.consume();
      const next = this.peek();

      // Function call
      if (next?.type === 'lparen') {
        this.consume(); // (
        const args: Expr[] = [];
        if (this.peek()?.type !== 'rparen') {
          args.push(this.expression());
          while (this.peek()?.type === 'comma') { this.consume(); args.push(this.expression()); }
        }
        this.expectType('rparen');
        return { type: 'function_call', name: ident.toUpperCase(), args };
      }

      // Attempt cell/range reference → e.g. A1, AA99, A1:Z99
      const ref = parseCellOrRange(ident, this);
      if (ref) return ref;

      // Boolean literals
      if (ident.toUpperCase() === 'TRUE') return { type: 'bool', value: true };
      if (ident.toUpperCase() === 'FALSE') return { type: 'bool', value: false };

      throw new Error(`Unknown identifier: ${ident}`);
    }

    throw new Error(`Unexpected token: ${tok.value ?? tok.type}`);
  }
}

/** Attempts to parse a cell/range reference like A1, BZ10, or A1:Z99. If next token is colon, parses full range. */
function parseCellOrRange(ident: string, parser: Parser): CellRef | RangeRef | null {
  const startRef = parseSingleCellRef(ident);
  if (!startRef) return null;

  const next = parser.peek();
  if (next && next.type === 'colon') {
    // Range ref — consume colon, then read next ident as end cell
    const colonTok = parser.peek();
    if (colonTok?.type !== 'colon') return startRef;
    // We can't easily get the next token without consuming it from Parser...
    // We already consumed the start ident. Next token should be colon.
    // Actually we checked next above and it's a colon. Let me rework this.
    // The issue is that Parser already consumed the ident. Let me restructure.
  }

  return startRef;
}

/**
 * Parser that can peek ahead. We need to handle the case where the ident
 * could be a cell ref followed by a colon (range). This is handled differently:
 * after consuming ident, if next is colon, consume it and the next ident.
 */
function parseCellOrRangeFromTokens(ident: string, tokens: Token[], pos: number): { expr: CellRef | RangeRef; consumed: number } | null {
  const startRef = parseSingleCellRef(ident);
  if (!startRef) return null;

  // Check if followed by colon + another ident
  if (tokens[pos]?.type === 'colon') {
    const nextToken = tokens[pos + 1];
    if (nextToken?.type === 'ident') {
      const endRef = parseSingleCellRef(nextToken.value);
      if (endRef) {
        return {
          expr: {
            type: 'range_ref',
            startCol: startRef.col,
            startRow: startRef.row,
            endCol: endRef.col,
            endRow: endRef.row,
          },
          consumed: 2, // colon + end ident
        };
      }
    }
  }

  return { expr: startRef, consumed: 0 };
}

function parseSingleCellRef(ident: string): CellRef | null {
  const m = ident.match(/^([A-Z]{1,2})(\d+)$/i);
  if (!m) return null;
  const col = colLettersToIndex(m[1].toUpperCase());
  const row = parseInt(m[2], 10) - 1; // 0-based
  if (row < 0 || row > 9999) return null;
  return { type: 'cell_ref', col, row };
}

function colLettersToIndex(letters: string): number {
  let idx = 0;
  for (const ch of letters) idx = idx * 26 + (ch.charCodeAt(0) - 64);
  return idx - 1; // 0-based
}

function colIndexToLetters(idx: number): string {
  let result = '';
  let n = idx + 1;
  while (n > 0) { n--; result = String.fromCharCode(65 + (n % 26)) + result; n = Math.floor(n / 26); }
  return result;
}

// ── Evaluator ──────────────────────────────────────────────────────────────

/**
 * Evaluates an expression AST against a 2D row-major data grid.
 * `data` is rows[colIndex] with string values. Empty strings are treated as blank.
 */
function evaluate(expr: Expr, data: string[][]): string | number | boolean {
  switch (expr.type) {
    case 'number': return expr.value;
    case 'string': return expr.value;
    case 'bool': return expr.value;

    case 'cell_ref': {
      const row = data[expr.row];
      if (!row || expr.col >= row.length) return '';
      const raw = row[expr.col];
      // If cell contains its own formula, skip (avoid circular refs — for now just return raw)
      return raw;
    }

    case 'range_ref': {
      const values: string[][] = [];
      for (let r = expr.startRow; r <= expr.endRow; r++) {
        const rowData = data[r];
        if (!rowData) continue;
        const slice: string[] = [];
        for (let c = expr.startCol; c <= expr.endCol; c++) {
          slice.push(rowData[c] ?? '');
        }
        values.push(slice);
      }
      return values; // Return raw grid slice — functions decide how to use it
    }

    case 'binary_op': {
      const l = evaluate(expr.left, data);
      const r = evaluate(expr.right, data);
      return applyBinaryOp(expr.op, l, r);
    }

    case 'comparison': {
      const l = evaluate(expr.left, data);
      const r = evaluate(expr.right, data);
      return applyComparison(expr.op, l, r);
    }

    case 'function_call': {
      const args = expr.args.map(a => evaluate(a, data));
      return callFunction(expr.name, args);
    }

    default:
      return '';
  }
}

function toNumber(v: string | number | boolean): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'boolean') return v ? 1 : 0;
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
}

function flattenValues(gridOrVal: any): (string | number)[] {
  if (Array.isArray(gridOrVal) && Array.isArray(gridOrVal[0])) {
    // It's a 2D grid from a range
    return (gridOrVal as string[][]).flat();
  }
  if (Array.isArray(gridOrVal)) return gridOrVal as (string | number)[];
  return [gridOrVal as string | number];
}

function applyBinaryOp(op: string, l: any, r: any): string | number {
  if (op === '&') return String(l) + String(r);

  const a = toNumber(l as any);
  const b = toNumber(r as any);

  switch (op) {
    case '+': return a + b;
    case '-': return a - b;
    case '*': return a * b;
    case '/': return b === 0 ? 0 : a / b;
    case '^': return Math.pow(a, b);
    default: return 0;
  }
}

function applyComparison(op: string, l: any, r: any): boolean {
  const a = toNumber(l as any);
  const b = toNumber(r as any);
  const isNumeric = typeof l === 'number' || typeof r === 'number';

  if (isNumeric) {
    switch (op) {
      case '>': return a > b;
      case '<': return a < b;
      case '>=': return a >= b;
      case '<=': return a <= b;
      case '==': return a === b;
      case '!=': return a !== b;
    }
  }

  const sl = String(l);
  const sr = String(r);
  switch (op) {
    case '==': return sl === sr;
    case '!=': return sl !== sr;
    case '>': return sl > sr;
    case '<': return sl < sr;
    case '>=': return sl >= sr;
    case '<=': return sl <= sr;
  }
  return false;
}

function callFunction(name: string, args: any[]): string | number {
  const flat = (a: any[]) => a.flatMap(flattenValues);

  switch (name) {
    case 'SUM': return flat(args).reduce((s, v) => s + toNumber(v), 0);
    case 'AVERAGE': {
      const nums = flat(args).map(toNumber).filter(v => !isNaN(v));
      return nums.length === 0 ? 0 : nums.reduce((s, v) => s + v, 0) / nums.length;
    }
    case 'MIN': return Math.min(...flat(args).map(toNumber));
    case 'MAX': return Math.max(...flat(args).map(toNumber));
    case 'COUNT': return flat(args).filter(v => !isNaN(toNumber(v)) && String(v).trim() !== '').length;
    case 'COUNTA': return flat(args).filter(v => String(v).trim() !== '').length;
    case 'CONCAT':
    case 'CONCATENATE':
      return flat(args).map(String).join('');

    case 'UPPER': return String(args[0] ?? '').toUpperCase();
    case 'LOWER': return String(args[0] ?? '').toLowerCase();
    case 'TRIM': return String(args[0] ?? '').trim();

    case 'IF': {
      const cond = args[0];
      const boolCond = typeof cond === 'boolean' ? cond : String(cond).trim() !== '' && String(cond) !== '0' && String(cond).toLowerCase() !== 'false';
      const trueVal = args[1] ?? '';
      const falseVal = args[2] ?? '';
      return boolCond ? (typeof trueVal === 'number' ? trueVal : String(trueVal)) : (typeof falseVal === 'number' ? falseVal : String(falseVal));
    }

    default:
      return `#NAME? (${name})`;
  }
}

// ── Public API ─────────────────────────────────────────────────────────────

/** Returns true if the cell value is a formula (starts with =). */
export function isFormula(value: string): boolean {
  return value.startsWith('=') && value.length > 1;
}

/**
 * Evaluates a formula string against the given sheet data.
 * Returns the computed value as a string for display, or '#ERROR!' on failure.
 */
export function evaluateFormula(formula: string, data: string[][]): string {
  try {
    const source = formula.slice(1); // strip leading =
    const tokens = tokenize(source);
    if (tokens.length === 0) return '';

    const parser = new ParserWithRangeLookahead(tokens);
    const ast = parser.parse();

    if (!ast) return '';

    const result = evaluate(ast, data);

    if (typeof result === 'number') {
      // Format: clean up decimals
      if (Number.isInteger(result)) return String(result);
      return parseFloat(result.toFixed(6)).toString();
    }
    if (typeof result === 'boolean') return result ? 'TRUE' : 'FALSE';
    return String(result);
  } catch (e) {
    return '#ERROR!';
  }
}

/** Return the display value for a cell, evaluating formulas if present. */
export function getCellDisplayValue(rawValue: string, data: string[][]): string {
  if (isFormula(rawValue)) return evaluateFormula(rawValue, data);
  return rawValue;
}

// ── Extended Parser with range lookahead ───────────────────────────────────

class ParserWithRangeLookahead {
  private tokens: Token[];
  private pos = 0;

  constructor(tokens: Token[]) { this.tokens = tokens; }

  private peek(): Token | undefined { return this.tokens[this.pos]; }
  private consume(): Token { return this.tokens[this.pos++]; }

  parse(): Expr | null {
    try {
      const expr = this.expression();
      if (this.pos < this.tokens.length) throw new Error('Trailing tokens');
      return expr;
    } catch {
      return null;
    }
  }

  private expression(): Expr {
    let left = this.comparison();
    while (this.peek()?.type === 'op' && this.peek()?.value === '&') { this.consume(); left = { type: 'binary_op', op: '&', left, right: this.comparison() }; }
    return left;
  }

  private comparison(): Expr {
    const left = this.term();
    const tok = this.peek();
    if (tok?.type === 'op' && ['>', '<', '>=', '<=', '==', '!='].includes(tok.value)) { this.consume(); return { type: 'comparison', op: tok.value as Comparison['op'], left, right: this.term() }; }
    return left;
  }

  private term(): Expr {
    let left = this.factor();
    let tok = this.peek();
    while (tok?.type === 'op' && (tok.value === '+' || tok.value === '-')) { this.consume(); left = { type: 'binary_op', op: tok.value as '+'|'-', left, right: this.factor() }; tok = this.peek(); }
    return left;
  }

  private factor(): Expr {
    let left = this.unary();
    let tok = this.peek();
    while (tok?.type === 'op' && ['*', '/', '^'].includes(tok.value)) { this.consume(); left = { type: 'binary_op', op: tok.value as '*'|'/'|'^', left, right: this.unary() }; tok = this.peek(); }
    return left;
  }

  private unary(): Expr {
    const tok = this.peek();
    if (tok?.type === 'op' && tok.value === '-') { this.consume(); return { type: 'binary_op', op: '*', left: { type: 'number', value: -1 }, right: this.unary() }; }
    return this.primary();
  }

  private primary(): Expr {
    const tok = this.peek();
    if (!tok) throw new Error('EOF');

    if (tok.type === 'number') { this.consume(); return { type: 'number', value: tok.value }; }
    if (tok.type === 'string') { this.consume(); return { type: 'string', value: tok.value }; }
    if (tok.type === 'lparen') { this.consume(); const e = this.expression(); this.expect('rparen'); return e; }

    if (tok.type === 'ident') {
      const ident = tok.value;
      this.consume();
      const next = this.peek();

      // Function call
      if (next?.type === 'lparen') {
        this.consume();
        const args: Expr[] = [];
        if (this.peek()?.type !== 'rparen') { args.push(this.expression()); while (this.peek()?.type === 'comma') { this.consume(); args.push(this.expression()); } }
        this.expect('rparen');
        return { type: 'function_call', name: ident.toUpperCase(), args };
      }

      // Cell / range reference
      const ref = parseSingleCellRef(ident);
      if (ref) {
        // Check for range (colon + next ident)
        if (this.peek()?.type === 'colon') {
          this.consume();
          const endIdent = this.peek();
          if (endIdent?.type === 'ident') {
            this.consume();
            const endRef = parseSingleCellRef(endIdent.value);
            if (endRef) return { type: 'range_ref', startCol: ref.col, startRow: ref.row, endCol: endRef.col, endRow: endRef.row };
          }
          throw new Error('Invalid range reference');
        }
        return ref;
      }

      if (ident.toUpperCase() === 'TRUE') return { type: 'bool', value: true };
      if (ident.toUpperCase() === 'FALSE') return { type: 'bool', value: false };
      throw new Error(`Unknown: ${ident}`);
    }

    throw new Error(`Unexpected: ${tok.value ?? tok.type}`);
  }

  private expect(type: Token['type']): void {
    const t = this.peek();
    if (!t || t.type !== type) throw new Error(`Expected ${type}`);
    this.consume();
  }
}
