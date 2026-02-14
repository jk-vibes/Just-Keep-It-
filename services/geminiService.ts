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
    
    CRITICAL TAXONOMY RULES:
    1. 'category': Must be exactly one of [Needs, Wants, Savings, Avoids].
    2. 'mainCategory': The high-level group (e.g., Housing, Household, Logistics, Lifestyle, Leisure, Personal, Investment, Reserve, Waste, Impulse).
    3. 'subCategory': The specific item (e.g., Rent, Groceries, Fuel, Dining, Shopping, SIP, Late Fee).
    
    STRICT CONSTRAINT: DO NOT use the word "General" or "Uncategorized" for ANY field. Be specific based on the merchant. 
    Examples: 
    - Amazon -> Wants -> Lifestyle -> Shopping
    - Zomato -> Wants -> Lifestyle -> Dining
    - Shell -> Needs -> Logistics -> Fuel
    - Netflix -> Wants -> Leisure -> Subscription
    
    Flag "Avoids": Identify wasteful, impulsive, or redundant expenses (e.g. late fees, bank penalties, unwanted subscriptions). Set category to 'Avoids'.
    Duplicate Check: If transactions share the same amount and merchant within +/- 1 day, mark newer ones with 'isDuplicateOf' set to the original ID.
    
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
              category: { type: Type.STRING }, // This is the Bucket (Needs, etc)
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
    Current Bucket: ${expense.category}
    
    IDENTIFICATION RULES:
    1. 'suggestedCategory': Assign to [Needs, Wants, Savings, Avoids].
    2. 'suggestedMainCategory': Assign to a group (e.g., Housing, Logistics, Lifestyle, Investment).
    3. 'suggestedSubCategory': Assign to a specific item (e.g., Rent, Dining, SIP).
    
    STRICT RULE: DO NOT use "General" or "Other" if you can reasonably infer the industry. For unknown merchants, use "Miscellaneous".
    
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

    Give him one piece of actionable, firm, but loving advice. Use a dad-like tone. 
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

export async function parseTransactionText(text: string, currency: string): Promise<{ entryType: 'Expense' | 'Income', amount: number, merchant: string, category: Category, mainCategory: string, subCategory: string, date: string, incomeType?: string, accountName?: string } | null> {
  const prompt = `
    Extract financial details from this text: "${text}".
    Currency: ${currency}.
    
    Assign:
    - Bucket (category): Needs/Wants/Savings/Avoids.
    - Group (mainCategory): e.g., Logistics, Lifestyle, Housing.
    - Item (subCategory): e.g., Fuel, Dining, Rent.
    
    STRICT RULE: NO "General" or "Other" descriptors.
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
  const prompt = `Generate a very short, professional description (max 8 words) for:
    Merchant: ${merchant}
    Category: ${mainCategory} (${subCategory})
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
    Analyze this financial log and extract transactions.
    Currency: ${currency}.
    For each, provide:
    - category: [Needs, Wants, Savings, Avoids]
    - mainCategory: Specific group
    - subCategory: Specific item
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
  const prompt = `
    Analyze these ${items.length} transactions. 
    Return:
    1. category: [Needs, Wants, Savings, Avoids]
    2. mainCategory: Specific group
    3. subCategory: Specific item
    STRICT: No "General" tags.
    Data: ${JSON.stringify(items)}
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
  const currentMonthSpent = expenses
    .filter(e => new Date(e.date).getMonth() === m && new Date(e.date).getFullYear() === y)
    .reduce((sum, e) => sum + e.amount, 0);

  const prompt = `
    Evaluate: "${query}".
    Profile: Net Worth ${Math.round(netWorth)}, Assets ${Math.round(assets)}, Debt ${Math.round(liabilities)}, Monthly Income ${Math.round(settings.monthlyIncome)}.
    Spent this month: ${Math.round(currentMonthSpent)}.
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