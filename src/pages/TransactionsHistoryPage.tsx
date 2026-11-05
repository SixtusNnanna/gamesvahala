import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { PAYMENT_MODES, PaymentMode, TransactionFilter } from '../types';

export const TransactionsHistoryPage: React.FC = () => {
  const { games, getFilteredTransactions, formatCurrency } = useApp();

  const [filterGameId, setFilterGameId] = useState<string>('');
  const [filterDate, setFilterDate] = useState<string>('');
  const [filterPaymentMode, setFilterPaymentMode] = useState<PaymentMode | ''>('');

  // Applied filter state
  const [appliedFilters, setAppliedFilters] = useState<TransactionFilter>({
    gameId: '',
    date: '',
    paymentMode: '',
  });

  const handleApplyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    setAppliedFilters({
      gameId: filterGameId,
      date: filterDate,
      paymentMode: filterPaymentMode,
    });
  };

  const handleClearFilters = () => {
    setFilterGameId('');
    setFilterDate('');
    setFilterPaymentMode('');
    setAppliedFilters({
      gameId: '',
      date: '',
      paymentMode: '',
    });
  };

  const [summary, setSummary] = useState<any>({
    transactions: [],
    rawTotal: 0,
    total: 0,
    feeDeducted: 0,
    feePercentage: 0,
    isFeeApplied: false,
  });

  useEffect(() => {
    let isMounted = true;
    getFilteredTransactions(appliedFilters).then(res => {
      if (isMounted && res) {
        setSummary(res);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [getFilteredTransactions, appliedFilters]);

  // Format date: DD MMM YYYY, HH:mm
  const formatDateTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      const day = d.getDate();
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = monthNames[d.getMonth()];
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, '0');
      const mins = String(d.getMinutes()).padStart(2, '0');
      return `${day} ${month} ${year}, ${hours}:${mins}`;
    } catch {
      return isoString;
    }
  };

  // Helper for Payment Mode Label
  const getPaymentModeLabel = (mode: PaymentMode) => {
    return PAYMENT_MODES.find(m => m.value === mode)?.label || mode.replace('_', ' ');
  };

  return (
    <div className="max-w-[1100px] mx-auto py-6">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <h1 className="text-3xl font-bold text-[#222]">Transaction History</h1>
        <div className="text-sm text-gray-500">
          Showing <span className="font-semibold text-gray-800">{summary.transactions.length}</span> record
          {summary.transactions.length === 1 ? '' : 's'}
        </div>
      </div>

      {/* Filter Form Card */}
      <form
        onSubmit={handleApplyFilters}
        className="bg-white p-[22px] rounded-[10px] mb-[22px] shadow-[0_3px_12px_rgba(0,0,0,0.05)] grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end"
      >
        <div>
          <label htmlFor="game_id" className="block mb-2 font-bold text-sm text-[#222]">
            Game
          </label>
          <select
            id="game_id"
            name="game_id"
            value={filterGameId}
            onChange={e => setFilterGameId(e.target.value)}
            className="w-full p-[11px] rounded-[6px] border border-[#ccc] text-sm bg-white outline-none focus:border-[#2e6b63]"
          >
            <option value="">All games</option>
            {games.map(game => (
              <option key={game.id} value={game.id}>
                {game.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="transaction_date" className="block mb-2 font-bold text-sm text-[#222]">
            Date
          </label>
          <input
            type="date"
            id="transaction_date"
            name="transaction_date"
            value={filterDate}
            onChange={e => setFilterDate(e.target.value)}
            className="w-full p-[11px] rounded-[6px] border border-[#ccc] text-sm bg-white outline-none focus:border-[#2e6b63]"
          />
        </div>

        <div>
          <label htmlFor="payment_mode" className="block mb-2 font-bold text-sm text-[#222]">
            Payment Mode
          </label>
          <select
            id="payment_mode"
            name="payment_mode"
            value={filterPaymentMode}
            onChange={e => setFilterPaymentMode(e.target.value as PaymentMode | '')}
            className="w-full p-[11px] rounded-[6px] border border-[#ccc] text-sm bg-white outline-none focus:border-[#2e6b63]"
          >
            <option value="">All payment modes</option>
            {PAYMENT_MODES.map(mode => (
              <option key={mode.value} value={mode.value}>
                {mode.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-2 items-center">
          <button
            type="submit"
            className="flex-1 p-[11px] bg-[#2e6b63] hover:bg-[#24564f] text-white rounded-[6px] border-none font-bold text-sm cursor-pointer transition-colors text-center"
          >
            Apply Filters
          </button>
          <button
            type="button"
            onClick={handleClearFilters}
            className="p-[11px] text-[#2e6b63] hover:text-[#174d46] hover:bg-[#f0f7f5] rounded-[6px] text-sm font-semibold transition-colors cursor-pointer text-center"
          >
            Clear filters
          </button>
        </div>
      </form>

      {/* Summary Card */}
      <section className="bg-white p-[22px] rounded-[10px] mb-[22px] shadow-[0_3px_12px_rgba(0,0,0,0.05)]">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-[#666] mb-1.5 text-sm">Total amount for matching transactions</p>
            <div className="text-[32px] font-bold text-[#2e6b63] leading-none">
              {formatCurrency(summary.total)}
            </div>
          </div>

          {/* Business fee deduction details from TransactionService */}
          {summary.isFeeApplied && (
            <div className="bg-[#eef8f5] border border-[#c1e7dc] p-3 rounded-lg text-sm text-[#145a4f]">
              <div className="font-bold flex items-center gap-1.5">
                <span>⚡ Fee Calculation Applied</span>
                <span className="text-xs px-2 py-0.5 bg-[#2e6b63] text-white rounded font-medium">
                  {summary.feePercentage}% Deduction
                </span>
              </div>
              <div className="mt-1 text-xs text-[#20695c] flex gap-4">
                <span>Gross: <strong>{formatCurrency(summary.rawTotal)}</strong></span>
                <span>Fee: <strong>-{formatCurrency(summary.feeDeducted)}</strong></span>
                <span>Net: <strong>{formatCurrency(summary.total)}</strong></span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Transactions Table Section */}
      <section className="bg-white p-[22px] rounded-[10px] shadow-[0_3px_12px_rgba(0,0,0,0.05)]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-[#222]">Transactions</h2>
          {summary.transactions.length > 0 && (
            <button
              onClick={() => window.print()}
              className="text-xs text-[#2e6b63] hover:underline font-semibold cursor-pointer"
            >
              Print / Save Report
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[650px] text-sm">
            <thead>
              <tr className="bg-[#f8faf9] border-b border-[#eee]">
                <th className="p-[13px] text-left font-bold text-[#444]">Game</th>
                <th className="p-[13px] text-left font-bold text-[#444]">Amount</th>
                <th className="p-[13px] text-left font-bold text-[#444]">Payment Mode</th>
                <th className="p-[13px] text-left font-bold text-[#444]">Date</th>
              </tr>
            </thead>
            <tbody>
              {summary.transactions.length > 0 ? (
                summary.transactions.map((tx: any) => (
                  <tr key={tx.id} className="border-b border-[#eee] hover:bg-[#fafbfb] transition-colors">
                    <td className="p-[13px] font-medium text-gray-800">
                      {tx.game ? tx.game.name : 'Unknown Game'}
                    </td>
                    <td className="p-[13px] font-semibold text-[#174d46]">
                      {formatCurrency(tx.amount)}
                    </td>
                    <td className="p-[13px]">
                      <span className="inline-block px-2.5 py-1 bg-[#edf5f3] text-[#1c645b] rounded text-xs font-semibold">
                        {getPaymentModeLabel(tx.paymentMode)}
                      </span>
                    </td>
                    <td className="p-[13px] text-gray-600">
                      {formatDateTime(tx.createdAt)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="text-center text-[#777] p-[25px]">
                    No transactions match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
