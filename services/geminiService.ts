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

export async function refineBatchTransactions(transactions: Array<{ id: string, amount: number, merchant: string, note: string }>): Promise<Array<{ id: string, merchant: string, category: Category, subCategory: string, isAvoidSuggestion: boolean }>> {
  const prompt = `
    Semantically audit and refine these financial transactions.
    For each item, determine the actual Merchant Name, its Category (Needs/Wants/Savings/Avoids/Uncategorized), and a specific Sub-Category.
    
    SPECIAL LOGIC: Identify "Avoids". These are unwanted expenses which can wait or were unnecessary (e.g. redundant subscriptions, late fees, penalties, impulsive low-value dining when budget is tight).
    
    Data: ${JSON.stringify(transactions)}
    
    Return a JSON array: [{id, merchant, category, subCategory, isAvoidSuggestion}]
    Note: isAvoidSuggestion should be true if you categorized it as "Avoids".
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
              subCategory: { type: Type.STRING },
              isAvoidSuggestion: { type: Type.BOOLEAN }
            },
            required: ["id", "merchant", "category", "subCategory", "isAvoidSuggestion"]
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

export async function getTacticalStrategy(
  expenses: Expense[], 
  budgetItems: BudgetItem[], 
  pendingBills: Bill[], 
  settings: UserSettings
) {
  const summary = expenses.reduce((acc, exp) => {
    if (exp.isConfirmed) {
      acc[exp.category] = (acc[exp.category] || 0) + Math.round(exp.amount);
    }
    return acc;
  }, {} as Record<string, number>);

  const billTotal = pendingBills.reduce((sum, b) => sum + b.amount, 0);

  const prompt = `
    Expenditure Planning Analysis:
    Income: ${settings.monthlyIncome} ${settings.currency}
    Actual Spend: Needs ${summary.Needs || 0}, Wants ${summary.Wants || 0}, Savings ${summary.Savings || 0}, Avoids ${summary.Avoids || 0}
    Unpaid Bills: ${billTotal} ${settings.currency}
    Target Allocation: ${settings.split.Needs}% Needs, ${settings.split.Wants}% Wants, ${settings.split.Savings}% Savings
    
    Provide a tactical recommendation on how to control expenses for the rest of the month.
    Highlight any high "Avoids" spending.
    Return JSON: {
      status: "Safe" | "Caution" | "Critical",
      recommendation: string (max 20 words),
      drillDown: string[] (3 actionable items),
      headroom: number (remaining discretionary cash)
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
            status: { type: Type.STRING },
            recommendation: { type: Type.STRING },
            drillDown: { type: Type.ARRAY, items: { type: Type.STRING } },
            headroom: { type: Type.NUMBER }
          },
          required: ["status", "recommendation", "drillDown", "headroom"]
        }
      }
    }));
    return JSON.parse(response.text || '{}');
  } catch (error) {
    return null;
  }
}

export async function getBudgetInsights(expenses: Expense[], settings: UserSettings) {
  const hash = getExpensesHash(expenses, settings);
  const cache = getPersistentCache();
  
  if (cache[hash] && (Date.now() - cache[hash].timestamp < 86400000)) {
    return cache[hash].data;
  }

  const summary = expenses.reduce((acc, exp) => {
    if (exp.isConfirmed) {
      acc[exp.category] = (acc[exp.category] || 0) + Math.round(exp.amount);
    }
    return acc;
  }, {} as Record<string, number>);

  const prompt = `
    Context: Monthly Income ${Math.round(settings.monthlyIncome)} ${settings.currency}.
    Current spend: Needs ${summary.Needs || 0}, Wants ${summary.Wants || 0}, Savings ${summary.Savings || 0}, Avoids ${summary.Avoids || 0}.
    Targets: ${settings.split.Needs}% Needs, ${settings.split.Wants}% Wants, ${settings.split.Savings}% Savings.
    Output 3 EXTREMELY SHORT actionable coaching tips. Focus on reducing "Avoids" if high.
    
    Return JSON array: [{tip, impact}]
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
              tip: { type: Type.STRING },
              impact: { type: Type.STRING }
            },
            required: ["tip", "impact"]
          }
        }
      }
    }));
    
    const results = JSON.parse(response.text || '[]');
    if (results.length > 0) {
      setPersistentCache(hash, results);
    }
    return results;
  } catch (error) {
    return null;
  }
}

export async function getDecisionAdvice(
  expenses: Expense[], 
  wealthItems: WealthItem[], 
  settings: UserSettings, 
  query: string
) {
  const summary = expenses.reduce((acc, exp) => {
    if (exp.isConfirmed) {
      acc[exp.category] = (acc[exp.category] || 0) + Math.round(exp.amount);
    }
    return acc;
  }, {} as Record<string, number>);

  const assets = wealthItems.filter(i => i.type === 'Investment').reduce((sum, i) => sum + i.value, 0);
  const liquid = wealthItems.filter(i => ['Savings', 'Cash'].includes(i.category)).reduce((sum, i) => sum + i.value, 0);

  const prompt = `
    Financial Advisor Request: "${query}"
    
    Context:
    - Monthly Income: ${Math.round(settings.monthlyIncome)} ${settings.currency}. 
    - Current Monthly Spend: Needs ${summary.Needs || 0}, Wants ${summary.Wants || 0}, Savings ${summary.Savings || 0}, Avoids ${summary.Avoids || 0}.
    - Net Portfolio: Assets ${Math.round(assets)}, Liquid Cash ${Math.round(liquid)}.
    
    Return JSON with status, score, reasoning, actionPlan, waitTime, and impactPercentage.
  `;

  try {
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: { 
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            status: { type: Type.STRING },
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
    return { 
      status: 'Caution', 
      score: 50, 
      reasoning: 'AI assessment system currently synchronizing.', 
      actionPlan: ["Review cash on hand", "Check upcoming bills"], 
      waitTime: "T+2 Days",
      impactPercentage: 0
    };
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

export async function predictBudgetCategory(name: string): Promise<{ category: Category, subCategory: string } | null> {
  const prompt = `
    Based on the budget item name "${name}", predict the most appropriate finance category (Needs/Wants/Savings/Avoids/Uncategorized) and a specific sub-category name.
    
    Return JSON with fields: category, subCategory.
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
            category: { type: Type.STRING },
            subCategory: { type: Type.STRING }
          },
          required: ["category", "subCategory"]
        }
      }
    }));
    
    const result = JSON.parse(response.text || '{}');
    const validCategories: Category[] = ['Needs', 'Wants', 'Savings', 'Avoids', 'Uncategorized'];
    return {
      category: validCategories.includes(result.category) ? result.category : 'Uncategorized',
      subCategory: result.subCategory || 'General'
    };
  } catch (error) {
    return null;
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