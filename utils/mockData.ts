import { Expense, Income, WealthItem, BudgetItem, Bill, BudgetRule, Category, RecurringItem } from '../types';
import { SUB_CATEGORIES, DEFAULT_CATEGORIES } from '../constants';

const MERCHANTS: Record<Category, string[]> = {
  Needs: ['Reliance Fresh', 'Airtel Digital', 'HDFC Home Loan', 'Bescom Power', 'Shell Fuel', 'Apollo Pharmacy', 'Uber India', 'BigBasket', 'Life Insurance', 'Municipal Tax', 'Society Maintenance', 'Gas Connection', 'Coursera', 'Udemy', 'Local Pharmacy'],
  Wants: ['Netflix', 'Starbucks', 'Zomato', 'PVR Cinemas', 'Zara', 'Amazon.in', 'H&M', 'Nike', 'Apple Store', 'Dining Out', 'BookMyShow', 'Spotify India', 'Steam Games', 'Weekend Trip', 'Decathlon', 'IKEA'],
  Savings: ['HDFC Securities', 'Zerodha SIP', 'Gold Purchase', 'Public Provident Fund', 'Fixed Deposit', 'Crypto Exchange', 'NPS Contribution', 'Mutual Fund Top-up', 'Vanguard', 'Post Office Savings'],
  Avoids: ['Late Payment Fee', 'Impulse Gadget', 'Unused Subscription', 'ATM Withdrawal Fee', 'Bank Penalty', 'Overspending Dining', 'Random E-commerce', 'Parking Fine', 'Credit Card Interest'],
  Uncategorized: ['General', 'Cash Withdrawal', 'Miscellaneous', 'Internal Correction']
};

const getMockNote = (bucket: Category, merchant: string, subCategory: string): string => {
  switch (bucket) {
    case 'Needs':
      if (subCategory.includes('Grocer')) return "Weekly household grocery replenishment";
      if (subCategory.includes('Rent')) return "Standard monthly housing settlement";
      if (subCategory.includes('Fuel')) return "Vehicle refueling at station";
      if (subCategory.includes('Util')) return "Essential public utility payment";
      return `Monthly ${subCategory} obligation`;
    case 'Wants':
      if (subCategory.includes('Dining')) return "Leisure dining and refreshments";
      if (subCategory.includes('Ent')) return "Digital content and entertainment";
      if (subCategory.includes('Shop')) return "Personal lifestyle acquisition";
      return `Discretionary spend on ${subCategory}`;
    case 'Savings':
      return `Strategic capital allocation to ${subCategory}`;
    case 'Avoids':
      return `Unplanned outflow: ${merchant}`;
    default:
      return `${merchant} registry point`;
  }
};

export const generate12MonthData = () => {
  const findMainCategory = (bucket: Category, subCat: string): string => {
    const bucketData = DEFAULT_CATEGORIES[bucket];
    if (!bucketData) return 'General';
    for (const [main, subs] of Object.entries(bucketData)) {
      if (subs.includes(subCat)) return main;
    }
    return 'General';
  };

  const expenses: Expense[] = [];
  const incomes: Income[] = [];
  const bills: Bill[] = [];
  const recurringItems: RecurringItem[] = [];
  
  const wealthItems: WealthItem[] = [
    { id: 'w1', type: 'Investment', category: 'Savings', name: 'HDFC Bank', alias: 'Primary Savings', value: 1250000, date: new Date().toISOString(), isMock: true },
    { id: 'w2', type: 'Investment', category: 'Investment', name: 'Zerodha Portfolio', alias: 'Equity Fund', value: 4500000, date: new Date().toISOString(), isMock: true },
    { id: 'w3_asset', type: 'Investment', category: 'Savings', name: 'ICICI Bank', alias: 'Secondary Savings', value: 850000, date: new Date().toISOString(), isMock: true },
    { id: 'w4_asset', type: 'Investment', category: 'Gold', name: 'SafeGold Vault', alias: 'Physical Gold', value: 1500000, date: new Date().toISOString(), isMock: true },
    { id: 'w5_asset', type: 'Investment', category: 'Cash', name: 'Physical Vault', alias: 'Emergency Cash', value: 200000, date: new Date().toISOString(), isMock: true },
    
    { id: 'cc1', type: 'Liability', category: 'Credit Card', name: 'AMEX Platinum', alias: 'Amex Card', value: 45000, limit: 1000000, date: new Date().toISOString(), isMock: true },
    { id: 'cc2', type: 'Liability', category: 'Credit Card', name: 'HDFC Infinia', alias: 'HDFC Premium', value: 120000, limit: 1500000, date: new Date().toISOString(), isMock: true },
    { id: 'cc3', type: 'Liability', category: 'Credit Card', name: 'ICICI Amazon Pay', alias: 'Amazon Card', value: 12500, limit: 500000, date: new Date().toISOString(), isMock: true },
    { id: 'cc4', type: 'Liability', category: 'Credit Card', name: 'Axis Magnus', alias: 'Axis Travel', value: 85000, limit: 1200000, date: new Date().toISOString(), isMock: true },
    { id: 'cc5', type: 'Liability', category: 'Credit Card', name: 'SBI ELITE', alias: 'SBI Shopping', value: 5000, limit: 300000, date: new Date().toISOString(), isMock: true },
    
    { id: 'l1', type: 'Liability', category: 'Home Loan', name: 'SBI Home Loan', alias: 'Home Loan', value: 3500000, emiAmount: 42500, maturityDate: '2035-12-31', date: new Date().toISOString(), isMock: true },
    { id: 'l2', type: 'Liability', category: 'Personal Loan', name: 'HDFC Personal', alias: 'Personal Loan', value: 450000, emiAmount: 12500, maturityDate: '2027-06-30', date: new Date().toISOString(), isMock: true },
    { id: 'l3', type: 'Liability', category: 'Personal Loan', name: 'Car Loan', alias: 'SUV Loan', value: 1200000, emiAmount: 22000, maturityDate: '2029-03-15', date: new Date().toISOString(), isMock: true },
  ];

  const budgetItems: BudgetItem[] = [
    { id: 'b1', name: 'Housing & Rent', amount: 80000, bucket: 'Needs', category: 'Housing', subCategory: 'Rent/Mortgage', isMock: true },
    { id: 'b2', name: 'Groceries Goal', amount: 25000, bucket: 'Needs', category: 'Household', subCategory: 'Groceries', isMock: true },
    { id: 'b3', name: 'Dining & Food', amount: 30000, bucket: 'Wants', category: 'Lifestyle', subCategory: 'Dining', isMock: true },
    { id: 'b4', name: 'Monthly SIP', amount: 150000, bucket: 'Savings', category: 'Investment', subCategory: 'SIP/Mutual Fund', isMock: true },
    { id: 'b5', name: 'Tech & Gadgets', amount: 20000, bucket: 'Wants', category: 'Lifestyle', subCategory: 'Tech Gadgets', isMock: true },
    { id: 'b6', name: 'Fuel Buffer', amount: 10000, bucket: 'Needs', category: 'Logistics', subCategory: 'Fuel', isMock: true }
  ];

  const rules: BudgetRule[] = [
    { id: 'r1', keyword: 'Zomato', category: 'Wants', mainCategory: 'Lifestyle', subCategory: 'Dining', isMock: true },
    { id: 'r2', keyword: 'Airtel', category: 'Needs', mainCategory: 'Communication', subCategory: 'Internet', isMock: true },
    { id: 'r3', keyword: 'Zerodha', category: 'Savings', mainCategory: 'Investment', subCategory: 'SIP/Mutual Fund', isMock: true }
  ];

  const now = new Date();
  
  for (let m = 0; m < 12; m++) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - m, 1);
    
    const incomeTypes = ['Salary', 'Freelance', 'Investment', 'Gift', 'Other'];
    incomeTypes.forEach((type, idx) => {
      incomes.push({
        id: `inc-${m}-${idx}`,
        amount: idx === 0 ? 300000 : Math.floor(Math.random() * 20000) + 5000,
        date: new Date(monthDate.getFullYear(), monthDate.getMonth(), idx + 1).toISOString().split('T')[0],
        type: type as any,
        paymentMethod: 'Net Banking',
        note: `${type} inflow`,
        targetAccountId: idx % 2 === 0 ? 'w1' : 'w3_asset',
        isMock: true
      });
    });

    const billMerchants = [
      { name: 'Society Dues', cat: 'Housing', sub: 'Maintenance' },
      { name: 'Electricity Board', cat: 'Housing', sub: 'Utilities' },
      { name: 'Gas Provider', cat: 'Housing', sub: 'Utilities' },
      { name: 'Internet Service', cat: 'Communication', sub: 'Internet' },
      { name: 'Life Insurance', cat: 'Essentials', sub: 'Health/Insurance' }
    ];
    billMerchants.forEach((bInfo, idx) => {
      bills.push({
        id: `bill-${m}-${idx}`,
        amount: Math.floor(Math.random() * 5000) + 1000,
        dueDate: new Date(monthDate.getFullYear(), monthDate.getMonth(), idx + 5).toISOString().split('T')[0],
        merchant: bInfo.name,
        category: 'Needs',
        mainCategory: bInfo.cat,
        subCategory: bInfo.sub,
        isPaid: m > 0,
        frequency: 'Monthly',
        note: `Standard monthly dues for ${bInfo.name}`,
        accountId: 'w1',
        isMock: true
      });
    });

    for (let i = 0; i < 5; i++) {
        expenses.push({
          id: `trf-${m}-${i}`,
          amount: Math.floor(Math.random() * 5000) + 1000,
          date: new Date(monthDate.getFullYear(), monthDate.getMonth(), i + 10).toISOString().split('T')[0],
          category: 'Uncategorized',
          mainCategory: 'Internal',
          subCategory: 'Transfer',
          merchant: 'Internal Transfer',
          note: `Capital rebalancing protocol`,
          isConfirmed: true,
          sourceAccountId: 'w1',
          isMock: true
        });
    }

    // High density transaction generation
    for (let t = 0; t < 100; t++) {
      const day = Math.floor(Math.random() * 28) + 1;
      const txDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), day).toISOString().split('T')[0];
      
      const rand = Math.random();
      let bucket: Category = 'Needs';
      if (rand > 0.9) bucket = 'Avoids';
      else if (rand > 0.7) bucket = 'Wants';
      else if (rand > 0.5) bucket = 'Savings';

      const merchantList = MERCHANTS[bucket];
      const merchant = merchantList[Math.floor(Math.random() * merchantList.length)];
      
      const subCats = SUB_CATEGORIES[bucket] || ['General'];
      const subCategory = subCats[Math.floor(Math.random() * subCats.length)];
      
      let amount = 0;
      if (bucket === 'Needs') amount = Math.floor(Math.random() * 3000) + 500;
      else if (bucket === 'Wants') amount = Math.floor(Math.random() * 6000) + 1000;
      else if (bucket === 'Savings') amount = Math.floor(Math.random() * 20000) + 5000;
      else amount = Math.floor(Math.random() * 2000) + 200;

      const accounts = ['w1', 'cc1', 'cc2', 'cc3', 'cc4', 'cc5'];
      const sourceId = accounts[Math.floor(Math.random() * accounts.length)];

      expenses.push({
        id: `exp-${m}-${t}`,
        amount,
        date: txDate,
        category: bucket, // Bucket level
        mainCategory: findMainCategory(bucket, subCategory), // Group level
        subCategory, // Item level
        merchant,
        note: getMockNote(bucket, merchant, subCategory),
        isConfirmed: true,
        sourceAccountId: sourceId,
        isMock: true
      });
    }
  }

  return { expenses, incomes, wealthItems, budgetItems, rules, bills, recurringItems };
};