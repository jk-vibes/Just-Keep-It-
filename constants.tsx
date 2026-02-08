import { Category, PaymentMethod } from './types';

export const CATEGORY_COLORS: Record<Category, string> = {
  Needs: '#60a5fa',     // Light Blue (Sky)
  Wants: '#ef4444',     // Red
  Savings: '#22c55e',   // Green
  Avoids: '#f59e0b',    // Amber (Caution)
  Uncategorized: '#94a3b8' // Slate
};

export const SUB_CATEGORIES: Record<Category, string[]> = {
  Needs: [
    'Rent/Mortgage', 
    'Groceries', 
    'Utilities', 
    'Fuel/Transport', 
    'Internet/Mobile', 
    'Health/Insurance', 
    'Education', 
    'Household', 
    'Debt Interest',
    'Loan',
    'Credit Card'
  ],
  Wants: [
    'Dining', 
    'Shopping', 
    'Travel', 
    'Entertainment', 
    'Subscription', 
    'Gifts', 
    'Hobbies', 
    'Coffee', 
    'Apparel', 
    'Beauty/Grooming'
  ],
  Savings: [
    'SIP/Mutual Fund', 
    'Emergency Fund', 
    'Stocks', 
    'Gold', 
    'Real Estate', 
    'Crypto', 
    'Fixed Deposit', 
    'Retirement'
  ],
  Avoids: [
    'Impulse Buy',
    'Late Fee',
    'Redundant Sub',
    'Unwanted Dining',
    'Excessive Shopping',
    'Penalty',
    'Vices',
    'Postponable'
  ],
  Uncategorized: ['General', 'Transfer', 'Bill Payment', 'Correction']
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