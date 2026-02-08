export type Category = 'Needs' | 'Wants' | 'Savings' | 'Avoids' | 'Uncategorized';
export type Frequency = 'None' | 'Weekly' | 'Monthly' | 'Yearly';
export type IncomeType = 'Salary' | 'Freelance' | 'Investment' | 'Gift' | 'Other';
export type AppTheme = 'Spiderman' | 'CaptainAmerica' | 'Naruto' | 'Batman' | 'Moon';
export type PaymentMethod = 'UPI' | 'Card' | 'Cash' | 'Net Banking' | 'Other';
export type DensityLevel = 'Normal' | 'Simple' | 'Compact';

export type WealthType = 'Investment' | 'Liability';
export type WealthCategory = 
  | 'Savings' | 'Pension' | 'Gold' | 'Cash' | 'Investment'
  | 'Credit Card' | 'Personal Loan' | 'Home Loan' | 'Overdraft' | 'Gold Loan' | 'Other';

export interface BudgetItem {
  id: string;
  name: string;
  amount: number;
  bucket: Category;
  category: string;
  subCategory?: string;
  isRecurringLink?: string; 
  isMock?: boolean;
  isImported?: boolean;
}

export interface Bill {
  id: string;
  amount: number;
  dueDate: string;
  merchant: string;
  category: Category; // The Bucket
  mainCategory: string; // The "Category" level
  subCategory?: string; // The "Sub-Category" level
  isPaid: boolean;
  frequency: Frequency;
  image?: string; // base64
  note?: string;
  accountId?: string; // Link to WealthItem
  isMock?: boolean;
  isImported?: boolean;
}

export interface Expense {
  id: string;
  amount: number;
  date: string;
  category: Category; // The Bucket
  mainCategory: string; // The "Category" level
  subCategory?: string; // The "Sub-Category" level
  paymentMethod?: PaymentMethod;
  note?: string;
  merchant?: string;
  isConfirmed: boolean;
  sourceAccountId?: string; 
  isMock?: boolean;
  isImported?: boolean;
  billId?: string; // Optional link to a captured bill
  ruleId?: string; // Track which rule categorized this
  isAIUpgraded?: boolean; // Track if AI handled it
}

export interface Income {
  id: string;
  amount: number;
  date: string;
  type: IncomeType;
  paymentMethod?: PaymentMethod;
  note?: string;
  targetAccountId?: string; 
  isMock?: boolean;
  isImported?: boolean;
}

export interface WealthItem {
  id: string;
  type: WealthType;
  category: WealthCategory;
  group?: string; // New field for custom grouping
  name: string; // The raw label used for mapping
  alias?: string; // Friendly display name
  value: number;
  limit?: number;
  date: string;
  isMock?: boolean;
  isImported?: boolean;
}

export interface BudgetRule {
  id: string;
  keyword: string;
  category: Category; // Bucket
  mainCategory: string;
  subCategory?: string;
  isImported?: boolean;
  isMock?: boolean;
}

export interface RecurringItem {
  id: string;
  amount: number;
  bucket: Category;
  category: string;
  subCategory?: string;
  note: string;
  merchant?: string;
  frequency: Frequency;
  nextDueDate: string;
  isMock?: boolean;
  isImported?: boolean;
}

export interface Notification {
  id: string;
  type: 'AI' | 'Activity' | 'Bill' | 'Strategy';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  severity?: 'info' | 'success' | 'warning' | 'error';
  metadata?: any; // For strategy scores or bill links
}

export interface UserSettings {
  monthlyIncome: number;
  split: {
    Needs: number;
    Wants: number;
    Savings: number;
  };
  isOnboarded: boolean;
  appTheme?: AppTheme;
  isCloudSyncEnabled: boolean;
  currency: string;
  lastSynced?: string;
  density?: DensityLevel;
  hasLoadedMockData?: boolean;
  dataFilter: 'all' | 'user' | 'mock';
  customCategories?: Record<Category, Record<string, string[]>>;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  accessToken?: string;
}

export type View = 'Dashboard' | 'Ledger' | 'Profile' | 'Add' | 'AddExpense' | 'AddIncome' | 'Auth' | 'Accounts' | 'Budget' | 'Rules' | 'Affordability' | 'Notifications';