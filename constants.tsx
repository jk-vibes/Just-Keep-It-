
import { Category, PaymentMethod } from './types';

export const CATEGORY_COLORS: Record<Category, string> = {
  Needs: '#60a5fa',     // Light Blue (Sky)
  Wants: '#f59e0b',     // Amber (Caution)
  Savings: '#22c55e',   // Green
  Avoids: '#ef4444',    // Red (Stop/Hazard)
  Uncategorized: '#94a3b8' // Slate
};

export const DEFAULT_CATEGORIES: Record<Category, Record<string, string[]>> = {
  Needs: {
    'Housing': ['Rent/Mortgage', 'Utilities', 'Maintenance', 'Municipal Tax'],
    'Household': ['Groceries', 'Supplies', 'Staff Salary'],
    'Logistics': ['Fuel', 'Transport', 'Parking'],
    'Communication': ['Internet', 'Mobile/Phone'],
    'Essentials': ['Health/Insurance', 'Education'],
    'Obligations': ['Debt Interest', 'Loan EMI', 'Credit Card Due']
  },
  Wants: {
    'Lifestyle': ['Dining', 'Shopping', 'Gifts', 'Hobbies'],
    'Leisure': ['Travel', 'Entertainment', 'Subscription', 'Weekend Trip'],
    'Personal': ['Coffee', 'Apparel', 'Beauty/Grooming', 'Tech Gadgets']
  },
  Savings: {
    'Investment': ['SIP/Mutual Fund', 'Stocks', 'Crypto', 'Gold'],
    'Reserve': ['Emergency Fund', 'Fixed Deposit', 'Cash Vault'],
    'Future': ['Real Estate', 'Retirement', 'Pension/NPS']
  },
  Avoids: {
    'Waste': ['Late Fee', 'Bank Penalty', 'ATM Fee'],
    'Impulse': ['Impulse Buy', 'Redundant Sub', 'Excessive Shopping'],
    'Low Value': ['Unwanted Dining', 'Vices', 'Postponable']
  },
  Uncategorized: {
    'General': ['General', 'Correction'],
    'Internal': ['Transfer', 'Bill Payment']
  }
};

// Add exported SUB_CATEGORIES for flat list access per bucket
export const SUB_CATEGORIES: Record<Category, string[]> = {
  Needs: Object.values(DEFAULT_CATEGORIES.Needs).flat(),
  Wants: Object.values(DEFAULT_CATEGORIES.Wants).flat(),
  Savings: Object.values(DEFAULT_CATEGORIES.Savings).flat(),
  Avoids: Object.values(DEFAULT_CATEGORIES.Avoids).flat(),
  Uncategorized: Object.values(DEFAULT_CATEGORIES.Uncategorized).flat(),
};

export const PAYMENT_METHODS: PaymentMethod[] = ['UPI', 'Card', 'Cash', 'Net Banking', 'Other'];

export const DEFAULT_SPLIT = {
  Needs: 50,
  Wants: 30,
  Savings: 20
};

export const SUPPORTED_CURRENCIES = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' }
];

export const getCurrencySymbol = (code: string) => {
  return SUPPORTED_CURRENCIES.find(c => c.code === code)?.symbol || '₹';
};
