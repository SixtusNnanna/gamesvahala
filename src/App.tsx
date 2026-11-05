import React from 'react';
import { useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { NewTransactionPage } from './pages/NewTransactionPage';
import { TransactionsHistoryPage } from './pages/TransactionsHistoryPage';
import { AddGamePage } from './pages/AddGamePage';
import { SignupPage } from './pages/SignupPage';
import { LoginPage } from './pages/LoginPage';

export const AppContent: React.FC = () => {
  const { currentUser, activePage, setActivePage } = useApp();

  // If not logged in, show login page
  if (!currentUser || activePage === 'login') {
    return <LoginPage />;
  }

  // Admin-only pages check (matches FastAPI @require_roles(Role.ADMIN))
  const isAdmin = currentUser.role === 'admin';

  return (
    <div className="min-h-screen flex flex-col bg-[#f4f6f8]">
      <Navbar />

      <main className="flex-1 max-w-[1100px] w-full mx-auto px-5 py-6">
        {activePage === 'transaction' && <NewTransactionPage />}

        {activePage === 'history' && (
          isAdmin ? (
            <TransactionsHistoryPage />
          ) : (
            <div className="max-w-[500px] mx-auto bg-white p-6 rounded-lg text-center shadow">
              <h2 className="text-lg font-bold text-red-600 mb-2">Access Denied</h2>
              <p className="text-sm text-gray-600 mb-4">
                You do not have permission to access the Transactions History page. Only administrators can view financial summaries.
              </p>
              <button
                onClick={() => setActivePage('transaction')}
                className="px-4 py-2 bg-[#2e6b63] text-white rounded font-bold text-sm"
              >
                Return to Enter Transaction
              </button>
            </div>
          )
        )}

        {activePage === 'add_game' && (
          isAdmin ? (
            <AddGamePage />
          ) : (
            <div className="max-w-[500px] mx-auto bg-white p-6 rounded-lg text-center shadow">
              <h2 className="text-lg font-bold text-red-600 mb-2">Access Denied</h2>
              <p className="text-sm text-gray-600 mb-4">
                Adding games requires Administrator privileges.
              </p>
              <button
                onClick={() => setActivePage('transaction')}
                className="px-4 py-2 bg-[#2e6b63] text-white rounded font-bold text-sm"
              >
                Return to Enter Transaction
              </button>
            </div>
          )
        )}

        {activePage === 'signup' && (
          isAdmin ? (
            <SignupPage />
          ) : (
            <div className="max-w-[500px] mx-auto bg-white p-6 rounded-lg text-center shadow">
              <h2 className="text-lg font-bold text-red-600 mb-2">Access Denied</h2>
              <p className="text-sm text-gray-600 mb-4">
                Creating staff accounts requires Administrator privileges.
              </p>
              <button
                onClick={() => setActivePage('transaction')}
                className="px-4 py-2 bg-[#2e6b63] text-white rounded font-bold text-sm"
              >
                Return to Enter Transaction
              </button>
            </div>
          )
        )}
      </main>

      <footer className="py-4 text-center text-xs text-gray-500 border-t border-gray-200 mt-auto bg-white/50">
        Valhala Games &bull; Arcade Financial Register Terminal &bull; {new Date().getFullYear()}
      </footer>
    </div>
  );
};

export default function App() {
  return <AppContent />;
}
