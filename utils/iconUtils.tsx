import React from 'react';
import { 
  Home, Car, ShoppingBag, Zap, HeartPulse, Wifi, Smartphone, 
  Utensils, Plane, TrendingUp, Banknote, Briefcase, Shield, 
  Star, Trophy, Sparkles, ReceiptText, ArrowRightLeft, 
  Coffee, Laptop, Scissors, BookOpen, Construction, Gift, 
  Dumbbell, Bitcoin, Gem, PiggyBank, Scale
} from 'lucide-react';

export const getCategoryIcon = (
  category: string, 
  mainCategory?: string, 
  subCategory?: string, 
  type?: string,
  size: number = 16
) => {
  const sc = subCategory?.toLowerCase() || '';
  const mc = mainCategory?.toLowerCase() || '';
  const c = category.toLowerCase();

  // Special System Categories
  if (sc === 'bill payment') return <ReceiptText size={size} />;
  if (sc === 'transfer') return <ArrowRightLeft size={size} />;
  if (sc === 'balance' || sc === 'adjustment') return <Scale size={size} />;

  // Income Mappings
  if (type === 'Salary') return <Banknote size={size} />;
  if (type === 'Freelance') return <Briefcase size={size} />;
  if (type === 'Investment') return <TrendingUp size={size} />;
  if (type === 'Gift') return <Gift size={size} />;

  // Needs Hierarchy
  if (mc.includes('house') || mc.includes('rent') || sc.includes('mortgage')) return <Home size={size} />;
  if (mc.includes('logistics') || mc.includes('transp') || mc.includes('fuel') || sc.includes('petrol')) return <Car size={size} />;
  if (mc.includes('household') || sc.includes('grocer') || sc.includes('supplies')) return <ShoppingBag size={size} />;
  if (sc.includes('util') || mc.includes('electricity') || mc.includes('power')) return <Zap size={size} />;
  if (mc.includes('vital') || sc.includes('health') || sc.includes('medical') || sc.includes('insurance')) return <HeartPulse size={size} />;
  if (mc.includes('comm') || sc.includes('internet') || sc.includes('wifi')) return <Wifi size={size} />;
  if (sc.includes('phone') || sc.includes('mobile')) return <Smartphone size={size} />;
  if (sc.includes('edu') || sc.includes('course') || sc.includes('school')) return <BookOpen size={size} />;
  if (sc.includes('maintenance') || sc.includes('staff')) return <Construction size={size} />;

  // Wants Hierarchy
  if (mc.includes('lifestyle') || sc.includes('din') || sc.includes('eat') || sc.includes('restaurant')) return <Utensils size={size} />;
  if (mc.includes('leisure') || sc.includes('travel') || sc.includes('trip') || sc.includes('hotel')) return <Plane size={size} />;
  if (sc.includes('coffee') || sc.includes('cafe')) return <Coffee size={size} />;
  if (sc.includes('gadget') || sc.includes('tech') || sc.includes('laptop')) return <Laptop size={size} />;
  if (sc.includes('beauty') || sc.includes('groom') || sc.includes('salon') || sc.includes('apparel')) return <Scissors size={size} />;
  if (sc.includes('hobby') || sc.includes('gym') || sc.includes('sport')) return <Dumbbell size={size} />;
  if (sc.includes('movie') || sc.includes('entertainment') || sc.includes('netflix')) return <Zap size={size} />;

  // Savings Hierarchy
  if (sc.includes('sip') || sc.includes('stock') || sc.includes('mutual') || sc.includes('invest')) return <TrendingUp size={size} />;
  if (sc.includes('gold')) return <Gem size={size} />;
  if (sc.includes('crypto') || sc.includes('bitcoin')) return <Bitcoin size={size} />;
  if (sc.includes('pension') || sc.includes('retire') || sc.includes('nps')) return <PiggyBank size={size} />;

  // Bucket Fallbacks
  if (c === 'needs') return <Shield size={size} />;
  if (c === 'wants') return <Star size={size} />;
  if (c === 'savings') return <Trophy size={size} />;
  if (c === 'avoids') return <Zap size={size} />;

  return <Sparkles size={size} />;
};
