import React from 'react';
import { useApp } from '../context/AppContext';

export const Navbar: React.FC = () => {
  const { currentUser, logout, activePage, setActivePage } = useApp();

  return (
    <nav className="bg-[#174d46] text-white py-4 px-[5%] flex items-center justify-between gap-5 flex-wrap shadow-md">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setActivePage('transaction')}
          className="text-[21px] font-bold text-white hover:text-[#b8e4d8] flex items-center gap-2 cursor-pointer transition-colors"
        >
          <span className="text-[#45c6a5] text-2xl font-black">⚔</span>
          <span>Valhala Games</span>
        </button>
      </div>

      {currentUser && (
        <div className="flex items-center gap-6 flex-wrap">
          {currentUser.role === 'admin' && (
            <div className="flex items-center gap-5 flex-wrap text-[15px]">
              <button
                onClick={() => setActivePage('transaction')}
                className={`transition-colors cursor-pointer py-1 ${
                  activePage === 'transaction'
                    ? 'text-[#45c6a5] font-bold border-b-2 border-[#45c6a5]'
                    : 'text-white hover:text-[#b8e4d8]'
                }`}
              >
                Enter Transaction
              </button>
              <button
                onClick={() => setActivePage('history')}
                className={`transition-colors cursor-pointer py-1 ${
                  activePage === 'history'
                    ? 'text-[#45c6a5] font-bold border-b-2 border-[#45c6a5]'
                    : 'text-white hover:text-[#b8e4d8]'
                }`}
              >
                Transactions
              </button>
              <button
                onClick={() => setActivePage('add_game')}
                className={`transition-colors cursor-pointer py-1 ${
                  activePage === 'add_game'
                    ? 'text-[#45c6a5] font-bold border-b-2 border-[#45c6a5]'
                    : 'text-white hover:text-[#b8e4d8]'
                }`}
              >
                Add Game
              </button>
              <button
                onClick={() => setActivePage('signup')}
                className={`transition-colors cursor-pointer py-1 ${
                  activePage === 'signup'
                    ? 'text-[#45c6a5] font-bold border-b-2 border-[#45c6a5]'
                    : 'text-white hover:text-[#b8e4d8]'
                }`}
              >
                Create Staff Access
              </button>
            </div>
          )}

          {currentUser.role === 'staff' && (
            <div className="flex items-center gap-3 text-sm text-[#b8e4d8]">
              <span className="bg-[#0f3631] px-2.5 py-1 rounded text-xs uppercase tracking-wider font-semibold text-[#45c6a5]">
                Staff Terminal
              </span>
            </div>
          )}

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <div className="text-xs text-[#a0c5bd] uppercase tracking-wider font-medium">
                Signed in as
              </div>
              <div className="text-sm font-semibold flex items-center gap-1.5">
                <span>{currentUser.username}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
                  currentUser.role === 'admin' ? 'bg-[#2e6b63] text-white' : 'bg-[#24564f] text-[#b8e4d8]'
                }`}>
                  {currentUser.role}
                </span>
              </div>
            </div>

            <button
              onClick={logout}
              className="py-[9px] px-[14px] bg-white text-[#174d46] hover:bg-[#eaf4f2] transition-colors rounded-[6px] font-bold text-sm cursor-pointer shadow-sm"
            >
              Log Out
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};
