import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  Game,
  GameStatus,
  PaymentMode,
  Transaction,
  TransactionFilter,
  TransactionSummaryResult,
  User,
} from '../types';

interface StaffUser {
  id: string;
  username: string;
  role: string;
  createdAt?: string;
}

interface AppContextType {
  currentUser: User | null;
  token: string | null;
  games: Game[];
  transactions: Transaction[];
  staffUsers: StaffUser[];
  activePage: 'transaction' | 'history' | 'add_game' | 'signup' | 'login';
  setActivePage: (page: 'transaction' | 'history' | 'add_game' | 'signup' | 'login') => void;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  signupStaff: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  addGame: (name: string, description: string, status: GameStatus) => Promise<{ success: boolean; error?: string }>;
  toggleGameStatus: (gameId: string) => Promise<void>;
  addTransaction: (gameId: string, amount: number, paymentMode: PaymentMode) => Promise<{ success: boolean; error?: string }>;
  getFilteredTransactions: (filter: TransactionFilter) => Promise<TransactionSummaryResult>;
  formatCurrency: (amount: number) => string;
  refreshData: () => Promise<void>;
  refreshStaff: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const TOKEN_KEY = 'valhala_jwt_token';
const USER_KEY = 'valhala_current_user';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  });

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem(USER_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [games, setGames] = useState<Game[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);

  const [activePage, setActivePage] = useState<'transaction' | 'history' | 'add_game' | 'signup' | 'login'>(() => {
    return token ? 'transaction' : 'login';
  });

  // Fetch games from MySQL
  const refreshGames = useCallback(async () => {
    try {
      const res = await fetch('/api/games');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setGames(
            data.map((g: any) => ({
              id: String(g.id),
              name: g.name,
              description: g.description,
              status: g.status as GameStatus,
              createdAt: g.createdAt || new Date().toISOString(),
            }))
          );
        }
      }
    } catch (err) {
      console.warn('Error fetching games from MySQL:', err);
    }
  }, []);

  // Fetch staff users (admin only)
  const refreshStaff = useCallback(async () => {
    if (!token || currentUser?.role !== 'admin') return;
    try {
      const res = await fetch('/api/staff', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setStaffUsers(data);
        }
      }
    } catch (e) {
      console.warn('Error fetching staff from MySQL:', e);
    }
  }, [token, currentUser]);

  // Fetch transactions from MySQL (admin only)
  const refreshTransactions = useCallback(async () => {
    if (!token || currentUser?.role !== 'admin') return;
    try {
      const res = await fetch('/api/transactions', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.transactions)) {
          setTransactions(
            data.transactions.map((t: any) => ({
              id: String(t.id),
              gameId: String(t.gameId),
              amount: Number(t.amount),
              paymentMode: t.paymentMode as PaymentMode,
              createdAt: t.createdAt,
            }))
          );
        }
      }
    } catch (e) {
      console.warn('Error fetching transactions from MySQL:', e);
    }
  }, [token, currentUser]);

  const refreshData = useCallback(async () => {
    await Promise.all([refreshGames(), refreshTransactions(), refreshStaff()]);
  }, [refreshGames, refreshTransactions, refreshStaff]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Validate session token on mount
  useEffect(() => {
    if (token) {
      fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(res => {
          if (!res.ok) {
            // Token expired or invalid
            logout();
          }
        })
        .catch(() => {});
    }
  }, [token]);

  // User Login against MySQL
  const login = async (username: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Invalid username or password.' };
      }

      setToken(data.token);
      setCurrentUser(data.user);
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      setActivePage('transaction');
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Login connection failed.' };
    }
  };

  const logout = () => {
    setToken(null);
    setCurrentUser(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setActivePage('login');
  };

  // Create Staff Access in MySQL
  const signupStaff = async (username: string, password: string) => {
    if (!token) {
      return { success: false, error: 'Authentication required' };
    }

    try {
      const res = await fetch('/api/auth/signup-staff', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to create staff account.' };
      }

      await refreshStaff();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Error communicating with MySQL.' };
    }
  };

  // Add Game to MySQL
  const addGame = async (name: string, description: string, status: GameStatus) => {
    if (!token) {
      return { success: false, error: 'Authentication required' };
    }

    try {
      const res = await fetch('/api/games', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, description, status }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to add game to MySQL.' };
      }

      await refreshGames();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Error communicating with MySQL.' };
    }
  };

  // Toggle Game Status in MySQL
  const toggleGameStatus = async (gameId: string) => {
    const game = games.find(g => g.id === gameId);
    if (!game || !token) return;
    const newStatus: GameStatus = game.status === 'available' ? 'unavailable' : 'available';

    // Optimistic UI update
    setGames(prev =>
      prev.map(g => (g.id === gameId ? { ...g, status: newStatus } : g))
    );

    try {
      await fetch(`/api/games/${gameId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      await refreshGames();
    } catch (err) {
      console.warn('Failed to update game status in MySQL:', err);
    }
  };

  // Record Transaction in MySQL
  const addTransaction = async (gameId: string, amount: number, paymentMode: PaymentMode) => {
    if (!token) {
      return { success: false, error: 'Authentication required' };
    }

    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          gameId,
          amount,
          paymentMode,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to record transaction in MySQL' };
      }

      await refreshTransactions();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Error communicating with MySQL.' };
    }
  };

  // Filter Transactions and compute net revenue with fee deduction from MySQL
  const getFilteredTransactions = async (filter: TransactionFilter): Promise<TransactionSummaryResult> => {
    if (!token) {
      return {
        transactions: [],
        rawTotal: 0,
        total: 0,
        feeDeducted: 0,
        feePercentage: 0,
        isFeeApplied: false,
      };
    }

    try {
      const params = new URLSearchParams();
      if (filter.gameId) params.append('gameId', filter.gameId);
      if (filter.date) params.append('date', filter.date);
      if (filter.paymentMode) params.append('paymentMode', filter.paymentMode);

      const res = await fetch(`/api/transactions?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('Error querying filtered transactions:', err);
    }

    return {
      transactions: [],
      rawTotal: 0,
      total: 0,
      feeDeducted: 0,
      feePercentage: 0,
      isFeeApplied: false,
    };
  };

  const formatCurrency = (amount: number): string => {
    return `₦${amount.toLocaleString('en-NG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        token,
        games,
        transactions,
        staffUsers,
        activePage,
        setActivePage,
        login,
        logout,
        signupStaff,
        addGame,
        toggleGameStatus,
        addTransaction,
        getFilteredTransactions,
        formatCurrency,
        refreshData,
        refreshStaff,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
