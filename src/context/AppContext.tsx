import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  Game,
  GameStatus,
  PaymentMode,
  Transaction,
  TransactionFilter,
  TransactionSummaryResult,
  User,
  UserWithCredentials,
} from '../types';
import {
  INITIAL_GAMES,
  INITIAL_TRANSACTIONS,
  INITIAL_USERS,
} from '../data/initialData';
import { auth, googleAuthProvider } from '../lib/firebase';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';

interface AppContextType {
  currentUser: User | null;
  users: UserWithCredentials[];
  games: Game[];
  transactions: Transaction[];
  activePage: 'transaction' | 'history' | 'add_game' | 'signup' | 'login';
  setActivePage: (page: 'transaction' | 'history' | 'add_game' | 'signup' | 'login') => void;
  login: (username: string, password: string) => { success: boolean; error?: string };
  loginWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  signupStaff: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  addGame: (name: string, description: string, status: GameStatus) => Promise<{ success: boolean; error?: string }>;
  toggleGameStatus: (gameId: string) => Promise<void>;
  addTransaction: (gameId: string, amount: number, paymentMode: PaymentMode) => Promise<{ success: boolean; error?: string }>;
  getFilteredTransactions: (filter: TransactionFilter) => TransactionSummaryResult;
  formatCurrency: (amount: number) => string;
  resetToDefaults: () => void;
  switchUserQuick: (role: 'admin' | 'staff') => void;
  refreshData: () => Promise<void>;
  isDbConnected: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEY_USERS = 'valhala_users_v1';
const STORAGE_KEY_CURRENT_USER = 'valhala_current_user_v1';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<UserWithCredentials[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_USERS);
      return stored ? JSON.parse(stored) : INITIAL_USERS;
    } catch {
      return INITIAL_USERS;
    }
  });

  const [games, setGames] = useState<Game[]>(INITIAL_GAMES);
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [isDbConnected, setIsDbConnected] = useState<boolean>(true);

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_CURRENT_USER);
      if (stored) {
        return JSON.parse(stored);
      }
      return { id: INITIAL_USERS[0].id, username: INITIAL_USERS[0].username, role: INITIAL_USERS[0].role };
    } catch {
      return { id: INITIAL_USERS[0].id, username: INITIAL_USERS[0].username, role: INITIAL_USERS[0].role };
    }
  });

  const [activePage, setActivePage] = useState<'transaction' | 'history' | 'add_game' | 'signup' | 'login'>(() => {
    return currentUser ? 'transaction' : 'login';
  });

  // Fetch games and transactions from Cloud SQL backend
  const refreshData = useCallback(async () => {
    try {
      const [gamesRes, txRes] = await Promise.all([
        fetch('/api/games'),
        fetch('/api/transactions'),
      ]);

      if (gamesRes.ok) {
        const gamesData = await gamesRes.json();
        if (Array.isArray(gamesData) && gamesData.length > 0) {
          setGames(
            gamesData.map((g: any) => ({
              id: String(g.id),
              name: g.name,
              description: g.description,
              status: g.status as GameStatus,
              createdAt: g.createdAt || new Date().toISOString(),
            }))
          );
        }
      }

      if (txRes.ok) {
        const txData = await txRes.json();
        if (txData && Array.isArray(txData.transactions) && txData.transactions.length > 0) {
          setTransactions(
            txData.transactions.map((t: any) => ({
              id: String(t.id),
              gameId: String(t.gameId),
              amount: Number(t.amount),
              paymentMode: t.paymentMode as PaymentMode,
              createdAt: t.createdAt,
            }))
          );
        }
      }
      setIsDbConnected(true);
    } catch (err) {
      console.warn('API sync fallback to local store:', err);
      setIsDbConnected(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        const username = fbUser.displayName || fbUser.email?.split('@')[0] || 'User';
        const role = fbUser.email?.includes('admin') ? 'admin' : 'staff';
        const userObj: User = {
          id: fbUser.uid,
          username,
          role,
        };
        setCurrentUser(userObj);

        // Sync with backend Cloud SQL database
        try {
          await fetch('/api/users/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              uid: fbUser.uid,
              email: fbUser.email || `${fbUser.uid}@valhala.local`,
              username,
              role,
            }),
          });
        } catch (e) {
          console.warn('Failed to sync user with Cloud SQL:', e);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Persist users and current session
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
    } catch (e) {
      console.error(e);
    }
  }, [users]);

  useEffect(() => {
    try {
      if (currentUser) {
        localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(currentUser));
      } else {
        localStorage.removeItem(STORAGE_KEY_CURRENT_USER);
      }
    } catch (e) {
      console.error(e);
    }
  }, [currentUser]);

  const loginWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleAuthProvider);
      if (result.user) {
        const username = result.user.displayName || result.user.email?.split('@')[0] || 'User';
        const role = result.user.email?.includes('admin') ? 'admin' : 'staff';
        const loggedUser: User = {
          id: result.user.uid,
          username,
          role,
        };
        setCurrentUser(loggedUser);
        setActivePage('transaction');

        // Sync with Cloud SQL
        await fetch('/api/users/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uid: result.user.uid,
            email: result.user.email,
            username,
            role,
          }),
        });

        return { success: true };
      }
      return { success: false, error: 'Google sign-in did not complete.' };
    } catch (err: any) {
      console.error('Google Sign-In Error:', err);
      return { success: false, error: err.message || 'Google sign-in failed.' };
    }
  };

  const login = (username: string, password: string) => {
    const trimmed = username.trim().toLowerCase();
    const found = users.find(u => u.username.toLowerCase() === trimmed);
    if (!found || found.passwordHash !== password) {
      return { success: false, error: 'Invalid username or password.' };
    }
    const loggedUser: User = { id: found.id, username: found.username, role: found.role };
    setCurrentUser(loggedUser);
    setActivePage('transaction');
    return { success: true };
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch {
      // Ignore if not signed in with Firebase
    }
    setCurrentUser(null);
    setActivePage('login');
  };

  const signupStaff = async (username: string, password: string) => {
    const trimmed = username.trim();
    if (!trimmed) {
      return { success: false, error: 'Username is required.' };
    }
    if (!password || password.length < 3) {
      return { success: false, error: 'Password must be at least 3 characters.' };
    }

    const exists = users.some(u => u.username.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      return { success: false, error: 'User already exists.' };
    }

    const newUser: UserWithCredentials = {
      id: `usr-staff-${Date.now()}`,
      username: trimmed,
      passwordHash: password,
      role: 'staff',
    };

    setUsers(prev => [...prev, newUser]);

    // Also sync to Cloud SQL database
    try {
      await fetch('/api/users/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: newUser.id,
          email: `${trimmed}@valhala.local`,
          username: trimmed,
          role: 'staff',
        }),
      });
    } catch (e) {
      console.warn('Sync staff to SQL failed:', e);
    }

    return { success: true };
  };

  const addGame = async (name: string, description: string, status: GameStatus) => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      return { success: false, error: 'Game name is required.' };
    }

    try {
      const res = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          description: description.trim(),
          status,
        }),
      });

      if (res.ok) {
        const created = await res.json();
        const newGame: Game = {
          id: String(created.id),
          name: created.name,
          description: created.description,
          status: created.status as GameStatus,
          createdAt: created.createdAt || new Date().toISOString(),
        };
        setGames(prev => [...prev, newGame]);
        return { success: true };
      }
    } catch (err) {
      console.warn('Failed to add game to Cloud SQL, falling back to local:', err);
    }

    const fallbackGame: Game = {
      id: `game-${Date.now()}`,
      name: trimmedName,
      description: description.trim(),
      status,
      createdAt: new Date().toISOString(),
    };
    setGames(prev => [...prev, fallbackGame]);
    return { success: true };
  };

  const toggleGameStatus = async (gameId: string) => {
    const game = games.find(g => g.id === gameId);
    if (!game) return;
    const newStatus: GameStatus = game.status === 'available' ? 'unavailable' : 'available';

    // Optimistic update
    setGames(prev =>
      prev.map(g => (g.id === gameId ? { ...g, status: newStatus } : g))
    );

    try {
      await fetch(`/api/games/${gameId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch (err) {
      console.warn('Failed to update game status in Cloud SQL:', err);
    }
  };

  const addTransaction = async (gameId: string, amount: number, paymentMode: PaymentMode) => {
    const game = games.find(g => g.id === gameId);
    if (!game || game.status === 'unavailable') {
      return { success: false, error: 'Game not found or unavailable' };
    }

    if (isNaN(amount) || amount <= 0) {
      return { success: false, error: 'Please enter a valid amount greater than 0' };
    }

    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId,
          amount: Number(amount.toFixed(2)),
          paymentMode,
          cashierUid: currentUser?.id,
        }),
      });

      if (res.ok) {
        const created = await res.json();
        const newTx: Transaction = {
          id: String(created.id),
          gameId: String(created.gameId),
          amount: Number(created.amount),
          paymentMode: created.paymentMode as PaymentMode,
          createdAt: created.createdAt || new Date().toISOString(),
        };
        setTransactions(prev => [newTx, ...prev]);
        return { success: true };
      }
    } catch (err) {
      console.warn('Failed to add transaction to Cloud SQL, falling back to local:', err);
    }

    const fallbackTx: Transaction = {
      id: `tx-${Date.now()}`,
      gameId,
      amount: Number(amount.toFixed(2)),
      paymentMode,
      createdAt: new Date().toISOString(),
    };
    setTransactions(prev => [fallbackTx, ...prev]);
    return { success: true };
  };

  // Implements TransactionService business logic
  const getFilteredTransactions = (filter: TransactionFilter): TransactionSummaryResult => {
    let filtered = [...transactions];

    if (filter.gameId) {
      filtered = filtered.filter(tx => String(tx.gameId) === String(filter.gameId));
    }

    if (filter.date) {
      filtered = filtered.filter(tx => {
        const txDate = new Date(tx.createdAt);
        const year = txDate.getFullYear();
        const month = String(txDate.getMonth() + 1).padStart(2, '0');
        const day = String(txDate.getDate()).padStart(2, '0');
        const formatted = `${year}-${month}-${day}`;
        return formatted === filter.date;
      });
    }

    if (filter.paymentMode) {
      filtered = filtered.filter(tx => tx.paymentMode === filter.paymentMode);
    }

    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const rawTotal = filtered.reduce((acc, curr) => acc + curr.amount, 0);

    // Business fee deduction logic from TransactionService:
    // bank_transfer: total = amount - (0.2323 * amount)
    // landmark_app: total = amount - (0.15 * amount)
    let netTotal = rawTotal;
    let feeDeducted = 0;
    let feePercentage = 0;
    let isFeeApplied = false;

    if (filter.paymentMode === 'bank_transfer') {
      feePercentage = 23.23;
      feeDeducted = rawTotal * 0.2323;
      netTotal = rawTotal - feeDeducted;
      isFeeApplied = true;
    } else if (filter.paymentMode === 'landmark_app') {
      feePercentage = 15;
      feeDeducted = rawTotal * 0.15;
      netTotal = rawTotal - feeDeducted;
      isFeeApplied = true;
    }

    const enriched = filtered.map(tx => ({
      ...tx,
      game: games.find(g => String(g.id) === String(tx.gameId)),
    }));

    return {
      transactions: enriched,
      rawTotal,
      total: Number(netTotal.toFixed(2)),
      feeDeducted: Number(feeDeducted.toFixed(2)),
      feePercentage,
      isFeeApplied,
    };
  };

  const formatCurrency = (amount: number): string => {
    return `₦${amount.toLocaleString('en-NG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const resetToDefaults = () => {
    setUsers(INITIAL_USERS);
    setGames(INITIAL_GAMES);
    setTransactions(INITIAL_TRANSACTIONS);
    setCurrentUser({ id: INITIAL_USERS[0].id, username: INITIAL_USERS[0].username, role: INITIAL_USERS[0].role });
    localStorage.clear();
  };

  const switchUserQuick = (role: 'admin' | 'staff') => {
    const userToSwitch = users.find(u => u.role === role) || INITIAL_USERS.find(u => u.role === role);
    if (userToSwitch) {
      setCurrentUser({ id: userToSwitch.id, username: userToSwitch.username, role: userToSwitch.role });
    }
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        users,
        games,
        transactions,
        activePage,
        setActivePage,
        login,
        loginWithGoogle,
        logout,
        signupStaff,
        addGame,
        toggleGameStatus,
        addTransaction,
        getFilteredTransactions,
        formatCurrency,
        resetToDefaults,
        switchUserQuick,
        refreshData,
        isDbConnected,
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
