
export type TimeMode = 'normal' | 'fast' | 'slow' | 'freeze';

export interface Upgrade {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  priceMultiplier: number;
  incomePerSecond: number;
  icon: string;
}

export interface Business {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  priceMultiplier: number;
  baseIncome: number;
  icon: string;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  requirement: number;
  type: 'balance' | 'totalEarned' | 'upgrades' | 'prestige';
}

export interface GameState {
  balance: number;
  totalEarned: number;
  lastUpdate: number;
  upgrades: Record<string, number>;
  businesses: Record<string, number>;
  achievements: string[];
  prestigePoints: number;
  prestigeMultiplier: number;
  version: string;
}
