
import { Upgrade, Business, Achievement } from './types';

export const INITIAL_UPGRADES: Upgrade[] = [
  { id: 'u1', name: 'Precision Clock', description: 'Improves timing. +$1/sec', basePrice: 15, priceMultiplier: 1.15, incomePerSecond: 1, icon: '⏱️' },
  { id: 'u2', name: 'Digital Ledger', description: 'Calculates faster. +$5/sec', basePrice: 100, priceMultiplier: 1.15, incomePerSecond: 5, icon: '📓' },
  { id: 'u3', name: 'High-Freq Server', description: 'Process time chunks. +$25/sec', basePrice: 500, priceMultiplier: 1.15, incomePerSecond: 25, icon: '🖥️' },
  { id: 'u4', name: 'Quantum Processor', description: 'Earnings outside time. +$100/sec', basePrice: 2000, priceMultiplier: 1.15, incomePerSecond: 100, icon: '⚛️' },
];

export const INITIAL_BUSINESSES: Business[] = [
  { id: 'b1', name: 'Lemonade Stand', description: 'The classic start. +$0.5/sec', basePrice: 10, priceMultiplier: 1.12, baseIncome: 0.5, icon: '🍋' },
  { id: 'b2', name: 'Local Coffee Shop', description: 'Fueling the town. +$2/sec', basePrice: 150, priceMultiplier: 1.12, baseIncome: 2, icon: '☕' },
  { id: 'b3', name: 'Tech Startup', description: 'Disrupting the world. +$15/sec', basePrice: 1200, priceMultiplier: 1.12, baseIncome: 15, icon: '🚀' },
  { id: 'b4', name: 'Real Estate Firm', description: 'Buying up the block. +$80/sec', basePrice: 8500, priceMultiplier: 1.12, baseIncome: 80, icon: '🏢' },
  { id: 'b5', name: 'Global Conglomerate', description: 'The world is yours. +$500/sec', basePrice: 50000, priceMultiplier: 1.12, baseIncome: 500, icon: '🌍' },
];

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'a1', name: 'First Dollar', description: 'Earn your first dollar', requirement: 1, type: 'totalEarned' },
  { id: 'a2', name: 'Entrepreneur', description: 'Reach $1,000 balance', requirement: 1000, type: 'balance' },
  { id: 'a3', name: 'Millionaire Club', description: 'Reach $1,000,000 balance', requirement: 1000000, type: 'balance' },
  { id: 'a4', name: 'Efficiency Pro', description: 'Buy 50 upgrades', requirement: 50, type: 'upgrades' },
  { id: 'a5', name: 'True Mogul', description: 'Prestige for the first time', requirement: 1, type: 'prestige' },
];

export const CURRENT_VERSION = '2.6.3';
export const VERSION_SUMMARY = 'Juice';

export const COLORS = {
  primary: '#2dd4bf', // Teal 400
  secondary: '#0f172a', // Slate 900
  accent: '#f59e0b', // Amber 500
};
