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
  return `v6-tactical-${settings.currency}-${Math.round(settings.monthlyIncome)}-${confirmed.length}-${confirmed.slice(-5).join('|')}`;
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
    Analyze and categorize these ${transactions.length} transactions.
    
    CLEANING RULES:
    - 'merchant': Extract a clean, professional name. Strip IDs, dates, or symbols (e.g., "ZOMATO* 123" -> "Zomato").
    
    TAXONOMY RULES (MANDATORY):
    1. 'category' (BUCKET): Must be exactly one of [Needs, Wants, Savings, Avoids].
    2. 'mainCategory' (PRIMARY CATEGORY): Group by industry (e.g., Housing, Household, Logistics, Lifestyle, Leisure, Personal, Investment, Reserve, Waste, Impulse).
    3. 'subCategory' (SUB NODE): Specific item (e.g., Rent, Groceries, Fuel, Dining, Shopping, SIP, Subscriptions).
    
    STRICT CONSTRAINTS:
    - YOU MUST return a classification for EVERY transaction provided.
    - NEVER use "General", "Other", "Miscellaneous" or "Uncategorized" if you can infer a better category from the merchant name.
    - Example: Starbucks -> Wants -> Personal -> Coffee. Uber -> Needs -> Logistics -> Transport.
    
    Avoidance Check: Mark unnecessary/impulsive spends as 'Avoids'.
    Duplicate Check: If transactions have same amount/merchant within +/- 1 day, mark newer ones with 'isDuplicateOf' set to the original transaction ID.
    
    Data: ${JSON.stringify(transactions)}
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
    console.error("Refinement failure:", error);
    return [];
  }
}

export async function auditTransaction(expense: Expense, currency: string) {
  const prompt = `
    Audit this transaction:
    Merchant: ${expense.merchant || 'Unknown'}
    Note: ${expense.note || 'None'}
    Amount: ${Math.round(expense.amount)} ${currency}
    Current Bucket: ${expense.category}
    
    RULES:
    1. suggestedCategory: [Needs, Wants, Savings, Avoids].
    2. suggestedMainCategory: Industry group (e.g., Housing, Lifestyle).
    3. suggestedSubCategory: Specific item (e.g., Rent, Dining).
    
    Clean the merchant name and DO NOT use "General" or "Other".
    
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
            isCorrect: { type: Type.BOOLEAN },
            suggestedCategory: { type: Type.STRING },
            suggestedMainCategory: { type: Type.STRING },
            suggestedSubCategory: { type: Type.STRING },
            merchant: { type: Type.STRING },
            insight: { type: Type.STRING },
            isAnomaly: { type: Type.BOOLEAN },
            potentialAvoid: { type: Type.BOOLEAN }
          },
          required: ["isCorrect", "suggestedCategory", "suggestedMainCategory", "suggestedSubCategory", "merchant", "insight", "isAnomaly", "potentialAvoid"]
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
    Role: Wise father advisor.
    Assets: ${Math.round(assets)}, Debt: ${Math.round(liabilities)}, Spent: ${Math.round(recentSpend)}, Income: ${Math.round(settings.monthlyIncome)}.
    Give actionable, firm advice under 30 words.
  `;

  try {
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    }));
    return response.text?.trim() || "Watch your step with those expenses, son.";
  } catch (error) {
    return "Wealth isn't about what you spend, it's about what you keep.";
  }
}

export async function parseTransactionText(text: string, currency: string): Promise<{ entryType: 'Expense' | 'Income', amount: number, merchant: string, category: Category, mainCategory: string, subCategory: string, date: string, incomeType?: string, accountName?: string } | null> {
  const prompt = `
    Extract from: "${text}".
    Currency: ${currency}.
    Required: Bucket, Primary Category, Sub Node. Clean merchant. NO "General" descriptors.
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
            mainCategory: { type: Type.STRING },
            subCategory: { type: Type.STRING },
            date: { type: Type.STRING },
            incomeType: { type: Type.STRING },
            accountName: { type: Type.STRING }
          },
          required: ["entryType", "amount", "merchant", "category", "mainCategory", "subCategory", "date"]
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
      mainCategory: result.mainCategory || 'Miscellaneous',
      subCategory: result.subCategory || 'Other',
      date: result.date || new Date().toISOString().split('T')[0],
      incomeType: result.incomeType,
      accountName: result.accountName
    };
  } catch (error) {
    return null;
  }
}

export async function generateQuickNote(merchant: string, mainCategory: string, subCategory: string): Promise<string> {
  const prompt = `Short professional description for ${merchant}: ${mainCategory} (${subCategory}). Max 8 words. String only.`;
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
  const prompt = `Analyze logs, extract transactions. Currency ${currency}. Provide Bucket, Primary Category, Sub Node. Clean merchants. JSON array.`;
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
              mainCategory: { type: Type.STRING },
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
  items: Array<{ merchant: string, amount: number, date: string, note?: string }>
): Promise<Array<{ merchant: string, category: Category, mainCategory: string, subCategory: string, intelligentNote: string }>> {
  const prompt = `Process ${items.length} transactions. Assign Bucket, Primary Category, Sub Node. Clean merchants. NO "General". JSON array.`;
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
  const currentMonthSpent = expenses.filter(e => new Date(e.date).getMonth() === m && new Date(e.date).getFullYear() === y).reduce((sum, e) => sum + e.amount, 0);

  const prompt = `Evaluate: "${query}". NetWorth ${netWorth}, Assets ${assets}, Debt ${liabilities}, Spent ${currentMonthSpent}. Return JSON.`;

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