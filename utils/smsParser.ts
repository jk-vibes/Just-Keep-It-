
import { Category, WealthType, WealthCategory } from '../types';
import { SUB_CATEGORIES } from '../constants';

export interface ParsedEntry {
  entryType: 'Expense' | 'Income' | 'Transfer' | 'Account' | 'Bill Payment';
  amount?: number;
  merchant?: string;
  source?: string;
  category?: Category;
  subCategory?: string;
  date: string;
  incomeType?: string;
  rawContent?: string;
  accountName?: string;
  targetAccountId?: string;
  wealthType?: WealthType;
  wealthCategory?: WealthCategory;
  value?: number;
  name?: string;
}

/**
 * Robust CSV Lexer supporting various delimiters and quoted fields.
 */
function parseCSV(csvText: string): string[][] {
  if (!csvText) return [];
  const lines = csvText.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length === 0) return [];
  
  const firstLine = lines[0];
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semiCount = (firstLine.match(/;/g) || []).length;
  const tabCount = (firstLine.match(/\t/g) || []).length;
  
  let delimiter = ',';
  if (semiCount > commaCount) delimiter = ';';
  if (tabCount > Math.max(commaCount, semiCount)) delimiter = '\t';

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        currentField += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === delimiter) {
        currentRow.push(currentField.trim());
        currentField = '';
      } else if (char === '\n' || (char === '\r' && nextChar === '\n')) {
        if (currentField !== '' || currentRow.length > 0) {
          currentRow.push(currentField.trim());
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = '';
        if (char === '\r') i++;
      } else {
        currentField += char;
      }
    }
  }
  if (currentRow.length > 0 || currentField) {
    currentRow.push(currentField.trim());
    rows.push(currentRow);
  }
  return rows.filter(row => row.length > 0);
}

const PATTERNS = {
  amount: /(?:Rs\.?|INR|Amt|VPA|Voucher|Amount|Total|Value)\s*([\d,]+\.?\d*)/i,
  spent: /\b(spent|paid|debited|deducted|dr|sent Rs|payment made to|vpa|purchase made on|debit|outflow|pos|withdrawal)\b/i,
  received: /\b(received|credited|deposited|cr|added|refunded|inward|transferred to your a\/c|credit|inflow|salary|freelance)\b/i,
  transfer: /\b(transfer|remit|internal|self|to a\/c|from a\/c|linked account|tfr|own account)\b/i,
  ccPayment: /\b(credit card payment|cc payment|cc bill|credit card bill|card payment|card settlement|paid card|bill desk)\b/i,
  merchant: /(?:to|at|towards|from|by|spent on|payment for|info:)\s+([^,.\n\r]+?)(?:\s+(?:via|on|Ref|Txn|Link|Date|Avl|Bal|Not you|Remaining))/i,
  date: /(\d{1,4})[-/.](\d{1,2})[-/.](\d{1,4})/, 
  otp: /\b(otp|one time password|verification code|security code)\b/i,
  junk: /\b(offer|loan|congratulations|reward|limited time|avl bal|available bal|balance is|limit|will be debited|scheduled|reminder|statement|min of|e-statement)\b/i
};

function cleanAmount(val: string): number {
  if (!val) return 0;
  // Remove non-numeric characters except for dots and minus signs
  const cleaned = val.replace(/[^0-9.-]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function resolveCategorySignals(text: string): { category: Category; subCategory: string } {
  const combined = text.toLowerCase();
  if (PATTERNS.ccPayment.test(combined)) return { category: 'Uncategorized', subCategory: 'Bill Payment' };
  
  // Fix: add explicit type cast for Object.entries values to fix property 'find' does not exist on type 'unknown'
  for (const [parent, children] of Object.entries(SUB_CATEGORIES) as [string, string[]][]) {
    const match = children.find(child => combined.includes(child.toLowerCase()));
    if (match) return { category: parent as Category, subCategory: match };
  }
  return { category: 'Uncategorized', subCategory: 'General' };
}

function isDate(val: string): boolean {
  if (!val) return false;
  return PATTERNS.date.test(val) || !isNaN(Date.parse(val));
}

function normalizeDate(val: string): string {
  if (!val) return new Date().toISOString().split('T')[0];
  const match = val.match(PATTERNS.date);
  if (match) {
    const [_, d1, d2, d3] = match;
    if (d1.length === 4) return `${d1}-${d2.padStart(2, '0')}-${d3.padStart(2, '0')}`;
    if (d3.length === 4) return `${d3}-${d2.padStart(2, '0')}-${d1.padStart(2, '0')}`;
  }
  try {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  } catch (e) {}
  return new Date().toISOString().split('T')[0];
}

export function parseSmsLocally(text: string): ParsedEntry[] {
  if (!text || !text.trim()) return [];
  const rows = parseCSV(text);
  if (rows.length === 0) return [];
  
  // Header detection logic
  const headerIdx = rows.findIndex(row => {
    const r = row.join(',').toUpperCase();
    return (r.includes('DATE') && (r.includes('AMOUNT') || r.includes('DEBIT') || r.includes('CREDIT') || r.includes('VALUE'))) || 
           (r.includes('ACCOUNT') && (r.includes('BAL') || r.includes('NAME') || r.includes('TYPE')));
  });

  if (headerIdx !== -1) {
    return parseStructuredRows(rows, headerIdx);
  }

  // Robust Generic Fallback: If no headers, try to find a row that looks like Date, Description, Amount
  return parseGenericRows(rows);
}

function parseStructuredRows(rows: string[][], headerIdx: number): ParsedEntry[] {
  const results: ParsedEntry[] = [];
  const headers = rows[headerIdx].map(h => h.toUpperCase());
  
  const getCol = (names: string[]) => headers.findIndex(h => names.some(n => h.includes(n)));
  
  const dateCol = getCol(['DATE', 'TIMESTAMP', 'TIME', 'TXN DATE', 'PERIOD']);
  const merchantCol = getCol(['PLACE', 'MERCHANT', 'DESCRIPTION', 'NOTE', 'PAYEE', 'PARTICULAR', 'NARRATION', 'REMARKS', 'DESC', 'ACCOUNT NAME', 'DETAILS']);
  const amountCol = getCol(['AMOUNT', 'VALUE', 'TOTAL', 'TRANSACTION AMT', 'SUM']);
  const balanceCol = getCol(['BALANCE', 'BAL', 'CURRENT BAL', 'OUTSTANDING', 'AVAILABLE']);
  const debitCol = headers.findIndex(h => h === 'DEBIT' || h === 'DR' || h.includes('WITHDRAW') || h.includes('OUT'));
  const creditCol = headers.findIndex(h => h === 'CREDIT' || h === 'CR' || h.includes('DEPOSIT') || h.includes('IN'));
  const typeCol = getCol(['DR/CR', 'TYPE', 'MODE', 'TRANSACTION TYPE']);
  const accountCol = getCol(['ACCOUNT', 'BANK', 'SOURCE', 'ACC']);

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < 2) continue;

    try {
      const typeStr = (typeCol !== -1 ? row[typeCol] : '').toUpperCase();
      const desc = (merchantCol !== -1 ? row[merchantCol] : '') || '';
      const accHint = (accountCol !== -1 ? row[accountCol] : '') || '';
      
      let amountVal = 0;
      let entryType: 'Expense' | 'Income' | 'Transfer' | 'Account' = 'Expense';

      if (debitCol !== -1 && creditCol !== -1) {
        const d = cleanAmount(row[debitCol]);
        const c = cleanAmount(row[creditCol]);
        if (c > 0) { amountVal = c; entryType = 'Income'; }
        else if (d > 0) { amountVal = d; entryType = 'Expense'; }
      } else {
        amountVal = Math.abs(cleanAmount(amountCol !== -1 ? row[amountCol] : (balanceCol !== -1 ? row[balanceCol] : '0')));
        if (typeStr.includes('CR') || typeStr.includes('CREDIT') || PATTERNS.received.test(typeStr) || PATTERNS.received.test(desc)) {
          entryType = 'Income';
        }
      }

      if (isNaN(amountVal) || amountVal === 0) continue;

      const dateStr = normalizeDate(row[dateCol]);

      if (typeStr.includes('ACCOUNT') || typeStr.includes('ASSET') || typeStr.includes('LIABILITY') || balanceCol !== -1 && amountCol === -1) {
          const isLiability = typeStr.includes('LIABILITY') || typeStr.includes('DEBT') || typeStr.includes('LOAN') || typeStr.includes('CARD');
          results.push({
              entryType: 'Account',
              value: amountVal,
              name: desc.trim() || accHint.trim() || 'Imported Account',
              wealthType: isLiability ? 'Liability' : 'Investment',
              wealthCategory: isLiability ? 'Credit Card' : 'Savings',
              date: dateStr,
              rawContent: row.join(' | ')
          });
          continue;
      }

      const isCC = PATTERNS.ccPayment.test(desc) || PATTERNS.ccPayment.test(typeStr);
      if (isCC || PATTERNS.transfer.test(desc) || PATTERNS.transfer.test(typeStr)) entryType = 'Transfer';

      const { category, subCategory } = (entryType === 'Transfer')
        ? { category: 'Uncategorized' as Category, subCategory: isCC ? 'Bill Payment' : 'Transfer' }
        : resolveCategorySignals(desc);

      results.push({
        entryType,
        amount: Math.round(amountVal),
        merchant: desc.trim() || 'General',
        date: dateStr,
        category,
        subCategory,
        accountName: accHint.trim() || undefined,
        rawContent: row.join(' | '),
        incomeType: entryType === 'Income' ? 'Other' : undefined
      });
    } catch (e) {}
  }
  return results;
}

function parseGenericRows(rows: string[][]): ParsedEntry[] {
  const results: ParsedEntry[] = [];
  const today = new Date().toISOString().split('T')[0];
  
  for (const row of rows) {
    if (row.length < 2) continue;
    
    let dateStr = today;
    let desc = 'Imported Item';
    let amountVal = 0;
    
    // Find the first column that looks like a date, one for description, one for amount
    const dateIdx = row.findIndex(v => isDate(v));
    const amountIdx = row.findIndex(v => v !== '' && !isNaN(cleanAmount(v)) && cleanAmount(v) !== 0);
    
    if (amountIdx !== -1) {
      amountVal = Math.abs(cleanAmount(row[amountIdx]));
      if (dateIdx !== -1) dateStr = normalizeDate(row[dateIdx]);
      
      const descIdx = row.findIndex((v, idx) => idx !== dateIdx && idx !== amountIdx && v.length > 2);
      if (descIdx !== -1) desc = row[descIdx];

      const { category, subCategory } = resolveCategorySignals(desc);
      const isIncome = PATTERNS.received.test(desc);

      results.push({
        entryType: isIncome ? 'Income' : 'Expense',
        amount: Math.round(amountVal),
        merchant: desc.trim(),
        date: dateStr,
        category,
        subCategory,
        rawContent: row.join(' | '),
        incomeType: isIncome ? 'Other' : undefined
      });
    }
  }
  return results;
}
