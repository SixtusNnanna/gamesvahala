import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { PAYMENT_MODES, PaymentMode } from '../types';

export const NewTransactionPage: React.FC = () => {
  const { games, addTransaction, transactions, formatCurrency } = useApp();

  const [selectedGameId, setSelectedGameId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode | ''>('');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Filter only available games and sort alphabetically by name (matches main.py)
  const availableGames = games
    .filter(g => g.status === 'available')
    .sort((a, b) => a.name.localeCompare(b.name));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!selectedGameId) {
      setMessage({ text: 'Please select a game', type: 'error' });
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setMessage({ text: 'Please enter a valid amount greater than 0', type: 'error' });
      return;
    }

    if (!paymentMode) {
      setMessage({ text: 'Please choose a payment mode', type: 'error' });
      return;
    }

    const result = await addTransaction(selectedGameId, numAmount, paymentMode);
    if (result.success) {
      setMessage({ text: 'Transaction added successfully', type: 'success' });
      // Reset form fields
      setSelectedGameId('');
      setAmount('');
      setPaymentMode('');
    } else {
      setMessage({ text: result.error || 'Failed to submit transaction', type: 'error' });
    }
  };

  // Recent 5 transactions for quick cashier verification
  const recentTransactions = transactions.slice(0, 5);

  return (
    <div className="max-w-[500px] mx-auto py-5">
      <div className="bg-white p-[30px] rounded-[12px] shadow-[0_4px_15px_rgba(0,0,0,0.08)]">
        <h1 className="text-2xl font-bold mt-0 mb-2 text-[#222]">New Transaction</h1>
        <p className="text-[#666] mb-[25px] text-sm">Enter the game transaction details below.</p>

        {message && (
          <div
            role="alert"
            className={`mb-5 p-3.5 rounded-md text-sm font-medium border transition-all ${
              message.type === 'success'
                ? 'bg-[#eaf7f3] border-[#a3dfd3] text-[#136154]'
                : 'bg-[#fff1f1] border-[#f2c5c5] text-[#a12b2b]'
            }`}
          >
            {message.type === 'success' ? '✓ ' : '⚠ '}
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-5">
            <label htmlFor="game_id" className="block mb-2 font-bold text-sm text-[#222]">
              Select Game <span className="text-[#c0392b]">*</span>
            </label>
            <select
              id="game_id"
              name="game_id"
              value={selectedGameId}
              onChange={e => setSelectedGameId(e.target.value)}
              required
              className="w-full p-3 border border-[#ccc] rounded-[6px] text-[15px] bg-white outline-none focus:border-[#2e6b63] transition-colors"
            >
              <option value="">-- Choose a game --</option>
              {availableGames.map(game => (
                <option key={game.id} value={game.id}>
                  {game.name}
                </option>
              ))}
            </select>
            {availableGames.length === 0 && (
              <p className="text-xs text-[#c0392b] mt-1">
                No active games available. Add games from the admin panel.
              </p>
            )}
          </div>

          <div className="mb-5">
            <label htmlFor="amount" className="block mb-2 font-bold text-sm text-[#222]">
              Amount <span className="text-[#c0392b]">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 font-semibold select-none">
                ₦
              </span>
              <input
                type="number"
                id="amount"
                name="amount"
                min="0.01"
                step="0.01"
                placeholder="Enter transaction amount"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                required
                className="w-full p-3 pl-8 border border-[#ccc] rounded-[6px] text-[15px] bg-white outline-none focus:border-[#2e6b63] transition-colors"
              />
            </div>
            {/* Quick quick-cash buttons for fast arcade cashier checkout */}
            <div className="flex gap-2 mt-2">
              {[1000, 2000, 3500, 5000].map(val => (
                <button
                  type="button"
                  key={val}
                  onClick={() => setAmount(val.toString())}
                  className="px-2 py-1 text-xs bg-[#f4f6f8] text-[#555] hover:bg-[#e2e8ec] rounded border border-[#ddd] cursor-pointer"
                >
                  ₦{val.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <label htmlFor="payment_mode" className="block mb-2 font-bold text-sm text-[#222]">
              Payment Mode <span className="text-[#c0392b]">*</span>
            </label>
            <select
              id="payment_mode"
              name="payment_mode"
              value={paymentMode}
              onChange={e => setPaymentMode(e.target.value as PaymentMode)}
              required
              className="w-full p-3 border border-[#ccc] rounded-[6px] text-[15px] bg-white outline-none focus:border-[#2e6b63] transition-colors"
            >
              <option value="">-- Choose payment mode --</option>
              {PAYMENT_MODES.map(mode => (
                <option key={mode.value} value={mode.value}>
                  {mode.label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="w-full p-[13px] border-none rounded-[6px] bg-[#2e6b63] hover:bg-[#24564f] text-white text-[16px] font-bold cursor-pointer transition-colors shadow-sm"
          >
            Submit Transaction
          </button>
        </form>
      </div>

      {/* Recent Activity Card */}
      {recentTransactions.length > 0 && (
        <div className="mt-6 bg-white p-5 rounded-[12px] shadow-[0_4px_15px_rgba(0,0,0,0.05)]">
          <div className="flex items-center justify-between mb-3 border-b pb-2">
            <h3 className="text-sm font-bold text-[#444] uppercase tracking-wider">
              Recent Register Entries
            </h3>
            <span className="text-xs text-gray-500">Latest {recentTransactions.length}</span>
          </div>
          <div className="divide-y divide-gray-100 text-sm">
            {recentTransactions.map(tx => {
              const game = games.find(g => g.id === tx.gameId);
              const modeLabel = PAYMENT_MODES.find(m => m.value === tx.paymentMode)?.label || tx.paymentMode;
              const dateStr = new Date(tx.createdAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              });
              return (
                <div key={tx.id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-gray-800">{game?.name || 'Arcade Game'}</div>
                    <div className="text-xs text-gray-500">
                      {modeLabel} • {dateStr}
                    </div>
                  </div>
                  <div className="font-bold text-[#174d46] text-right">
                    {formatCurrency(tx.amount)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
