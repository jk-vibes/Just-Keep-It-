
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { Expense, UserSettings, Category, WealthItem, BudgetItem, Bill } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

let isProcessing = false;
const queue: (() => Promise<void>)[] = [];

async function processQueue() {
  if (isProcessing || queue.length === 0) return;
  isProcessing = true;
  const task = queue.shift();
  if (task) await task();
  isProcessing = false;
  processQueue();
}

const INSIGHT_CACHE_KEY = 'jk_ai_insights_cache';

function getPersistentCache(): Record<string, any> {
  try {
    const cached = localStorage.getItem(INSIGHT_CACHE_KEY);
    return cached ? JSON.parse(cached) : {};
  } catch {
    return {};
  }
}

function setPersistentCache(hash: string, data: any) {
  try {
    const cache = getPersistentCache();
    cache[hash] = { data, timestamp: Date.now() };
    localStorage.setItem(INSIGHT_CACHE_KEY, JSON.stringify(cache));
  } catch (e) {
    console.warn("Cache write failed", e);
  }
}

export function getExpensesHash(expenses: Expense[], settings: UserSettings): string {
  const confirmed = expenses
    .filter(e => e.isConfirmed)
    .sort((a, b) => a.id.localeCompare(b.id))
    .map(e => `${e.id}-${Math.round(e.amount)}`);
  return `v5-tactical-${settings.currency}-${Math.round(settings.monthlyIncome)}-${confirmed.length}-${confirmed.slice(-5).join('|')}`;
}

async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 15000): Promise<T> {
  return new Promise((resolve, reject) => {
    const execute = async () => {
      try {
        const result = await fn();
        resolve(result);
      } catch (error: any) {
        const errorStr = (error?.message || "").toUpperCase();
        const isRateLimit = errorStr.includes('429') || errorStr.includes('RESOURCE_EXHAUSTED') || errorStr.includes('QUOTA');
        
        if (isRateLimit && retries > 0) {
          const jitter = Math.random() * 3000;
          const waitTime = delay + jitter;
          await new Promise(r => setTimeout(r, waitTime));
          queue.push(() => withRetry(fn, retries - 1, delay * 2).then(resolve).catch(reject));
          processQueue();
        } else {
          reject(error);
        }
      }
    };

    queue.push(execute);
    processQueue();
  });
}

export async function refineBatchTransactions(transactions: Array<{ id: string, amount: number, merchant: string, note: string, date: string }>): Promise<Array<{ id: string, merchant: string, category: Category, mainCategory: string, subCategory: string, note: string, isAvoidSuggestion: boolean, isDuplicateOf?: string }>> {
  const prompt = `
    Audit and refine these ${transactions.length} transactions.
    Rules:
    1. Identify Merchant Name, Main Category, and Sub-Category.
    2. Flag "Avoids": Deferrable, impulsive, or wasteful expenses (e.g. late fees, redundant subscriptions, impulsive low-value eating out when other essentials are pending).
    3. Identify Duplicates: If two items have same amount, merchant, and are on the same or adjacent dates, provide the ID of the "Primary" item in 'isDuplicateOf'.
    4. Generate an "Intelligent Note": Professional 5-8 word description (e.g. "Consolidated monthly streaming charges").

    Data: ${JSON.stringify(transactions)}
    
    Return JSON array of objects. Do not categorize as 'Uncategorized' if a specific match exists.
  `;

  try {
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { 
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              merchant: { type: Type.STRING },
              category: { type: Type.STRING },
              mainCategory: { type: Type.STRING },
              subCategory: { type: Type.STRING },
              note: { type: Type.STRING },
              isAvoidSuggestion: { type: Type.BOOLEAN },
              isDuplicateOf: { type: Type.STRING }
            },
            required: ["id", "merchant", "category", "mainCategory", "subCategory", "note", "isAvoidSuggestion"]
          }
        }
      }
    }));
    return JSON.parse(response.text || '[]');
  } catch (error) {
    return [];
  }
}

export async function auditTransaction(expense: Expense, currency: string) {
  const prompt = `
    Audit this transaction:
    Merchant: ${expense.merchant || 'Unknown'}
    Note: ${expense.note || 'None'}
    Amount: ${Math.round(expense.amount)} ${currency}
    Current Category: ${expense.category}
    
    Identify if this belongs in:
    - Needs: Survival/Obligations
    - Wants: Chosen enjoyment
    - Savings: Future capital
    - Avoids: Unwanted, deferrable, or wasteful expenses (Late fees, penalties, impulsive redundant buys).
    
    Return JSON: {
      isCorrect: boolean,
      suggestedCategory: string,
      suggestedMainCategory: string,
      suggestedSubCategory: string,
      insight: string (max 15 words),
      isAnomaly: boolean,
      potentialAvoid: boolean
    }
  `;

  try {
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { 
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isCorrect: { type: Type.BOOLEAN },
            suggestedCategory: { type: Type.STRING },
            suggestedMainCategory: { type: Type.STRING },
            suggestedSubCategory: { type: Type.STRING },
            insight: { type: Type.STRING },
            isAnomaly: { type: Type.BOOLEAN },
            potentialAvoid: { type: Type.BOOLEAN }
          },
          required: ["isCorrect", "suggestedCategory", "suggestedMainCategory", "suggestedSubCategory", "insight", "isAnomaly", "potentialAvoid"]
        }
      }
    }));
    return JSON.parse(response.text || '{}');
  } catch (error) {
    return null;
  }
}

export async function getFatherlyAdvice(
  expenses: Expense[],
  wealthItems: WealthItem[],
  settings: UserSettings
): Promise<string> {
  const assets = wealthItems.filter(i => i.type === 'Investment').reduce((sum, i) => sum + i.value, 0);
  const liabilities = wealthItems.filter(i => i.type === 'Liability').reduce((sum, i) => sum + i.value, 0);
  const m = new Date().getMonth();
  const y = new Date().getFullYear();
  const recentSpend = expenses
    .filter(e => new Date(e.date).getMonth() === m && new Date(e.date).getFullYear() === y)
    .reduce((sum, e) => sum + e.amount, 0);

  const prompt = `
    You are a wise, financially savvy father talking to your son about his money. 
    Current State:
    - Assets: ${Math.round(assets)} ${settings.currency}
    - Debt: ${Math.round(liabilities)} ${settings.currency}
    - Recent Spend this month: ${Math.round(recentSpend)} ${settings.currency}
    - Monthly Income: ${Math.round(settings.monthlyIncome)} ${settings.currency}

    Give him one piece of actionable, firm, but loving advice. Use a dad-like tone (e.g., 'Listen son...', 'Back in my day...', 'Money doesn't grow on trees', 'Fix the leak before the ship sinks'). 
    If debt is high relative to assets, be firmer. If savings are growing, be proud but cautious.
    Keep it under 30 words. Return ONLY the advice text.
  `;

  try {
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    }));
    return response.text?.trim() || "Watch your step with those expenses, son. A small leak can sink a big ship.";
  } catch (error) {
    return "Listen son, focus on the foundation. Wealth isn't about what you spend, it's about what you keep.";
  }
}

export async function parseTransactionText(text: string, currency: string): Promise<{ entryType: 'Expense' | 'Income', amount: number, merchant: string, category: Category, subCategory: string, date: string, incomeType?: string, accountName?: string } | null> {
  const prompt = `
    Extract financial details from this text: "${text}".
    Currency: ${currency}.
    Identify Category as Needs/Wants/Savings/Avoids.
    "Avoids" are unwanted expenses which can wait.
    Return JSON.
  `;

  try {
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { 
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            entryType: { type: Type.STRING },
            amount: { type: Type.NUMBER },
            merchant: { type: Type.STRING },
            category: { type: Type.STRING },
            subCategory: { type: Type.STRING },
            date: { type: Type.STRING },
            incomeType: { type: Type.STRING },
            accountName: { type: Type.STRING }
          },
          required: ["entryType", "amount", "merchant", "category", "subCategory", "date"]
        }
      }
    }));
    
    const result = JSON.parse(response.text || '{}');
    const validCategories: Category[] = ['Needs', 'Wants', 'Savings', 'Avoids', 'Uncategorized'];
    return {
      entryType: (result.entryType === 'Income' ? 'Income' : 'Expense'),
      amount: Math.round(Math.abs(result.amount || 0)),
      merchant: result.merchant || result.accountName || 'Merchant',
      category: validCategories.includes(result.category) ? result.category : 'Uncategorized',
      subCategory: result.subCategory || 'General',
      date: result.date || new Date().toISOString().split('T')[0],
      incomeType: result.incomeType,
      accountName: result.accountName
    };
  } catch (error) {
    return null;
  }
}

export async function generateQuickNote(merchant: string, mainCategory: string, subCategory: string): Promise<string> {
  const prompt = `Generate a very short, professional, clever one-liner description (max 8 words) for a financial transaction.
    Merchant: ${merchant}
    Category: ${mainCategory} (${subCategory})
    Examples: "Weekly grocery replenishment", "Essential monthly utility settlement", "Friday night leisure dining".
    Return ONLY the string.`;

  try {
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    }));
    return response.text?.trim().replace(/^["']|["']$/g, '') || `${merchant}: ${subCategory}`;
  } catch (error) {
    return `${merchant}: ${subCategory}`;
  }
}

export async function parseBulkTransactions(text: string, currency: string): Promise<any[]> {
  const prompt = `
    Analyze this financial log text and extract transactions.
    Currency: ${currency}.
    Categorize as Needs, Wants, Savings, or Avoids (Unwanted/Deferrable).
    Return JSON array.
  `;

  try {
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { 
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              entryType: { type: Type.STRING },
              amount: { type: Type.NUMBER },
              merchant: { type: Type.STRING },
              category: { type: Type.STRING },
              subCategory: { type: Type.STRING },
              date: { type: Type.STRING },
              incomeType: { type: Type.STRING },
              accountName: { type: Type.STRING },
              rawContent: { type: Type.STRING },
              isAvoidSuggestion: { type: Type.BOOLEAN }
            },
            required: ["entryType", "date"]
          }
        }
      }
    }));
    return JSON.parse(response.text || '[]');
  } catch (error) {
    return [];
  }
}

export async function batchProcessNewTransactions(
  items: Array<{ merchant: string, amount: number, date: string }>
): Promise<Array<{ merchant: string, category: Category, mainCategory: string, subCategory: string, intelligentNote: string }>> {
  const prompt = `
    Analyze these ${items.length} financial transactions. 
    For each, provide:
    1. A clean, professional merchant name.
    2. Category (Needs/Wants/Savings/Avoids).
    3. Main Category & Sub Category from standard finance taxonomy.
    4. An "Intelligent Note": A clever, concise 5-8 word description based on the merchant pattern (e.g. "Weekly organic grocery restock", "Digital streaming services subscription").

    Data: ${JSON.stringify(items)}

    Return a JSON array matching input order.
  `;

  try {
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              merchant: { type: Type.STRING },
              category: { type: Type.STRING },
              mainCategory: { type: Type.STRING },
              subCategory: { type: Type.STRING },
              intelligentNote: { type: Type.STRING }
            },
            required: ["merchant", "category", "mainCategory", "subCategory", "intelligentNote"]
          }
        }
      }
    }));
    return JSON.parse(response.text || '[]');
  } catch (error) {
    return [];
  }
}

/**
 * FIXED: Added missing getDecisionAdvice function to fix error in AskMe component.
 * Evaluates financial queries using Gemini against current wealth data.
 */
export async function getDecisionAdvice(
  expenses: Expense[],
  wealthItems: WealthItem[],
  settings: UserSettings,
  query: string
): Promise<{ status: 'Safe' | 'Caution' | 'Danger', score: number, reasoning: string, actionPlan: string[], waitTime: string, impactPercentage: number }> {
  const assets = wealthItems.filter(i => i.type === 'Investment').reduce((sum, i) => sum + i.value, 0);
  const liabilities = wealthItems.filter(i => i.type === 'Liability').reduce((sum, i) => sum + i.value, 0);
  const netWorth = assets - liabilities;
  
  const m = new Date().getMonth();
  const y = new Date().getFullYear();
  const currentMonthSpent = expenses
    .filter(e => new Date(e.date).getMonth() === m && new Date(e.date).getFullYear() === y)
    .reduce((sum, e) => sum + e.amount, 0);

  const prompt = `
    Evaluate this financial decision: "${query}".
    Current Financial Profile:
    - Net Worth: ${Math.round(netWorth)} ${settings.currency}
    - Total Assets: ${Math.round(assets)} ${settings.currency}
    - Total Debt: ${Math.round(liabilities)} ${settings.currency}
    - Monthly Income: ${Math.round(settings.monthlyIncome)} ${settings.currency}
    - Already spent this month: ${Math.round(currentMonthSpent)} ${settings.currency}
    - Savings Rate Target: ${settings.split.Savings}%
    
    Analyze the impact and provide a score (0-100, where 100 is perfectly safe).
    Return JSON format.
  `;

  try {
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            status: { type: Type.STRING, enum: ['Safe', 'Caution', 'Danger'] },
            score: { type: Type.NUMBER },
            reasoning: { type: Type.STRING },
            actionPlan: { type: Type.ARRAY, items: { type: Type.STRING } },
            waitTime: { type: Type.STRING },
            impactPercentage: { type: Type.NUMBER }
          },
          required: ["status", "score", "reasoning", "actionPlan", "waitTime", "impactPercentage"]
        }
      }
    }));
    return JSON.parse(response.text || '{}');
  } catch (error) {
    throw error;
  }
}
