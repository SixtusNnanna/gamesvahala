export type PaymentMode = 'bank_transfer' | 'landmark_app' | 'upside_down_house';

export type GameStatus = 'available' | 'unavailable';

export type UserRole = 'staff' | 'admin';

export interface User {
  id: string;
  username: string;
  role: UserRole;
}

export interface UserWithCredentials extends User {
  passwordHash: string; // Plaintext or simulated hash for local storage
}

export interface Game {
  id: string;
  name: string;
  description: string;
  status: GameStatus;
  createdAt: string;
}

export interface Transaction {
  id: string;
  gameId: string;
  amount: number;
  paymentMode: PaymentMode;
  createdAt: string;
}

export interface TransactionWithGame extends Transaction {
  game?: Game;
}

export interface TransactionFilter {
  gameId?: string;
  date?: string; // YYYY-MM-DD
  paymentMode?: PaymentMode | '';
}

export interface TransactionSummaryResult {
  transactions: TransactionWithGame[];
  rawTotal: number;
  total: number;
  feeDeducted: number;
  feePercentage: number;
  isFeeApplied: boolean;
}

export const PAYMENT_MODES: { value: PaymentMode; label: string }[] = [
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'landmark_app', label: 'Landmark App' },
  { value: 'upside_down_house', label: 'Up Side Down House' },
];

export const GAME_STATUSES: { value: GameStatus; label: string }[] = [
  { value: 'available', label: 'Available' },
  { value: 'unavailable', label: 'Unavailable' },
];
